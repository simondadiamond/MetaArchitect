# /harvest Command Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/harvest` — an autonomous idea generation command that runs the full `/capture` pipeline on Perplexity-sourced topics, self-improves via pillar selection rates, and prunes stale harvest ideas.

**Architecture:** Harvest is a loop over N targeted Perplexity queries (N=5 cold start, N=8 warm). Each query runs the full `/capture` sub-pipeline (Brand Strategist → Brand Scorer → Angle Extractor → validateUIF → Airtable write). A `harvest-memory.json` file tracks run count and query history, enabling pillar weighting and keyword-overlap topic avoidance. No new Airtable fields or schema changes required.

**Tech Stack:** Claude Code slash command (Markdown SOP), claude-sonnet-4-6, sonar-pro (Perplexity), Airtable MCP tools, `.claude/harvest-memory.json` (JSON state file).

---

## Key Design Decisions (locked in from spec sessions)

| Decision | Resolution |
|---|---|
| Cold start threshold | `run_count < 3` → equal weighting (1 query per pillar) |
| Warm query budget | 8 queries, weighted by pillar selection rate, floor 1 per pillar |
| Topic avoidance v1 | Exact keyword overlap: skip if new query shares ≥2 keywords with a ≥2-run 0%-selection query |
| Score threshold | `score_overall >= 7.0` → write to Airtable; below → discard (log entry only) |
| Pruning scope | Harvest-generated ideas only (`source_type = "harvest"`, `Status = "New"`, `captured_at > 28 days ago`) |
| New Airtable fields | None — use `source_type = "harvest"` (typecast), `raw_input` for query string, `selection_reason` for archive note |
| Shallow UIF | Identical to `/capture` step 6.5 — single Perplexity response + Angle Extractor → `validateUIF` |

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `.claude/commands/harvest.md` | CREATE | Full SOP — all steps, all prompts inline |
| `.claude/harvest-memory.json` | CREATE | Initial state: `{ run_count: 0, query_log: [] }` |

No existing files modified.

---

## Chunk 1: harvest-memory.json + harvest.md skeleton

### Task 1: Create harvest-memory.json

**Files:**
- Create: `.claude/harvest-memory.json`

- [ ] **Step 1: Write the file**

```json
{
  "run_count": 0,
  "query_log": []
}
```

`query_log` entries will have this shape (for reference — not written at init):
```json
{
  "query": "string — the exact query sent to Perplexity",
  "pillar": "string — one of the 5 content pillars",
  "run_date": "ISO date string",
  "ideas_generated": 0,
  "ideas_selected": 0
}
```

`ideas_generated` = count of ideas from this query that passed the `score_overall >= 7.0` threshold and were written to Airtable.
`ideas_selected` = count of those ideas whose Airtable `Status` later moved past `"New"` (to Selected/Ready/Completed). Computed at the START of each run, not at write time.

- [ ] **Step 2: Commit**

```bash
git add .claude/harvest-memory.json
git commit -m "feat: add harvest-memory.json initial state"
```

---

### Task 2: Write harvest.md — header, precondition, STATE init, memory load

**Files:**
- Create: `.claude/commands/harvest.md`

- [ ] **Step 1: Write the file header and precondition block**

```markdown
# /harvest — Autonomous Idea Generation Command

Runs the full /capture sub-pipeline autonomously on Perplexity-sourced topics. No human input required.
Self-improves via pillar selection rates stored in `.claude/harvest-memory.json`.

---

## Precondition

None. This command can run any time.
Risk tier: medium → S + T + E required.

> **Airtable**: Use MCP tools directly. All table IDs and field IDs in `.claude/skills/airtable.md`. Always `typecast: true`.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "harvest",
  entityId: state.workflowId  // no single entity — use workflowId as self-reference
});
```
```

- [ ] **Step 2: Write the memory load step**

```markdown
## Step 1: Load Harvest Memory

Read `.claude/harvest-memory.json`. If the file is missing or malformed, initialize:
```javascript
const memory = { run_count: 0, query_log: [] };
```

This is the cold-start fallback — no crash, no prompt to user.
```

- [ ] **Step 3: Commit skeleton**

```bash
git add .claude/commands/harvest.md
git commit -m "feat: add harvest.md skeleton with STATE init and memory load"
```

---

## Chunk 2: Selection rate computation + query plan builder

### Task 3: Write harvest.md — selection rate computation

**Files:**
- Modify: `.claude/commands/harvest.md`

- [ ] **Step 1: Write Step 2 — fetch harvested ideas and compute selection rates**

```markdown
## Step 2: Compute Pillar Selection Rates

