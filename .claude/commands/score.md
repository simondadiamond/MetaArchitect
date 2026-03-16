# /score — Performance Scoring Command

Record manual performance scores for published posts and trigger the self-improvement loop.

---

## Precondition

Posts with `status = published` AND `performance_score IS NULL`.

Risk tier: medium → S + T + E.

> **Airtable**: Use MCP tools directly — no node scripts. See `.claude/skills/airtable.md` for field IDs. Always `typecast: true` on writes.

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
// MCP: get_table_schema for status "published" choice ID, then:
//   mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs"
//   fieldIds: [fldlC1PMzRw0z6cTR, fldgVwvcXFDA7RCxf, fldztvQenFV0pW44l,
//              fldphmqLqRe5j2m7m, fldRHUQer2GFyLieS, fldk046kLs4yG2p1Y,
//              fldNQw5L5KBFpFt5a, fldIjahm90oqJEqHx, fldr6w1R6fRiGXyXp, fld9OwHI6Z2Al3p7T]
//   filters: status = "published" (choice ID) AND performance_score isEmpty
//   sort: fldr6w1R6fRiGXyXp asc
const posts = // result.records

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
// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
//   fields: fldIjahm90oqJEqHx (performance_score), fldHUA73iAythfRsQ (score_source), fldlC1PMzRw0z6cTR (status)
await patchRecord(POSTS, post.id, {
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
  // MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblWuQNSJ25bs18DZ, recordIds: [hookId])
  //   fieldIds: [fld0b1nWNg3ZXT21f, fldfckbIwaSSebctW, fldVKrSnP34sofwZ7]
  const hook = // result.records[0]
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

  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblWuQNSJ25bs18DZ, typecast: true)
  await patchRecord(HOOKS, hookId, {
    avg_score: newAvg,
    use_count: newCount,
    status: newStatus
  });
  hooksUpdated++;

  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
  await createRecord(LOGS, {
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
  // MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblYsys2ydvryVtmf, recordIds: [frameworkId])
  //   fieldIds: [fldoAs2QC066Th0x9, fldtVJ6vuENyFgz8A, fldBhDdj55AxwLEUl]
  const framework = // result.records[0]
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

  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblYsys2ydvryVtmf, typecast: true)
  await patchRecord(FRAMEWORKS, frameworkId, {
    avg_score: newAvg,
    use_count: newCount,
    status: newStatus
  });
  frameworksUpdated++;

  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
  await createRecord(LOGS, {
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

#### Update humanity_snippet quality (if humanity_snippet_id set)
```javascript
if (post.fields?.humanity_snippet_id?.length > 0) {
  const snippetId = post.fields.humanity_snippet_id[0];
  // MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF, recordIds: [snippetId])
  //   fieldIds: [fldiAFNJJZUcqhr7C, fldZ6ifFD4OW0PDOt, fld90hLmFbyPWvy59]
  const snippet = // result.records[0]

  const oldAvg   = snippet.fields?.avg_score ?? null;
  const oldCount = Number(snippet.fields?.used_count ?? 0);
  const newCount = oldCount + 1;

  // Blend post performance_score with review-stage snippet_fit_score (if present).
  // snippet_fit_score is 1–5; normalize to 0–10 scale before blending.
  const fitScore  = Number(post.fields?.snippet_fit_score ?? 0);  // 1-5 or 0 if not rated
  const postScore = Number(score);                                  // 0-10
  const normalizedFit = fitScore > 0 ? fitScore * 2 : postScore;   // if no fit score, use postScore
  const blendedScore  = fitScore > 0
    ? (postScore * 0.7) + (normalizedFit * 0.3)
    : postScore;

  const newAvg = updateRunningAverage(oldAvg, newCount, blendedScore);

  let newStatus = snippet.fields?.status ?? "candidate";
  let statusChanged = false;
  if (shouldPromote(newAvg, newCount) && newStatus !== "proven") {
    newStatus = "proven";
    statusChanged = true;
    promotedCount++;
  } else if (shouldRetire(newAvg, newCount) && newStatus !== "retired") {
    newStatus = "retired";
    statusChanged = true;
    retiredCount++;
  } else if (newStatus === "candidate" && newCount >= 1) {
    newStatus = "active";
    statusChanged = true;
  }

  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF, typecast: true)
  //   fields: fldiAFNJJZUcqhr7C (avg_score), fldZ6ifFD4OW0PDOt (used_count),
  //           fld90hLmFbyPWvy59 (status), fldfqHyUlwn7JqBFn (last_used_at)
  await patchRecord(SNIPPETS, snippetId, {
    avg_score:    newAvg,
    used_count:   newCount,
    status:       newStatus,
    last_used_at: new Date().toISOString()
  });
  snippetsUpdated++;

  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
  await createRecord(LOGS, {
    workflow_id: state.workflowId,
    entity_id: snippetId,
    step_name: "improver",
    stage: "score_propagation",
    timestamp: new Date().toISOString(),
    output_summary: `snippet [${snippetId}] avg_score: ${newAvg.toFixed(2)}, use_count: ${newCount}, status: ${newStatus}${statusChanged ? " (changed)" : ""}${fitScore > 0 ? `, fit_score: ${fitScore}/5` : ""}`,
    model_version: "n/a",
    status: "success"
  });
}
```

// TODO: recommended_next_action on ideas is set once at /capture and never updated.
// After scoring, /score has real signal: "this idea has N published posts scoring avg X.X,
// N angles remain." Consider writing a fresh recommended_next_action to the idea here —
// e.g. "2 angles remain — consider planning week 2026-WXX" or "Exhausted — archive".
// Low effort, high Airtable-visibility value.

// TODO: Idea scores (score_brand_fit, score_authority, score_overall, etc.) are static —
// set once at /capture and never adjusted based on actual post performance.
// If posts from a given idea consistently underperform, those scores stay artificially high
// and the idea keeps appearing as a strong candidate in the planner.
// Future improvement: after scoring, check if this idea has ≥3 scored posts and if avg
// performance_score diverges significantly from score_overall (±2.0). If so, flag it
// or nudge score_overall toward the performance reality. Design carefully — don't create
// a feedback loop that punishes ideas with only 1 weak post.

### 6. Continue to next post

### 7. Final report
```
[N] posts scored.
[N] hooks updated. [N] frameworks updated. [N] snippets updated.
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
| `humanity_snippets` | `avg_score`, `used_count`, `status`, `last_used_at` | updated via improver logic |
| `logs` | multiple | one per post scored, one per hook/framework/snippet updated |

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
⚠ Score saved but improver update failed for [hook|framework|snippet] [id] — [error]. Logged. Run /score again to retry propagation.
```
Note: The `performance_score` write is the primary operation. Improver updates are secondary — a failure there does not invalidate the score.
