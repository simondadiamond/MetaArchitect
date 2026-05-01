# /week — Full-Week Content Sprint

Run the complete planning → research → draft → review flow for the current ISO week in one session.

Replaces running `/editorial-planner` + `/research` ×N + `/draft` ×N + `/review` ×N sequentially. Instead of re-querying Supabase at each command to find "what's next", `/week` builds a session manifest of post stub IDs in Phase 1 and carries it through all phases.

**Usage**: `/week` (current ISO week) or `/week 2026-W15` (specific week)

**Risk tier**: medium → S + T + E required throughout.

**Does NOT include**: `/publish` (requires LinkedIn action + URL) or `/score` (requires 7-day wait). Those remain separate commands.

> **Supabase**: All reads/writes go through `tools/supabase.mjs` — never call Supabase MCP from inside this command (token-conscious rule). Column registry: `.claude/skills/supabase.md`. All columns are snake_case.

```javascript
import {
  getRecords, getRecord, createRecord, patchRecord,
  logEntry, setLock, clearLock, TABLES,
} from './tools/supabase.mjs';
```

---

## Entry Point — Parse Argument + Compute Week

```javascript
import { randomUUID } from "crypto";

const args = userInput.trim().split(/\s+/).slice(1);
const weekArg = args[0] ?? null;

if (weekArg && !/^\d{4}-W\d{2}$/.test(weekArg)) {
  return `❌ Invalid week format: "${weekArg}". Use YYYY-WNN (e.g., 2026-W15)`;
}

function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
const targetWeek = weekArg ?? getISOWeek(new Date());
```

---

## STATE Init

```javascript
const weekState = {
  workflowId: randomUUID(),       // correlation key for ALL log entries this run
  stage: "init",
  entityType: "week",
  entityId: targetWeek,
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),

  targetWeek,
  postStubIds: [],                // ordered list — populated in Phase 1
  postStubMap: {},                // { [stubId]: { ideaId, plannedOrder, narrativeRole, angleIndex, status, topic } }
  phase: "plan",
  planConfirmed: false,

  researchResults: {},            // { [stubId]: { status: "ok"|"failed", error? } }
  draftResults: {},               // { [stubId]: { status: "ok"|"failed", error? } }
  reviewResults: {},              // { [stubId]: { status: "approved"|"rejected" } }

  cache: {}                       // session-level cache: { brand, frameworks, hooks, snippets }
                                  // brand loaded in Phase 0; libraries loaded before Phase 3 loop
};

function updateStage(newStage) {
  weekState.stage = newStage;
  weekState.lastUpdatedAt = new Date().toISOString();
}
```

---

## Phase 0 — Session Cache Preload

Run immediately after STATE init, before Resume check and before any other work.
Loads brand once for the entire session — all phases (research, draft) read from `weekState.cache.brand`
instead of making separate Supabase calls.

```javascript
updateStage("cache_preload");

// Load brand record once — used by Phase 2 (research) and Phase 3 (draft)
const brandRows = await getRecords(TABLES.BRAND,
  { name: 'metaArchitect' },
  { fields: ['name','goals','icp_short','main_guidelines'], limit: 1 });
if (!brandRows[0]) throw new Error("Brand row 'metaArchitect' not found in pipeline.brand — aborting /week");
weekState.cache.brand = brandRows[0];

// Note: frameworks, hooks, snippets are loaded just before Phase 3 (only needed for drafting)
// See Phase 3 preamble in runPhase3Draft()
```

---

## Resume / Recovery Check

Run immediately after Phase 0 cache preload. Detects in-flight or partially complete weeks and jumps to the correct phase.

```javascript
updateStage("resume_check");

const existingStubs = await getRecords(TABLES.POSTS,
  { planned_week: targetWeek },
  {
    fields: ['id','status','planned_order','narrative_role','angle_index','idea_id','intent','research_started_at'],
    orderBy: { col: 'planned_order', dir: 'asc' },
    limit: 50,
  });
```

If stubs exist, populate the manifest:

```javascript
if (existingStubs.length > 0) {
  weekState.postStubIds = existingStubs.map(s => s.id);
  weekState.postStubMap = Object.fromEntries(
    existingStubs.map(s => [s.id, {
      ideaId:       s.idea_id,           // UUID FK (no longer an array)
      plannedOrder: s.planned_order,
      narrativeRole: s.narrative_role,
      angleIndex:   s.angle_index ?? 0,
      status:       s.status,
      topic:        null   // filled from idea record if needed
    }])
  );

  const statuses = existingStubs.map(s => s.status);
  const allDecided       = statuses.every(st => ["approved", "rejected"].includes(st));
  const allDrafted       = statuses.every(st => ["drafted", "approved", "rejected"].includes(st));
  const allResearchReady = statuses.every(st => ["research_ready", "drafted", "approved", "rejected"].includes(st));

  if (allDecided) {
    // Week already reviewed — show summary and exit
    printWeekSummary(weekState);
    return;
  } else if (allDrafted) {
    console.log(`\n⏩ Resuming at Phase 4 — Review (${existingStubs.length} drafted posts for ${targetWeek})\n`);
    await runPhase4Review(weekState);
    return;
  } else if (allResearchReady) {
    console.log(`\n⏩ Resuming at Phase 3 — Draft (${existingStubs.length} research_ready posts for ${targetWeek})\n`);
    await runPhase3Draft(weekState);
    return;
  } else {
    // Some stubs still planned or researching — resume research
    // Stale lock check (researching + research_started_at set) is handled per-stub in Phase 2
    console.log(`\n⏩ Resuming at Phase 2 — Research (${existingStubs.length} stubs found for ${targetWeek})\n`);
    await runPhase2Research(weekState);
    return;
  }
}
// No existing stubs — fall through to Phase 1
```

