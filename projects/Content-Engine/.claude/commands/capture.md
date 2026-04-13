# /capture — Idea Capture Command

Replaces the Telegram/n8n pipeline. Captures raw ideas, fetches external content (YouTube/blogs), refines them using the Brand Strategist, scores them using the Brand Scorer, and saves them to Airtable.

---

## Precondition

None. This is the top-of-funnel entry point.
Risk tier: medium → S + T + E required.

> **Airtable**: Use MCP tools directly — no node scripts. All table IDs and field IDs are in `.claude/skills/airtable.md`. Always `typecast: true` on any create or update call.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "idea",
  entityId: null // set after Draft Record creation
});
```

---

## Steps

### 1. Collect Input
```javascript
const fs = require('fs');
const path = require('path');
let rawInput = "";
const inputPath = path.join(process.cwd(), '.capture_input');

if (fs.existsSync(inputPath)) {
  rawInput = fs.readFileSync(inputPath, 'utf8').trim();
  fs.unlinkSync(inputPath); // Consume the file so it isn't reused
} else {
  // Fall back to the Claude Code prompt loop
  rawInput = await prompt("Idea: ");
}

if (!rawInput || rawInput.trim() === "") return "Input cannot be empty.";
```

### 2. Detect Source & Fetch Content
```javascript
updateStage(state, "fetching");
const ytRe = /(?:youtube\.com\/watch|youtu\.be\/)/i;
const urlRe = /^https?:\/\//i;

let sourceType, sourceUrl = null, content = "";

if (ytRe.test(rawInput)) {
  sourceType = "youtube";
  sourceUrl = rawInput.trim();
  console.log("Fetching YouTube transcript...");
  content = await fetchYoutube(sourceUrl); // from fetcher.md
} else if (urlRe.test(rawInput)) {
  sourceType = "blog";
  sourceUrl = rawInput.trim();
  console.log("Fetching Blog content...");
  content = await fetchBlog(sourceUrl); // from fetcher.md
} else {
  sourceType = "text";
  content = rawInput.trim();
}
```

### 3. Create Draft Record (Tolerant Pillar)
Create the record *before* the expensive LLM calls so we have an entityId to log against.
```javascript
updateStage(state, "creating_draft");
// MCP: mcp__claude_ai_Airtable__create_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk", typecast: true
//   fields: { Topic: "Processing...", Status: "New", workflow_id, source_type, raw_input }
//   field IDs: fldMtlpG32VKE0WkN (Topic), fld9frOZF4oaf3r6V (Status),
//              fldoREHCHsCU6pXuE (workflow_id), fldBkIqNugXb4M5Fk (source_type),
//              fld7FkHIuCaZ47SyA (Source/url), fldrQ3CDTEDuIhEsy (raw_input)
const ideaRecord = // result.records[0]

state.entityId = ideaRecord.id;
```

### 4. Brand Context
Brand context is already available in CLAUDE.md (brand-summary.md) and the command system prompt —
no Airtable fetch needed. Use the inline brand context directly in Steps 5 and 6.

> **Why skipped**: The Airtable brand record (~3,500 tokens) duplicates what's already in the
> conversation context via CLAUDE.md. Fetching it adds latency and token cost with no quality gain.
> Only restore this fetch if brand fields in Airtable have diverged from CLAUDE.md and a sync hasn't happened.

```javascript
// No fetch required. Brand context = CLAUDE.md brand-summary.md (already in context).
// Steps 5 and 6 use this directly. Remove `brand.fields?.main_guidelines` references
// from scorer prompt — substitute the inline brand guidelines from CLAUDE.md instead.
```

### 5. Brand Strategist (Refinement)
```javascript
updateStage(state, "strategist");
// Call claude-sonnet-4-6 with the prompt below.
// Input: content, sourceType, brand
// IMPORTANT: validateBrief(output) must pass before proceeding.
```

**System prompt:**
```
You are the Brand Strategist for The Meta Architect, Simon Paris's AI reliability engineering brand.

Brand thesis: State Beats Intelligence. Production AI fails from architecture failures — missing state,
no checkpoints, no observability — not model weakness.
Category: AI Reliability Engineering. Never "AI automation" or "prompt engineering."
ICP: LLMOps engineers and GenAI platform leads at regulated enterprises. 7–15 years in software.
Owns a pilot that worked in demos and is now breaking in production.

Voice: practitioner-to-practitioner. Diagnostic, not inspirational.
Never: "excited to share", "game-changing", "revolutionary", "in the age of AI".

Content pillars:
- Production Failure Taxonomy
- STATE Framework Applied
- Defensive Architecture
- The Meta Layer
- Regulated AI & Law 25

