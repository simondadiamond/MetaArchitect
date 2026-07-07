# /research — Deep Research Command

Deepen research on a planned post stub: target the assigned angle, run NotebookLM deep research (~40 sources), query for grounded angle facts, merge results into the idea's UIF, mark the post stub `research_ready`.

---

## Precondition

Post stub `status = "planned"` AND `research_started_at` is empty.

Default (no argument): oldest planned post stub by `planned_week` asc, `planned_order` asc.
With argument: `/research [post_stub_id]` — research a specific post stub.

Risk tier: medium → S + T + E required.

> **Supabase**: All reads/writes go through `tools/supabase.mjs` — never call Supabase MCP from inside this command (token-conscious rule). Column registry: `.claude/skills/supabase.md`. All columns are snake_case.
> **NotebookLM**: Deep research uses `mcp__notebooklm-mcp__research_start/status/import/notebook_query` — no Perplexity, no node scripts.

```javascript
import {
  getRecords, getRecord, createRecord, patchRecord,
  logEntry, setLock, clearLock, TABLES,
} from './tools/supabase.mjs';
```

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
// Use it directly — skip the DB fetch.
// Standalone /research (no weekState): fetch from Supabase.
let brand;
if (weekState?.cache?.brand) {
  brand = weekState.cache.brand;
} else {
  const rows = await getRecords(TABLES.BRAND,
    { name: 'metaArchitect' },
    { fields: ['name','goals','icp_short','main_guidelines'], limit: 1 });
  brand = rows[0];
}
if (!brand) throw new Error("Brand row 'metaArchitect' not found in pipeline.brand");
```

### 2. Find target post stub
```javascript
// If a specific post_stub_id was passed via the slash command argument, fetch it directly.
// Otherwise: oldest planned, unlocked stub.
let postStub;
if (typeof argument === 'string' && argument.length > 0) {
  postStub = await getRecord(TABLES.POSTS, argument,
    ['id','status','idea_id','angle_index','planned_week','planned_order','research_started_at']);
  if (!postStub) throw new Error(`Post stub ${argument} not found`);
} else {
  const candidates = await getRecords(TABLES.POSTS,
    { status: 'planned', research_started_at: null },
    {
      fields: ['id','status','idea_id','angle_index','planned_week','planned_order'],
      orderBy: { col: 'planned_week', dir: 'asc' },
      limit: 50,
    });
  // Secondary in-memory sort by planned_order asc (PostgREST single-key order is enforced above).
  candidates.sort((a, b) => (a.planned_order ?? 9999) - (b.planned_order ?? 9999));
  if (candidates.length === 0) {
    return "No post stubs with status = planned and research_started_at empty. Run /editorial-planner first.";
  }
  postStub = candidates[0];
}

const ideaId     = postStub.idea_id;            // already a UUID (FK column), not an array
const angleIndex = postStub.angle_index ?? 0;
if (!ideaId) throw new Error("Post stub is missing idea_id — check pipeline.posts row");
```

### 3. Load idea + UIF
```javascript
const idea = await getRecord(TABLES.IDEAS, ideaId,
  ['id','topic','intelligence_file','content_brief','intent','notebook_id']);
if (!idea) throw new Error(`Idea ${ideaId} not found in pipeline.ideas`);

const notebookId = idea.notebook_id ?? null;
const hasExistingNotebook = !!notebookId;
// hasExistingNotebook = true  → idea was captured via /capture (NLM deep already done)
//                               → fast path: skip crawl, run targeted notebook_query only
// hasExistingNotebook = false → harvest-sourced idea (shallow Perplexity UIF)
//                               → full path: run complete NLM deep research sequence

// Lenient parse: fix \_  → _ before JSON.parse (migrated data may have invalid escape sequences)
function parseUIF(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch(_) {}
  try { return JSON.parse(raw.replace(/\\\_/g, '_')); } catch(e) {
    throw new Error(`intelligence_file is not valid JSON after repair attempt: ${e.message}`);
  }
}

const contentBrief = idea.content_brief ? JSON.parse(idea.content_brief) : null;
// content_brief is optional for pre-capture ideas (harvest/migration). query_derivation falls back to UIF fields.

const existingUIF = parseUIF(idea.intelligence_file);
if (!existingUIF) throw new Error("intelligence_file is null — run /capture first to generate shallow UIF");

const targetAngle = existingUIF.angles?.[angleIndex];
if (!targetAngle) throw new Error(`angle_index ${angleIndex} not found in UIF (${existingUIF.angles?.length ?? 0} angles)`);
```

### 4. Lock on post stub — BEFORE any API call
```javascript
updateStage(state, "locking");
await setLock(TABLES.POSTS, postStub.id, 'research_started_at', 'researching');
await logEntry({
  workflow_id: state.workflowId,
  entity_id:   postStub.id,
  step_name:   "lock",
  stage:       "locking",
  output_summary: `Research locked for post stub ${postStub.id} — angle_index ${angleIndex}: "${targetAngle.angle_name}"`,
  model_version: "n/a",
  status: "success",
});
```

### 5. Derive NLM research query (deterministic — no LLM needed)
```javascript
updateStage(state, "query_derivation");
const currentYear = new Date().getFullYear();

