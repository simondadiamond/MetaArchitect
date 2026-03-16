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

### 4. Fetch Brand Context
```javascript
// MCP: mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblwfU5EpDgOKUF7f"
//   fieldIds: all brand fields (fldsP8FwcTxJdkac8 through fldBtXwgSegiYP2pB)
//   filters: { operator: "=", operands: ["fldsP8FwcTxJdkac8", "metaArchitect"] }
const brands = // result.records
const brand = brands.length > 0 ? brands[0] : null;
if (!brand) throw new Error("Brand record 'metaArchitect' not found in Airtable");
```

### 5. Brand Strategist (Refinement)
```javascript
updateStage(state, "strategist");
// Call claude-sonnet-4-6 with the Brand Strategist prompt (from strategist.md).
// Provide `content`, `sourceType`, `sourceUrl`, and `brand`.
// IMPORTANT: validateBrief(output) must pass before proceeding.
```
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
// Call claude-sonnet-4-6 with the Brand Scorer prompt (from strategist.md).
// Provide `strategistOutput` (the content_brief) and `brand`.
// IMPORTANT: validateCaptureScores(output) must pass before proceeding.
```
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

### 6.5. Shallow Research

Runs immediately after scoring to produce angles for the planner. No new lock needed — the draft record exists and no other expensive operation is in flight.

```javascript
updateStage(state, "shallow_research");

// 1. Build overview query from content_brief fields
const overviewQuery = `${strategistOutput.topic} — ${strategistOutput.core_angle}`;

// 2. Call Perplexity (sonar-pro) — 1 query, broad landscape overview
const perplexityResult = await callPerplexity(overviewQuery);

// Log Perplexity call
// MCP: mcp__claude_ai_Airtable__create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: state.entityId,
  step_name: "shallow_research_perplexity",
  stage: "shallow_research",
  timestamp: new Date().toISOString(),
  output_summary: `Shallow research query: "${overviewQuery}"`,
  model_version: "sonar-pro",
  status: "success"
});

// 3. Call Claude (claude-sonnet-4-6) — Angle Extractor prompt (see researcher.md)
//    Input: perplexityResult + strategistOutput (content_brief) + brand
//    Output: shallow UIF — meta, core_knowledge.facts (2–5 from citations),
//            angles[] (4–5 angles, each with angle_name, contrarian_take,
//            pillar_connection, brand_specific_angle, supporting_facts: []),
//            humanity_snippets: []
//    Instruction to model:
//      "Do not invent facts. Only extract what Perplexity returned.
//      Generate 4–5 highly specific, practitioner-grade angles. Do NOT pad
//      with weak filler angles to hit the quota — quality and specificity
//      matter more than count. Stop at 4 if the source cannot support a 5th
//      strong angle.
//      Aim for diversity across these categories when the source material
//      supports it:
//        - diagnostic / teardown (what breaks and why)
//        - framework / architecture (how to fix it)
//        - resonance / story (lived failure moment)
//        - contrarian (what everyone gets wrong)
//        - tactical (specific checklist or technique)
//        - regulated / governance implication (Law 25, OSFI, auditability)
//        - trend / product / prediction (only if the source material genuinely
//          supports a practitioner-level operator opinion — reveals mechanism,
//          tradeoff, or production reality; not a generic trend summary)
//      Do not force every category — use only those the source material
//      genuinely supports. At least 1 angle must have brand_specific_angle=true.
//      Angles represent reusable intellectual territory that may support multiple
//      posts across multiple weeks — generate them with that durability in mind."
const shallowUIF = await extractAngles({ perplexityResult, contentBrief: strategistOutput, brand });
```

**E — Explicit Gate**:
```javascript
const uifValidation = validateUIF(shallowUIF);
if (!uifValidation.valid) throw new Error(`Shallow UIF validation: ${uifValidation.errors.join("; ")}`);
```

Log Claude call:
```javascript
// MCP: mcp__claude_ai_Airtable__create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: state.entityId,
  step_name: "angle_extractor",
  stage: "shallow_research",
  timestamp: new Date().toISOString(),
  output_summary: `Angle extraction complete. ${shallowUIF.angles.length} angles generated.`,
  model_version: "claude-sonnet-4-6",
  status: "success"
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
  "Intelligence File": JSON.stringify(shallowUIF),
  research_depth: "shallow",
  captured_at: new Date().toISOString()
});
```

### 8. Report to Simon
```
✅ Idea captured!
   {working_title}
   Intent: {intent}
   Overall Score: {score_overall}/10
   Angles: {shallowUIF.angles.length} generated
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
