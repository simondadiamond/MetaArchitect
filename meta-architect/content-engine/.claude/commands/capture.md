# /capture — Idea Capture Command

Replaces the Telegram/n8n pipeline. Captures raw ideas, fetches external content (YouTube/blogs), refines them using the Brand Strategist, scores them using the Brand Scorer, and saves them to Airtable.

---

## Precondition

None. This is the top-of-funnel entry point.
Risk tier: medium → S + T + E required.

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
const ideaRecord = await createRecord(process.env.AIRTABLE_TABLE_IDEAS, {
  title: "Processing...",
  status: "processing",
  workflow_id: state.workflowId,
  source_type: sourceType,
  source_url: sourceUrl,
  raw_input: rawInput
});

state.entityId = ideaRecord.id;
```

### 4. Fetch Brand Context
```javascript
const brands = await getRecords(process.env.AIRTABLE_TABLE_BRAND, `{name} = "metaArchitect"`);
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
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
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
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
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

### 7. Final Airtable Write
```javascript
updateStage(state, "saving");
await patchRecord(process.env.AIRTABLE_TABLE_IDEAS, state.entityId, {
  title: strategistOutput.working_title,
  status: "pending_selection", // Replaces 'captured' for pipeline readiness
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
  captured_at: new Date().toISOString()
});
```

### 8. Report to Simon
```
✅ Idea captured!
   {working_title}
   Intent: {intent}
   Overall Score: {score_overall}/10
   Next step: {recommended_next_action}
```

---

## Error Path
```javascript
} catch (error) {
  // If we have an entityId, update the Airtable record to failed
  if (state.entityId) {
    await patchRecord(process.env.AIRTABLE_TABLE_IDEAS, state.entityId, {
      status: "processing_failed",
      recommended_next_action: `Failed at ${state.stage}: ${error.message}`
    });
  }

  // Always log the error
  await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
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