> Only runs when `memory.run_count >= 3`. Skip if cold start.

### 2a. Fetch all harvest-generated ideas

Get schema for Status field (singleSelect) to retrieve choice IDs:
```
mcp__claude_ai_Airtable__get_table_schema(
  appgvQDqiFZ3ESigA,
  [{ tableId: "tblVKVojZscMG6gDk", fieldIds: ["fld9frOZF4oaf3r6V"] }]
)
→ capture choice ID for "New"
```

Then fetch all ideas where `source_type = "harvest"`:
```
mcp__claude_ai_Airtable__list_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblVKVojZscMG6gDk",
  fieldIds: [
    "fldMtlpG32VKE0WkN",   // Topic
    "fld9frOZF4oaf3r6V",   // Status
    "fldBkIqNugXb4M5Fk",   // source_type
    "fldQMArYmpP8s6VKb"    // Intelligence File (UIF)
  ],
  filters: { operator: "=", operands: ["fldBkIqNugXb4M5Fk", "harvest"] }
)
```

> Note: `source_type` is a singleSelect. If no harvest ideas exist yet, it may not have a choice ID. Use `typecast: true` on writes; for reads, filter using the plain value "harvest" (text field shortcut from airtable.md).

### 2b. Compute rates

For each harvested idea:
- Parse `Intelligence File` field → `uif = JSON.parse(record.fields["Intelligence File"])`
- Derive dominant pillar: `uif.angles[0].pillar_connection` — extract the pillar name (one of the 5 valid pillar names)
- Selected = `Status` is NOT "New" (i.e., Selected / Ready / Completed)

```javascript
const PILLARS = [
  "Production Failure Taxonomy",
  "STATE Framework Applied",
  "Defensive Architecture",
  "The Meta Layer",
  "Regulated AI & Law 25"
];

// Initialize counters
const rates = {};
PILLARS.forEach(p => { rates[p] = { total: 0, selected: 0 }; });

// Tally
for (const idea of harvestedIdeas) {
  const uif = JSON.parse(idea.fields["Intelligence File"] ?? "null");
  if (!uif?.angles?.[0]?.pillar_connection) continue;
  const pillar = PILLARS.find(p => uif.angles[0].pillar_connection.includes(p));
  if (!pillar) continue;
  rates[pillar].total++;
  if (idea.fields["Status"] !== "New") rates[pillar].selected++;
}

// Selection rate per pillar (null if no data)
const selectionRates = {};
PILLARS.forEach(p => {
  selectionRates[p] = rates[p].total > 0
    ? rates[p].selected / rates[p].total
    : null;
});
```
```

### Task 4: Write harvest.md — query plan builder

- [ ] **Step 1: Write Step 3 — build the weighted query plan**

```markdown
## Step 3: Build Query Plan

### Cold start (run_count < 3)
Allocate exactly 1 query per pillar → 5 queries total, order as listed.

```javascript
const COLD_START_BUDGET = 5;
const WARM_BUDGET = 8;
const PILLAR_FLOOR = 1;

let queryPlan; // array of { pillar: string, slot: number }

if (memory.run_count < 3) {
  queryPlan = PILLARS.map(p => ({ pillar: p }));
} else {
  // Weighted allocation
  // Use selection rate if available; default 0.5 for pillars with null rate
  const weights = PILLARS.map(p => ({
    pillar: p,
    weight: selectionRates[p] ?? 0.5
  }));
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  // Proportional allocation, floor 1 per pillar
  let slots = weights.map(w => ({
    pillar: w.pillar,
    slots: Math.max(PILLAR_FLOOR, Math.round((w.weight / totalWeight) * WARM_BUDGET))
  }));

  // Correct rounding drift — trim or add from highest-weight pillar
  let allocated = slots.reduce((s, x) => s + x.slots, 0);
  const sorted = [...slots].sort((a, b) => {
    const wa = selectionRates[a.pillar] ?? 0.5;
    const wb = selectionRates[b.pillar] ?? 0.5;
    return wb - wa;
  });
  while (allocated > WARM_BUDGET) {
    const top = sorted.find(s => s.slots > PILLAR_FLOOR);
    if (!top) break;
    top.slots--;
    allocated--;
  }
  while (allocated < WARM_BUDGET) {
    sorted[0].slots++;
    allocated++;
  }

  // Expand to per-query array
  queryPlan = [];
  slots.forEach(s => {
    for (let i = 0; i < s.slots; i++) queryPlan.push({ pillar: s.pillar });
  });
}
```

