# /harvest — Autonomous Idea Generation Command

Runs the full /capture sub-pipeline autonomously on Perplexity-sourced topics. No human input required.
Self-improves via pillar selection rates stored in `.claude/harvest-memory.json`.

---

## Precondition

None. This command can run any time.
Risk tier: medium → S + T + E required.

> **Airtable**: Use MCP tools directly. All table IDs and field IDs in `.claude/skills/airtable.md`. Always `typecast: true`.
> **No lock**: Harvest has no single long-lived lock. Each idea write is an independent sub-pipeline. Partial runs are inherently tolerant — ideas already written survive a mid-run failure.

---

## ⚠️ Session Integrity Rule (E — Explicit)

**Never write to Airtable using data that was not produced by pipeline steps running in the current session.**

Each slot carries a `session_verified: false` flag initialized at query generation time. It is set to `true` only when the Perplexity call returns a non-empty result in this session. The Airtable write gate (Step 10) MUST check this flag and abort the write if it is `false`.

```javascript
// Initialized per slot:
slotResults[i] = { session_verified: false, ideas_generated: 0 };

// Set only after live Perplexity call succeeds:
if (perplexityResult.content && perplexityResult.content.length > 0) {
  slotResults[i].session_verified = true;
}

// Write gate — Step 10:
if (!slotResults[slotIndex].session_verified) {
  await logEntry({
    step_name: "harvest_write_blocked",
    stage: state.stage,
    output_summary: `Write blocked: session_verified=false for slot ${slotIndex} — Perplexity result was not produced in this session. Possible context resumption without re-running pipeline.`,
    model_version: "n/a",
    status: "error"
  });
  slotResults[slotIndex].ideas_generated = 0;
  continue; // Never write fabricated data
}
```

**Why this exists:** When Claude resumes from a summarized/compacted context, it may have topic names in memory but not live pipeline outputs. Without this gate, it can silently write fabricated content_briefs, UIFs, and scores to Airtable — corrupting the ideas table with data that was never validated by the actual pipeline. This happened on 2026-03-17 (run hrv_20260317_c4d1). The 5 corrupted records were archived with `selection_reason: CORRUPTED`.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "harvest",
  entityId: state.workflowId  // no single entity — use workflowId as self-reference
});
```

---

## Step 1: Load Harvest Memory

Read `.claude/harvest-memory.json`. If the file is missing or malformed, initialize:

```javascript
const memory = { run_count: 0, query_log: [] };
```

This is the cold-start fallback — no crash, no prompt to user.

`query_log` entry shape (for reference):
```json
{
  "query": "the exact query string sent to Perplexity",
  "pillar": "one of the 5 content pillars",
  "run_date": "YYYY-MM-DD",
  "ideas_generated": 0
}
```

`ideas_generated` = 1 if this query produced an idea that passed the `score_overall >= 7.0` threshold and was written to Airtable; 0 otherwise.

---

## Step 2: Fetch Brand Context

```
mcp__claude_ai_Airtable__list_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblwfU5EpDgOKUF7f",
  fieldIds: ["fldsP8FwcTxJdkac8","fld9E3rY6tQfZDas6","fldMgky7tvS2Y877o","fld7N55IwEM8CQYW0","fldLYt1DMS1Fwd5Vy","fldIgCmPBohoEqet2","fldBtXwgSegiYP2pB"],
  filters: { operator: "=", operands: ["fldsP8FwcTxJdkac8", "metaArchitect"] }
)
→ brand = result.records[0]
```

If no brand record found, abort with:
```
❌ /harvest failed at init — Brand record 'metaArchitect' not found in Airtable
```

---

## Step 3: Compute Pillar Selection Rates

> Only runs when `memory.run_count >= 3`. Skip entirely if cold start — jump to Step 4.

### 3a. Fetch all harvest-generated ideas

Get choice ID for Status field first (singleSelect requires schema lookup for filtering):
```
mcp__claude_ai_Airtable__get_table_schema(
  appgvQDqiFZ3ESigA,
  [{ tableId: "tblVKVojZscMG6gDk", fieldIds: ["fld9frOZF4oaf3r6V"] }]
)
→ capture choice ID for "New" → selXXX
```

Then fetch all harvest ideas (source_type is singleLineText — no schema lookup needed):
```
mcp__claude_ai_Airtable__list_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblVKVojZscMG6gDk",
  fieldIds: [
    "fldMtlpG32VKE0WkN",   // Topic
    "fld9frOZF4oaf3r6V",   // Status
    "fldBkIqNugXb4M5Fk",   // source_type
    "fldQMArYmpP8s6VKb",   // Intelligence File
    "fldYU3CKk5HZAfrWo"    // captured_at
  ],
  filters: { operator: "=", operands: ["fldBkIqNugXb4M5Fk", "harvest"] }
)
→ harvestedIdeas = result.records
```

### 3b. Compute rates per pillar

```javascript
const PILLARS = [
  "Production Failure Taxonomy",
  "STATE Framework Applied",
  "Defensive Architecture",
  "The Meta Layer",
  "Regulated AI & Law 25"
];