// Prefer content_brief fields; fall back to UIF top-level fields for pre-capture ideas (no content_brief)
const queryTopic = contentBrief?.topic ?? existingUIF.topic ?? idea.topic;
const queryAngle = targetAngle.contrarian_take ?? targetAngle.angle_name ?? existingUIF.core_angle ?? "";
const researchQuery = `${queryTopic} — ${queryAngle} — ${currentYear}`;

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

  await logEntry({
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_angle_query", stage: "nlm_angle_query",
    output_summary: `NLM targeted query (fast path). notebook_id: ${notebookId}. conversation_id: ${nlmQueryResult.conversation_id}. Sources used: ${nlmQueryResult.sources_used?.length ?? 0}`,
    model_version: "notebooklm-deep", status: "success",
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

  await logEntry({
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_research_start", stage: "nlm_research_start",
    output_summary: `NLM research started (full path). notebook_id: ${notebook_id} query: "${researchQuery}"`,
    model_version: "notebooklm-deep", status: "success",
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

  await logEntry({
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_research_import", stage: "nlm_research_import",
    output_summary: `NLM import complete. ${importResult.imported_count} sources imported. Sources found: ${researchResult.sources_found}`,
    model_version: "notebooklm-deep", status: "success",
  });

  // 6d. Query notebook — extract grounded facts for target angle
  updateStage(state, "nlm_angle_query");
  // MCP: mcp__notebooklm-mcp__notebook_query
  //   notebook_id, query: <angle extractor prompt — see researcher.md Stage 2>
  //   Input to prompt: brand, contentBrief, targetAngle, existingUIF
  nlmQueryResult = // notebook_query result

  await logEntry({
    workflow_id: state.workflowId, entity_id: postStub.id,
    step_name: "nlm_angle_query", stage: "nlm_angle_query",
    output_summary: `NLM query complete (full path). conversation_id: ${nlmQueryResult.conversation_id}. Sources used: ${nlmQueryResult.sources_used?.length ?? 0}`,
    model_version: "notebooklm-deep", status: "success",
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

Use `tools/research-complete.mjs` — pipe JSON payload to stdin. This is the canonical write path; never write one-off scripts.

```bash
echo '{
  "workflowId": "<workflowId>",
  "stubs": [{
    "stubId": "<postStub.id>",
    "ideaId": "<ideaId>",
    "notebookId": "<activeNotebookId>",
    "uif": <updatedUIF>,
    "hooks": <generatedHooks>
  }]
}' | node tools/research-complete.mjs
```

The tool validates the UIF, writes ideas + posts, creates hook records, and logs completion in one call. JSON has no single quotes so heredoc quoting works cleanly.

> **Note for /week parallel research**: when called from runResearchForStub(), build the payload in memory and pipe it after all NLM calls complete. The tool handles one or many stubs per call.

// SESSION CACHE UPDATE: When called from /week, write the deepened UIF back to weekState
// so the draft phase can use it without re-fetching from Supabase.
// if (weekState?.postStubMap?.[postStub.id]) {
//   weekState.postStubMap[postStub.id].uif = updatedUIF;
// }
```

### 10. Extract hooks → write to hooks_library
```javascript
updateStage(state, "hook_extraction");
// For the deepened angle (targetAngle after merge), call hook generation prompt
// (see researcher.md Stage 4) → array of {hook_text, hook_type, intent}.
for (const h of generatedHooks) {
  await createRecord(TABLES.HOOKS, {
    hook_text:      h.hook_text,
    hook_type:      h.hook_type,             // contrarian | stat_lead | question | story_open | provocative_claim
    source_idea_id: ideaId,                  // UUID FK (was Airtable linked record array)
    angle_name:     targetAngle.angle_name,
    intent:         h.intent,
    status:         'candidate',
  }, ['id']);
}
```

### 11. Log completion
```javascript
await logEntry({
  workflow_id: state.workflowId,
  entity_id:   postStub.id,
  step_name:   "complete",
  stage:       "complete",
  output_summary: `Research complete: angle "${targetAngle.angle_name}" deepened — ${updatedUIF.core_knowledge.facts.length} total facts`,
  model_version: "n/a",
  status: "success",
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

| Table | Column | Value |
|---|---|---|
| `pipeline.posts` | `research_started_at` | `now()` (set at step 4, BEFORE API calls) |
| `pipeline.posts` | `status` | `"researching"` → `"research_ready"` (or reverted to `"planned"` on error) |
| `pipeline.posts` | `research_completed_at` | `now()` |
| `pipeline.ideas` | `intelligence_file` | updated UIF v3.0 JSON string (target angle deepened) |
| `pipeline.ideas` | `research_depth` | `"deep"` |
| `pipeline.ideas` | `research_completed_at` | `now()` |
| `pipeline.ideas` | `status` | `"Ready"` |
| `pipeline.hooks_library` | (new rows) | hooks from deepened angle as `status = candidate` |
| `pipeline.logs` | (multiple entries) | one per stage |

---

## Error Path

```javascript
} catch (error) {
  // Clear lock + revert status (uses helper)
  await clearLock(TABLES.POSTS, postStub.id, 'research_started_at', 'planned');

  await logEntry({
    workflow_id: state.workflowId,
    entity_id:   postStub.id,
    step_name:   "error",
    stage:       state.stage,
    output_summary: `Error: ${error.message}`,
    model_version: "n/a",
    status: "error",
  });

  return formatError("/research", state.stage, error.message, true);
  // Output: ❌ Research failed at [stage] — [error] — lock reset, safe to retry
}
```