### Topic avoidance filter

Before generating a query for each slot, check against avoided topics in `memory.query_log`:

```javascript
// Build avoidance list: queries with >= 2 runs and 0% selection rate
const avoidedQueries = [];
const queryGroups = {};
memory.query_log.forEach(entry => {
  if (!queryGroups[entry.query]) queryGroups[entry.query] = { runs: 0, generated: 0 };
  queryGroups[entry.query].runs++;
  queryGroups[entry.query].generated += entry.ideas_generated;
});
Object.entries(queryGroups).forEach(([query, stats]) => {
  if (stats.runs >= 2 && stats.generated === 0) avoidedQueries.push(query);
});

// Keyword overlap check (v1 — exact keywords, no embeddings)
const stopwords = new Set(['the','a','an','and','or','in','of','for','to','with','is','are','on','at','by','that','this','how']);
function extractKeywords(q) {
  return q.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
}
function isAvoided(candidateQuery) {
  const newKws = new Set(extractKeywords(candidateQuery));
  return avoidedQueries.some(avoided => {
    const overlap = extractKeywords(avoided).filter(k => newKws.has(k));
    return overlap.length >= 2;
  });
}
```

The `isAvoided()` check runs AFTER generating the candidate query (Step 4). If avoided, regenerate once with "regenerate" flag. If still avoided, use it anyway — avoidance is best-effort, not a hard block.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/commands/harvest.md
git commit -m "feat: harvest — selection rate computation and query plan builder"
```

---

## Chunk 3: Per-query pipeline

### Task 5: Write harvest.md — Harvest Query Generator prompt

**Files:**
- Modify: `.claude/commands/harvest.md`

- [ ] **Step 1: Write Step 4 — Harvest Query Generator**

```markdown
## Step 4: Generate Queries (Harvest Query Generator)

For each slot in `queryPlan`, generate a targeted Perplexity search query using claude-sonnet-4-6.

**System prompt**:
```
You are the Harvest Query Generator for The Meta Architect content brand.

Brand: The Meta Architect — AI Reliability Engineering
Thesis: State Beats Intelligence
Brand guidelines: {brand.fields?.main_guidelines}
ICP: {brand.fields?.icp_short}

Generate ONE specific Perplexity search query targeting the given content pillar.

Rules:
- Query must be 8–15 words, practitioner-grade specificity
- Must target production AI systems, LLM reliability, state management, or enterprise AI governance
- Must surface information The Meta Architect's ICP (LLMOps engineers, GenAI platform leads) would recognize as relevant to their production failures
- Must NOT be about: general AI trends, model comparisons, beginner tutorials, vendor marketing
- If avoid_topics is provided, do not produce a query with 2+ overlapping keywords from any listed topic

Output ONLY this JSON — no preamble:
{
  "query": "string",
  "rationale": "one sentence"
}
```

**User prompt**:
```
Target pillar: {pillar}

Pillar description:
{PILLAR_DESCRIPTIONS[pillar]}

Avoid topics (these queries produced no ideas in 2+ runs — do not overlap):
{avoidedQueries.length > 0 ? avoidedQueries.join('\n') : 'None'}

Generate one query.
```

**Pillar descriptions** (inline constant — do not call LLM for this):
```javascript
const PILLAR_DESCRIPTIONS = {
  "Production Failure Taxonomy": "Naming and classifying LLM failure modes with precision. Focus on specific, reproducible failure patterns in production agent systems — context rot, silent truncation, lock starvation, hallucination cascades.",
  "STATE Framework Applied": "Demonstrations of the STATE pillars (Structured, Traceable, Auditable, Tolerant, Explicit) in real architecture decisions. Before/after comparisons of stateless vs. stateful agent designs.",
  "Defensive Architecture": "Design patterns that make AI systems fault-tolerant by construction. Validation gates, lock patterns, idempotency, resumable workflows. The plumbing around the model.",
  "The Meta Layer": "How to use AI to do the work most people do manually — including figuring out what to ask the AI. The meta-skill is knowing what question to ask.",
  "Regulated AI & Law 25": "Quebec Law 25, OSFI, and EU AI Act as architecture requirements. Automated decision logging, explainability, personal data enumeration. Compliance that falls out of good state management."
};
```