const rates = {};
PILLARS.forEach(p => { rates[p] = { total: 0, selected: 0 }; });

for (const idea of harvestedIdeas) {
  const uif = JSON.parse(idea.fields["Intelligence File"] ?? "null");
  if (!uif?.angles?.[0]?.pillar_connection) continue;
  const pillar = PILLARS.find(p => uif.angles[0].pillar_connection.includes(p));
  if (!pillar) continue;
  rates[pillar].total++;
  if (idea.fields["Status"] !== "New") rates[pillar].selected++;
}

const selectionRates = {};
PILLARS.forEach(p => {
  selectionRates[p] = rates[p].total > 0
    ? rates[p].selected / rates[p].total
    : null;
});
```

---

## Step 4: Build Query Plan

### Constants

```javascript
const COLD_START_BUDGET = 5;
const WARM_BUDGET = 8;
const PILLAR_FLOOR = 1;
const SCORE_THRESHOLD = 7.0;
```

### Cold start (run_count < 3)

```javascript
let queryPlan; // array of { pillar: string }

if (memory.run_count < 3) {
  queryPlan = PILLARS.map(p => ({ pillar: p }));
} else {
  // Weighted allocation — use selection rate if available; default 0.5 for null
  const weights = PILLARS.map(p => ({
    pillar: p,
    weight: selectionRates[p] ?? 0.5
  }));
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  let slots = weights.map(w => ({
    pillar: w.pillar,
    slots: Math.max(PILLAR_FLOOR, Math.round((w.weight / totalWeight) * WARM_BUDGET))
  }));

  // Correct rounding drift — trim from highest-weight pillar, add to highest-weight
  const sorted = [...slots].sort((a, b) => (selectionRates[b.pillar] ?? 0.5) - (selectionRates[a.pillar] ?? 0.5));
  let allocated = slots.reduce((s, x) => s + x.slots, 0);
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

  queryPlan = [];
  slots.forEach(s => {
    for (let i = 0; i < s.slots; i++) queryPlan.push({ pillar: s.pillar });
  });
}
```

### Topic avoidance filter (v1 — keyword overlap)

```javascript
// Build avoidance list: queries with >= 2 runs that produced 0 ideas
const queryGroups = {};
memory.query_log.forEach(entry => {
  if (!queryGroups[entry.query]) queryGroups[entry.query] = { runs: 0, generated: 0 };
  queryGroups[entry.query].runs++;
  queryGroups[entry.query].generated += entry.ideas_generated;
});
const avoidedQueries = Object.entries(queryGroups)
  .filter(([, stats]) => stats.runs >= 2 && stats.generated === 0)
  .map(([query]) => query);

// Keyword overlap check (exact — no embeddings in v1)
const STOPWORDS = new Set(['the','a','an','and','or','in','of','for','to','with','is','are','on','at','by','that','this','how','using','use','your','their','its','from','into']);

