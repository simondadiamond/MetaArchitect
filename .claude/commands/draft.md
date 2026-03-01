# /draft — Post Drafting Command

Create draft posts from a researched idea using framework + hook + humanity snippet.

---

## Precondition

`status = researched` AND `research_completed_at IS NOT NULL`.

Default: oldest researched idea by `research_completed_at` ascending.
With argument: `/draft [record_id]` — draft a specific idea.

Risk tier: medium → S + T + E required.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "idea",
  entityId: idea.id
});
```

---

## Steps

### 1. Find brand context
```javascript
const brands = await getRecords(process.env.AIRTABLE_TABLE_BRAND, `{name} = "metaArchitect"`);
const brand = brands.length > 0 ? brands[0] : null;
if (!brand) throw new Error("Brand record 'metaArchitect' not found in Airtable (AIRTABLE_TABLE_BRAND)");
```

### 2. Find target idea
```javascript
const ideas = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `AND({status} = "researched", {research_completed_at} != "")`,
  [{ field: "research_completed_at", direction: "asc" }]
);
if (ideas.length === 0) {
  return "No ideas with status = researched. Run /research first.";
}
const idea = ideas[0];
```

### 2. Parse UIF
```javascript
const uif = idea.fields?.intelligence_file
  ? JSON.parse(idea.fields.intelligence_file)
  : null;
if (!uif) throw new Error("intelligence_file is null — research may not have completed");

const contentBrief = idea.fields?.content_brief
  ? JSON.parse(idea.fields.content_brief)
  : null;
```

### 3. Determine distribution targets
From `contentBrief.distribution_platforms[]` or default to `["linkedin"]`.
Each platform gets one draft per angle (or limit to top 2 angles if >3 to avoid overload).

For each `(platform, angle)` combination:

### 4. Query framework_library
```javascript
updateStage(state, "framework_query");
// Use improver.md Framework Query:
// Filter: status != retired, best_for contains angle's pillar
// Sort: proven first, then avg_score desc
const framework = await queryFramework(angle, idea);
```

### 5. Query hooks_library
```javascript
updateStage(state, "hook_query");
// Use improver.md Hook Query:
// Filter: status != retired, intent matches idea.intent
// Sort: proven first, then avg_score desc
const hook = await queryHook(idea.fields?.intent);
```

### 6. Query humanity_snippets
```javascript
updateStage(state, "snippet_query");
// Use improver.md Humanity Snippet Query:
// Filter: status = active, order used_count asc, tag overlap with angle
const snippet = await querySnippet(angle);
const needsSnippet = snippet === null;
```

### 7. Generate draft (writer skill)
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

**E — Explicit gate**: Run `validatePost({ draft_content: draftContent, platform })` — must pass before creating post record.

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

### 8. Create posts record
```javascript
updateStage(state, "writing");
const postRecord = await createRecord(process.env.AIRTABLE_TABLE_POSTS, {
  idea_id: [idea.id],
  platform,
  intent: idea.fields?.intent,
  format: framework?.fields?.pattern_type ?? "none",
  draft_content: draftContent,
  hook_id: hook ? [hook.id] : [],
  framework_id: framework ? [framework.id] : [],
  humanity_snippet_id: snippet ? [snippet.id] : [],
  needs_snippet: needsSnippet,
  status: "drafted",
  drafted_at: new Date().toISOString()
});
```

### 9. Log creation
```javascript
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: postRecord.id,
  step_name: "draft_created",
  stage: "complete",
  timestamp: new Date().toISOString(),
  output_summary: `Draft created: ${platform} / ${angle.angle_name} / framework: ${framework?.fields?.framework_name ?? "none"} / hook: ${hook?.id ?? "none"}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
});
```

### 10. Report to Simon
For each draft created:
```
✅ Draft created: [platform] — [angle_name]
   Framework: [framework_name] | Hook: [hook_type] | Snippet: [yes/no]
```

For any draft with `needs_snippet = true`:
```
⚠ No snippet matched for angle: [angle_name]
  What would fit: [brief description of the kind of operational moment that would work —
  e.g., "a specific moment when you discovered a silent failure in a production pipeline"]
```

After all drafts:
```
[N] drafts created. Run /review to approve.
```

---

## Writes

| Table | Field | Value |
|---|---|---|
| `posts` | `idea_id` | linked to idea |
| `posts` | `platform` | platform string |
| `posts` | `intent` | from idea.intent |
| `posts` | `format` | framework pattern_type |
| `posts` | `draft_content` | generated post text |
| `posts` | `hook_id` | linked to hook record (if matched) |
| `posts` | `framework_id` | linked to framework record (if matched) |
| `posts` | `humanity_snippet_id` | linked to snippet (if matched) |
| `posts` | `needs_snippet` | true/false |
| `posts` | `status` | `drafted` |
| `posts` | `drafted_at` | `now()` |
| `logs` | multiple | one per draft generated |

---

## Rules

- **Never block on missing snippet** — draft without, flag `needs_snippet = true`
- **Never fabricate a humanity snippet** — only use verified records from `humanity_snippets` table
- `needs_snippet` is reported to Simon with a description of what kind of moment would fit
- `score_audience_relevance` is never read or used in any draft decision

---

## Error Path

No persistent lock for `/draft` (drafts are created per-attempt, not pre-locked).
If a draft generation fails for one (platform, angle) pair, log the error and continue with remaining combinations:

```
⚠ Draft failed for [platform]/[angle]: [error] — skipped, [N] other drafts completed
```

If all drafts fail:
```
❌ Draft failed for all targets — [error] — logged, safe to retry
```