Spine check: output must implicitly or explicitly connect to "State Beats Intelligence."
```

**User prompt:**
```
Raw input: {content}
Source type: {sourceType}

Analyze this input and produce a content brief as JSON with exactly these fields:
{
  "working_title": string,         // punchy, under 8 words
  "topic": string,                 // 1-sentence topic framing
  "core_angle": string,            // the non-obvious practitioner insight
  "intent": "authority" | "education" | "community" | "virality",
  "pillar_connection": string,     // one of the 5 pillars exactly as written above
  "icp_pain": string,              // which ICP frustration this hits (1-2 words)
  "hook_idea": string,             // 1-line hook concept (not final copy)
  "thesis_tie": string,            // how this lands on State Beats Intelligence
  "single_lesson": string,         // the one architectural takeaway
  "contrarian_claim": string       // the claim that flips conventional wisdom
}

Output JSON only. No preamble.
```

**validateBrief checks:** all 10 fields present and non-empty, `intent` is one of the 4 allowed values, `pillar_connection` is one of the 5 exact pillar names.
**E — Explicit Gate**: 
```javascript
const briefValidation = validateBrief(strategistOutput);
if (!briefValidation.valid) throw new Error(`Brief Validation Failed: ${briefValidation.errors.join(", ")}`);
```
Log success:
```javascript
// MCP: mcp__claude_ai_Airtable__create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: state.entityId,
  step_name: "brand_strategist",
  stage: "refined",
  timestamp: new Date().toISOString(),
  output_summary: `Strategist complete. Topic: ${strategistOutput.topic}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
});
```

### 6. Brand Scorer (Evaluation)
```javascript
updateStage(state, "scorer");
// Call claude-sonnet-4-6 with the prompt below.
// Input: strategistOutput (content_brief), brand
// IMPORTANT: validateCaptureScores(output) must pass before proceeding.
```

**System prompt:**
```
You are the Brand Scorer for The Meta Architect. Score content ideas for their value to a solo
AI reliability engineering brand targeting enterprise LLMOps practitioners.

Scoring dimensions:
- brand_fit: alignment with STATE thesis and AI Reliability Engineering category
- originality: says something the ICP hasn't read 10 times already
- monetization: moves someone toward Beta Cohort ($700–900 CAD) or consulting engagement
- production_effort: how much work to produce (1=trivial, 10=very heavy lift)
- virality: would practitioners share or repost this
- authority: builds Simon's credibility as the AI reliability engineering practitioner
- audience_relevance: ICP (paged at 2am, non-deterministic failures, no observability) finds this immediately recognizable
```

**User prompt:**
```
Content brief: {JSON.stringify(contentBrief)}

Score this idea. Output JSON only:
{
  "score_brand_fit": number,           // 1–10
  "score_originality": number,         // 1–10
  "score_monetization": number,        // 1–10
  "score_production_effort": number,   // 1–10
  "score_virality": number,            // 1–10
  "score_authority": number,           // 1–10
  "score_overall": number,             // 1–10 weighted average
  "score_audience_relevance": number,  // 1–10 — computed only, NEVER written to Airtable
  "rationale_brand_fit": string,
  "rationale_audience_relevance": string,
  "rationale_originality": string,
  "rationale_monetization": string,
  "rationale_production_effort": string,
  "rationale_virality": string,
  "rationale_authority": string,
  "recommended_next_action": string    // 1–2 sentences: when to schedule, what to pair with
}
```

**validateCaptureScores checks:** all score fields present and numeric 1–10, all rationale fields non-empty, `recommended_next_action` present.
**E — Explicit Gate**:
```javascript
const scoreValidation = validateCaptureScores(scorerOutput);
if (!scoreValidation.valid) throw new Error(`Score Validation Failed: ${scoreValidation.errors.join(", ")}`);
```
Log success:
```javascript
// MCP: mcp__claude_ai_Airtable__create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: state.entityId,
  step_name: "brand_scorer",
  stage: "scored",
  timestamp: new Date().toISOString(),
  output_summary: `Scorer complete. Overall: ${scorerOutput.score_overall}/10`,
  model_version: "claude-sonnet-4-6",
  status: "success"
});
```

### 6.5. Deep Research (NotebookLM)

Runs immediately after scoring. Uses NLM deep mode (~40 sources) on a broad topic query — no angle is assigned yet, so the query covers the full topic landscape. The notebook_id is stored for reuse by `/research` (fast targeted query instead of a second full crawl).

