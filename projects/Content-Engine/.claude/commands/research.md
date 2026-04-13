# /research — Deep Research Command

Deepen research on a planned post stub: target the assigned angle, run NotebookLM deep research (~40 sources), query for grounded angle facts, merge results into the idea's UIF, mark the post stub `research_ready`.

---

## Precondition

Post stub `status = "planned"` AND `research_started_at` is empty.

Default (no argument): oldest planned post stub by `planned_week` asc, `planned_order` asc.
With argument: `/research [post_stub_id]` — research a specific post stub.

Risk tier: medium → S + T + E required.

> **Airtable**: Use MCP tools directly — no node scripts. All table IDs and field IDs are in `.claude/skills/airtable.md`. Always `typecast: true` on writes.
> **NotebookLM**: Deep research uses `mcp__notebooklm-mcp__research_start/status/import/notebook_query` — no Perplexity, no node scripts.

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
// SESSION CACHE: When called from /week, weekState.cache.brand is pre-loaded.
// Use it directly — skip the Airtable fetch.
// Standalone /research (no weekState): fetch from Airtable as normal.
//
// if (weekState?.cache?.brand) {
//   brand = weekState.cache.brand;
// } else {
//   MCP: mcp__claude_ai_Airtable__list_records_for_table
//     baseId: "appgvQDqiFZ3ESigA", tableId: "tblwfU5EpDgOKUF7f"
//     fieldIds: [fldsP8FwcTxJdkac8, fld7N55IwEM8CQYW0, fldLYt1DMS1Fwd5Vy, fldBtXwgSegiYP2pB]
//     (name, goals, icp_short, main_guidelines — colors/typography/icp_long not needed for research)
//     filters: name = "metaArchitect" (text field, no schema lookup)
// }
const brand = weekState?.cache?.brand ?? /* MCP fetch result */ brands[0];
if (!brand) throw new Error("Brand record 'metaArchitect' not found in Airtable");
```

### 2. Find target post stub
```javascript
// MCP: mcp__claude_ai_Airtable__get_table_schema to get choice IDs for status = "planned"
//   Then: mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs"
//   fieldIds: [fldlC1PMzRw0z6cTR, fldlGGDwqp6Hy17jT, fldwDOdJgmbf2IZKv, fldViXirsiFl1j1w4, fldIqhg3WzB4vZfhl, fldC2PIfrupZA2Ohk]
//   filters: status = "planned" (choice ID) AND research_started_at isEmpty
//   sort: fldViXirsiFl1j1w4 asc, fldIqhg3WzB4vZfhl asc
const posts = // result.records
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
// MCP: mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk"
//   recordIds: [ideaId]
//   fieldIds: [fldMtlpG32VKE0WkN, fldQMArYmpP8s6VKb, fldBvV1FgpD1l2PG1, fldF8BxXjbUiHCWIa, fld6IEXqxWqwZtHow]
//             (Topic, Intelligence File, content_brief, intent, notebook_id)
const idea = // result.records[0];
if (!idea) throw new Error(`Idea ${ideaId} not found`);

const notebookId = idea.fields?.notebook_id ?? null;
const hasExistingNotebook = !!notebookId;
// hasExistingNotebook = true  → idea was captured via /capture (NLM deep already done)
//                               → fast path: skip crawl, run targeted notebook_query only
// hasExistingNotebook = false → harvest-sourced idea (shallow Perplexity UIF)
//                               → full path: run complete NLM deep research sequence

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
// MCP: mcp__claude_ai_Airtable__update_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs", typecast: true
//   records: [{ id: postStub.id, fields: { fldC2PIfrupZA2Ohk: now, fldlC1PMzRw0z6cTR: "researching" } }]
await patchRecord(POSTS, postStub.id, {
  research_started_at: new Date().toISOString(),
  status: "researching"
});
// MCP: mcp__claude_ai_Airtable__create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
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

### 5. Derive NLM research query (deterministic — no LLM needed)
```javascript
updateStage(state, "query_derivation");
const currentYear = new Date().getFullYear();
const researchQuery = `${contentBrief.topic} — ${targetAngle.contrarian_take} — ${currentYear}`;

// Year-anchor gate
if (!researchQuery.includes(String(currentYear))) {
  throw new Error(`/research aborted: query missing ${currentYear} year anchor. Query: "${researchQuery}"`);
}
```

### 6. NotebookLM research

Two paths based on whether `/capture` already created a notebook for this idea.