**Resume decision table:**

| Condition | Action |
|---|---|
| All stubs `approved` / `rejected` | Print summary, exit |
| All stubs `drafted` (or later) | Jump to Phase 4 — Review |
| All stubs `research_ready` (or later) | Jump to Phase 3 — Draft |
| Mix of `planned` / `researching` / `research_ready` | Jump to Phase 2 — Research |
| No stubs | Phase 1 — Plan (fresh run) |

---

## Phase 1 — Plan

Full `/editorial-planner` logic, reproduced inline. The only differences: (1) `targetWeek` is already set (supports the `/week 2026-W15` argument path); (2) stub IDs are captured into the session manifest as they are written — no second Supabase query needed.

### Step 1. Idempotency check (already handled by resume check above)

If stubs exist for `targetWeek`, resume check above catches it. Phase 1 only runs for fresh weeks.

### Step 2. Fetch candidates

```javascript
updateStage("fetch_candidates");
const candidates = await getRecords(TABLES.IDEAS,
  { status: 'New' },
  {
    fields: ['id','topic','status','intelligence_file','content_brief','intent','score_overall','score_brand_fit','score_originality','score_virality'],
    orderBy: { col: 'score_overall', dir: 'desc' },
    limit: 100,
  });
if (candidates.length < 3) {
  return `⚠ Only ${candidates.length} ideas with status = "New" — need at least 3. Run /capture or /harvest to add more.`;
}
```

### Steps 3–8. Fetch context, history, brand; build composer input; call Editorial Composer

Follow the full `/editorial-planner` Steps 3–9 exactly (pipeline context, editorial history, brand, `buildComposerInput`, `claude-sonnet-4-6` call with `planner.md` system prompt, `validateEditorialPlan()`). See `.claude/commands/editorial-planner.md` for the complete step-by-step.

Log the composer call to the `logs` table using `weekState.workflowId`.

### Step 9. Write post stubs + populate manifest

Same write logic as `/editorial-planner` Step 10, with one addition: capture each stub ID into `weekState.postStubMap` immediately on creation.

```javascript
updateStage("writing");
const written = [];
const selected_at = new Date().toISOString();

for (const post of plan.posts) {
  try {
    // Derive source_angle_name, territory_key, post_class
    // (identical logic to /editorial-planner Step 10)
    const candidateRecord = composerInput.candidates.find(c => c.idea_id === post.idea_id);
    const selectedAngle = candidateRecord?.angles?.[post.angle_index];
    const sourceAngleName = selectedAngle?.angle_name ?? null;
    const territoryKey = deriveTerritory(post, sourceAngleName);  // same helper as /editorial-planner
    const postClass = inferPostClass(post, sourceAngleName, territoryKey, recentHistory);  // same helper

    const postStub = await createRecord(TABLES.POSTS, {
      idea_id:          post.idea_id,        // UUID FK (single value, not an array)
      planned_week:     targetWeek,
      planned_order:    post.order,
      narrative_role:   post.narrative_role,
      angle_index:      post.angle_index,
      series_id:        post.series_id ?? null,
      series_part:      post.series_part ?? null,
      series_total:     post.series_total ?? null,
      selection_reason: post.why_selected,
      status:           "planned",
      pillar:           post.pillar,
      thesis_angle:     post.thesis_angle,
      source_angle_name: sourceAngleName,
      territory_key:    territoryKey,
      post_class:       postClass,
    }, ['id']);

    // Patch idea to Selected
    await patchRecord(TABLES.IDEAS, post.idea_id, {
      status:           "Selected",
      selected_at,
      planned_week:     targetWeek,
      planned_order:    post.order,
      narrative_role:   post.narrative_role,
      series_id:        post.series_id ?? null,
      series_part:      post.series_part ?? null,
      series_total:     post.series_total ?? null,
      selection_reason: post.why_selected,
    });

    // ← KEY DIFFERENCE FROM /editorial-planner: populate manifest immediately
    weekState.postStubIds.push(postStub.id);

    // Cache UIF + contentBrief from the raw idea record (loaded in Step 2 fetch_candidates).
    // Look up by id from the original `candidates` array — composerInput.candidates is mapped
    // and doesn't carry the raw JSON columns.
    // This prevents research and draft from re-fetching the same data from Supabase.
    // After research completes, the UIF entry is overwritten with the deepened version.
    const rawIdea  = candidates.find(c => c.id === post.idea_id);
    const rawUIF   = rawIdea?.intelligence_file;
    const rawBrief = rawIdea?.content_brief;

    weekState.postStubMap[postStub.id] = {
      ideaId:       post.idea_id,
      plannedOrder: post.order,
      narrativeRole: post.narrative_role,
      angleIndex:   post.angle_index,
      status:       "planned",
      topic:        post.topic ?? rawIdea?.topic ?? "",
      uif:          rawUIF ? JSON.parse(rawUIF) : null,          // shallow UIF from planning phase
      contentBrief: rawBrief ? JSON.parse(rawBrief) : null       // overwritten by research if deep
    };
    written.push(postStub.id);

    // Log
    await logEntry({ workflow_id: weekState.workflowId, entity_id: postStub.id,
      step_name: "post_stub_created", stage: "writing",
      timestamp: new Date().toISOString(),
      output_summary: `Post stub created: order ${post.order} / angle_index ${post.angle_index} / ${post.narrative_role}`,
      model_version: "n/a", status: "success" });

  } catch (e) {
    const writtenList = written.length > 0 ? ` Already written: ${written.join(", ")}` : "";
    return `❌ /week failed at writing (idea ${post.idea_id}) — ${e.message}${writtenList} — check pipeline.posts before retrying`;
  }
}
```