**Validation**:
```javascript
function validateHarvestQuery(output) {
  if (!output.query || output.query.trim() === "") return { valid: false, error: "query is empty" };
  const wordCount = output.query.trim().split(/\s+/).length;
  if (wordCount < 5) return { valid: false, error: `query too short (${wordCount} words)` };
  return { valid: true };
}
```

Log the generator call:
```javascript
{
  step_name: "harvest_query_generator",
  stage: "query_planning",
  output_summary: `Pillar: ${pillar} → Query: "${generatedQuery}"`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```

After generating, run `isAvoided(query)`. If avoided, regenerate once with the flag `"regenerate: true, previous_query: <query>"` appended to the user prompt. If still avoided, use it.
```

---

### Task 6: Write harvest.md — Perplexity + Brand Strategist + Brand Scorer per query

- [ ] **Step 1: Write Step 5 — Perplexity call**

```markdown
## Step 5: Perplexity Call (per query)

For each query in `queryPlan` (after query generation in Step 4):

```javascript
updateStage(state, `harvesting_${pillar.replace(/\s+/g, '_').toLowerCase()}`);

const perplexityResult = await callPerplexity(query);
// callPerplexity pattern from researcher.md Stage 2 — sonar-pro, same request shape
```

Log:
```javascript
{
  step_name: "harvest_perplexity",
  stage: state.stage,
  output_summary: `Query: "${query}" → ${perplexityResult.content.slice(0, 200)}... Citations: ${perplexityResult.citations.length}`,
  model_version: "sonar-pro",
  status: "success"
}
```

On Perplexity error: log error, set `ideas_generated: 0` for this query_log entry, continue to next query. Do NOT abort the full harvest run.
```

- [ ] **Step 2: Write Step 6 — Brand Strategist**

```markdown
## Step 6: Brand Strategist (per query)

Feed Perplexity result as raw content to the Brand Strategist (from `strategist.md` Stage 1).
```javascript
// sourceType = "research"
// content = perplexityResult.content
// sourceUrl = null
```

Use the exact prompt from `strategist.md` Stage 1.

**E — Explicit Gate**:
```javascript
const briefValidation = validateBrief(strategistOutput);
if (!briefValidation.valid) {
  // Log error, mark ideas_generated: 0 for this slot, continue to next query
  await logError("brand_strategist", briefValidation.errors.join(", "));
  continue;
}
```

Log success:
```javascript
{
  step_name: "harvest_strategist",
  stage: state.stage,
  output_summary: `Topic: ${strategistOutput.topic} | Intent: ${strategistOutput.intent}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```
```

- [ ] **Step 3: Write Step 7 — Brand Scorer + threshold gate**

