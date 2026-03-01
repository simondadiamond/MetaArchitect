# /ideas — Idea Selection Command

Surface ideas ready for selection and let Simon choose which to move forward.

---

## Precondition

Ideas with `status = pending_selection`.

No LLM calls. No lock needed. Risk tier: low (read-only display + one Airtable write on selection).

---

## STATE Init

```javascript
// Low risk — S+T only
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,   // set after selection
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};
```

---

## Steps

### 1. Load ideas
```javascript
const ideas = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `{status} = "pending_selection"`,
  [{ field: "score_overall", direction: "desc" }]
);

if (ideas.length === 0) {
  return "No ideas with status = pending_selection. Send something to the Telegram bot first.";
}
```

### 2. Compute current queue composition
```javascript
const allSelected = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `OR({status} = "selected", {status} = "researching", {status} = "researched", {status} = "drafted")`
);
const queueCounts = { authority: 0, education: 0, community: 0, virality: 0 };
allSelected.forEach(r => {
  const intent = r.fields?.intent;
  if (intent) queueCounts[intent] = (queueCounts[intent] ?? 0) + 1;
});
const queueTotal = Object.values(queueCounts).reduce((a, b) => a + b, 0);
```

### 3. Display ranked table
```
## Ideas Ready for Selection

#  | Title                          | Intent    | Overall | Brand | Original | Virality | Next Action
---|--------------------------------|-----------|---------|-------|----------|----------|------------
1  | [title]                        | authority |   8.2   |  9    |    7     |    8     | [recommended_next_action]
2  | [title]                        | education |   7.8   |  8    |    8     |    6     | ...
...

## Current Queue Composition
authority: [N] posts in pipeline (target: 50%)
education:  [N] posts in pipeline (target: 30%)
community:  [N] posts in pipeline (target: 15%)
virality:   [N] posts in pipeline (target:  5%)

[⚠ Over-indexed: authority at 70% — consider selecting education or community next]
```

**Over-indexing flag**: If any intent exceeds its target by >20 percentage points AND there are alternatives available, flag it prominently.

**Dimensions shown**: `score_overall`, `score_brand_fit`, `score_originality`, `score_virality`.
**Never show**: `score_audience_relevance` — this field is invisible to all commands.

### 4. Simon selects
```
Enter number to select (or 'q' to quit):
```

### 5. Idempotency check
```javascript
const selected = ideas[choice - 1];
if (selected.fields?.selected_at) {
  return `⚠ Idea already selected at ${selected.fields.selected_at} — run /research to proceed.`;
}
```

### 6. Write
```javascript
await patchRecord(
  process.env.AIRTABLE_TABLE_IDEAS,
  selected.id,
  {
    selected_at: new Date().toISOString(),
    status: "selected"
  }
);
```

---

## Writes

| Field | Value |
|---|---|
| `selected_at` | `now()` |
| `status` | `selected` |

---

## Error Path

No lock to reset. If write fails:
```
❌ Failed to mark idea as selected — [error]. Idea status unchanged. Safe to retry.
```
