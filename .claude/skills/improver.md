# Improver Skill

Manages the self-improvement loop: score propagation → running average updates → promote/retire logic.

Triggered by `/score` after each `performance_score` is written.

---

## Averaging Functions

```javascript
// Running average — for avg_score (stable quality signal, used in promote/retire)
function updateRunningAverage(oldAvg, oldCount, newScore) {
  if (oldCount === 0 || oldAvg === null || oldAvg === undefined) return newScore;
  // Note: oldCount is the NEW use_count (already incremented before calling)
  return ((oldAvg * (oldCount - 1)) + newScore) / oldCount;
}

// EMA — for avg_impressions + avg_engagement_rate (scale-aware, adapts with account growth)
// α = 0.3: each new post contributes 30%; history decays to ~10% after ~5 uses.
function updateEMA(oldAvg, newValue, alpha = 0.3) {
  if (oldAvg == null) return newValue;
  return (alpha * newValue) + ((1 - alpha) * oldAvg);
}
```

**Update sequence** (for hooks and frameworks):
1. Read current `avg_score`, `use_count`, `avg_impressions`, `avg_engagement_rate` from the record
2. Increment `use_count` by 1
3. `newAvg    = updateRunningAverage(old_avg, new_use_count, performance_score)`
4. `newAvgImp = updateEMA(old_avg_impressions, impressions)`
5. `newAvgER  = updateEMA(old_avg_engagement_rate, er)`  ← er is decimal (e.g. 0.042)
6. Write all 5 fields to Airtable
7. Apply promote/retire logic (based on `avg_score` only)

---

## Promote Logic

```javascript
function shouldPromote(avgScore, useCount) {
  return avgScore >= 7.5 && useCount >= 3;
}
```

If `shouldPromote` returns true and current `status !== "proven"`:
- Update `status = "proven"` in Airtable
- Log: `{ step_name: "improver", stage: "score_propagation", output_summary: "hook [id] promoted to proven (avg: X, uses: N)" }`

---

## Retire Logic

```javascript
function shouldRetire(avgScore, useCount) {
  return avgScore < 4.0 && useCount >= 3;
}
```

If `shouldRetire` returns true and current `status !== "retired"`:
- Update `status = "retired"` in Airtable
- Log: `{ step_name: "improver", stage: "score_propagation", output_summary: "hook [id] retired (avg: X, uses: N)" }`

---

## Hook Query for /draft

Used by `/draft` to find the best available hook for a given angle + intent. Uses multi-dimensional weighted scoring based on post intent.

```javascript
const ER_CEILING = 0.07;  // must match score.md — update both when recalibrating

const intentWeights = {
  authority:  { score: 0.4, impressions: 0.4, er: 0.2 },  // reach matters for authority
  virality:   { score: 0.3, impressions: 0.5, er: 0.2 },  // reach matters most
  education:  { score: 0.5, impressions: 0.2, er: 0.3 },  // balanced
  community:  { score: 0.3, impressions: 0.2, er: 0.5 },  // conversation matters
  default:    { score: 0.5, impressions: 0.25, er: 0.25 }
};

// Relative rank within the candidate set (avoids absolute impressions scale problem)
function relativeRank(value, allValues) {
  if (value == null) return 5;  // neutral when no data
  const sorted = [...allValues.filter(v => v != null)].sort((a, b) => a - b);
  if (sorted.length < 2) return 5;
  const idx = sorted.lastIndexOf(value);
  return (idx / (sorted.length - 1)) * 10;  // 0-10
}

function scoreHook(hook, postIntent, allCandidates) {
  const provenBonus = hook.fields.status === "proven" ? 2.0 : 0;
  const avgScore    = hook.fields.avg_score ?? 5;
  const avgER       = hook.fields.avg_engagement_rate ?? null;
  const erScore     = avgER != null ? Math.min((avgER / ER_CEILING) * 10, 10) : 5;
  const impRank     = relativeRank(
    hook.fields.avg_impressions ?? null,
    allCandidates.map(h => h.fields.avg_impressions ?? null)
  );
  const w = intentWeights[postIntent] ?? intentWeights.default;
  return provenBonus + (avgScore * w.score) + (impRank * w.impressions) + (erScore * w.er);
}

// MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblWuQNSJ25bs18DZ)
//   fieldIds: [fldSIjqzsFuxWOaYb, fldOvWxj7O0x51aIX, fld6UZ8Fy7q2cZQyF,
//              fldVKrSnP34sofwZ7, fld0b1nWNg3ZXT21f, fldfckbIwaSSebctW,
//              fld6RgXuUNgyMBuFe, flddxiv4RPE8IEwvm]
//   filters: status != "retired", intent = postIntent
const allCandidates = // result.records (intent-matched, non-retired)

// Fallback: if no intent-matched hooks, broaden to all non-retired
const pool = allCandidates.length > 0 ? allCandidates : allNonRetiredHooks;

const ranked = pool.sort((a, b) => scoreHook(b, postIntent, pool) - scoreHook(a, postIntent, pool));
return ranked[0] ?? null;
```