### Step 10. Display plan + confirmation gate

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEEKLY EDITORIAL PLAN — [Week NN, YYYY]         /week
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Theme: [plan.theme or "none"]
[N] posts this week | [N] post stubs created

POST 1 — [narrative_role label]
  Topic:     [topic]
  Angle [N]: [angle_name]
  Pillar:    [pillar]
  Thesis:    [thesis_angle]
  Why:       [why_selected]

[repeat for each post]

Rationale: [plan.rationale]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next: Research [N] posts in parallel → draft → review.

Confirm? Enter y to continue, x to stop here:
```

```javascript
const confirm = await getUserInput();
if (confirm.trim().toLowerCase() !== "y") {
  console.log(`\nStopped after planning. Post stubs written to pipeline.posts.`);
  console.log(`Run /week again to resume, or /research [id] to process individually.`);
  return;
}

weekState.planConfirmed = true;
weekState.phase = "research";

await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
  step_name: "phase_1_confirmed", stage: "plan_confirmed",
  timestamp: new Date().toISOString(),
  output_summary: `Plan confirmed. ${weekState.postStubIds.length} stubs queued for research.`,
  model_version: "n/a", status: "success" });
```

**Phase 1 error path**: Log error, list already-written stub IDs in error message. Manual cleanup: delete partial stubs + reset idea Status to "New" before retrying.

---

## Phase 2 — Research (Parallel Subagents)

All stubs at `status = "planned"` are researched in parallel. Partial failures are isolated — failed stubs do not block the rest of the week.

```javascript
async function runPhase2Research(weekState) {
  updateStage("research_dispatch");

  const SKIP_STATUSES = ["research_ready", "drafted", "approved", "rejected"];
  const stubsToResearch = weekState.postStubIds.filter(
    id => !SKIP_STATUSES.includes(weekState.postStubMap[id]?.status)
  );

  if (stubsToResearch.length === 0) {
    console.log(`\n✅ All post stubs already research_ready — skipping Phase 2.\n`);
    await runPhase3Draft(weekState);
    return;
  }

  console.log(`\n${"━".repeat(52)}`);
  console.log(`PHASE 2 — RESEARCH                              /week`);
  console.log(`${"━".repeat(52)}`);
  console.log(`Researching ${stubsToResearch.length} stub(s) in parallel. Failures are isolated.\n`);

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "phase_2_start", stage: "research_dispatch",
    timestamp: new Date().toISOString(),
    output_summary: `Dispatching ${stubsToResearch.length} parallel research subagents`,
    model_version: "n/a", status: "success" });

  // Dispatch in parallel — each subagent is independent
  const researchPromises = stubsToResearch.map(stubId =>
    runResearchForStub(stubId, weekState)
      .then(result => ({ stubId, ...result }))
      .catch(err => ({ stubId, status: "failed", error: err.message }))
  );

  const outcomes = await Promise.allSettled(researchPromises);

  for (const outcome of outcomes) {
    const val = outcome.status === "fulfilled" ? outcome.value
      : { stubId: "unknown", status: "failed", error: outcome.reason?.message ?? "unknown" };
    weekState.researchResults[val.stubId] = { status: val.status, error: val.error ?? null };
    if (weekState.postStubMap[val.stubId]) {
      weekState.postStubMap[val.stubId].status = val.status === "ok" ? "research_ready" : "planned";
    }
  }

  const okCount   = Object.values(weekState.researchResults).filter(r => r.status === "ok").length;
  const failCount = Object.values(weekState.researchResults).filter(r => r.status === "failed").length;

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "phase_2_complete", stage: "research_complete",
    timestamp: new Date().toISOString(),
    output_summary: `Phase 2: ${okCount} ok, ${failCount} failed of ${stubsToResearch.length}`,
    model_version: "n/a", status: failCount > 0 ? "error" : "success" });

  // Print Phase 2 summary
  console.log(`\n${"━".repeat(52)}`);
  console.log(`PHASE 2 — RESEARCH COMPLETE                     /week`);
  console.log(`${"━".repeat(52)}`);
  for (const stubId of weekState.postStubIds) {
    const stub   = weekState.postStubMap[stubId];
    const result = weekState.researchResults[stubId];
    if (!result) continue;
    const icon  = result.status === "ok" ? "✅" : "❌";
    const label = result.status === "ok" ? "research_ready"
      : `FAILED — ${result.error ?? "unknown"}`;
    console.log(`  ${icon} Post ${stub.plannedOrder}: ${stub.topic || stubId} — ${label}`);
  }

  if (failCount > 0) {
    console.log(`\n⚠ ${failCount} stub(s) failed. Lock cleared on each — safe to retry.`);
    console.log(`  Retry individually: /research [stubId]`);
    console.log(`  Or re-run /week — resume check will pick up remaining stubs.\n`);
  }
  if (okCount === 0) {
    console.log(`\n❌ No stubs reached research_ready — stopping.`);
    return;
  }
  console.log(`\nContinuing to Phase 3 — Draft (${okCount} stub(s) ready)...\n`);
  await runPhase3Draft(weekState);
}
```

### Research Subagent — `runResearchForStub(stubId, weekState)`

Encapsulates the full `/research` SOP for one stub. Key differences:
- **Step 2**: Uses `stubId` as direct record lookup instead of "oldest planned" filter
- **workflowId**: Uses `weekState.workflowId` for log correlation
- **Stale lock handling**: If `research_started_at` is set on the target stub, clear it and proceed (same as standalone `/research` idempotency behavior)
- **Error path**: Returns `{ status: "failed", error }` instead of printing; clears lock before returning

```javascript
async function runResearchForStub(stubId, weekState) {
  // STATE for this subagent (uses parent workflowId for correlation)
  const subState = {
    workflowId: weekState.workflowId,
    stage: "init",
    entityType: "post",
    entityId: stubId,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  };

  try {
    // Step 1: Brand context — use session cache (loaded in Phase 0, never re-fetch)
    const brand = weekState.cache.brand;
    if (!brand) throw new Error("weekState.cache.brand is empty — Phase 0 cache preload may have failed");

    // Step 2: Load target stub by ID (not "oldest planned" filter)
    const postStub = await getRecord(TABLES.POSTS, stubId,
      ['id','status','idea_id','angle_index','planned_week','planned_order','research_started_at']);
    if (!postStub) throw new Error(`Post stub ${stubId} not found`);

    // Stale lock check: if research_started_at is set on this stub, clear it and proceed
    if (postStub.research_started_at) {
      subState.stage = "clearing_stale_lock";
      await logEntry({ workflow_id: subState.workflowId, entity_id: stubId,
        step_name: "stale_lock_cleared", stage: subState.stage,
        output_summary: `Stale lock found on ${stubId} — cleared, retrying`, status: "success" });
      await clearLock(TABLES.POSTS, stubId, 'research_started_at', 'planned');
    }

    const ideaId    = postStub.idea_id;            // UUID FK (not an array)
    const angleIndex = postStub.angle_index ?? 0;
    if (!ideaId) throw new Error("Post stub missing idea_id");

    // Steps 3–11: Full /research SOP
    // See .claude/commands/research.md for complete step-by-step.
    // All log calls use subState.workflowId = weekState.workflowId.
    //
    // Step 3: Load idea + UIF
    //         Note: weekState.postStubMap[stubId].uif has the shallow UIF from Phase 1 —
    //         /research still fetches fresh from Supabase here (stub might have been pre-existing
    //         from a resume, with no cached UIF). Use the Supabase fetch as source of truth.
    // Step 4: Set LOCK — research_started_at = now(), status = "researching"
    // Step 5: Research Architect LLM call (researcher.md system prompt)
    // Step 6: NLM research (fast path or full path — see research.md Step 6)
    // Step 7: UIF Merger LLM call + validateUIF() gate
    // Step 8: Write updated UIF to ideas table + mark stub research_ready
    // Step 9: Hook extraction + write to hooks_library
    // Step 10: Log completion

    // ── CACHE UPDATE: write deepened UIF back to weekState for draft phase ──
    // updatedUIF is the result from the UIF Merger (Step 7 above).
    // Draft phase reads weekState.postStubMap[stubId].uif instead of re-fetching from Supabase.
    if (updatedUIF && weekState.postStubMap[stubId]) {
      weekState.postStubMap[stubId].uif = updatedUIF;
    }

    return { status: "ok" };

  } catch (error) {
    // Clear lock on failure
    try {
      await clearLock(TABLES.POSTS, stubId, 'research_started_at', 'planned');
    } catch (_) {}

    await logEntry({ workflow_id: weekState.workflowId, entity_id: stubId,
      step_name: "research_subagent_error", stage: subState.stage,
      timestamp: new Date().toISOString(),
      output_summary: `Research subagent failed: ${error.message}`,
      model_version: "n/a", status: "error" });

    return { status: "failed", error: error.message };
  }
}
```

---

## Phase 3 — Draft (Sequential)

Sequential by design: fast (~10s/post), and sequential output is readable. Parallel would interleave terminal output and make errors hard to read.

```javascript
async function runPhase3Draft(weekState) {
  updateStage("draft_start");

  // Re-verify statuses from Supabase before filtering (handles resume case)
  const refreshed = await getRecords(TABLES.POSTS,
    { id: weekState.postStubIds },
    { fields: ['id','status'], limit: weekState.postStubIds.length });
  refreshed.forEach(r => {
    if (weekState.postStubMap[r.id]) weekState.postStubMap[r.id].status = r.status;
  });

  const stubsToDraft = weekState.postStubIds.filter(
    id => weekState.postStubMap[id]?.status === "research_ready"
  );

  if (stubsToDraft.length === 0) {
    console.log(`\n✅ All research_ready stubs already drafted — skipping Phase 3.\n`);
    await runPhase4Review(weekState);
    return;
  }

  console.log(`\n${"━".repeat(52)}`);
  console.log(`PHASE 3 — DRAFT                                 /week`);
  console.log(`${"━".repeat(52)}`);

  // ── LIBRARY PRELOAD ────────────────────────────────────────────────────────
  // Load frameworks, hooks, and snippets ONCE before the draft loop.
  // Each runDraftForStub() reads from weekState.cache instead of querying Supabase per post.
  updateStage("library_preload");

  // Frameworks — all non-retired
  const allFrameworks = await getRecords(TABLES.FRAMEWORKS, null,
    { fields: ['id','framework_name','description','one_liner','use_when','example','status','source_link','avg_score'], limit: 200 });
  weekState.cache.frameworks = allFrameworks.filter(f => f.status !== 'retired');

  // Hooks — all non-retired, sorted by avg_score desc (intent filtering done in-memory per post)
  const allHooks = await getRecords(TABLES.HOOKS, null,
    { fields: ['id','hook_text','hook_type','intent','status','avg_score','source_idea_id','angle_name'],
      orderBy: { col: 'avg_score', dir: 'desc' }, limit: 200 });
  weekState.cache.hooks = allHooks.filter(h => h.status !== 'retired').slice(0, 60);

  // Snippets — eligible only (cooldown filter applied in-memory)
  const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const allSnippets = await getRecords(TABLES.SNIPPETS, null,
    { fields: ['id','snippet_text','category','tags','last_used_at','status','snippet_fit_avg'], limit: 300 });
  weekState.cache.snippets = allSnippets
    .filter(s => !s.last_used_at || s.last_used_at < cutoff)
    .slice(0, 50);

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "library_preload", stage: "library_preload",
    timestamp: new Date().toISOString(),
    output_summary: `Library cache loaded: ${weekState.cache.frameworks?.length ?? 0} frameworks, ${weekState.cache.hooks?.length ?? 0} hooks, ${weekState.cache.snippets?.length ?? 0} snippets`,
    model_version: "n/a", status: "success" });
  // ── END LIBRARY PRELOAD ───────────────────────────────────────────────────

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "phase_3_start", stage: "draft_start",
    timestamp: new Date().toISOString(),
    output_summary: `Phase 3 — Drafting ${stubsToDraft.length} stubs sequentially`,
    model_version: "n/a", status: "success" });

  for (const stubId of stubsToDraft) {
    const stub = weekState.postStubMap[stubId];
    console.log(`\nDrafting Post ${stub.plannedOrder} of ${stubsToDraft.length}...`);

    try {
      await runDraftForStub(stubId, weekState);
      weekState.draftResults[stubId] = { status: "ok" };
      weekState.postStubMap[stubId].status = "drafted";
      console.log(`  ✅ Post ${stub.plannedOrder} drafted`);
    } catch (error) {
      weekState.draftResults[stubId] = { status: "failed", error: error.message };
      console.log(`  ❌ Post ${stub.plannedOrder} failed: ${error.message}`);
      // Stub remains at research_ready — retry with /draft [id]
    }
  }

  const draftOk   = Object.values(weekState.draftResults).filter(r => r.status === "ok").length;
  const draftFail = Object.values(weekState.draftResults).filter(r => r.status === "failed").length;

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "phase_3_complete", stage: "draft_complete",
    timestamp: new Date().toISOString(),
    output_summary: `Phase 3: ${draftOk} drafted, ${draftFail} failed`,
    model_version: "n/a", status: draftFail > 0 ? "error" : "success" });

  if (draftOk === 0) {
    console.log(`\n❌ No stubs drafted successfully — stopping. Retry with /draft [id].`);
    return;
  }
  if (draftFail > 0) {
    console.log(`\n⚠ ${draftFail} stub(s) failed drafting. Retry individually with /draft [id].`);
    console.log(`Continuing to review with ${draftOk} drafted post(s)...\n`);
  }
  await runPhase4Review(weekState);
}
```

### Draft Subagent — `runDraftForStub(stubId, weekState)`

Full `/draft` SOP for one stub. Key differences:
- **Step 2**: Uses `stubId` as direct record lookup instead of "oldest research_ready" filter
- **workflowId**: Uses `weekState.workflowId`
- **Error path**: Throws instead of printing — Phase 3 loop catches it

```javascript
async function runDraftForStub(stubId, weekState) {
  // Step 1: Brand context — use weekState.cache.brand (loaded in Phase 0, never re-fetch)
  // Step 2: Load stub by ID — getRecord(TABLES.POSTS, stubId, [...])
  // Step 3: Load idea + parse UIF — use weekState.postStubMap[stubId].uif (deepened by research)
  //         Falls back to getRecord(TABLES.IDEAS, ideaId, [...]) only if cache miss (e.g. resume from partial state)
  // Step 4: Platform default: "linkedin"
  // Step 5: Query framework_library — use weekState.cache.frameworks (loaded in Phase 3 preamble)
  //         Falls back to getRecords(TABLES.FRAMEWORKS, ...) if cache miss
  // Step 6: Query hooks_library — use weekState.cache.hooks, filter in-memory by intent
  //         Falls back to getRecords(TABLES.HOOKS, ...) if cache miss
  // Step 7: Query humanity_snippets — use weekState.cache.snippets (cooldown pre-filtered)
  //         Falls back to getRecords(TABLES.SNIPPETS, ...) if cache miss
  // Step 8: In-session LLM call (claude-sonnet-4-6, writer.md system prompt — Max subscription, NOT SDK)
  //         validatePost() gate — word count 150–250, structure valid
  // Step 9: patchRecord(TABLES.POSTS, stubId, {...}):
  //         status="drafted", draft_content, hook_id, framework_id, humanity_snippet_id,
  //         alt_snippet_ids, needs_snippet, intent, format, platform, drafted_at=now()
  //         Update humanity_snippets.last_used_at = now() (immediate — not at score time)
  // Step 10: Log LLM call via logEntry({...}) (workflow_id = weekState.workflowId)
  //
  // See .claude/commands/draft.md for the complete step-by-step.
}
```

---

## Phase 4 — Review (Interactive, One Post at a Time)

```javascript
async function runPhase4Review(weekState) {
  updateStage("review_start");

  // Re-verify statuses from Supabase (handles resume — only show still-drafted posts)
  const refreshed = await getRecords(TABLES.POSTS,
    { id: weekState.postStubIds },
    { fields: ['id','status'], limit: weekState.postStubIds.length });
  refreshed.forEach(r => {
    if (weekState.postStubMap[r.id]) weekState.postStubMap[r.id].status = r.status;
  });

  const stubsToReview = weekState.postStubIds.filter(
    id => weekState.postStubMap[id]?.status === "drafted"
  );

  if (stubsToReview.length === 0) {
    console.log(`\n✅ No drafted posts to review.\n`);
    printWeekSummary(weekState);
    return;
  }

  console.log(`\n${"━".repeat(52)}`);
  console.log(`PHASE 4 — REVIEW                                /week`);
  console.log(`${"━".repeat(52)}`);
  console.log(`${stubsToReview.length} post(s) to review. Decisions save immediately.\n`);

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "phase_4_start", stage: "review_start",
    timestamp: new Date().toISOString(),
    output_summary: `Phase 4 — Reviewing ${stubsToReview.length} drafted posts`,
    model_version: "n/a", status: "success" });

  let reviewedCount = 0;
  const totalToReview = stubsToReview.length;

  for (const stubId of stubsToReview) {
    reviewedCount++;
    const stub = weekState.postStubMap[stubId];

    // Load full post data for this stub (draft_content + FK ids)
    const post = await getRecord(TABLES.POSTS, stubId,
      ['id','status','draft_content','intent','format','platform','hook_id','framework_id','humanity_snippet_id','alt_snippet_ids','needs_snippet','idea_id']);
    // FK lookups (hook, framework, snippet, alt_snippets) — same as /review Step 2,
    // performed inline via getRecord(TABLES.HOOKS / FRAMEWORKS / SNIPPETS, ...) when needed.

    // Post header
    console.log(`\n${"━".repeat(52)}`);
    console.log(`POST ${reviewedCount} OF ${totalToReview}  — /week Phase 4`);
    const intentLabel = stub.intent ?? post.intent ?? "";
    console.log(`Platform: linkedin | Intent: ${intentLabel}`);
    console.log(`${"━".repeat(52)}`);

    // Pass 1–3: Editorial optimization (3-pass inline — same as /review Step 2.5)
    // Pass 1: Humanizer skill (AI-tell removal)
    // Pass 2: Brand fidelity check (inline reasoning against editorial.md)
    // Pass 3: Conditional repair if recommendation = repair_needed
    // optimization = { originalContent, winnerContent, fidelityReport, preferOriginal }
    let optimization = await runEditorialOptimization(post, weekState);

    // Display (same format as /review Step 3)
    displayPostForReview(post, optimization, reviewedCount, totalToReview);

    // Interactive decision loop — same commands as /review
    let postDecided = false;
    let revisionCount = 0;
    const MAX_REVISIONS = 3;

    while (!postDecided) {
      const input = await getUserInput("\nEnter choice: ");
      const cmd = input.trim().toLowerCase();

      if (cmd === "a") {
        // Approve optimized — patchRecord(TABLES.POSTS, stubId, { draft_content, status: 'approved', approved_at: now() })
        await approvePost(stubId, optimization.winnerContent, false, weekState);
        weekState.reviewResults[stubId] = { status: "approved" };
        weekState.postStubMap[stubId].status = "approved";
        optimization = null;
        postDecided = true;
        console.log(`\n✅ Post ${reviewedCount} approved.`);

      } else if (cmd === "ao") {
        // Approve original
        await approvePost(stubId, optimization.originalContent, true, weekState);
        weekState.reviewResults[stubId] = { status: "approved" };
        weekState.postStubMap[stubId].status = "approved";
        optimization = null;
        postDecided = true;
        console.log(`\n✅ Post ${reviewedCount} approved (original).`);

      } else if (cmd.startsWith("r ") && !cmd.startsWith("ro ")) {
        // Revise optimized
        if (revisionCount >= MAX_REVISIONS) {
          console.log(`\n⚠ Max ${MAX_REVISIONS} revisions reached. Use a, ao, or x.`);
        } else {
          revisionCount++;
          const notes = input.slice(2).trim();
          optimization = await revisePost(stubId, notes, optimization, "optimized", weekState);
          displayPostForReview(post, optimization, reviewedCount, totalToReview);
        }

      } else if (cmd.startsWith("ro ")) {
        // Revise original
        if (revisionCount >= MAX_REVISIONS) {
          console.log(`\n⚠ Max ${MAX_REVISIONS} revisions reached. Use a, ao, or x.`);
        } else {
          revisionCount++;
          const notes = input.slice(3).trim();
          optimization = await revisePost(stubId, notes, optimization, "original", weekState);
          displayPostForReview(post, optimization, reviewedCount, totalToReview);
        }

      } else if (cmd === "?") {
        // Show original inline — no state change
        console.log(`\nORIGINAL DRAFT:\n${"─".repeat(40)}\n${optimization.originalContent}\n${"─".repeat(40)}\n`);

      } else if (cmd === "x") {
        // Reject
        await patchRecord(TABLES.POSTS, stubId, { status: "rejected" });
        await logEntry({ workflow_id: weekState.workflowId, entity_id: stubId,
          step_name: "post_rejected", stage: "review_rejected",
          timestamp: new Date().toISOString(), output_summary: "Post rejected",
          model_version: "n/a", status: "success" });
        weekState.reviewResults[stubId] = { status: "rejected" };
        weekState.postStubMap[stubId].status = "rejected";
        optimization = null;
        postDecided = true;
        console.log(`\nPost ${reviewedCount} rejected.`);

      } else if (cmd === "s1" || cmd === "s2") {
        // Snippet swap — same as /review snippet swap handler
        await handleSnippetSwap(stubId, cmd, post, weekState);
        // Reload post + redisplay
        displayPostForReview(post, optimization, reviewedCount, totalToReview);

      } else if (/^sf [1-5]$/.test(cmd)) {
        // Rate snippet fit
        const score = parseInt(cmd.slice(3));
        await patchRecord(TABLES.POSTS, stubId, { snippet_fit_score: score });
        console.log(`✅ Snippet fit: ${score}/5 saved.`);

      } else if (cmd.startsWith("sn ")) {
        // Save new snippet candidate
        const text = input.slice(3).trim();
        if (text.length < 20) { console.log("⚠ Snippet too short — provide at least a sentence."); }
        else {
          await createRecord(TABLES.SNIPPETS, { snippet_text: text, status: "candidate" });
          console.log(`✅ Snippet candidate saved.`);
        }

      } else {
        console.log(`\n⚠ Unknown command. Options: a / ao / r [notes] / ro [notes] / ? / x / s1 / s2 / sf [1-5] / sn [text]`);
      }
    }

    // Post decided — transition message
    if (reviewedCount < totalToReview) {
      console.log(`\nMoving to Post ${reviewedCount + 1} of ${totalToReview}...\n`);
    }
  }

  // Phase 4 complete
  const approvedCount = Object.values(weekState.reviewResults).filter(r => r.status === "approved").length;
  const rejectedCount = Object.values(weekState.reviewResults).filter(r => r.status === "rejected").length;

  await logEntry({ workflow_id: weekState.workflowId, entity_id: targetWeek,
    step_name: "phase_4_complete", stage: "review_complete",
    timestamp: new Date().toISOString(),
    output_summary: `Phase 4: ${approvedCount} approved, ${rejectedCount} rejected of ${totalToReview}`,
    model_version: "n/a", status: "success" });

  weekState.phase = "complete";
  printWeekSummary(weekState);
}
```

### Post Display Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST 2 OF 3  — /week Phase 4
Platform: linkedin | Intent: authority
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[optimized post content]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EDITORIAL  Brand: [X]/10 | Platform: [X]/10 | Repair: [yes/no]
  Fixed:     [what was improved]
  Kept:      [what was preserved]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hook:        [hook_text] ([hook_type])
Framework:   [framework_name]
Snippet:     [snippet first 80 chars] [⚠ needs_snippet if true]
  Alt 1:     [alt_snippet_1 first 80 chars] (or "none")
  Alt 2:     [alt_snippet_2 first 80 chars] (or "none")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
  a   — approve optimized    ao  — approve original
  r [notes] — revise         ro [notes] — revise original
  ?   — show original        x   — reject
  s1 / s2  — swap snippet    sf [1-5]  — rate snippet
  sn [text] — save new snippet candidate
```

