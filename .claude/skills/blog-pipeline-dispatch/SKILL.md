---
name: blog-pipeline-dispatch
description: Use when the Command Center schedule fires '/blog-pipeline-dispatch' (~every 25 min), or when Simon asks to "process the blog pipeline" / "run the dispatcher". Router only — reads listActionable(), invokes the mapped stage skill on the single oldest actionable row, and stops. Do NOT trigger for starting a new post (write-post), approving a checkpoint (that's Simon in CC/chat), or retrying a failed row (CC's retry action resets the stage first — this skill picks it up on its next fire).
---

## Blog Pipeline Dispatch

**Risk tier: low (S + T)** — reads `blog_ideas` via `listActionable`/`getIdea` and logs to `pipeline.logs`; its only conditional write is the `failed_<stage>` backstop below. It never advances a stage on success — the invoked stage skill does that itself. On any failure:

```
❌ blog-pipeline-dispatch failed at [stage] — [error message] — no lock held, safe to retry
```

This skill is a **router, not a worker**. It does not restate any stage skill's process, gates, or exit contract — read and follow the invoked skill's own SKILL.md in full.

---

### Hard rule

**Process exactly ONE row per invocation, then stop.** This fires every ~25 minutes on a shared machine with tight memory headroom (Sterling: ~8GB always-on of 16GB) and scheduler fires can overlap — one row per run is the safety margin. Never loop to a second row in the same invocation, even if the first row finished instantly.

---

### STEP 0 — STATE Init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,           // set once a row is picked
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Run node snippets from `projects/Content-Engine/` (deps + `.env` resolve there).

```javascript
const { listActionable, getIdea, setStage } = await import('./tools/blog-artifacts.mjs');
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'blog_dispatch',
  stage: state.stage, output_summary: '<see log values below>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

---

### Stage → skill map

| `stage` | `post_type: article` | `post_type: teardown` |
|---|---|---|
| `researching` | `research` | **skip, note**: "teardown research+drafting are Simon-initiated via teardown-generate" |
| `outlining` | `blog-outline` | anomaly — teardown rows never sit here; `setStage(id, 'failed_outlining')`, reason `"teardown row at outlining — investigate"` |
| `drafting` | `blog-draft` | **skip, note**: same reason as `researching` |
| `editing` | `editorial` | `editorial` |
| `optimizing` | `blog-optimize` | `blog-optimize` |
| `fact_check` | `blog-factcheck` | `blog-factcheck` |
| `inserting` | `blog-insert` | `blog-insert` |

`listActionable()` (from `./tools/blog-artifacts.mjs`) already filters to the seven machine stages above — human stages (`candidate`, `awaiting_outline_approval`, `awaiting_final_review`) and terminal states (`failed_*`, `promoted_to_post`, `rejected`) never appear in its results.

---

### Protocol

1. **List.** `const rows = await listActionable(10);` (oldest-first). Empty → print `blog pipeline: nothing actionable`, log it (`output_summary: 'nothing actionable'`), exit.
2. **Pick.** Walk `rows` oldest-first. For each row, look up `(row.stage, row.post_type)` in the map above:
   - Maps to a skill → this is the row. Stop walking.
   - Maps to skip-with-note → log `output_summary: 'skipped <ideaId> (<reason>)'`, continue to the next row.
   - Maps to the outlining anomaly → `setStage(ideaId, 'failed_outlining')` with the reason above, log `output_summary: 'skipped <ideaId> (teardown row at outlining — investigate)'`, continue to the next row.
   - No row in the batch is dispatchable → print/log `blog pipeline: nothing actionable`, exit.
3. **Re-verify.** Immediately before invoking, `const idea = await getIdea(ideaId); if (idea.stage !== expectedStage) → skip this row (another run already claimed it), log the mismatch, exit.`
4. **Invoke.** Read the mapped skill's SKILL.md and follow it in full on this row. It performs its own terminal `setStage`/`claimStage` — **never call `setStage`/`claimStage` yourself for the success path.**
5. **Verify the move.** `const after = await getIdea(ideaId);`
   - `after.stage !== expectedStage` → the row moved (or failed_* was set by the stage skill itself) → done.
   - `after.stage === expectedStage` (unchanged) and it is not already `failed_<stage>` → the dispatcher's **only permitted stage write**: `setStage(ideaId, 'failed_<stage>')`, reason `"skill exited without advancing"`.
6. **Log** the outcome (`step_name: 'blog_dispatch'`) and **stop** — do not process a second row.

Log `output_summary` values:
- `'nothing actionable'`
- `'dispatched <skill> on <ideaId> (<stage>, <post_type>) → <resulting stage>'`
- `'skipped <ideaId> (<reason>)'`

---

### `--dry-run` mode

Triggered only when the invocation explicitly says dry-run (never by the CC schedule — that always runs live). List the full `listActionable(10)` batch and print, per row, what WOULD happen (dispatch to which skill, or skip with which reason) using the same map and walk order as the live protocol. **Touch nothing and log nothing** — no `getIdea` re-verify, no skill invocation, no `setStage`, no `logEntry` call.
