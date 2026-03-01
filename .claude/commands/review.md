# /review — Post Review Command

Display drafted posts for Simon's approval, revision, or rejection.

---

## Precondition

Posts with `status = drafted`.

Risk tier: low for display, medium for approve/revise writes → S + T + E on writes.

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "post",
  entityId: null   // set per post as reviewed
});
```

---

## Steps

### 1. Load drafted posts
```javascript
const posts = await getRecords(
  process.env.AIRTABLE_TABLE_POSTS,
  `{status} = "drafted"`,
  [{ field: "drafted_at", direction: "asc" }]
);

if (posts.length === 0) {
  return "No posts with status = drafted. Run /draft first.";
}
```

### 2. Load linked records for each post
For each post, fetch:
- `hook_id` → hook record from `hooks_library` (`hook_text`, `hook_type`)
- `framework_id` → framework record from `framework_library` (`framework_name`)
- `humanity_snippet_id` → snippet from `humanity_snippets` (`snippet_text`)
- `needs_snippet` flag

### 3. Display each post
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Post [N] of [Total]
Platform: [linkedin/twitter] | Intent: [authority/education/community/virality]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Full draft_content]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hook used:      [hook_text] ([hook_type])
Framework used: [framework_name]
Snippet used:   [snippet_text first 60 chars...] | [⚠ needs_snippet — no snippet matched]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
  a — approve
  r [notes] — revise (e.g., "r make the hook more direct")
  x — reject

Enter choice:
```

### 4. Handle Simon's input

#### Approve
```javascript
updateStage(state, "approving");
await patchRecord(process.env.AIRTABLE_TABLE_POSTS, post.id, {
  status: "approved",
  approved_at: new Date().toISOString()
});
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_approved",
  stage: "approving",
  timestamp: new Date().toISOString(),
  output_summary: `Post approved: ${post.fields?.platform}`,
  model_version: "n/a",
  status: "success"
});
console.log("✅ Approved. Run /publish when ready.");
```

#### Revise
```javascript
// revisionCount tracks revisions per post — max 3
updateStage(state, "revising");
const notes = input.replace(/^r\s*/i, "").trim();
// Call writer skill with revision prompt:
// "Apply these revision notes to the post: [notes]"
// Run validatePost on result
// Display revised post
// Loop back to step 3 for this post
// If revisionCount >= 3: "Max revisions reached. Approve or reject."
```

**Revision prompt** for writer skill:
```
Revise this LinkedIn post based on the following notes.
Keep all structural rules (10-line anatomy, word count 150-250, voice prohibitions).

Current post:
[draft_content]

Revision notes:
[notes]

Output the revised post only. No explanation.
```

After revision: update `draft_content` in Airtable immediately (so revision history is not lost on crash) and log:
```javascript
await patchRecord(process.env.AIRTABLE_TABLE_POSTS, post.id, {
  draft_content: revisedContent
});
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_revised",
  stage: "revising",
  timestamp: new Date().toISOString(),
  output_summary: `Post revised (pass ${revisionCount}): ${notes.slice(0, 100)}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
});
```

#### Reject
```javascript
updateStage(state, "rejecting");
await patchRecord(process.env.AIRTABLE_TABLE_POSTS, post.id, {
  status: "rejected"
});
await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_rejected",
  stage: "rejecting",
  timestamp: new Date().toISOString(),
  output_summary: "Post rejected",
  model_version: "n/a",
  status: "success"
});
console.log("Post rejected.");
```

### 5. Continue to next post until all reviewed

After all posts:
```
Review complete: [N] approved, [N] revised+approved, [N] rejected.
Approved posts are ready to publish. Run /publish.
```

---

## Writes

| Table | Field | Value |
|---|---|---|
| `posts` | `status` | `approved` \| `rejected` |
| `posts` | `approved_at` | `now()` (approve only) |
| `posts` | `draft_content` | updated content (revise only) |
| `logs` | multiple | one per decision |

---

## Error Path

If write fails for a single post:
```
❌ Failed to save decision for post [id] — [error]. Status unchanged. Re-enter choice.
```
