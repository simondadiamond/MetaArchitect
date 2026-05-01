# /score — Performance Scoring Command

Record LinkedIn engagement metrics for published posts, compute calibrated performance scores, and trigger the self-improvement loop.

---

## Precondition

Posts with `status = published` AND `performance_score IS NULL`.

Risk tier: medium → S + T + E.

> **Supabase**: All reads/writes go through `tools/supabase.mjs` — never call Supabase MCP from inside this command (token-conscious rule). Column registry: `.claude/skills/supabase.md`. All columns are snake_case.

```javascript
import {
  getRecords, getRecord, patchRecord,
  logEntry, TABLES,
} from './tools/supabase.mjs';
```

---

## Calibration Constant

```javascript
const ER_CEILING = 0.07;  // 7% ER = 10/10. Recalibrate when following changes significantly.
// Signal to recalibrate: avg ER across last 20 posts drops below 3% → lower to 0.05.
```

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "post",
  entityId: null   // set per post
});

// Session counters (reset per /score run)
let hooksUpdated = 0, frameworksUpdated = 0, snippetsUpdated = 0;
let promotedCount = 0, retiredCount = 0;
let totalER = 0, totalComputedScore = 0, scoredCount = 0;  // for final report averages
```

---

## Helper Functions

```javascript
// Compute performance_score from raw metrics
function computeFromMetrics(impressions, likes, comments, shares, saves) {
  const engagements = likes + comments + shares + saves;
  const er = engagements / impressions;                                  // decimal, e.g. 0.042
  const score = Math.min(Math.round((er / ER_CEILING) * 100) / 10, 10.0); // 1 decimal, clamp at 10
  return { er, score };
}

// EMA for scale-aware averaging (avg_impressions, avg_engagement_rate)
function updateEMA(oldAvg, newValue, alpha = 0.3) {
  if (oldAvg == null) return newValue;
  return (alpha * newValue) + ((1 - alpha) * oldAvg);
}

// Simple running average for avg_score (stable quality signal)
function updateRunningAverage(oldAvg, oldCount, newScore) {
  if (oldCount === 0 || oldAvg == null) return newScore;
  return ((oldAvg * (oldCount - 1)) + newScore) / oldCount;
}

function shouldPromote(avg, count) { return count >= 3 && avg >= 7.5; }
function shouldRetire(avg, count)  { return count >= 3 && avg < 4.0; }
```

---

## Steps

### 1. Load scorable posts
```javascript
// Filter syntax: status = 'published' AND performance_score IS NULL.
// supabase.mjs maps null filter values to .is(col, null) — exactly the IS NULL check.
const posts = await getRecords(TABLES.POSTS,
  { status: 'published', performance_score: null },
  {
    fields: ['id','status','draft_content','platform','published_at','post_url',
             'hook_id','framework_id','humanity_snippet_id','snippet_fit_score'],
    orderBy: { col: 'published_at', dir: 'asc' },
    limit: 50,
  });

if (posts.length === 0) {
  return "No published posts with performance_score empty. Nothing to score.";
}
```

### 2. Display each post and collect metrics
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Score Post [N] of [Total]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Platform:    [platform]
Published:   [published_at]
URL:         [post_url]

[First 2 lines of draft_content]...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Open LinkedIn Analytics for this post and enter:

  Impressions : ___
  Likes       : ___
  Comments    : ___
  Shares      : ___
  Saves       : ___  (enter 0 if not visible)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3a. Validate raw inputs
Each field: non-negative integer. Re-prompt individually on invalid input. `score_audience_relevance` is never shown or collected.

### 3b. Guard for impressions = 0
```
"Impressions can't be 0 — skip this post? [y/n]"
```
- `y` → skip post (remains `published`, `performance_score = null`); continue to next
- `n` → re-prompt impressions

### 3c. Compute and present score
```javascript
const { er, score: computedScore } = computeFromMetrics(impressions, likes, comments, shares, saves);
```

Display:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Engagement rate : [X.X]%
Computed score  : [X.X] / 10

Press Enter to accept, or type a number (0-10) to override:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3d. Override
```javascript
const input = await prompt("Score: ");
let finalScore, scoreSource;
if (input.trim() === "") {
  finalScore  = computedScore;
  scoreSource = "metrics";
} else {
  const override = parseFloat(input.trim());
  if (isNaN(override) || override < 0 || override > 10) {
    // re-prompt until valid
  }
  finalScore  = Math.round(override * 10) / 10;
  scoreSource = "metrics_override";
}
```

### 4. Write post metrics + score (atomic)
```javascript
updateStage(state, "scoring");
await patchRecord(TABLES.POSTS, post.id, {
  impressions,
  likes,
  comments,
  shares,
  saves,
  performance_score: finalScore,
  score_source:      scoreSource,            // "metrics" | "metrics_override"
  status:            "scored",
});

