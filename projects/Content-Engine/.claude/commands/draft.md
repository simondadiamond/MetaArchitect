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
once for the whole week. Reference it at each step before making an Airtable call. This avoids
re-fetching the same reference data (brand, frameworks, hooks, snippets) for every post.

**Cache keys:**
- `weekState.cache.brand` — brand record (loaded in /week Phase 0)
- `weekState.cache.frameworks` — all non-retired framework records (loaded before Phase 3 loop)
- `weekState.cache.hooks` — all non-retired hook records, unfiltered by intent (filter in-memory)
- `weekState.cache.snippets` — eligible snippet records with cooldown filter applied (maxRecords: 50)
- `weekState.postStubMap[stubId].uif` — deepened UIF written back after research completes

**Fallback**: If no `weekState` (standalone `/draft` run), fetch from Airtable as normal.

> **Airtable**: Use MCP tools directly — no node scripts. All table IDs and field IDs are in `.claude/skills/airtable.md`. Always `typecast: true` on writes.

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
// Standalone /draft: fetch from Airtable.
//
// MCP (fallback only): mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblwfU5EpDgOKUF7f"
//   fieldIds: [fldsP8FwcTxJdkac8, fld7N55IwEM8CQYW0, fldLYt1DMS1Fwd5Vy, fldBtXwgSegiYP2pB]
//   (name, goals, icp_short, main_guidelines — colors/typography/icp_long not needed for drafting)
//   filters: name = "metaArchitect"
const brand = weekState?.cache?.brand ?? /* MCP fetch result */ brands[0];
if (!brand) throw new Error("Brand record 'metaArchitect' not found in Airtable");
```

### 2. Find target post stub
```javascript
// MCP: get_table_schema for status choice ID "research_ready", then:
//   mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs"
//   fieldIds: [fldlC1PMzRw0z6cTR, fldlGGDwqp6Hy17jT, fldwDOdJgmbf2IZKv,
//              fldViXirsiFl1j1w4, fldIqhg3WzB4vZfhl, fldps8GeW62IjxTze]
//   filters: status = "research_ready" (choice ID)
//   sort: fldViXirsiFl1j1w4 asc, fldIqhg3WzB4vZfhl asc
const posts = // result.records
if (posts.length === 0) {
  return "No post stubs with status = research_ready. Run /research first.";
}
const postStub = posts[0];
const angleIndex = postStub.fields?.angle_index ?? 0;
const ideaId = postStub.fields?.idea_id?.[0];

if (!ideaId) throw new Error("Post stub is missing idea_id — check Airtable data");
```

### 3. Load idea + parse UIF
```javascript
// SESSION CACHE: use weekState.postStubMap[stubId].uif if available.
// This is the deepened UIF written back by /research after it completes — no re-fetch needed.
// Standalone /draft or cache miss: fetch from Airtable as normal.
//
// MCP (fallback only): mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk"
//   recordIds: [ideaId]
//   fieldIds: [fldMtlpG32VKE0WkN, fldQMArYmpP8s6VKb, fldBvV1FgpD1l2PG1, fldF8BxXjbUiHCWIa]
const idea = // result.records[0] (only fetched if no cache hit)
if (!idea && !weekState?.postStubMap?.[postStub.id]?.uif) throw new Error(`Idea ${ideaId} not found`);

const uif = weekState?.postStubMap?.[postStub.id]?.uif
  ?? (idea.fields?.["Intelligence File"] ? JSON.parse(idea.fields["Intelligence File"]) : null);
if (!uif) throw new Error("Intelligence File is null — research may not have completed");