---

## Framework Query for /draft

```javascript
function scoreFramework(fw, allCandidates) {
  // Frameworks match by pillar (best_for), not intent.
  // Use balanced weights (education preset) as default.
  const provenBonus = fw.fields.status === "proven" ? 2.0 : 0;
  const avgScore    = fw.fields.avg_score ?? 5;
  const avgER       = fw.fields.avg_engagement_rate ?? null;
  const erScore     = avgER != null ? Math.min((avgER / ER_CEILING) * 10, 10) : 5;
  const impRank     = relativeRank(
    fw.fields.avg_impressions ?? null,
    allCandidates.map(f => f.fields.avg_impressions ?? null)
  );
  const w = intentWeights.education;  // balanced default
  return provenBonus + (avgScore * w.score) + (impRank * w.impressions) + (erScore * w.er);
}

// MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblYsys2ydvryVtmf)
//   fieldIds: [fldcFJnXRemmm2PqU, fld92B4yioAGqEbfL, fldMPkk9oVvbqvTv5,
//              fldlCsQrc9GWIT1yg, fldoAs2QC066Th0x9, fldtVJ6vuENyFgz8A, fldBhDdj55AxwLEUl,
//              fldiGWr8FwZMQjqfe, fldAQX51YZ6YsIAE7]
//   filters: status != "retired"
const allFrameworks = // result.records
const pillar = angle.pillar_connection;  // e.g. "STATE Framework Applied"
const matching = allFrameworks.filter(f => f.fields.best_for?.includes(pillar));

// Fallback: if no pillar match, use all non-retired
const pool = matching.length > 0 ? matching : allFrameworks;

const ranked = pool.sort((a, b) => scoreFramework(b, pool) - scoreFramework(a, pool));
return ranked[0] ?? null;
```

---

## Humanity Snippet Query for /draft

```javascript
// MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF)
//   fieldIds: [fldaWegy2OyWpA28D, fldZFO5xKMiqBuUMY, fldiAFNJJZUcqhr7C,
//              fldZ6ifFD4OW0PDOt, fld90hLmFbyPWvy59, fldvIYK5Xh9v7BwOl]
//   filters: status != "retired"
const allSnippets = // result.records

const angleText = [
  angle.angle_name ?? "",
  angle.contrarian_take ?? "",
  angle.single_lesson ?? "",
  angle.pillar_connection ?? ""
].join(" ").toLowerCase();

function tokenize(text) { return text.split(/\W+/).filter(t => t.length > 3); }
const angleTokens = tokenize(angleText);

const scored = allSnippets.map(s => {
  const tags        = String(s.fields.tags ?? "").toLowerCase().split(",").map(t => t.trim());
  const snippetText = String(s.fields.snippet_text ?? "").toLowerCase();
  const tagOverlap  = angleTokens.filter(t => tags.some(tag => tag.includes(t))).length;
  const textOverlap = angleTokens.filter(t => snippetText.includes(t)).length;
  const avgScore    = Number(s.fields.avg_score ?? 0);
  const usedCount   = Number(s.fields.used_count ?? 0);
  const avgER       = s.fields.avg_engagement_rate ?? null;
  const erScore     = avgER != null ? Math.min((avgER / ER_CEILING) * 10, 10) : 5;

  // Weighted scoring: relevance first, then performance signal
  const score = (tagOverlap * 4) + (textOverlap * 2) + (avgScore * 1.0) + (erScore * 0.5) - (usedCount * 0.25);
  return { record: s, score, tagOverlap, textOverlap };
});

return scored
  .filter(x => x.tagOverlap > 0 || x.textOverlap > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, limit)
  .map(x => x.record);
// If no snippet returned: needs_snippet = true. Never fabricate.
```

---

## Log Format for Improvement Updates

```javascript
{
  workflow_id: state.workflowId,
  entity_id: hookId,
  step_name: "improver",
  stage: "score_propagation",
  timestamp: new Date().toISOString(),
  output_summary: `hook [${hookId}] avg_score: ${newAvg.toFixed(2)}, avg_imp: ${Math.round(newAvgImp)}, avg_er: ${(newAvgER*100).toFixed(1)}%, use_count: ${newCount}, status: ${newStatus}`,
  model_version: "n/a",
  status: "success"
}
```

---

## /score Summary Report

After processing all scored posts, report:

```
[N] posts scored.
[N] hooks updated. [N] frameworks updated. [N] snippets updated.
[N] promoted to proven. [N] retired.
Avg engagement rate: [X.X]%  |  Avg computed score: [X.X]
```