```javascript
updateStage(state, "deep_research");

// 1. Build research query — broad topic overview (angle targeting happens in /research)
const currentYear = new Date().getFullYear();
const researchQuery = `${strategistOutput.topic} — ${strategistOutput.core_angle} — ${currentYear}`;

// Year-anchor gate
if (!researchQuery.includes(String(currentYear))) {
  throw new Error(`/capture deep research aborted: query missing ${currentYear} year anchor. Query: "${researchQuery}"`);
}

// 2a. Start NLM deep research (~5 min, ~40 sources)
// MCP: mcp__notebooklm-mcp__research_start
//   query: researchQuery, source: "web", mode: "deep"
//   title: `Research: ${strategistOutput.topic} — ${new Date().toISOString().slice(0,10)}`
// Returns: { task_id, notebook_id }
const { task_id, notebook_id } = // research_start result

// Log start
await createRecord(LOGS, {
  workflow_id: state.workflowId, entity_id: state.entityId,
  step_name: "nlm_research_start", stage: "deep_research",
  timestamp: new Date().toISOString(),
  output_summary: `NLM research started. notebook_id: ${notebook_id}. query: "${researchQuery}"`,
  model_version: "notebooklm-deep", status: "success"
});

// 2b. Poll until complete (max 6 min)
// MCP: mcp__notebooklm-mcp__research_status
//   notebook_id, task_id, poll_interval: 30, max_wait: 360, compact: true
//   NOTE: compact:true — we only need status + sources_found. The report text is never used;
//   all content extraction happens via notebook_query below. Saves ~7,500 tokens per run.
const researchResult = // research_status result
if (researchResult.status !== "completed") {
  throw new Error(`NLM research did not complete in time. Status: ${researchResult.status}`);
}

// 2c. Import top 20 web sources (skip index 0 = deep_report, internal to notebook)
// MCP: mcp__notebooklm-mcp__research_import
//   notebook_id, task_id, source_indices: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
const importResult = // research_import result

await createRecord(LOGS, {
  workflow_id: state.workflowId, entity_id: state.entityId,
  step_name: "nlm_research_import", stage: "deep_research",
  timestamp: new Date().toISOString(),
  output_summary: `NLM import complete. ${importResult.imported_count} sources. Sources found: ${researchResult.sources_found}`,
  model_version: "notebooklm-deep", status: "success"
});

// 2d. Query notebook — extract grounded angles across the full topic
// MCP: mcp__notebooklm-mcp__notebook_query
//   notebook_id
//   query: <angle extractor prompt below>
const nlmQueryResult = // notebook_query result
if (!nlmQueryResult.answer) throw new Error("NLM notebook_query returned empty answer");

await createRecord(LOGS, {
  workflow_id: state.workflowId, entity_id: state.entityId,
  step_name: "nlm_angle_query", stage: "deep_research",
  timestamp: new Date().toISOString(),
  output_summary: `NLM query complete. conversation_id: ${nlmQueryResult.conversation_id}. Sources used: ${nlmQueryResult.sources_used?.length ?? 0}`,
  model_version: "notebooklm-deep", status: "success"
});
```

**Angle extractor query** (pass as `query` to `notebook_query`):
```
You are the Angle Extractor for The Meta Architect brand (AI Reliability Engineering, "State Beats Intelligence" thesis).

ICP context: The practitioner reading this post has been paged at 2am because an LLM hallucinated.
Their reality: non-deterministic outputs they can't reproduce, no stack trace,
no observability, compliance asking "can we log why the agent did this?",
leadership demanding GenAI yesterday.
Their language: "debugging is a game of chance" / "clever demo duct-taped into
production" / "it's not about the model — it's about the plumbing" /
"prompt whack-a-mole" / "there's no stack trace."
Their goal: stop betting their job on vibes. Get a proper architecture for
stateful, auditable LLM systems.

Topic: {strategistOutput.topic}
Core angle: {strategistOutput.core_angle}

Extract 5–8 grounded facts from the sources, then generate 4–5 practitioner-grade content angles.

For each FACT:
- statement: the specific claim
- grounding_quote: exact sentence from a source (not a paraphrase)
- source_url: URL
- source_tier: "tier1"|"tier2"|"tier3"|"tier4"
- verified: true if methodology traceable at source URL, false otherwise

For each ANGLE:
- angle_name: short descriptor
- contrarian_take: the non-obvious practitioner insight
- pillar_connection: one of "Production Failure Taxonomy" | "STATE Framework Applied" | "Defensive Architecture" | "The Meta Layer" | "Regulated AI & Law 25"
- brand_specific_angle: true only if this angle depends on Simon's specific positioning or STATE framework

Self-check per angle (cut any that fail):
✓ Can you quote a specific sentence from a source that directly supports this? If not → cut it.
✓ Does the contrarian_take name a specific mechanism, failure mode, or production reality?
✓ Would this practitioner read it and think "yes, exactly — that's the thing nobody says"?
✗ Restatements of the topic title → cut
✗ Generic LLMOps 101 observations → cut
✗ No connection to state, observability, compliance, or architectural control → cut

Aim for diversity: diagnostic/teardown, framework/architecture, resonance/story, contrarian, tactical, regulatory.
At least 1 angle must have brand_specific_angle=true.
Stop at 4 angles if the source cannot support a strong 5th — quality over quota.

Output JSON only:
{
  "facts": [...],
  "angles": [...]
}
```