function extractKeywords(q) {
  return q.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOPWORDS.has(w));
}

function isAvoided(candidateQuery) {
  const newKws = new Set(extractKeywords(candidateQuery));
  return avoidedQueries.some(avoided => {
    const overlap = extractKeywords(avoided).filter(k => newKws.has(k));
    return overlap.length >= 2;
  });
}
```

---

## Step 5: Generate Queries (Harvest Query Generator)

For each slot in `queryPlan`, generate TWO targeted Perplexity queries using claude-sonnet-4-6:
- **Q1 (facts/incidents)**: specific data, named failures, enforcement cases, survey findings
- **Q2 (contrarian angles)**: what practitioners get wrong, what the conventional wisdom misses, what a specific finding actually means vs. how it's being interpreted

Both queries are generated in a single LLM call per slot. Both go to Perplexity. Both feed the angle extractor (Step 9).

### Pillar descriptions (inline constant)

```javascript
const PILLAR_DESCRIPTIONS = {
  "Production Failure Taxonomy": "Naming and classifying LLM failure modes with precision. Focus on specific, reproducible failure patterns in production agent systems — context rot, silent truncation, lock starvation, hallucination cascades.",
  "STATE Framework Applied": "Demonstrations of STATE pillars (Structured, Traceable, Auditable, Tolerant, Explicit) in real architecture decisions. Before/after comparisons of stateless vs. stateful agent designs.",
  "Defensive Architecture": "Design patterns that make AI systems fault-tolerant by construction. Validation gates, lock patterns, idempotency, resumable workflows. The plumbing around the model.",
  "The Meta Layer": "How to use AI to do the work most people do manually — including figuring out what to ask the AI. The meta-skill is knowing what question to ask.",
  "Regulated AI & Law 25": "Quebec Law 25, OSFI, and EU AI Act as architecture requirements. Automated decision logging, explainability, personal data enumeration. Compliance that falls out of good state management."
};
```

### System prompt

```
You are the Harvest Query Generator for The Meta Architect content brand.

Brand: The Meta Architect — AI Reliability Engineering
Thesis: State Beats Intelligence
Brand guidelines: {brand.fields?.main_guidelines}
ICP: {brand.fields?.icp_short}

Current year: 2026. Target research from 2025 — the AI space moves fast, even the wrong month matters.

Generate TWO Perplexity search queries targeting the given content pillar.

## NAMED ENTITY REQUIREMENT (non-negotiable)

Every query MUST contain at least one named entity from this list:
- A specific tool by name: LangChain, LangGraph, LangSmith, LlamaIndex, LangFuse, Weights & Biases, Arize Phoenix, OpenTelemetry, Cleanlab, CrewAI, AutoGen, Semantic Kernel
- A specific organization or company by name: OpenAI, Anthropic, Cohere, Mistral, Hugging Face, AWS Bedrock, Azure OpenAI, Google Vertex AI — OR a named enterprise organization
- A specific named survey or report: Cleanlab State of AI in Production, McKinsey The State of AI, Stack Overflow Developer Survey, Gartner Magic Quadrant, OWASP LLM Top 10
- A specific regulation with article/section: OSFI B-13, Quebec Law 25 Article 12.1, EU AI Act Article 6, SOC 2 Type II

## WHAT GOOD LOOKS LIKE

**Bad (fails named entity requirement):**
- "LLM agent context window overflow silent truncation production failures 2025"
  → Returns: generic overview blog post, no specific data
- "enterprise GenAI stateful agent architecture migration case studies 2025"
  → Returns: "Enterprise organizations are adopting stateful agents..."
- "AI output validation failures production pipeline incident reports 2025"
  → Returns: OWASP list + abstract risks

**Good (has named entity + targets specific findable data):**
- "Cleanlab 2025 state of AI in production survey LLM agent reliability hallucination rates"
  → Returns: specific survey data with methodology and percentages
- "LangSmith LangFuse production debugging LLM agent tracing failure root cause practitioners 2025"
  → Returns: specific tool comparison with named failure scenarios
