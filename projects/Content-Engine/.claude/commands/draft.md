# /draft — Post Drafting Command

Create a draft post from a `research_ready` post stub, using the stub's assigned angle, framework, hook, and humanity snippet.

---

## Precondition

Post stub `status = "research_ready"`.

Default: oldest research_ready post stub by `planned_week` asc, `planned_order` asc.
With argument: `/draft [post_stub_id]` — draft a specific post stub.

Risk tier: medium → S + T + E required.

---

## Shared Session Cache

When invoked from `/week`, a `weekState.cache` object is available containing data pre-loaded
once for the whole week. Reference it at each step before making a Supabase call. This avoids
re-fetching the same reference data (brand, frameworks, hooks, snippets) for every post.

**Cache keys:**
- `weekState.cache.brand` — brand record (loaded in /week Phase 0)
- `weekState.cache.frameworks` — all non-retired framework records (loaded before Phase 3 loop)
- `weekState.cache.hooks` — all non-retired hook records, unfiltered by intent (filter in-memory)
- `weekState.cache.snippets` — eligible snippet records with cooldown filter applied (≤50)
- `weekState.postStubMap[stubId].uif` — deepened UIF written back after research completes

**Fallback**: If no `weekState` (standalone `/draft` run), fetch from Supabase as normal.

> **Supabase**: All reads/writes go through `tools/supabase.mjs` — never call Supabase MCP from inside this command (token-conscious rule). Column registry: `.claude/skills/supabase.md`. All columns are snake_case.

```javascript
import {
  getRecords, getRecord, createRecord, patchRecord,
  logEntry, TABLES,
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
```

---

## Steps

### 1. Find brand context
```javascript
// SESSION CACHE: use weekState.cache.brand if available (pre-loaded in /week Phase 0).
// Standalone /draft: fetch from Supabase.
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
// Otherwise: oldest research_ready stub by planned_week asc, planned_order asc.
let postStub;
if (typeof argument === 'string' && argument.length > 0) {
  postStub = await getRecord(TABLES.POSTS, argument,
    ['id','status','idea_id','angle_index','planned_week','planned_order','intent']);
  if (!postStub) throw new Error(`Post stub ${argument} not found`);
} else {
  const candidates = await getRecords(TABLES.POSTS,
    { status: 'research_ready' },
    {
      fields: ['id','status','idea_id','angle_index','planned_week','planned_order','intent'],
      orderBy: { col: 'planned_week', dir: 'asc' },
      limit: 50,
    });
  // Secondary in-memory sort by planned_order asc (PostgREST single-key order is enforced above).
  candidates.sort((a, b) => (a.planned_order ?? 9999) - (b.planned_order ?? 9999));
  if (candidates.length === 0) {
    return "No post stubs with status = research_ready. Run /research first.";
  }
  postStub = candidates[0];
}

const angleIndex = postStub.angle_index ?? 0;
const ideaId     = postStub.idea_id;            // UUID FK (not an array)
if (!ideaId) throw new Error("Post stub is missing idea_id — check pipeline.posts row");
```

### 3. Load idea + parse UIF
```javascript
// SESSION CACHE: use weekState.postStubMap[stubId].uif if available.
// This is the deepened UIF written back by /research after it completes — no re-fetch needed.
// Standalone /draft or cache miss: fetch from Supabase.
let idea = null;
if (!weekState?.postStubMap?.[postStub.id]?.uif) {
  idea = await getRecord(TABLES.IDEAS, ideaId,
    ['id','topic','intelligence_file','content_brief','intent']);
  if (!idea) throw new Error(`Idea ${ideaId} not found in pipeline.ideas`);
}

const uif = weekState?.postStubMap?.[postStub.id]?.uif
  ?? (idea.intelligence_file ? JSON.parse(idea.intelligence_file) : null);
if (!uif) throw new Error("intelligence_file is null — research may not have completed");

const contentBrief = weekState?.postStubMap?.[postStub.id]?.contentBrief
  ?? (idea?.content_brief ? JSON.parse(idea.content_brief) : null);

// Resolve the post's intent — prefer post stub, fall back to idea
const ideaIntent = postStub.intent ?? idea?.intent ?? null;

// Select the assigned angle
const angle = uif.angles?.[angleIndex];
if (!angle) throw new Error(`angle_index ${angleIndex} not found in UIF (${uif.angles?.length ?? 0} angles)`);
```

### 4. Determine platform

Default to `"linkedin"`. In a future iteration this can be derived from `contentBrief.distribution_platforms`.