await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      post.id,
  step_name:      "score",
  stage:          "scoring",
  output_summary: `post scored: impressions=${impressions}, er=${(er*100).toFixed(1)}%, computed=${computedScore}, final=${finalScore}, source=${scoreSource}`,
  model_version:  "n/a",
  status:         "success",
});
```

### 5. Trigger improver — score propagation

#### Update hook (if hook_id set)
```javascript
// hook_id is now a single uuid FK (not an array of Airtable record IDs).
if (post.hook_id) {
  const hookId = post.hook_id;
  const hook = await getRecord(TABLES.HOOKS, hookId,
    ['id','avg_score','use_count','status','avg_impressions','avg_engagement_rate']);

  const oldAvg    = hook.avg_score ?? null;
  const oldCount  = hook.use_count ?? 0;
  const newCount  = oldCount + 1;
  const newAvg    = updateRunningAverage(oldAvg, newCount, finalScore);
  const newAvgImp = updateEMA(hook.avg_impressions ?? null, impressions);
  const newAvgER  = updateEMA(hook.avg_engagement_rate ?? null, er);

  let newStatus = hook.status;
  let statusChanged = false;
  if (shouldPromote(newAvg, newCount) && newStatus !== "proven") {
    newStatus = "proven"; statusChanged = true; promotedCount++;
  } else if (shouldRetire(newAvg, newCount) && newStatus !== "retired") {
    newStatus = "retired"; statusChanged = true; retiredCount++;
  }

  await patchRecord(TABLES.HOOKS, hookId, {
    avg_score:           newAvg,
    use_count:           newCount,
    status:              newStatus,
    avg_impressions:     newAvgImp,
    avg_engagement_rate: newAvgER,
  });
  hooksUpdated++;

  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      hookId,
    step_name:      "improver",
    stage:          "score_propagation",
    output_summary: `hook [${hookId}] avg_score: ${newAvg.toFixed(2)}, avg_imp: ${Math.round(newAvgImp)}, avg_er: ${(newAvgER*100).toFixed(1)}%, use_count: ${newCount}, status: ${newStatus}${statusChanged ? " (changed)" : ""}`,
    model_version:  "n/a",
    status:         "success",
  });
}
```

#### Update framework (if framework_id set)
```javascript
if (post.framework_id) {
  const frameworkId = post.framework_id;
  const framework = await getRecord(TABLES.FRAMEWORKS, frameworkId,
    ['id','avg_score','use_count','status','avg_impressions','avg_engagement_rate']);

  const oldAvg    = framework.avg_score ?? null;
  const oldCount  = framework.use_count ?? 0;
  const newCount  = oldCount + 1;
  const newAvg    = updateRunningAverage(oldAvg, newCount, finalScore);
  const newAvgImp = updateEMA(framework.avg_impressions ?? null, impressions);
  const newAvgER  = updateEMA(framework.avg_engagement_rate ?? null, er);

  let newStatus = framework.status;
  let statusChanged = false;
  if (shouldPromote(newAvg, newCount) && newStatus !== "proven") {
    newStatus = "proven"; statusChanged = true; promotedCount++;
  } else if (shouldRetire(newAvg, newCount) && newStatus !== "retired") {
    newStatus = "retired"; statusChanged = true; retiredCount++;
  }

  await patchRecord(TABLES.FRAMEWORKS, frameworkId, {
    avg_score:           newAvg,
    use_count:           newCount,
    status:              newStatus,
    avg_impressions:     newAvgImp,
    avg_engagement_rate: newAvgER,
  });
  frameworksUpdated++;

  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      frameworkId,
    step_name:      "improver",
    stage:          "score_propagation",
    output_summary: `framework [${frameworkId}] avg_score: ${newAvg.toFixed(2)}, avg_imp: ${Math.round(newAvgImp)}, avg_er: ${(newAvgER*100).toFixed(1)}%, use_count: ${newCount}, status: ${newStatus}${statusChanged ? " (changed)" : ""}`,
    model_version:  "n/a",
    status:         "success",
  });
}
```

#### Update humanity_snippet quality (if humanity_snippet_id set)
```javascript
if (post.humanity_snippet_id) {
  const snippetId = post.humanity_snippet_id;
  const snippet = await getRecord(TABLES.SNIPPETS, snippetId,
    ['id','avg_score','used_count','status','avg_impressions','avg_engagement_rate']);

  const oldAvg   = snippet.avg_score ?? null;
  const oldCount = Number(snippet.used_count ?? 0);
  const newCount = oldCount + 1;

  // Blend post performance_score with review-stage snippet_fit_score (if present).
  // snippet_fit_score is 1–5; normalize to 0–10 scale before blending.
  const fitScore      = Number(post.snippet_fit_score ?? 0);  // 1-5 or 0 if not rated
  const normalizedFit = fitScore > 0 ? fitScore * 2 : finalScore;
  const blendedScore  = fitScore > 0
    ? (finalScore * 0.7) + (normalizedFit * 0.3)
    : finalScore;

  const newAvg    = updateRunningAverage(oldAvg, newCount, blendedScore);
  const newAvgImp = updateEMA(snippet.avg_impressions ?? null, impressions);
  const newAvgER  = updateEMA(snippet.avg_engagement_rate ?? null, er);

  let newStatus = snippet.status ?? "candidate";
  let statusChanged = false;
  if (shouldPromote(newAvg, newCount) && newStatus !== "proven") {
    newStatus = "proven"; statusChanged = true; promotedCount++;
  } else if (shouldRetire(newAvg, newCount) && newStatus !== "retired") {
    newStatus = "retired"; statusChanged = true; retiredCount++;
  } else if (newStatus === "candidate" && newCount >= 1) {
    newStatus = "active"; statusChanged = true;
  }
  // Note: candidate → retired (skipping active) is intentional.
  // If shouldRetire fires at count >= 3, the snippet has enough data to retire regardless of active state.

  await patchRecord(TABLES.SNIPPETS, snippetId, {
    avg_score:           newAvg,
    used_count:          newCount,
    status:              newStatus,
    last_used_at:        new Date().toISOString(),
    avg_impressions:     newAvgImp,
    avg_engagement_rate: newAvgER,
  });
  snippetsUpdated++;

  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      snippetId,
    step_name:      "improver",
    stage:          "score_propagation",
    output_summary: `snippet [${snippetId}] avg_score: ${newAvg.toFixed(2)}, avg_imp: ${Math.round(newAvgImp)}, avg_er: ${(newAvgER*100).toFixed(1)}%, use_count: ${newCount}, status: ${newStatus}${statusChanged ? " (changed)" : ""}${fitScore > 0 ? `, fit_score: ${fitScore}/5` : ""}`,
    model_version:  "n/a",
    status:         "success",
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
Avg engagement rate: [X.X]%  |  Avg computed score: [X.X]
```

---

## Writes

| Table | Column | Value |
|---|---|---|
| `pipeline.posts` | `impressions`, `likes`, `comments`, `shares`, `saves` | raw LinkedIn metrics |
| `pipeline.posts` | `performance_score` | computed from ER formula (or override) |
| `pipeline.posts` | `score_source` | `"metrics"` or `"metrics_override"` |
| `pipeline.posts` | `status` | `"scored"` |
| `pipeline.hooks_library` | `avg_score`, `use_count`, `status` | running average + promote/retire |
| `pipeline.hooks_library` | `avg_impressions`, `avg_engagement_rate` | EMA — scale-aware |
| `pipeline.framework_library` | `avg_score`, `use_count`, `status` | running average + promote/retire |
| `pipeline.framework_library` | `avg_impressions`, `avg_engagement_rate` | EMA — scale-aware |
| `pipeline.humanity_snippets` | `avg_score`, `used_count`, `status`, `last_used_at` | running average + promote/retire |
| `pipeline.humanity_snippets` | `avg_impressions`, `avg_engagement_rate` | EMA — scale-aware |
| `pipeline.logs` | multiple | one per post scored, one per hook/framework/snippet updated |

---

## Idempotency

Precondition check: `performance_score IS NULL`. If a post already has a score, it's excluded from the query — running `/score` twice on the same data is a no-op.

---

## Error Path

If score write fails for one post:
```
❌ Failed to save score for post [id] — [error]. Try again.
```

If improver update fails:
```
⚠ Score saved but improver update failed for [hook|framework|snippet] [id] — [error]. Logged. Run /score again to retry propagation.
```
Note: The post write (metrics + performance_score) is the primary operation. Improver updates are secondary — a failure there does not invalidate the score.

---

## Future: LinkedIn API Automation

When `memberCreatorPostAnalytics` Standard Tier is approved:
1. Create `tools/linkedin-metrics.mjs` — takes `post_url` → extracts post URN → returns `{ impressions, likes, comments, shares, saves }`
2. Replace Step 2 manual prompt with API call (display fetched values for confirmation before computing)
3. Add `"api"` as third `score_source` option via `typecast: true`
4. Compute → confirm → override → write path is **identical** to the manual path
