# /draft — Post Drafting Command

Create a draft post from a `research_ready` post stub, using the stub's assigned angle, framework, hook, and humanity snippet.

---

## Precondition

Post stub `status = "research_ready"`.

Default: oldest research_ready post stub by `planned_week` asc, `planned_order` asc.
With argument: `/draft [post_stub_id]` — draft a specific post stub.

Risk tier: medium → S + T + E required.

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
// MCP: mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblwfU5EpDgOKUF7f"
//   fieldIds: all brand fields — filters: name = "metaArchitect"
const brands = // result.records
const brand = brands.length > 0 ? brands[0] : null;
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
// MCP: mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblVKVojZscMG6gDk"
//   recordIds: [ideaId]
//   fieldIds: [fldMtlpG32VKE0WkN, fldQMArYmpP8s6VKb, fldBvV1FgpD1l2PG1, fldF8BxXjbUiHCWIa]
const idea = // result.records[0]
if (!idea) throw new Error(`Idea ${ideaId} not found`);

const uif = idea.fields?.["Intelligence File"]
  ? JSON.parse(idea.fields["Intelligence File"])
  : null;
if (!uif) throw new Error("Intelligence File is null — research may not have completed");

const contentBrief = idea.fields?.content_brief
  ? JSON.parse(idea.fields.content_brief)
  : null;

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
// MCP: get_table_schema for status choice IDs, then list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblYsys2ydvryVtmf"
//   fieldIds: [fldcFJnXRemmm2PqU, fld92B4yioAGqEbfL, fldMPkk9oVvbqvTv5,
//              fldlCsQrc9GWIT1yg, fldoAs2QC066Th0x9, fldtVJ6vuENyFgz8A, fldBhDdj55AxwLEUl]
//   filters: status != "retired" — sort by proven first, then avg_score desc
const framework = await queryFramework(angle, idea);
```

### 6. Query hooks_library
```javascript
updateStage(state, "hook_query");
// MCP: list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblWuQNSJ25bs18DZ"
//   fieldIds: [fldSIjqzsFuxWOaYb, fldOvWxj7O0x51aIX, fld6UZ8Fy7q2cZQyF,
//              fldVKrSnP34sofwZ7, fld0b1nWNg3ZXT21f, fldfckbIwaSSebctW]
//   filters: status != "retired", intent = idea.intent — sort proven first
const hook = await queryHook(idea.fields?.intent);
```

### 7. Query humanity_snippets
```javascript
updateStage(state, "snippet_query");
// Fetch top 3 candidates using weighted scoring (see querySnippets below).
// snippet = best match; alternateSnippets = next 2 for /review to offer.
const snippetCandidates = await querySnippets(angle, 3);
const snippet = snippetCandidates[0] ?? null;
const alternateSnippets = snippetCandidates.slice(1);
const needsSnippet = snippet === null;
```

**querySnippets(angle, limit) — weighted scoring:**
```javascript
async function querySnippets(angle, limit = 3) {
  // MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF)
  //   fieldIds: [fldaWegy2OyWpA28D, fldZFO5xKMiqBuUMY, fldiAFNJJZUcqhr7C, fldZ6ifFD4OW0PDOt, fld90hLmFbyPWvy59]
  //   filters: status != "retired" (get_table_schema first for choice ID)
  const allSnippets = // result.records

  const angleText = [
    angle.angle_name ?? "",
    angle.contrarian_take ?? "",
    angle.single_lesson ?? "",
    angle.pillar_connection ?? ""
  ].join(" ").toLowerCase();

  function tokenize(text) {
    return text.split(/\W+/).filter(t => t.length > 3);
  }
  const angleTokens = tokenize(angleText);

  const scored = allSnippets.map(s => {
    const tags = String(s.fields.tags ?? "").toLowerCase().split(",").map(t => t.trim());
    const snippetText = String(s.fields.snippet_text ?? "").toLowerCase();
    const tagOverlap   = angleTokens.filter(t => tags.some(tag => tag.includes(t))).length;
    const textOverlap  = angleTokens.filter(t => snippetText.includes(t)).length;
    const avgScore     = Number(s.fields.avg_score ?? 0);
    const usedCount    = Number(s.fields.used_count ?? 0);

    const score = (tagOverlap * 4) + (textOverlap * 2) + (avgScore * 1.5) - (usedCount * 0.25);
    return { record: s, score, tagOverlap, textOverlap };
  });

  return scored
    .filter(x => x.tagOverlap > 0 || x.textOverlap > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.record);
}
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