- "OSFI B-13 AI model governance examination findings financial institutions compliance gaps 2025"
  → Returns: named regulatory findings from specific institutions
- "LangChain LangGraph production failure agentic workflow lock starvation tool call errors 2025"
  → Returns: specific GitHub issues, named failure modes, practitioner reports

## SELF-CHECK (required before outputting)

For each query, ask: "If someone Googled this right now, would the first 3 results contain a specific named organization, a specific number or rate from a named source, or a specific named enforcement case?" If the answer is NO — rewrite the query.

## Q1 vs Q2 RULES

**Q1 (query_facts)**: Target specific incidents, survey data, enforcement cases, tool failure reports.
- Must name a specific tool, org, survey, or regulation
- Must target quantified data or named incident — not a trend overview

**Q2 (query_contrarian)**: Target what practitioners get wrong, what the conventional wisdom misses, why a commonly recommended approach fails in practice.
- Should be grounded in the same topic as Q1 but from the skeptical/failure angle
- Example: if Q1 is about Cleanlab survey data on LLM hallucination rates, Q2 might be "why RAG pipelines fail to reduce hallucination rates despite retrieval augmentation practitioners 2025"
- Must still name a specific tool, org, or approach — not just "why X is hard"

## OTHER RULES
- Each query must be 8–15 words
- MUST include a year anchor: "2025" or "2026"
- Must NOT be about: conceptual overviews, "what is X" topics, general AI trends, vendor marketing, beginner tutorials
- If avoid_topics is provided, do not produce queries with 2+ overlapping keywords from any listed topic

Output ONLY this JSON — no preamble:
{
  "query_facts": "string",
  "query_contrarian": "string",
  "rationale": "one sentence covering both queries"
}
```

### User prompt

```
Target pillar: {pillar}

Pillar description:
{PILLAR_DESCRIPTIONS[pillar]}

Current date: {new Date().toISOString().slice(0,10)}. Target 2025 data — recent, specific, practitioner-grade.

Avoid topics (these queries produced no ideas in 2+ runs — do not overlap with 2+ keywords):
{avoidedQueries.length > 0 ? avoidedQueries.join('\n') : 'None'}