```markdown
## Step 7: Brand Scorer + Threshold Gate (per query)

Run Brand Scorer on the content brief (from `strategist.md` Stage 2).

**E — Explicit Gate**:
```javascript
const scoreValidation = validateCaptureScores(scorerOutput);
if (!scoreValidation.valid) {
  await logError("brand_scorer", scoreValidation.errors.join(", "));
  continue;
}
```

**Threshold check**:
```javascript
const SCORE_THRESHOLD = 7.0;
if (scorerOutput.score_overall < SCORE_THRESHOLD) {
  await logEntry({
    step_name: "harvest_threshold_reject",
    output_summary: `Below threshold: score_overall=${scorerOutput.score_overall} for "${strategistOutput.topic}"`,
    model_version: "n/a",
    status: "success"
  });
  // Record in query_log: ideas_generated: 0 for this slot
  continue; // Skip to next query — no Airtable write
}
```

Log scorer success:
```javascript
{
  step_name: "harvest_scorer",
  output_summary: `Score: ${scorerOutput.score_overall}/10 — PASSED threshold for "${strategistOutput.topic}"`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/harvest.md
git commit -m "feat: harvest — Perplexity + Strategist + Scorer per query pipeline"
```

---

### Task 7: Write harvest.md — Angle Extractor → UIF → Airtable write

- [ ] **Step 1: Write Step 8 — Angle Extractor + validateUIF**

```markdown
## Step 8: Angle Extractor + validateUIF (per query, above-threshold only)

Run the Angle Extractor (from `capture.md` Step 6.5 — same prompt, same model, same validation).

Input:
- `perplexityResult` (from Step 5)
- `contentBrief: strategistOutput` (from Step 6)
- `brand`

**E — Explicit Gate**:
```javascript
const uifValidation = validateUIF(shallowUIF);
if (!uifValidation.valid) {
  await logError("harvest_angle_extractor", `UIF validation: ${uifValidation.errors.join("; ")}`);
  continue;
}
```

Log:
```javascript
{
  step_name: "harvest_angle_extractor",
  output_summary: `${shallowUIF.angles.length} angles extracted for "${strategistOutput.topic}"`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```
```

- [ ] **Step 2: Write Step 9 — Airtable write**

```markdown
## Step 9: Write to Airtable (per query, above-threshold only)

Create the idea record using MCP. Field mapping is identical to `/capture` Step 7, with two differences:
- `source_type: "harvest"` (new value — typecast creates it)
- `raw_input`: the Perplexity query string (not user text)

```javascript
// MCP: mcp__claude_ai_Airtable__create_records_for_table
// baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk", typecast: true
{
  fields: {
    fldMtlpG32VKE0WkN: strategistOutput.working_title,    // Topic
    fld9frOZF4oaf3r6V: "New",                             // Status
    fldF8BxXjbUiHCWIa: strategistOutput.intent,           // intent
    fldBvV1FgpD1l2PG1: JSON.stringify(strategistOutput),  // content_brief
    fldeYByfFx9xjFnnK: scorerOutput.score_brand_fit,
    fldquN4wVbd6eLKYF: scorerOutput.score_originality,
    fldnFzMf3h6L7ez0l: scorerOutput.score_monetization,
    fldrYVICu2Tg71Jrk: scorerOutput.score_production_effort,
    fldvw93lwpYEqD5nX: scorerOutput.score_virality,
    fld1L6eEoqpP6uxbX: scorerOutput.score_authority,
    fldJatmYz453YGTyV: scorerOutput.score_overall,
    flddvjuABw1KBIf4K: JSON.stringify({
      brand_fit: scorerOutput.rationale_brand_fit,
      audience_relevance: scorerOutput.rationale_audience_relevance,
      originality: scorerOutput.rationale_originality,
      monetization: scorerOutput.rationale_monetization,
      production_effort: scorerOutput.rationale_production_effort,
      virality: scorerOutput.rationale_virality,
      authority: scorerOutput.rationale_authority
    }),
    fldgyi72BLytnCNPN: scorerOutput.recommended_next_action,
    fldQMArYmpP8s6VKb: JSON.stringify(shallowUIF),         // Intelligence File
    fldAwyDJrDdoyPmtR: "shallow",                          // research_depth
    fldBkIqNugXb4M5Fk: "harvest",                          // source_type
    fldrQ3CDTEDuIhEsy: query,                              // raw_input = the query
    fldoREHCHsCU6pXuE: state.workflowId,                   // workflow_id
    fldYU3CKk5HZAfrWo: new Date().toISOString()            // captured_at
  }
}
```

After successful write: increment `ideasWritten` counter for the harvest report. Record `ideas_generated: 1` in query_log for this slot.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/harvest.md
git commit -m "feat: harvest — Angle Extractor + UIF validation + Airtable write"
```

---

## Chunk 4: Pruning, memory update, report

### Task 8: Write harvest.md — prune stale harvest ideas

- [ ] **Step 1: Write Step 10 — pruning**

```markdown
## Step 10: Prune Stale Harvest Ideas

After all queries are processed, archive harvest-generated ideas that have sat at "New" for > 28 days.

### 10a. Identify stale ideas

From the harvested ideas already fetched in Step 2 (re-use that list, no new Airtable call needed):

```javascript
const STALE_DAYS = 28;
const staleIdeas = harvestedIdeas.filter(idea => {
  if (idea.fields["Status"] !== "New") return false;
  const capturedAt = idea.fields["captured_at"] ?? idea.fields["fldYU3CKk5HZAfrWo"];
  if (!capturedAt) return false;
  const ageMs = Date.now() - new Date(capturedAt).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
});
```

> **Cold start note**: On the first run (run_count = 0), `harvestedIdeas` will be empty (no harvest ideas exist yet). The prune loop runs over an empty array — this is correct, no special handling needed.

### 10b. Archive them

For each stale idea:
```javascript
// MCP: mcp__claude_ai_Airtable__update_records_for_table
// baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk", typecast: true
{
  id: idea.id,
  fields: {
    fld9frOZF4oaf3r6V: "Archived",          // Status — typecast creates this value
    fld5Q97Lwm8ZzHpAK: "harvest_prune: No activity after 28 days"  // selection_reason
  }
}
```

> `Status = "Archived"` is a new singleSelect value. `typecast: true` creates it automatically.

Log:
```javascript
{
  step_name: "harvest_prune",
  output_summary: `Archived ${staleIdeas.length} stale harvest ideas`,
  model_version: "n/a",
  status: "success"
}
```
```

---

### Task 9: Write harvest.md — memory update + harvest report

- [ ] **Step 1: Write Step 11 — update harvest-memory.json**

```markdown
## Step 11: Update Harvest Memory

After all writes and pruning are complete:

```javascript
updateStage(state, "updating_memory");

// Build new query_log entries for this run
const newEntries = queryPlan.map((slot, i) => ({
  query: generatedQueries[i],           // store the actual query string used
  pillar: slot.pillar,
  run_date: new Date().toISOString().slice(0, 10),  // YYYY-MM-DD
  ideas_generated: slotResults[i].ideas_generated,  // 0 or 1
  ideas_selected: 0  // always 0 at write time — updated at next run's Step 2
}));

// Note: ideas_selected is NEVER updated at write time.
// It is computed fresh at the start of each run by checking Status in Airtable (Step 2).
// The query_log is append-only for new entries; ideas_selected on old entries
// is NOT backfilled — selection rates are computed live from Airtable in Step 2.

const updatedMemory = {
  run_count: memory.run_count + 1,
  query_log: [...memory.query_log, ...newEntries]
};

// Write back to .claude/harvest-memory.json
// Use the Write tool to overwrite the file with JSON.stringify(updatedMemory, null, 2)
```
```

- [ ] **Step 2: Write Step 12 — harvest report**

```markdown
## Step 12: Harvest Report

Print to terminal:
```
🌾 Harvest complete — {new Date().toISOString().slice(0, 10)}

Run:             #{memory.run_count + 1} ({memory.run_count < 3 ? "cold start — equal weighting" : "weighted"})
Queries run:     {queryPlan.length}
Ideas written:   {ideasWritten}
Ideas pruned:    {staleIdeas.length}

Pillar coverage:
{pillarSummary}  ← one line per pillar: name + selection rate + query count

Topics avoided this run ({avoidedQueries.length}):
{avoidedQueries.length > 0 ? avoidedQueries.map(q => `  — "${q}"`).join('\n') : '  None'}

New ideas added:
{newIdeaLines}  ← one line per written idea: "[PILLAR-ABBREV] Topic (score: X.X)"
```

Pillar abbreviations for the report:
```javascript
const PILLAR_ABBREV = {
  "Production Failure Taxonomy": "PROD-FAIL",
  "STATE Framework Applied":     "STATE",
  "Defensive Architecture":      "DEF-ARCH",
  "The Meta Layer":              "META",
  "Regulated AI & Law 25":       "LAW25"
};
```
```

- [ ] **Step 3: Write the error path**

```markdown
## Error Path

```javascript
} catch (error) {
  await logEntry({
    step_name: "error",
    stage: state.stage,
    output_summary: `Error: ${error.message}`,
    model_version: "n/a",
    status: "error"
  });
  // Harvest has no lock to clear — each idea write is independent.
  // Partial runs are safe: ideas already written remain in Airtable.
  return formatError("/harvest", state.stage, error.message, false);
}
```

Note: `/harvest` has no single lock because there is no single expensive operation to guard — each idea goes through an independent sub-pipeline. Partial progress is inherently tolerant. Any successfully written idea survives a mid-run failure.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/commands/harvest.md
git commit -m "feat: harvest — pruning, memory update, harvest report, error path"
```

---

### Task 10: Final checks and push

- [ ] **Step 1: Verify harvest.md covers the full S+T+E checklist**

Run through the STATE S+T+E checklist from `brand/state-framework.md`:
- [ ] State object initialized with all required fields ← Step STATE Init
- [ ] Stage updated at each transition ← `updateStage()` called before each major step
- [ ] Every LLM call logged ← Harvest Query Generator, Strategist, Scorer, Angle Extractor logs
- [ ] Every Perplexity call logged ← Step 5 log
- [ ] Lock: Not applicable (no single long-lived lock) — document this explicitly in the command
- [ ] All LLM/API output validated before Airtable write ← `validateBrief`, `validateCaptureScores`, `validateUIF` gates
- [ ] Error path reports stage + error message ← `formatError` pattern

- [ ] **Step 2: Final commit**

```bash
git add .claude/commands/harvest.md .claude/harvest-memory.json
git commit -m "feat: add /harvest command — autonomous idea generation with STATE compliance"
```

- [ ] **Step 3: Push to branch**

```bash
git push -u origin claude/content-machine-architecture-C8EfB
```