```javascript
let nlmQueryResult;

if (hasExistingNotebook) {
  // ── FAST PATH (manually captured ideas) ──────────────────────────────────
  // Notebook already has ~40 sources from /capture. Skip the crawl.
  // Run one targeted notebook_query for the assigned angle only (~30 sec).
  updateStage(state, "nlm_angle_query");
  // MCP: mcp__notebooklm-mcp__notebook_query
  //   notebook_id: notebookId
  //   query: <angle extractor prompt — see researcher.md Stage 2>
  //   Input to prompt: brand, contentBrief, targetAngle, existingUIF
  nlmQueryResult = // notebook_query result

  await createRecord(LOGS, {
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_angle_query", stage: "nlm_angle_query",
    timestamp: new Date().toISOString(),
    output_summary: `NLM targeted query (fast path). notebook_id: ${notebookId}. conversation_id: ${nlmQueryResult.conversation_id}. Sources used: ${nlmQueryResult.sources_used?.length ?? 0}`,
    model_version: "notebooklm-deep", status: "success"
  });

} else {
  // ── FULL PATH (harvest-sourced ideas — no existing notebook) ─────────────
  // Run complete NLM deep research sequence (~5 min, ~40 sources).

  // 6a. Start research
  updateStage(state, "nlm_research_start");
  // MCP: mcp__notebooklm-mcp__research_start
  //   query: researchQuery, source: "web", mode: "deep"
  //   title: `Research: ${contentBrief.topic} — ${new Date().toISOString().slice(0,10)}`
  const { task_id, notebook_id } = // research_start result

  await createRecord(LOGS, {
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_research_start", stage: "nlm_research_start",
    timestamp: new Date().toISOString(),
    output_summary: `NLM research started (full path). notebook_id: ${notebook_id} query: "${researchQuery}"`,
    model_version: "notebooklm-deep", status: "success"
  });

  // 6b. Poll until complete (max 6 min)
  updateStage(state, "nlm_research_status");
  // MCP: mcp__notebooklm-mcp__research_status
  //   notebook_id, task_id, poll_interval: 30, max_wait: 360, compact: false
  const researchResult = // research_status result
  if (researchResult.status !== "completed") {
    throw new Error(`NLM research did not complete in time. Status: ${researchResult.status}`);
  }

  // 6c. Import top 20 web sources (skip index 0 = deep_report, internal to notebook)
  updateStage(state, "nlm_research_import");
  // MCP: mcp__notebooklm-mcp__research_import
  //   notebook_id, task_id, source_indices: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
  const importResult = // research_import result

  await createRecord(LOGS, {
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_research_import", stage: "nlm_research_import",
    timestamp: new Date().toISOString(),
    output_summary: `NLM import complete. ${importResult.imported_count} sources imported. Sources found: ${researchResult.sources_found}`,
    model_version: "notebooklm-deep", status: "success"
  });

  // 6d. Query notebook — extract grounded facts for target angle
  updateStage(state, "nlm_angle_query");
  // MCP: mcp__notebooklm-mcp__notebook_query
  //   notebook_id, query: <angle extractor prompt — see researcher.md Stage 2>
  //   Input to prompt: brand, contentBrief, targetAngle, existingUIF
  nlmQueryResult = // notebook_query result

  await createRecord(LOGS, {
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_angle_query", stage: "nlm_angle_query",
    timestamp: new Date().toISOString(),
    output_summary: `NLM query complete (full path). conversation_id: ${nlmQueryResult.conversation_id}. Sources used: ${nlmQueryResult.sources_used?.length ?? 0}`,
    model_version: "notebooklm-deep", status: "success"
  });
}
```

**E — Explicit gate**: If `nlmQueryResult.answer` is empty → throw error (goes to error path).

### 7. UIF Merger — deepen target angle only
```javascript
updateStage(state, "uif_merger");
// Call claude-sonnet-4-6 with UIF Merger prompt (see researcher.md).
// Input: existingUIF, angleIndex, nlmQueryResult.answer + nlmQueryResult.sources_used
// Task: extract new facts from NLM answer into existingUIF.core_knowledge.facts (append, no duplicates),
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

// Set provenance_log to include NLM notebook reference
// Use notebookId (fast path) or notebook_id (full path) — whichever is defined
const activeNotebookId = notebookId ?? notebook_id;
updatedUIF.meta.provenance_log = [
  existingUIF.meta.provenance_log ?? "",
  `nlm:${activeNotebookId}`
].filter(Boolean).join(",");

// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblVKVojZscMG6gDk, typecast: true)
//   fields: fldQMArYmpP8s6VKb (Intelligence File), fldAwyDJrDdoyPmtR (research_depth),
//           fldvnK9lQWpoJaL30 (research_completed_at), fld9frOZF4oaf3r6V (Status)
await patchRecord(IDEAS, ideaId, {
  "Intelligence File": JSON.stringify(updatedUIF),
  research_depth: "deep",
  research_completed_at: new Date().toISOString(),
  Status: "Ready"
});

// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
//   fields: fldlC1PMzRw0z6cTR (status), fldzTm7FfPo9FtEYX (research_completed_at)
await patchRecord(POSTS, postStub.id, {
  status: "research_ready",
  research_completed_at: new Date().toISOString()
});

// SESSION CACHE UPDATE: When called from /week, write the deepened UIF back to weekState
// so the draft phase can use it without re-fetching from Airtable.
// if (weekState?.postStubMap?.[postStub.id]) {
//   weekState.postStubMap[postStub.id].uif = updatedUIF;
// }
```

### 10. Extract hooks → write to hooks_library
```javascript
updateStage(state, "hook_extraction");
// For the deepened angle (targetAngle after merge):
//   Call hook generation prompt (see researcher.md Stage 4)
//   MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblWuQNSJ25bs18DZ, typecast: true)
//   fields: fldSIjqzsFuxWOaYb (hook_text), fldOvWxj7O0x51aIX (hook_type),
//           fld3aBVety5oSAxKu (source_idea: [ideaId]), fldnuhK79wUIKnrw4 (angle_name),
//           fld6UZ8Fy7q2cZQyF (intent), fldVKrSnP34sofwZ7 (status: "candidate")
```

### 11. Log completion
```javascript
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
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
  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
  //   Clear lock — research_started_at: null, status: "planned"
  await patchRecord(POSTS, postStub.id, {
    research_started_at: null,
    status: "planned"
  });

  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
  await createRecord(LOGS, {
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