Generate two queries (query_facts + query_contrarian). Both must name a specific tool, organization, survey, or regulation. Apply the self-check before outputting.
```

### Validation

```javascript
function validateHarvestQuery(output) {
  if (!output.query_facts || output.query_facts.trim() === "") return { valid: false, error: "query_facts is empty" };
  if (!output.query_contrarian || output.query_contrarian.trim() === "") return { valid: false, error: "query_contrarian is empty" };
  const wc1 = output.query_facts.trim().split(/\s+/).length;
  const wc2 = output.query_contrarian.trim().split(/\s+/).length;
  if (wc1 < 5) return { valid: false, error: `query_facts too short (${wc1} words)` };
  if (wc2 < 5) return { valid: false, error: `query_contrarian too short (${wc2} words)` };
  return { valid: true };
}
```

Store both as `generatedQueries[i] = { facts: output.query_facts, contrarian: output.query_contrarian }`.

### Avoidance check + one retry

After generating, run `isAvoided(output.query_facts)`. If avoided, regenerate once by appending to the user prompt:
```
REGENERATE — your previous query_facts ("{previous_query}") overlaps with an avoided topic. Generate a different angle on this pillar.
```

If still avoided after regeneration, use the regenerated queries anyway — avoidance is best-effort, not a hard block.

### Log the generator call

```javascript
{
  step_name: "harvest_query_generator",
  stage: state.stage,
  output_summary: `Pillar: ${pillar} → Facts: "${output.query_facts}" | Contrarian: "${output.query_contrarian}"`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```

---

## Step 6: Perplexity Calls (per query slot — 2 calls)

Run both queries sequentially. Both must succeed (non-empty content) for `session_verified` to be set to `true`.

```javascript
updateStage(state, `harvesting_${PILLAR_ABBREV[pillar].toLowerCase()}`);

const perplexityFacts = await callPerplexity(generatedQueries[slotIndex].facts);
const perplexityContrarian = await callPerplexity(generatedQueries[slotIndex].contrarian);
```

```javascript
// callPerplexity implementation
async function callPerplexity(query) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: query }]
    })
  });
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    citations: data.citations ?? []
  };
}
```

Set `session_verified = true` only if BOTH calls return non-empty content:
```javascript
if (perplexityFacts.content && perplexityFacts.content.length > 0 &&
    perplexityContrarian.content && perplexityContrarian.content.length > 0) {
  slotResults[slotIndex].session_verified = true;
}
```

Log each call:
```javascript
{
  step_name: "harvest_perplexity_facts",     // or "harvest_perplexity_contrarian"
  stage: state.stage,
  output_summary: `Query: "${query}" → ${result.content.slice(0, 200)}... Citations: ${result.citations.length}`,
  model_version: "sonar-pro",
  status: "success"
}
```

**On Perplexity error on either call**: log error entry, record `ideas_generated: 0` for this slot, continue to next query. Do NOT abort the full harvest run.

---

## Step 7: Brand Strategist (per query slot)

Feed both Perplexity results to the Brand Strategist (prompt from `strategist.md` Stage 1).

```javascript
// sourceType = "research"
// sourceUrl = null
// content = perplexityFacts.content + "\n\n---\n\n" + perplexityContrarian.content
```

Use the exact system prompt and user prompt from `strategist.md` Stage 1.

**Reject handling**: The strategist may return `{ "reject": true, "reason": "..." }` if the content is too generic (see strategist.md Stage 1). Check for this before running `validateBrief`:

```javascript
// Check for strategist rejection first
if (strategistOutput.reject === true) {
  await logEntry({
    step_name: "harvest_strategist",
    stage: state.stage,
    output_summary: `Content rejected by specificity gate: ${strategistOutput.reason}`,
    model_version: "claude-sonnet-4-6",
    status: "error"
  });
  slotResults[slotIndex].ideas_generated = 0;
  continue;
}
```

**E — Explicit Gate**:
```javascript
const briefValidation = validateBrief(strategistOutput);
if (!briefValidation.valid) {
  await logEntry({
    step_name: "harvest_strategist",
    stage: state.stage,
    output_summary: `Brief validation failed: ${briefValidation.errors.join(", ")}`,
    model_version: "claude-sonnet-4-6",
    status: "error"
  });
  slotResults[slotIndex].ideas_generated = 0;
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

---

## Step 8: Brand Scorer + Threshold Gate (per query slot)

Run Brand Scorer (prompt from `strategist.md` Stage 2).

**E — Explicit Gate**:
```javascript
const scoreValidation = validateCaptureScores(scorerOutput);
if (!scoreValidation.valid) {
  await logEntry({
    step_name: "harvest_scorer",
    stage: state.stage,
    output_summary: `Score validation failed: ${scoreValidation.errors.join(", ")}`,
    model_version: "claude-sonnet-4-6",
    status: "error"
  });
  slotResults[slotIndex].ideas_generated = 0;
  continue;
}
```

**Threshold check**:
```javascript
if (scorerOutput.score_overall < SCORE_THRESHOLD) {
  await logEntry({
    step_name: "harvest_threshold_reject",
    stage: state.stage,
    output_summary: `Below threshold: score_overall=${scorerOutput.score_overall} for "${strategistOutput.topic}" — discarded`,
    model_version: "n/a",
    status: "success"
  });
  slotResults[slotIndex].ideas_generated = 0;
  continue; // Skip to next query — no Airtable write
}
```

Log scorer success:
```javascript
{
  step_name: "harvest_scorer",
  stage: state.stage,
  output_summary: `Score: ${scorerOutput.score_overall}/10 — PASSED threshold for "${strategistOutput.topic}"`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```

---

## Step 9: Angle Extractor + validateUIF (per query slot, above-threshold only)

Run Angle Extractor (exact same prompt and model as `/capture` Step 6.5 — from `researcher.md` Angle Extractor section).

Input:
- `perplexityFacts` and `perplexityContrarian` (from Step 6 — both results)
- `contentBrief: strategistOutput` (from Step 7)
- `brand`

Pass both Perplexity results to the UIF Compiler user prompt as:
```
Q1 (Facts/Incidents): {perplexityFacts.content}
Q2 (Contrarian Angles): {perplexityContrarian.content}
```

(The UIF Compiler prompt in researcher.md accepts Q1/Q2/Q3 — harvest passes Q1 and Q2 only, leaving Q3 empty or omitted.)

**E — Explicit Gate**:
```javascript
const uifValidation = validateUIF(shallowUIF);
if (!uifValidation.valid) {
  await logEntry({
    step_name: "harvest_angle_extractor",
    stage: state.stage,
    output_summary: `UIF validation failed: ${uifValidation.errors.join("; ")}`,
    model_version: "claude-sonnet-4-6",
    status: "error"
  });
  slotResults[slotIndex].ideas_generated = 0;
  continue;
}
```

Log success:
```javascript
{
  step_name: "harvest_angle_extractor",
  stage: state.stage,
  output_summary: `${shallowUIF.angles.length} angles extracted for "${strategistOutput.topic}"`,
  model_version: "claude-sonnet-4-6",
  status: "success"
}
```

---

## Step 10: Write to Airtable (per query slot, above-threshold only)

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
    fldQMArYmpP8s6VKb: JSON.stringify(shallowUIF),         // Intelligence File (UIF)
    fldAwyDJrDdoyPmtR: "shallow",                          // research_depth
    fldBkIqNugXb4M5Fk: "harvest",                          // source_type — typecast creates value
    fldrQ3CDTEDuIhEsy: generatedQuery,                     // raw_input = the query string
    fldoREHCHsCU6pXuE: state.workflowId,                   // workflow_id
    fldYU3CKk5HZAfrWo: new Date().toISOString()            // captured_at
  }
}
```

After successful write:
- Increment `ideasWritten` counter
- Set `slotResults[slotIndex].ideas_generated = 1`
- Store `{ topic: strategistOutput.working_title, pillar, score: scorerOutput.score_overall }` in `newIdeaLines` for the report

---

## Step 11: Prune Stale Harvest Ideas

After all query slots are processed.

### 11a. Identify stale ideas

Re-use `harvestedIdeas` from Step 3 (no new Airtable call needed).

> **Cold start (run_count = 0)**: `harvestedIdeas` is empty — prune loop runs over an empty array. Correct, no special handling needed.

```javascript
const STALE_DAYS = 28;
const staleIdeas = harvestedIdeas.filter(idea => {
  if ((idea.fields["Status"] ?? "New") !== "New") return false;
  const capturedAt = idea.fields["captured_at"] ?? idea.fields[fldYU3CKk5HZAfrWo];
  if (!capturedAt) return false;
  const ageMs = Date.now() - new Date(capturedAt).getTime();
  return ageMs > STALE_DAYS * 24 * 60 * 60 * 1000;
});
```

### 11b. Archive stale ideas

For each stale idea (batch into groups of 10 for MCP call limit):
```javascript
// MCP: mcp__claude_ai_Airtable__update_records_for_table
// baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk", typecast: true
{
  id: idea.id,
  fields: {
    fld9frOZF4oaf3r6V: "Archived",                                  // Status — typecast creates value
    fld5Q97Lwm8ZzHpAK: "harvest_prune: No activity after 28 days"   // selection_reason
  }
}
```

> `Status = "Archived"` is a new singleSelect value. `typecast: true` creates it automatically. Pruned ideas are NOT deleted — their count still contributes to the denominator in selection rate computation (a pruned idea is a non-selected idea).

Log:
```javascript
{
  step_name: "harvest_prune",
  stage: "pruning",
  output_summary: `Archived ${staleIdeas.length} stale harvest ideas (28+ days at Status=New)`,
  model_version: "n/a",
  status: "success"
}
```

---

## Step 12: Update Harvest Memory

```javascript
updateStage(state, "updating_memory");

