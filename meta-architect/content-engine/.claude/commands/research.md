# /research — Deep Research Command

Execute deep research on a selected idea: generate queries, call Perplexity, compile UIF, extract hooks.

---

## Precondition

`status = selected` AND `research_started_at IS NULL`.

Default (no argument): oldest selected idea by `selected_at` ascending.
With argument: `/research [record_id]` — research a specific idea.

Risk tier: medium → S + T + E required.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "idea",
  entityId: idea.id
});
// state.workflowId is the ID used for all log entries in this run
```

---

## Steps

### 1. Find target idea
```javascript
const ideas = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `AND({status} = "selected", {research_started_at} = "")`,
  [{ field: "selected_at", direction: "asc" }]
);
if (ideas.length === 0) {
  return "No ideas with status = selected and research_started_at empty. Run /ideas first.";
}
const idea = ideas[0];  // oldest selected
```

### 2. Idempotency check
```javascript
if (idea.fields?.research_started_at) {
  return `⚠ Research already started at ${idea.fields.research_started_at}. Status: ${idea.fields.status}. Check Airtable for current state.`;
}
```

### 3. Lock immediately — BEFORE any API call
```javascript
updateStage(state, "locking");
await patchRecord(process.env.AIRTABLE_TABLE_IDEAS, idea.id, {
  research_started_at: new Date().toISOString(),
  status: "researching"
});
// Log the lock
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: idea.id,
  step_name: "lock",
  stage: "locking",
  timestamp: new Date().toISOString(),
  output_summary: `Research locked for: ${idea.fields?.title}`,
  model_version: "n/a",
  status: "success"
});
```

### 4. Parse content_brief
```javascript
const contentBrief = idea.fields?.content_brief
  ? JSON.parse(idea.fields.content_brief)
  : null;
if (!contentBrief) throw new Error("content_brief is null or unparseable");
```

### 5. Research Architect — generate 3 queries
```javascript
updateStage(state, "research_architect");
// Call claude-sonnet-4-6 with Research Architect prompt (see researcher.md)
// Validate: validateResearchPlan(output) — must be true before proceeding
// Log result to logs table (step_name: "research_architect")
```

**E — Explicit gate**: If `validateResearchPlan` returns false → throw error (goes to error path).

### 6. Execute 3 Perplexity calls (sequential)
```javascript
updateStage(state, "perplexity_q1");
const q1 = await callPerplexity(queries[0].query);
// Log Q1 (step_name: "perplexity_q1")

updateStage(state, "perplexity_q2");
const q2 = await callPerplexity(queries[1].query);
// Log Q2 (step_name: "perplexity_q2")

updateStage(state, "perplexity_q3");
const q3 = await callPerplexity(queries[2].query);
// Log Q3 (step_name: "perplexity_q3")
```

### 7. UIF Compiler — synthesize to UIF v3.0
```javascript
updateStage(state, "uif_compiler");
// Call claude-sonnet-4-6 with UIF Compiler prompt (see researcher.md)
// Log result (step_name: "uif_compiler")
```

### 8. Validate UIF
```javascript
const uifResult = validateUIF(uifOutput);
if (!uifResult.valid) {
  throw new Error(`UIF validation: ${uifResult.errors.join("; ")}`);
}
```

**E — Explicit gate**: validateUIF must pass before any write.

### 9. Write UIF + complete research
```javascript
updateStage(state, "writing");

// Set provenance_log with actual log record IDs
uifOutput.meta.provenance_log = [q1LogId, q2LogId, q3LogId].join(",");

await patchRecord(process.env.AIRTABLE_TABLE_IDEAS, idea.id, {
  intelligence_file: JSON.stringify(uifOutput),
  research_completed_at: new Date().toISOString(),
  status: "researched"
});
```

### 10. Extract hooks → write to hooks_library
```javascript
updateStage(state, "hook_extraction");
// For each angle in uifOutput.angles:
//   Call hook generation prompt (see researcher.md Stage 4)
//   Write each hook to hooks_library as status = "candidate"
```

### 11. Log completion
```javascript
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: idea.id,
  step_name: "complete",
  stage: "complete",
  timestamp: new Date().toISOString(),
  output_summary: `Research complete: ${uifOutput.meta.topic} — ${uifOutput.angles.length} angles, ${uifOutput.core_knowledge.facts.length} facts`,
  model_version: "n/a",
  status: "success"
});
```

### 12. Report to Simon
```
✅ Research complete: [topic]
   Angles: [N] | Facts: [N] | Hooks extracted: [N]
   Run /draft to create posts.
```

---

## Writes

| Table | Field | Value |
|---|---|---|
| `ideas` | `research_started_at` | `now()` (set at step 3, BEFORE API calls) |
| `ideas` | `status` | `researching` → `researched` |
| `ideas` | `intelligence_file` | UIF v3.0 JSON string |
| `ideas` | `research_completed_at` | `now()` |
| `hooks_library` | (new records) | hooks as `status = candidate` |
| `logs` | (multiple entries) | one per stage |

---

## Error Path

```javascript
} catch (error) {
  // Clear the lock — allow retry
  await patchRecord(process.env.AIRTABLE_TABLE_IDEAS, idea.id, {
    research_started_at: null,
    status: "research_failed"
  });

  // Log the failure
  await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
    workflow_id: state.workflowId,
    entity_id: idea.id,
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