```javascript
const platform = "linkedin";
```

### 5. Query framework_library
```javascript
updateStage(state, "framework_query");
// SESSION CACHE: use weekState.cache.frameworks if available (pre-loaded before Phase 3 loop).
// Standalone /draft: fetch from Supabase, in-memory filter for non-retired.
let allFrameworks;
if (weekState?.cache?.frameworks) {
  allFrameworks = weekState.cache.frameworks;
} else {
  const rows = await getRecords(TABLES.FRAMEWORKS, null,
    { fields: ['id','framework_name','description','one_liner','use_when','example','status','source_link','avg_score','pattern_type'], limit: 200 });
  allFrameworks = rows.filter(f => f.status !== 'retired');
}
// Selection: multi-dimensional weighted scoring — see scoreFramework() in improver.md
const framework = scoreFramework(allFrameworks, angle, idea);
```

### 6. Query hooks_library
```javascript
updateStage(state, "hook_query");
// SESSION CACHE: use weekState.cache.hooks if available (all non-retired hooks, unfiltered).
// Filter by intent in-memory after retrieving from cache — same result, no extra round-trip.
let allHooks;
if (weekState?.cache?.hooks) {
  allHooks = weekState.cache.hooks;
} else {
  const rows = await getRecords(TABLES.HOOKS, null,
    { fields: ['id','hook_text','hook_type','intent','status','avg_score','source_idea_id','angle_name'],
      orderBy: { col: 'avg_score', dir: 'desc' }, limit: 200 });
  allHooks = rows.filter(h => h.status !== 'retired').slice(0, 60);
}
// Filter in-memory by intent; fall back to all non-retired if no intent match
const intentHooks = allHooks.filter(h => h.intent === ideaIntent);
const hookPool = intentHooks.length > 0 ? intentHooks : allHooks;
// Selection: multi-dimensional weighted scoring — see scoreHook() in improver.md
const hook = scoreHook(hookPool, ideaIntent);
```

### 7. Query humanity_snippets
```javascript
updateStage(state, "snippet_query");
// SESSION CACHE: use weekState.cache.snippets if available (pre-loaded with cooldown filter).
// Standalone /draft: fetch from Supabase, apply 28-day cooldown filter in-memory.
let allSnippets;
if (weekState?.cache?.snippets) {
  allSnippets = weekState.cache.snippets;
} else {
  const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await getRecords(TABLES.SNIPPETS, null,
    { fields: ['id','snippet_text','category','tags','last_used_at','status','snippet_fit_avg'], limit: 300 });
  allSnippets = rows
    .filter(s => !s.last_used_at || s.last_used_at < cutoff)
    .slice(0, 50);
}
// Top 3 candidates via weighted scoring (see querySnippets in improver.md).
// snippet = best match; alternateSnippets = next 2 for /review to offer.
const snippetCandidates = scoreSnippets(allSnippets, angle, 3);
const snippet = snippetCandidates[0] ?? null;
const alternateSnippets = snippetCandidates.slice(1);
const needsSnippet = snippet === null;
// Weighted formula: (tagOverlap*4) + (textOverlap*2) + (avgScore*1.0) + (erScore*0.5) - (usedCount*0.25)
```

### 8. Generate draft (writer skill)
```javascript
updateStage(state, "drafting");
// Classify supporting facts by citation weight before passing to writer:
// Primary (anchor claims): source_tier tier1|tier2 AND verified: true
// Color only (framing, not standalone claims): tier3|tier4
// Never standalone: verified: false (only usable when a verified fact already anchors the point)
const supporting_facts = angle.supporting_facts ?? [];
// Call claude-sonnet-4-6 with writer.md Draft Generation Prompt
// Inputs: uif, angle, supporting_facts, framework, hook, snippet (or null), platform, brand
// Log result (step_name: "draft_generation")
const draftContent = await generateDraft({ uif, angle, supporting_facts, framework, hook, snippet, platform, brand });
```

**E — Explicit gate**: Run `validatePost({ draft_content: draftContent, platform })` — must pass before writing to post stub.

<!-- BACKLOG GAP-2: Draft fact citation gate (LLM-soft, not enforced)
     Current state: citation rules live in writer.md system prompt and facts are
     labeled [tier / verified] inline — the writer is instructed but not blocked.
     A verified:false fact used as a standalone anchor claim will not be caught.
     To close: add a post-generation check that parses draftContent against the
     fact list and rejects any draft that cites a verified:false fact without a
     verified:true anchor already present in the post.
     Revisit when: post volume is high enough that manual review can't catch it,
     or after the first time a bad citation ships.
