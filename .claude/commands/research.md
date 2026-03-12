# /research — Deep Research Command

Deepen research on a planned post stub: target the assigned angle, run 2 Perplexity queries, merge results into the idea's UIF, mark the post stub `research_ready`.

---

## Precondition

Post stub `status = "planned"` AND `research_started_at` is empty.

Default (no argument): oldest planned post stub by `planned_week` asc, `planned_order` asc.
With argument: `/research [post_stub_id]` — research a specific post stub.

Risk tier: medium → S + T + E required.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "post",
  entityId: postStub.id
});
// state.workflowId is the ID used for all log entries in this run
```

---

## Steps

### 1. Find brand context
```javascript
const brands = await getRecords(process.env.AIRTABLE_TABLE_BRAND, `{name} = "metaArchitect"`);
const brand = brands.length > 0 ? brands[0] : null;
if (!brand) throw new Error("Brand record 'metaArchitect' not found in Airtable (AIRTABLE_TABLE_BRAND)");
```

### 2. Find target post stub
```javascript
const posts = await getRecords(
  TABLES.POSTS,
  `AND({status} = "planned", {research_started_at} = "")`,
  [{ field: "planned_week", direction: "asc" }, { field: "planned_order", direction: "asc" }]
);
if (posts.length === 0) {
  return "No post stubs with status = planned and research_started_at empty. Run /editorial-planner first.";
}
const postStub = posts[0];
const ideaId = postStub.fields?.idea_id?.[0];
const angleIndex = postStub.fields?.angle_index ?? 0;

if (!ideaId) throw new Error("Post stub is missing idea_id — check Airtable data");
```

### 3. Load idea + UIF
```javascript
const idea = await getRecord(TABLES.IDEAS, ideaId);
if (!idea) throw new Error(`Idea ${ideaId} not found`);

const contentBrief = idea.fields?.content_brief
  ? JSON.parse(idea.fields.content_brief)
  : null;
if (!contentBrief) throw new Error("content_brief is null or unparseable");

const existingUIF = idea.fields?.["Intelligence File"]
  ? JSON.parse(idea.fields["Intelligence File"])
  : null;
if (!existingUIF) throw new Error("Intelligence File is null — run /capture first to generate shallow UIF");

const targetAngle = existingUIF.angles?.[angleIndex];
if (!targetAngle) throw new Error(`angle_index ${angleIndex} not found in UIF (${existingUIF.angles?.length ?? 0} angles)`);
```

### 4. Lock on post stub — BEFORE any API call
```javascript
updateStage(state, "locking");
await patchRecord(TABLES.POSTS, postStub.id, {
  research_started_at: new Date().toISOString(),
  status: "researching"
});
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: postStub.id,
  step_name: "lock",
  stage: "locking",
  timestamp: new Date().toISOString(),
  output_summary: `Research locked for post stub ${postStub.id} — angle_index ${angleIndex}: "${targetAngle.angle_name}"`,
  model_version: "n/a",
  status: "success"
});
```

### 5. Research Architect — generate 2 targeted queries
```javascript
updateStage(state, "research_architect");
// Call claude-sonnet-4-6 with Research Architect prompt (see researcher.md).
// Input: brand, contentBrief, targetAngle (the specific angle object), existingUIF.core_knowledge.facts
// Task: generate exactly 2 Perplexity queries that deepen THIS angle's contrarian_take
//       and pillar_connection. Do not generate broad overview queries — the shallow
//       research already covered that. Target depth, not breadth.
// Validate: validateResearchPlan(output) must pass before proceeding.
// Log result (step_name: "research_architect")
```

**E — Explicit gate**: If `validateResearchPlan` returns false → throw error (goes to error path).

### 6. Execute 2 Perplexity calls (sequential)
```javascript
updateStage(state, "perplexity_q1");
const q1 = await callPerplexity(queries[0].query);
// Log Q1 (step_name: "perplexity_q1")