**3. Call Claude — build full UIF from NLM answer**
```javascript
// Input: nlmQueryResult.answer + strategistOutput + brand
// Use the UIF Compiler prompt from researcher.md (Stage 3)
// Output: deepUIF (full UIF v3.0 object)
const deepUIF = await compileUIF({ nlmAnswer: nlmQueryResult.answer, contentBrief: strategistOutput, brand });
```

**E — Explicit Gate**:
```javascript
const uifValidation = validateUIF(deepUIF);
if (!uifValidation.valid) throw new Error(`UIF validation: ${uifValidation.errors.join("; ")}`);
```

Log Claude call:
```javascript
await createRecord(LOGS, {
  workflow_id: state.workflowId, entity_id: state.entityId,
  step_name: "uif_compiler", stage: "deep_research",
  timestamp: new Date().toISOString(),
  output_summary: `UIF compiled. ${deepUIF.angles.length} angles, ${deepUIF.core_knowledge.facts.length} facts.`,
  model_version: "claude-sonnet-4-6", status: "success"
});
```

### 7. Final Airtable Write
```javascript
updateStage(state, "saving");
// MCP: mcp__claude_ai_Airtable__update_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk", typecast: true
//   records: [{ id: state.entityId, fields: { ... } }]
//   Use field IDs from airtable.md (Intelligence File = fldQMArYmpP8s6VKb, etc.)
await patchRecord(IDEAS, state.entityId, {
  Topic: strategistOutput.working_title,
  Status: "New",
  intent: strategistOutput.intent,
  content_brief: JSON.stringify(strategistOutput),
  score_brand_fit: scorerOutput.score_brand_fit,
  score_originality: scorerOutput.score_originality,
  score_monetization: scorerOutput.score_monetization,
  score_production_effort: scorerOutput.score_production_effort,
  score_virality: scorerOutput.score_virality,
  score_authority: scorerOutput.score_authority,
  score_overall: scorerOutput.score_overall,
  score_rationales: JSON.stringify({
    brand_fit: scorerOutput.rationale_brand_fit,
    audience_relevance: scorerOutput.rationale_audience_relevance,
    originality: scorerOutput.rationale_originality,
    monetization: scorerOutput.rationale_monetization,
    production_effort: scorerOutput.rationale_production_effort,
    virality: scorerOutput.rationale_virality,
    authority: scorerOutput.rationale_authority
  }),
  recommended_next_action: scorerOutput.recommended_next_action,
  // TODO: score_audience_relevance is computed by the Brand Scorer (scorerOutput.score_audience_relevance)
  // but never written to Airtable — it's buried in score_rationales JSON and invisible to the planner.
  // Either: (a) add a dedicated number field "score_audience_relevance" to ideas and write it here,
  // or (b) remove it from the scorer prompt entirely to reduce noise. Decision pending.
  "Intelligence File": JSON.stringify(deepUIF),
  notebook_id: notebook_id,             // fld6IEXqxWqwZtHow — reused by /research for fast targeted query
  research_depth: "deep",
  captured_at: new Date().toISOString()
});
```

### 8. Report to Simon
```
✅ Idea captured!
   {working_title}
   Intent: {intent}
   Overall Score: {score_overall}/10
   Angles: {deepUIF.angles.length} generated | Facts: {deepUIF.core_knowledge.facts.length} grounded
   Notebook: {notebook_id}
   Next step: {recommended_next_action}
```

---

## Error Path
```javascript
} catch (error) {
  // If we have an entityId, update the Airtable record to failed
  if (state.entityId) {
    // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblVKVojZscMG6gDk, typecast: true)
    await patchRecord(IDEAS, state.entityId, {
      status: "processing_failed",
      recommended_next_action: `Failed at ${state.stage}: ${error.message}`
    });
  }

  // Always log the error
  // MCP: mcp__claude_ai_Airtable__create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
    workflow_id: state.workflowId,
    entity_id: state.entityId || "none",
    step_name: "error",
    stage: state.stage,
    timestamp: new Date().toISOString(),
    output_summary: `Error: ${error.message}`,
    model_version: "n/a",
    status: "error"
  });

  return formatError("/capture", state.stage, error.message, false);
}
```
