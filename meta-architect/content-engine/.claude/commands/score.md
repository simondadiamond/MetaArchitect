# /score — Performance Scoring Command

Record manual performance scores for published posts and trigger the self-improvement loop.

---

## Precondition

Posts with `status = published` AND `performance_score IS NULL`.

Risk tier: medium → S + T + E.

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

### 1. Load scorable posts
```javascript
const posts = await getRecords(
  process.env.AIRTABLE_TABLE_POSTS,
  `AND({status} = "published", {performance_score} = "")`,
  [{ field: "published_at", direction: "asc" }]
);

if (posts.length === 0) {
  return "No published posts with performance_score empty. Nothing to score.";
}
```

### 2. Display each post
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score Post [N] of [Total]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform:    [platform]
Published:   [published_at]
URL:         [post_url]

[First 2 lines of draft_content]...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enter performance score (0-10):
```

Note: Only `performance_score` is collected — no other dimensions. `score_audience_relevance` is never shown or collected.

### 3. Validate score
```javascript
const input = await prompt("Score: ");
const score = parseFloat(input);
const validation = validateScore({ performance_score: score });
if (!validation.valid) {
  console.log(`⚠ ${validation.errors.join(", ")}. Enter a number 0-10:`);
  // Re-prompt until valid
}
```

### 4. Write performance_score
```javascript
updateStage(state, "scoring");
await patchRecord(process.env.AIRTABLE_TABLE_POSTS, post.id, {
  performance_score: score,
  score_source: "manual",
  status: "scored"
});
```

### 5. Trigger improver skill — score propagation

#### Update hook (if hook_id set)
```javascript
if (post.fields?.hook_id?.length > 0) {
  const hookId = post.fields.hook_id[0];
  const hook = await getRecord(process.env.AIRTABLE_TABLE_HOOKS, hookId);
  const oldAvg = hook.fields?.avg_score ?? null;
  const oldCount = hook.fields?.use_count ?? 0;
  const newCount = oldCount + 1;
  const newAvg = updateRunningAverage(oldAvg, newCount, score);

  let newStatus = hook.fields?.status;
  let statusChanged = false;
  if (shouldPromote(newAvg, newCount) && newStatus !== "proven") {
    newStatus = "proven";
    statusChanged = true;
    promotedCount++;
  } else if (shouldRetire(newAvg, newCount) && newStatus !== "retired") {
    newStatus = "retired";
    statusChanged = true;
    retiredCount++;
  }

  await patchRecord(process.env.AIRTABLE_TABLE_HOOKS, hookId, {
    avg_score: newAvg,
    use_count: newCount,
    status: newStatus
  });
  hooksUpdated++;

  // Log update
  await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
    workflow_id: state.workflowId,
    entity_id: hookId,
    step_name: "improver",
    stage: "score_propagation",
    timestamp: new Date().toISOString(),
    output_summary: `hook [${hookId}] avg_score updated to ${newAvg.toFixed(2)}, use_count: ${newCount}, status: ${newStatus}${statusChanged ? " (changed)" : ""}`,
    model_version: "n/a",
    status: "success"
  });
}
```

#### Update framework (if framework_id set)
```javascript
if (post.fields?.framework_id?.length > 0) {
  const frameworkId = post.fields.framework_id[0];
  const framework = await getRecord(process.env.AIRTABLE_TABLE_FRAMEWORKS, frameworkId);
  const oldAvg = framework.fields?.avg_score ?? null;
  const oldCount = framework.fields?.use_count ?? 0;
  const newCount = oldCount + 1;
  const newAvg = updateRunningAverage(oldAvg, newCount, score);

  let newStatus = framework.fields?.status;
  let statusChanged = false;
  if (shouldPromote(newAvg, newCount) && newStatus !== "proven") {
    newStatus = "proven";
    statusChanged = true;
    promotedCount++;
  } else if (shouldRetire(newAvg, newCount) && newStatus !== "retired") {
    newStatus = "retired";
    statusChanged = true;
    retiredCount++;
  }

  await patchRecord(process.env.AIRTABLE_TABLE_FRAMEWORKS, frameworkId, {
    avg_score: newAvg,
    use_count: newCount,
    status: newStatus
  });
  frameworksUpdated++;

  // Log update
  await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
    workflow_id: state.workflowId,
    entity_id: frameworkId,
    step_name: "improver",
    stage: "score_propagation",
    timestamp: new Date().toISOString(),
    output_summary: `framework [${frameworkId}] avg_score updated to ${newAvg.toFixed(2)}, use_count: ${newCount}, status: ${newStatus}${statusChanged ? " (changed)" : ""}`,
    model_version: "n/a",
    status: "success"
  });
}
```

#### Update humanity_snippet used_count (if humanity_snippet_id set)
```javascript
if (post.fields?.humanity_snippet_id?.length > 0) {
  const snippetId = post.fields.humanity_snippet_id[0];
  const snippet = await getRecord(process.env.AIRTABLE_TABLE_SNIPPETS, snippetId);
  const newUsedCount = (snippet.fields?.used_count ?? 0) + 1;
  await patchRecord(process.env.AIRTABLE_TABLE_SNIPPETS, snippetId, {
    used_count: newUsedCount
  });
  await createRecord(process.env.AIRTABLE_TABLE_LOGS, {
    workflow_id: state.workflowId,
    entity_id: snippetId,
    step_name: "improver",
    stage: "score_propagation",
    timestamp: new Date().toISOString(),
    output_summary: `snippet [${snippetId}] used_count updated to ${newUsedCount}`,
    model_version: "n/a",
    status: "success"
  });
}
```

### 6. Continue to next post

### 7. Final report
```
[N] posts scored.
[N] hooks updated. [N] frameworks updated.
[N] promoted to proven. [N] retired.
```

---

## Writes

| Table | Field | Value |
|---|---|---|
| `posts` | `performance_score` | score entered by Simon |
| `posts` | `score_source` | `manual` |
| `posts` | `status` | `scored` |
| `hooks_library` | `avg_score`, `use_count`, `status` | updated via improver logic |
| `framework_library` | `avg_score`, `use_count`, `status` | updated via improver logic |
| `humanity_snippets` | `used_count` | incremented |
| `logs` | multiple | one per post scored, one per hook/framework updated |

---

## Idempotency

Precondition check: `performance_score IS NULL`. If a post already has a score, it's excluded from the query — running `/score` twice on the same data is a no-op.

---

## Error Path

If score write fails for one post:
```
❌ Failed to save score for post [id] — [error]. Score: [score]. Try again.
```

If improver update fails:
```
⚠ Score saved but improver update failed for hook [id] — [error]. Logged. Run /score again to retry propagation.
```
Note: The `performance_score` write is the primary operation. Improver updates are secondary — a failure there does not invalidate the score.