const contentBrief = weekState?.postStubMap?.[postStub.id]?.contentBrief
  ?? (idea?.fields?.content_brief ? JSON.parse(idea.fields.content_brief) : null);

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
// Standalone /draft: fetch from Airtable with maxRecords: 40 as a reasonable cap.
//
// MCP (fallback only): get_table_schema for status choice IDs, then list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblYsys2ydvryVtmf"
//   fieldIds: [fldcFJnXRemmm2PqU, fld92B4yioAGqEbfL, fldMPkk9oVvbqvTv5,
//              fldlCsQrc9GWIT1yg, fldoAs2QC066Th0x9, fldtVJ6vuENyFgz8A, fldBhDdj55AxwLEUl,
//              fldiGWr8FwZMQjqfe, fldAQX51YZ6YsIAE7]
//   filters: status != "retired"
//   maxRecords: 40  ← cap response size; library is small, top 40 is sufficient
const allFrameworks = weekState?.cache?.frameworks ?? /* MCP fetch result */ frameworks;
// Selection: multi-dimensional weighted scoring — see scoreFramework() in improver.md
const framework = scoreFramework(allFrameworks, angle, idea);
```

### 6. Query hooks_library
```javascript
updateStage(state, "hook_query");
// SESSION CACHE: use weekState.cache.hooks if available (all non-retired hooks, unfiltered).
// Filter by intent in-memory after retrieving from cache — same result, no extra round-trip.
// Standalone /draft: fetch from Airtable with intent filter + maxRecords: 60.
//
// MCP (fallback only): list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblWuQNSJ25bs18DZ"
//   fieldIds: [fldSIjqzsFuxWOaYb, fldOvWxj7O0x51aIX, fld6UZ8Fy7q2cZQyF,
//              fldVKrSnP34sofwZ7, fld0b1nWNg3ZXT21f, fldfckbIwaSSebctW,
//              fld6RgXuUNgyMBuFe, flddxiv4RPE8IEwvm]
//   filters: status != "retired", intent = idea.intent
//   maxRecords: 60  ← sorted by avg_score desc; top 60 covers all quality hooks
const allHooks = weekState?.cache?.hooks ?? /* MCP fetch result */ hooks;
// Filter in-memory by intent; fall back to all non-retired if no intent match
const intentHooks = allHooks.filter(h => h.fields?.intent === idea.fields?.intent);
const hookPool = intentHooks.length > 0 ? intentHooks : allHooks;
// Selection: multi-dimensional weighted scoring — see scoreHook() in improver.md
const hook = scoreHook(hookPool, idea.fields?.intent);
```

### 7. Query humanity_snippets
```javascript
updateStage(state, "snippet_query");
// SESSION CACHE: use weekState.cache.snippets if available (pre-loaded with cooldown filter).
// Standalone /draft: fetch from Airtable with date filter + maxRecords: 50.
//
// MCP (fallback only): list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblk8QpMOBOs6BMbF"
//   fieldIds: [fldaWegy2OyWpA28D, fldZFO5xKMiqBuUMY, fldiAFNJJZUcqhr7C,
//              fldZ6ifFD4OW0PDOt, fld90hLmFbyPWvy59, fldvIYK5Xh9v7BwOl,
//              fldfqHyUlwn7JqBFn]  ← last_used_at required for 28-day cooldown gate
//   filters: last_used_at < [28 days ago] OR last_used_at isEmpty
//   maxRecords: 50  ← cooldown filter pre-narrows; 50 is enough for weighted scoring
// Fetch top 3 candidates using weighted scoring (see querySnippets in improver.md).
// snippet = best match; alternateSnippets = next 2 for /review to offer.
const allSnippets = weekState?.cache?.snippets ?? /* MCP fetch result */ snippets;
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
// MCP: mcp__claude_ai_Airtable__update_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs", typecast: true
//   records: [{ id: postStub.id, fields: { ... } }] — see field IDs in airtable.md
// Do NOT create a new record — update the existing post stub.
await patchRecord(POSTS, postStub.id, {
  platform,
  intent: idea.fields?.intent,
  format: framework?.fields?.pattern_type ?? "none",
  draft_content: draftContent,
  hook_id: hook ? [hook.id] : [],
  framework_id: framework ? [framework.id] : [],
  humanity_snippet_id: snippet ? [snippet.id] : [],
  alt_snippet_ids: alternateSnippets.map(s => s.id),
  needs_snippet: needsSnippet,
  status: "drafted",
  drafted_at: new Date().toISOString()
});

// Set cooldown on selected snippet immediately — at draft time, not score time.
// This prevents the same snippet from being picked again within 28 days even if
// /score hasn't run yet (which would be 7+ days after publish).
if (snippet) {
  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF, typecast: true)
  //   records: [{ id: snippet.id, fields: { fldfqHyUlwn7JqBFn: now() } }]
  await patchRecord(SNIPPETS, snippet.id, {
    last_used_at: new Date().toISOString()
  });
}
```

### 10. Log completion
```javascript
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: postStub.id,
  step_name: "draft_created",
  stage: "complete",
  timestamp: new Date().toISOString(),
  output_summary: `Draft written to post stub ${postStub.id}: ${platform} / ${angle.angle_name} / framework: ${framework?.fields?.framework_name ?? "none"} / hook: ${hook?.id ?? "none"}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
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

| Table | Field | Value |
|---|---|---|
| `posts` | `platform` | `"linkedin"` |
| `posts` | `intent` | from idea.intent |
| `posts` | `format` | framework pattern_type |
| `posts` | `draft_content` | generated post text |
| `posts` | `hook_id` | linked to hook record (if matched) |
| `posts` | `framework_id` | linked to framework record (if matched) |
| `posts` | `humanity_snippet_id` | linked to snippet (if matched) |
| `posts` | `alt_snippet_ids` | linked to up to 2 alternate snippet candidates |
| `posts` | `needs_snippet` | true/false |
| `posts` | `status` | `"drafted"` |
| `posts` | `drafted_at` | `now()` |
| `humanity_snippets` | `last_used_at` | `now()` — written immediately on snippet selection to start the 28-day cooldown |
| `logs` | one entry | draft_created |

---

## Rules

- **Single angle per run** — draft the post stub's assigned `angle_index` only. No iteration over all angles.
- **Patch, don't create** — the post stub already exists; update it in place. Never `createRecord` a new posts record.
- **Never block on missing snippet** — draft without, flag `needs_snippet = true`
- **Never fabricate a humanity snippet** — only use verified records from `humanity_snippets` table
- `needs_snippet` is reported to Simon with a description of what kind of moment would fit
- `score_audience_relevance` is never read or used in any draft decision
- **`needs_snippet` must be derived, not hardcoded**: always `snippet === null` — never `false` as a literal
- **`alt_snippet_ids` must always be present in the payload**: `alternateSnippets.map(s => s.id)` (empty array `[]` if no alternates) — Airtable silently ignores missing fields; omitting it is invisible at write time but breaks `/review`
- **Airtable checkbox read-back**: `needs_snippet = false` (unchecked) does NOT appear in the API response — the field is absent, not `false`. This is correct Airtable behavior.

---

## Error Path

No persistent lock for `/draft`. If draft generation fails:

```javascript
} catch (error) {
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
  return formatError("/draft", state.stage, error.message, false);
  // Output: ❌ /draft failed at [stage] — [error]
}
```

Post stub remains at `status = "research_ready"` — safe to retry.
