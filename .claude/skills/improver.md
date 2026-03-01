# Improver Skill

Manages the self-improvement loop: score propagation → running average updates → promote/retire logic.

Triggered by `/score` after each `performance_score` is written.

---

## Running Average Update

```javascript
function updateRunningAverage(oldAvg, oldCount, newScore) {
  // Count guard: if this is the first score, avg = score
  if (oldCount === 0 || oldAvg === null || oldAvg === undefined) {
    return newScore;
  }
  // Running average formula
  // Note: oldCount is the NEW use_count (already incremented before calling this)
  return ((oldAvg * (oldCount - 1)) + newScore) / oldCount;
}
```

**Update sequence** (for both hooks and frameworks):
1. Read current `avg_score` and `use_count` from the record
2. Increment `use_count` by 1
3. Call `updateRunningAverage(old_avg, new_use_count, performance_score)`
4. Write `avg_score = new_avg` and `use_count = new_use_count` to Airtable
5. Apply promote/retire logic (see below)

---

## Promote Logic

```javascript
function shouldPromote(avgScore, useCount) {
  return avgScore >= 7.0 && useCount >= 3;
}
```

If `shouldPromote` returns true and current `status !== "proven"`:
- Update `status = "proven"` in Airtable
- Log: `{ step_name: "improver", stage: "score_propagation", output_summary: "hook [id] promoted to proven (avg: X, uses: N)" }`

---

## Retire Logic

```javascript
function shouldRetire(avgScore, useCount) {
  return avgScore < 4.0 && useCount >= 5;
}
```

If `shouldRetire` returns true and current `status !== "retired"`:
- Update `status = "retired"` in Airtable
- Log: `{ step_name: "improver", stage: "score_propagation", output_summary: "hook [id] retired (avg: X, uses: N)" }`

---

## Hook Query for /draft

Used by `/draft` to find the best available hook for a given angle + intent.

```javascript
// Filter: not retired, ordered proven first then by avg_score desc
const formula = `AND({status} != "retired", {intent} = "${idea.intent}")`;
const sort = [
  { field: "status", direction: "asc" },   // "proven" sorts before "candidate" alphabetically — but use secondary sort
  { field: "avg_score", direction: "desc" }
];
// Note: Airtable doesn't natively sort "proven" before "candidate" with a single sort.
// Fetch all non-retired, then in JavaScript:
const hooks = allHooks.sort((a, b) => {
  const statusOrder = { proven: 0, candidate: 1, retired: 2 };
  const statusDiff = (statusOrder[a.fields.status] ?? 1) - (statusOrder[b.fields.status] ?? 1);
  if (statusDiff !== 0) return statusDiff;
  return (b.fields.avg_score ?? 0) - (a.fields.avg_score ?? 0);
});
```

Return the top result. If no hooks match the intent filter, broaden to all non-retired hooks.

---

## Framework Query for /draft

```javascript
// Filter: not retired, best_for contains the post's content pillar
// best_for is a comma-separated text field
const pillar = "STATE Framework Applied";  // example
const allFrameworks = await getRecords(FRAMEWORKS, `{status} != "retired"`);
const matching = allFrameworks.filter(f =>
  f.fields.best_for?.includes(pillar)
);
// Sort proven first, then by avg_score desc
const ranked = matching.sort((a, b) => {
  const statusOrder = { proven: 0, candidate: 1 };
  const statusDiff = (statusOrder[a.fields.status] ?? 1) - (statusOrder[b.fields.status] ?? 1);
  if (statusDiff !== 0) return statusDiff;
  return (b.fields.avg_score ?? 0) - (a.fields.avg_score ?? 0);
});
return ranked[0] ?? null;
```

If no framework matches the pillar, return the top non-retired framework overall.

---

## Humanity Snippet Query for /draft

```javascript
// Filter: status = active, ordered by used_count asc (prefer less-used snippets)
// Tag overlap with post angle: match on comma-separated tags
const allSnippets = await getRecords(SNIPPETS, `{status} = "active"`);

// Tag overlap scoring
const angleTags = angle.angle_name.toLowerCase().split(/\s+/);
const scored = allSnippets.map(s => {
  const snippetTags = (s.fields.tags ?? "").toLowerCase().split(",").map(t => t.trim());
  const overlap = angleTags.filter(t => snippetTags.some(st => st.includes(t))).length;
  return { record: s, overlap, usedCount: s.fields.used_count ?? 0 };
});

// Sort: overlap desc, then used_count asc (less-used preferred)
scored.sort((a, b) => {
  if (b.overlap !== a.overlap) return b.overlap - a.overlap;
  return a.usedCount - b.usedCount;
});

const best = scored[0]?.record ?? null;
return best;
```

If no snippet returned: `needs_snippet = true`. Never fabricate.

---

## Log Format for Improvement Updates

```javascript
{
  workflow_id: state.workflowId,
  entity_id: postRecordId,
  step_name: "improver",
  stage: "score_propagation",
  timestamp: new Date().toISOString(),
  output_summary: `hook [${hookId}] avg_score updated to ${newAvg.toFixed(2)}, use_count: ${newCount}, status: ${newStatus}`,
  model_version: "n/a",
  status: "success"
}
```

---

## /score Summary Report

After processing all scored posts, report:

```
[N] posts scored.
[N] hooks updated. [N] frameworks updated.
[N] promoted to proven. [N] retired.
```

Example:
```
3 posts scored.
2 hooks updated. 1 framework updated.
1 promoted to proven. 0 retired.
```