---

## Week Summary

```javascript
function printWeekSummary(weekState) {
  const approved    = weekState.postStubIds.filter(id => weekState.reviewResults[id]?.status === "approved");
  const rejected    = weekState.postStubIds.filter(id => weekState.reviewResults[id]?.status === "rejected");
  const notReviewed = weekState.postStubIds.filter(id => !weekState.reviewResults[id]);
  const researchFailed = weekState.postStubIds.filter(id => weekState.researchResults[id]?.status === "failed");

  console.log(`\n${"━".repeat(52)}`);
  console.log(`WEEK COMPLETE — ${weekState.targetWeek}                  /week`);
  console.log(`${"━".repeat(52)}`);
  console.log(`\n  Research:  ${weekState.postStubIds.length - researchFailed.length} ok, ${researchFailed.length} failed`);
  console.log(`  Approved:  ${approved.length} post(s) ready to publish`);
  console.log(`  Rejected:  ${rejected.length} post(s)`);
  if (notReviewed.length > 0) {
    console.log(`  Pending:   ${notReviewed.length} post(s) not reviewed this session`);
  }

  if (researchFailed.length > 0) {
    console.log(`\n  Failed research (retry with /research [id]):`);
    researchFailed.forEach(id => {
      const stub = weekState.postStubMap[id];
      console.log(`    • Post ${stub.plannedOrder}: ${id}`);
      console.log(`      ${weekState.researchResults[id]?.error ?? "unknown error"}`);
    });
  }

  if (approved.length > 0) {
    console.log(`\nApproved posts are ready. Run /publish for each when ready to go live.`);
  }
  console.log(`Note: /publish and /score remain separate — LinkedIn action required.`);
  console.log(`${"━".repeat(52)}\n`);
}
```

