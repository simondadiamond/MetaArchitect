# Airtable Skill

All Airtable operations use the REST API v0 with Personal Access Token auth.

---

## Authentication

```javascript
const headers = {
  "Authorization": `Bearer ${process.env.AIRTABLE_PAT}`,
  "Content-Type": "application/json"
};
const BASE = process.env.AIRTABLE_BASE_ID;
```

---

## Table Environment Variables

| Variable | Table | Purpose |
|---|---|---|
| `AIRTABLE_TABLE_IDEAS` | `ideas` | Content ideas with scoring and research data |
| `AIRTABLE_TABLE_POSTS` | `posts` | Draft and published posts |
| `AIRTABLE_TABLE_HOOKS` | `hooks_library` | Hook candidates, proven hooks, retired hooks |
| `AIRTABLE_TABLE_FRAMEWORKS` | `framework_library` | Content frameworks and templates |
| `AIRTABLE_TABLE_SNIPPETS` | `humanity_snippets` | Personal story/experience snippets |
| `AIRTABLE_TABLE_LOGS` | `logs` | STATE traceability log |
| `AIRTABLE_TABLE_BRAND` | `brand` | Core brand context and guidelines |

---

## Field Name Reference

### `brand` table
```
name                    (text)
colors                  (text)
typography              (text)
goals                   (text)
icp_short               (text)
icp_long                (long text)
main_guidelines         (long text)
```

### `ideas` table
```
title                   (text)
status                  (single select: processing/pending_selection/selected/researching/researched/research_failed)
source_type             (single select: text/youtube/blog)
source_url              (url)
raw_input               (long text)
workflow_id             (text)
intent                  (single select: authority/education/community/virality)
content_brief           (long text — JSON string)
intelligence_file       (long text — JSON string, UIF v3.0)
score_brand_fit         (number 1-10)
score_originality       (number 1-10)
score_monetization      (number 1-10)
score_production_effort (number 1-10, inverted: 10=easy)
score_virality          (number 1-10)
score_authority         (number 1-10)
score_overall           (number 1-10)
score_rationales        (long text — JSON string)
recommended_next_action (text)
captured_at             (date/time)
selected_at             (date/time)
research_started_at     (date/time — LOCK FIELD)
research_completed_at   (date/time — GATE FIELD)
```

**Note**: `score_audience_relevance` exists in Airtable but is never read or written by any command.

### `posts` table
```
idea_id                 (linked record — array of record IDs)
platform                (single select: linkedin/twitter/youtube)
intent                  (single select: authority/education/community/virality)
format                  (text)
draft_content           (long text)
hook_id                 (linked record — hooks_library)
framework_id            (linked record — framework_library)
humanity_snippet_id     (linked record — humanity_snippets)
needs_snippet           (checkbox — true if no snippet matched during draft)
post_url                (url)
performance_score       (number 0-10)
score_source            (single select: manual)
status                  (single select: drafted/approved/rejected/published/scored)
drafted_at              (date/time)
approved_at             (date/time)
published_at            (date/time)
```

### `hooks_library` table
```
hook_text               (long text)
hook_type               (single select: contrarian/stat_lead/question/story_open/provocative_claim)
source_idea             (linked record — ideas)
angle_name              (text)
intent                  (single select: authority/education/community/virality)
status                  (single select: candidate/proven/retired)
avg_score               (number — running average of performance scores)
use_count               (number — times used in published posts)
created_at              (created time — auto)
```

### `framework_library` table
```
framework_name          (text)
pattern_type            (single select: before_after/problem_solution/contrarian/stat_lead/story_arc/case_study)
best_for                (text — comma-separated pillar names)
template                (long text — structural scaffold, 3-5 sentences)
status                  (single select: candidate/proven/retired)
use_count               (number)
avg_score               (number — running average)
```

### `humanity_snippets` table
```
snippet_text            (long text)
tags                    (text — comma-separated)
status                  (single select: active/inactive)
used_count              (number)
```

### `logs` table
```
workflow_id             (text)
entity_id               (text — Airtable record ID)
step_name               (text)
stage                   (text)
timestamp               (date/time)
output_summary          (long text)
model_version           (text)
status                  (single select: success/error)
```

---

## API Patterns

### GET — list with filter
```javascript
async function getRecords(tableId, formula, sort = []) {
  const params = new URLSearchParams();
  if (formula) params.append("filterByFormula", formula);
  if (sort.length) sort.forEach((s, i) => {
    params.append(`sort[${i}][field]`, s.field);
    params.append(`sort[${i}][direction]`, s.direction || "asc");
  });

  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${tableId}?${params}`,
    { headers }
  );
  const data = await res.json();
  return data.records || [];
}
```

### GET — paginated (use for large tables)
```javascript
async function getAllRecords(tableId, formula) {
  let records = [], offset;
  do {
    const params = new URLSearchParams();
    if (formula) params.append("filterByFormula", formula);
    if (offset) params.append("offset", offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/${tableId}?${params}`,
      { headers }
    );
    const data = await res.json();
    records = records.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  return records;
}
```

### PATCH — update by record ID
```javascript
async function patchRecord(tableId, recordId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${tableId}/${recordId}`,
    { method: "PATCH", headers, body: JSON.stringify({ fields }) }
  );
  return res.json();
}
```

### POST — create record
```javascript
async function createRecord(tableId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${tableId}`,
    { method: "POST", headers, body: JSON.stringify({ fields }) }
  );
  return res.json();
}
```

---

## Safe Field Access

Always use nullish coalescing when reading Airtable fields — fields missing from the response return `undefined`, not `null`:

```javascript
const title = record.fields?.title ?? null;
const score = record.fields?.score_overall ?? null;
const brief = record.fields?.content_brief
  ? JSON.parse(record.fields.content_brief)
  : null;
```

---

## Running Average Formula

Used by improver skill when updating `avg_score` after a new `performance_score`:

```javascript
function updateRunningAverage(oldAvg, oldCount, newScore) {
  if (oldCount === 0 || oldAvg === null) return newScore;
  return ((oldAvg * (oldCount - 1)) + newScore) / oldCount;
}
// Note: call AFTER incrementing use_count, so oldCount = new use_count
// Example: use_count was 2, now 3. oldCount = 3.
// new_avg = ((old_avg * 2) + new_score) / 3
```

---

## Common Filter Formulas

```javascript
// Ideas ready for research
`AND({status} = "selected", {research_started_at} = "")`

// Ideas ready for drafting
`AND({status} = "researched", {research_completed_at} != "")`

// Posts ready for review
`{status} = "drafted"`

// Posts ready for scoring
`AND({status} = "published", {performance_score} = "")`

// Hooks not retired, for /draft
`{status} != "retired"`

// Proven hooks first (sort: proven before candidate)
// Use status field sort: proven → candidate order in sort array
```