// Build new query_log entries for this run
// query_log stores the facts query as the primary key (used for avoidance overlap checks)
const newEntries = queryPlan.map((slot, i) => ({
  query: generatedQueries[i].facts,
  pillar: slot.pillar,
  run_date: new Date().toISOString().slice(0, 10),
  ideas_generated: slotResults[i].ideas_generated
}));

// Note: ideas_selected is NOT tracked in query_log.
// Selection rates are computed live from Airtable at Step 3 of each run.
// The query_log is append-only — never backfill old entries.

const updatedMemory = {
  run_count: memory.run_count + 1,
  query_log: [...memory.query_log, ...newEntries]
};

// Write back to .claude/harvest-memory.json using the Write tool
// JSON.stringify(updatedMemory, null, 2)
```

---

## Step 13: Harvest Report

```javascript
const PILLAR_ABBREV = {
  "Production Failure Taxonomy": "PROD-FAIL",
  "STATE Framework Applied":     "STATE",
  "Defensive Architecture":      "DEF-ARCH",
  "The Meta Layer":              "META",
  "Regulated AI & Law 25":       "LAW25"
};

// Pillar summary lines
const pillarSummary = PILLARS.map(p => {
  const rate = selectionRates?.[p];
  const rateStr = rate !== null && rate !== undefined
    ? `${Math.round(rate * 100)}% selection`
    : "no data yet";
  const queryCount = queryPlan.filter(s => s.pillar === p).length;
  return `  ${p.padEnd(35)} ${rateStr.padEnd(18)} → ${queryCount} quer${queryCount === 1 ? 'y' : 'ies'}`;
}).join('\n');

