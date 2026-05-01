# /publish — Post Publishing Command

Format approved posts for copy-paste and record the live URL once published.

---

## Precondition

Posts with `status = approved`.

Risk tier: medium (Supabase writes) → S + T + E.

> **Supabase**: All reads/writes go through `tools/supabase.mjs` — never call Supabase MCP from inside this command (token-conscious rule). Column registry: `.claude/skills/supabase.md`. All columns are snake_case.

```javascript
import {
  getRecords, patchRecord,
  logEntry, TABLES,
} from './tools/supabase.mjs';
```

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "post",
  entityId: null   // set per post
});
```

---

## Steps

### 1. Load approved posts
```javascript
const posts = await getRecords(TABLES.POSTS,
  { status: 'approved' },
  {
    fields: ['id','status','platform','draft_content','approved_at'],
    orderBy: { col: 'approved_at', dir: 'asc' },
    limit: 50,
  });

if (posts.length === 0) {
  return "No posts with status = approved. Run /review first.";
}
```

### 2. For each post: format and display

#### LinkedIn format
```javascript
function formatLinkedIn(draftContent) {
  // Ensure blank lines between sections are present
  // Ensure hashtags are on final line
  // Return clean copy-paste string
  return draftContent.trim();
}
```

#### X (Twitter) format
```javascript
function formatTwitter(draftContent) {
  // Single tweet: trim to ≤280 chars, warn if truncated
  // Thread: each tweet on separate block with /1, /2, etc.
  return draftContent.trim();
}
```

**Display block**:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
READY TO PUBLISH — [PLATFORM] ([N] of [Total])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Formatted post content — clean, copy-paste ready]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paste the post URL once it's live (required):
```

### 3. Collect URL from Simon

```javascript
const url = await prompt("Post URL: ");

// Validate: must be non-empty
if (!url || url.trim() === "") {
  console.log("⚠ URL is required. Enter the post URL:");
  // Prompt again — do not skip
  url = await prompt("Post URL: ");
}

// Basic URL format check
if (!url.startsWith("http")) {
  console.log("⚠ That doesn't look like a URL. Enter the full post URL:");
  url = await prompt("Post URL: ");
}
```

`post_url` is **never skipped**. Prompt again if empty. This field is required for the future metrics pipeline.

### 4. Write
```javascript
updateStage(state, "publishing");
await patchRecord(TABLES.POSTS, post.id, {
  post_url:     url.trim(),
  status:       "published",
  published_at: new Date().toISOString(),
});

await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      post.id,
  step_name:      "published",
  stage:          "publishing",
  output_summary: `Published: ${post.platform} — ${url.trim()}`,
  model_version:  "n/a",
  status:         "success",
});

console.log(`✅ Published. Run /score when you have performance data.`);
```

### 5. Continue to next post

After all posts:
```
[N] posts published. Run /score to record performance and update the improvement loop.
```

---

## Writes

| Table | Column | Value |
|---|---|---|
| `pipeline.posts` | `post_url` | URL entered by Simon (required, never empty) |
| `pipeline.posts` | `status` | `published` |
| `pipeline.posts` | `published_at` | `now()` |
| `pipeline.logs` | one entry | per post published |

---

## Error Path

If write fails:
```
❌ Failed to save publish data for post [id] — [error]. URL: [url]. Try again or update pipeline.posts manually.
```

Never proceed to next post if URL is not saved. This field is required for the metrics pipeline.
