# /ideas — Idea Backlog Viewer

> **Deprecated**: `/ideas` is now a read-only backlog diagnostic. To build the weekly plan, run `/editorial-planner` instead.

Display the current backlog of unselected ideas, ranked by score. No writes. No selection prompt.

**Risk tier**: low (read-only).

---

## Steps

### 1. Load backlog

```javascript
const ideas = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `{Status} = "New"`,
  [{ field: "score_overall", direction: "desc" }]
);

if (ideas.length === 0) {
  return "No ideas with Status = New. Run /capture to add ideas to the backlog.";
}
```

### 2. Compute current queue composition

```javascript
const allSelected = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `OR({Status} = "Selected", {Status} = "Researching", {Status} = "Ready")`
);
const queueCounts = { authority: 0, education: 0, community: 0, virality: 0 };
allSelected.forEach(r => {
  const intent = r.fields?.intent;
  if (intent && queueCounts[intent] !== undefined) queueCounts[intent]++;
});
const queueTotal = Object.values(queueCounts).reduce((a, b) => a + b, 0);
```

### 3. Display ranked backlog

```
## Idea Backlog (Status = New)

#  | Title                          | Intent    | Overall | Brand | Original | Virality
---|--------------------------------|-----------|---------|-------|----------|----------
1  | [topic]                        | authority |   8.2   |  9    |    7     |    8
2  | [topic]                        | education |   7.8   |  8    |    8     |    6
...

## Current Pipeline Composition
authority: [N] posts in pipeline (target: 50%)
education:  [N] posts in pipeline (target: 30%)
community:  [N] posts in pipeline (target: 15%)
virality:   [N] posts in pipeline (target:  5%)

[⚠ Over-indexed: authority at 70% — editorial-planner will balance this]

Run /editorial-planner to build the weekly lineup.
```

**Over-indexing flag**: If any intent exceeds its target by >20 percentage points, flag it prominently.

**Dimensions shown**: `score_overall`, `score_brand_fit`, `score_originality`, `score_virality`.
**Never show**: `score_audience_relevance` — this field is invisible to all commands.

---

## No Writes

This command makes no Airtable writes. It is safe to run at any time.