updateStage(state, "perplexity_q2");
const q2 = await callPerplexity(queries[1].query);
// Log Q2 (step_name: "perplexity_q2")
```

### 7. UIF Merger — deepen target angle only
```javascript
updateStage(state, "uif_merger");
// Call claude-sonnet-4-6 with UIF Merger prompt (see researcher.md).
// Input: existingUIF, angleIndex, q1 + q2 results
// Task: merge new facts from q1/q2 into existingUIF.core_knowledge.facts (append, no duplicates),
//       update existingUIF.angles[angleIndex].supporting_facts with indices of newly added facts,
//       do not modify any other angle.
// Output: updatedUIF (full UIF object with the single angle deepened)
// Log result (step_name: "uif_merger")
```

### 8. Validate updated UIF
```javascript
const uifResult = validateUIF(updatedUIF);
if (!uifResult.valid) {
  throw new Error(`UIF validation: ${uifResult.errors.join("; ")}`);
}
```

**E — Explicit gate**: validateUIF must pass before any write.

### 9. Write UIF + complete research
```javascript
updateStage(state, "writing");

// Set provenance_log to include new log IDs
updatedUIF.meta.provenance_log = [
  existingUIF.meta.provenance_log ?? "",
  q1LogId,
  q2LogId
].filter(Boolean).join(",");

// Update the idea's Intelligence File with the deepened UIF
await patchRecord(TABLES.IDEAS, ideaId, {
  "Intelligence File": JSON.stringify(updatedUIF),
  research_depth: "deep",
  research_completed_at: new Date().toISOString(),
  Status: "Ready"
});

// Mark post stub research_ready
await patchRecord(TABLES.POSTS, postStub.id, {
  status: "research_ready",
  research_completed_at: new Date().toISOString()
});
```

### 10. Extract hooks → write to hooks_library
```javascript
updateStage(state, "hook_extraction");
// For the deepened angle (targetAngle after merge):
//   Call hook generation prompt (see researcher.md Stage 4)
//   Write each hook to hooks_library as status = "candidate"
//   source_idea: [ideaId]
```

### 11. Log completion
```javascript
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: postStub.id,
  step_name: "complete",
  stage: "complete",
  timestamp: new Date().toISOString(),
  output_summary: `Research complete: angle "${targetAngle.angle_name}" deepened — ${updatedUIF.core_knowledge.facts.length} total facts`,
  model_version: "n/a",
  status: "success"
});
```

### 12. Report to Simon
```
✅ Research complete: [topic] — Angle [N]: [angle_name]
   New facts added: [N] | Total facts: [N] | Hooks extracted: [N]
   Run /draft to create the post.
```

---

## Writes

| Table | Field | Value |
|---|---|---|
| `posts` | `research_started_at` | `now()` (set at step 4, BEFORE API calls) |
| `posts` | `status` | `"researching"` → `"research_ready"` (or reverted to `"planned"` on error) |
| `posts` | `research_completed_at` | `now()` |
| `ideas` | `Intelligence File` | updated UIF v3.0 JSON string (target angle deepened) |
| `ideas` | `research_depth` | `"deep"` |
| `ideas` | `research_completed_at` | `now()` |
| `ideas` | `Status` | `"Ready"` |
| `hooks_library` | (new records) | hooks from deepened angle as `status = candidate` |
| `logs` | (multiple entries) | one per stage |

---

## Error Path

```javascript
} catch (error) {
  // Clear the lock on the post stub — revert to planned for retry
  await patchRecord(TABLES.POSTS, postStub.id, {
    research_started_at: null,
    status: "planned"
  });

  // Log the failure
  await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
    workflow_id: state.workflowId,
    entity_id: postStub.id,
    step_name: "error",
    stage: state.stage,
    timestamp: new Date().toISOString(),
    output_summary: `Error: ${error.message}`,
    model_version: "n/a",
    status: "error"
  });

  return formatError("/research", state.stage, error.message, true);
  // Output: ❌ Research failed at [stage] — [error] — lock reset, safe to retry
}
```