---

## Error Handling Summary

| Phase | Failure scope | Recovery |
|---|---|---|
| Phase 1 — Plan | Whole command | List written stub IDs; manual cleanup before retry |
| Phase 2 — Research | Per stub, isolated | Lock cleared; stub stays `planned`; week continues without it |
| Phase 3 — Draft | Per stub, isolated | Stub stays `research_ready`; retry with `/draft [id]` |
| Phase 4 — Review | Per write (approve/reject) | Re-present options without advancing; retry same post |

All errors use format: `❌ /week failed at [phase]/[stage] — [message] — [recovery hint]`

---

## Supabase Writes (Full Reference)

All columns exist in `pipeline.*` (see `infra/supabase/schema.sql`). All names are snake_case.

| Phase | Table | Columns |
|---|---|---|
| Plan | `pipeline.posts` | `idea_id` (uuid FK), `planned_week`, `planned_order`, `narrative_role`, `angle_index`, `status="planned"`, `pillar`, `thesis_angle`, `source_angle_name`, `territory_key`, `post_class`, `selection_reason`, series fields |
| Plan | `pipeline.ideas` | `status="Selected"`, `selected_at`, `planned_week`, `planned_order`, `narrative_role`, `selection_reason` |
| Research | `pipeline.posts` | `research_started_at` (lock → null on completion), `status="researching"→"research_ready"`, `research_completed_at` |
| Research | `pipeline.ideas` | `intelligence_file` (updated UIF), `research_depth="deep"`, `research_completed_at`, `status="Ready"` |
| Research | `pipeline.hooks_library` | new hook rows per stub (`source_idea_id` uuid FK) |
| Draft | `pipeline.posts` | `draft_content`, `hook_id`, `framework_id`, `humanity_snippet_id`, `alt_snippet_ids`, `needs_snippet`, `intent`, `format`, `platform="linkedin"`, `status="drafted"`, `drafted_at` |
| Draft | `pipeline.humanity_snippets` | `last_used_at=now()` |
| Review | `pipeline.posts` | `draft_content` (if revised), `status="approved"\|"rejected"`, `approved_at`, `humanity_snippet_id` (if swapped), `snippet_fit_score` |
| All phases | `pipeline.logs` | `workflow_id`, `entity_id`, `step_name`, `stage`, `timestamp`, `output_summary`, `model_version`, `status` |