// New ideas lines
const newIdeasStr = newIdeaLines.length > 0
  ? newIdeaLines.map(l => `  → [${PILLAR_ABBREV[l.pillar]}] ${l.topic} (score: ${l.score.toFixed(1)})`).join('\n')
  : '  None — all queries below threshold or errored';

console.log(`
🌾 Harvest complete — ${new Date().toISOString().slice(0, 10)}

Run:             #${updatedMemory.run_count} (${memory.run_count < 3 ? 'cold start — equal weighting' : 'weighted by selection rate'})
Queries run:     ${queryPlan.length}
Ideas written:   ${ideasWritten}
Ideas pruned:    ${staleIdeas.length}

Pillar coverage:
${pillarSummary}

Topics avoided this run (${avoidedQueries.length}):
${avoidedQueries.length > 0 ? avoidedQueries.map(q => `  — "${q}"`).join('\n') : '  None'}

New ideas added:
${newIdeasStr}
`);
```

---

## Error Path

```javascript
} catch (error) {
  await mcp_create_log_entry({
    workflow_id: state.workflowId,
    entity_id: state.workflowId,
    step_name: "error",
    stage: state.stage,
    timestamp: new Date().toISOString(),
    output_summary: `Error: ${error.message}`,
    model_version: "n/a",
    status: "error"
  });
  // No lock to clear — harvest has no single long-lived lock.
  // Ideas already written to Airtable remain. Partial progress is preserved.
  return `❌ /harvest failed at ${state.stage} — ${error.message}`;
}
```

---

## S+T+E Checklist

Before marking this run complete, verify:
- [x] State object initialized (`buildStateObject` at start)
- [x] Stage updated at each transition (`updateStage` before each major step)
- [x] Every LLM call logged (Query Generator, Strategist, Scorer, Angle Extractor)
- [x] Every Perplexity call logged (Step 6)
- [x] Lock: Not applicable — no single long-lived lock; each idea is independent
- [x] All LLM/API output validated before Airtable write (`validateBrief`, `validateCaptureScores`, `validateUIF`)
- [x] Error path reports stage + error message