-->

### 9. Patch post stub in place
```javascript
updateStage(state, "writing");
// Do NOT create a new row — update the existing post stub.
// FK columns: hook_id / framework_id / humanity_snippet_id are uuid (single value, not arrays).
// alt_snippet_ids is uuid[] — write as a JS array of UUIDs.
await patchRecord(TABLES.POSTS, postStub.id, {
  platform,
  intent:              ideaIntent,
  format:              framework?.pattern_type ?? "none",
  draft_content:       draftContent,
  hook_id:             hook?.id ?? null,
  framework_id:        framework?.id ?? null,
  humanity_snippet_id: snippet?.id ?? null,
  alt_snippet_ids:     alternateSnippets.map(s => s.id),
  needs_snippet:       needsSnippet,
  status:              "drafted",
  drafted_at:          new Date().toISOString(),
});

// Set cooldown on selected snippet immediately — at draft time, not score time.
// This prevents the same snippet from being picked again within 28 days even if
// /score hasn't run yet (which would be 7+ days after publish).
if (snippet) {
  await patchRecord(TABLES.SNIPPETS, snippet.id, {
    last_used_at: new Date().toISOString(),
  });
}
```

### 10. Log completion
```javascript
await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      postStub.id,
  step_name:      "draft_created",
  stage:          "complete",
  output_summary: `Draft written to post stub ${postStub.id}: ${platform} / ${angle.angle_name} / framework: ${framework?.framework_name ?? "none"} / hook: ${hook?.id ?? "none"}`,
  model_version:  "claude-sonnet-4-6",
  status:         "success",
});
```

### 11. Report to Simon
```
✅ Draft created: [platform] — Angle [N]: [angle_name]
   Framework: [framework_name] | Hook: [hook_type]
   Snippet: [snippet_text first 60 chars...] (+ [N] alternates for /review)
```

If `needs_snippet = true`:
```
⚠ No snippet matched for angle: [angle_name]
  What would fit: [brief description of the kind of operational moment that would work —
  e.g., "a specific moment when you discovered a silent failure in a production pipeline"]
```

After draft:
```
Draft written to post stub. Run /review to approve.
```

---

## Writes

| Table | Column | Value |
|---|---|---|
| `pipeline.posts` | `platform` | `"linkedin"` |
| `pipeline.posts` | `intent` | from idea.intent (or post stub's pre-set intent) |
| `pipeline.posts` | `format` | framework `pattern_type` |
| `pipeline.posts` | `draft_content` | generated post text |
| `pipeline.posts` | `hook_id` | uuid FK (single value, nullable) |
| `pipeline.posts` | `framework_id` | uuid FK (single value, nullable) |
| `pipeline.posts` | `humanity_snippet_id` | uuid FK (single value, nullable) |
| `pipeline.posts` | `alt_snippet_ids` | uuid[] — up to 2 alternate snippet candidates |
| `pipeline.posts` | `needs_snippet` | true/false |
| `pipeline.posts` | `status` | `"drafted"` |
| `pipeline.posts` | `drafted_at` | `now()` |
| `pipeline.humanity_snippets` | `last_used_at` | `now()` — written immediately on snippet selection to start the 28-day cooldown |
| `pipeline.logs` | one entry | draft_created |

---

## Rules

- **Single angle per run** — draft the post stub's assigned `angle_index` only. No iteration over all angles.
- **Patch, don't create** — the post stub already exists; update it in place. Never `createRecord` a new posts row.
- **Never block on missing snippet** — draft without, flag `needs_snippet = true`
- **Never fabricate a humanity snippet** — only use verified rows from `pipeline.humanity_snippets`
- `needs_snippet` is reported to Simon with a description of what kind of moment would fit
- `score_audience_relevance` is never read or used in any draft decision
- **`needs_snippet` must be derived, not hardcoded**: always `snippet === null` — never `false` as a literal
- **`alt_snippet_ids` must always be present in the payload**: `alternateSnippets.map(s => s.id)` (empty array `[]` if no alternates) — `/review` reads it directly

---

## Error Path

No persistent lock for `/draft`. If draft generation fails:

```javascript
} catch (error) {
  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      postStub.id,
    step_name:      "error",
    stage:          state.stage,
    output_summary: `Error: ${error.message}`,
    model_version:  "n/a",
    status:         "error",
  });
  return formatError("/draft", state.stage, error.message, false);
  // Output: ❌ /draft failed at [stage] — [error]
}
```

Post stub remains at `status = "research_ready"` — safe to retry.
