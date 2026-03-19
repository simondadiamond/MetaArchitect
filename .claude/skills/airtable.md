# Airtable Skill — MCP Edition

All Airtable operations use MCP tools directly. **No node scripts. No HTTP client.**

---

## MCP Tool Reference

| Tool | When to Use |
|------|-------------|
| `mcp__claude_ai_Airtable__list_records_for_table` | Read/query records from any table |
| `mcp__claude_ai_Airtable__create_records_for_table` | Create new records (up to 10 per call) |
| `mcp__claude_ai_Airtable__update_records_for_table` | Update existing records by record ID |
| `mcp__claude_ai_Airtable__get_table_schema` | **Required before filtering on singleSelect/multipleSelects** — returns choice IDs |
| `mcp__claude_ai_Airtable__list_tables_for_base` | Discover table/field schemas |

---

## Base & Table IDs

```
BASE_ID:    appgvQDqiFZ3ESigA

IDEAS:      tblVKVojZscMG6gDk
POSTS:      tblz0nikoZ89MHHTs
HOOKS:      tblWuQNSJ25bs18DZ
FRAMEWORKS: tblYsys2ydvryVtmf
SNIPPETS:   tblk8QpMOBOs6BMbF
LOGS:       tblzT4NBJ2Q6zm3Qf
BRAND:      tblwfU5EpDgOKUF7f
SESSIONS:   tblcqd1u7lPHbLRDZ
```

---

## Write Rules

**Always pass `typecast: true`** on any `create_records_for_table` or `update_records_for_table` call that touches:
- singleSelect fields (Status, status, intent, hook_type, pattern_type, narrative_role, pillar, post_class, etc.)
- multipleSelects fields (tags, best_for, etc.)
- Any field value that might not yet exist in Airtable's option list

`typecast: true` instructs Airtable to auto-create missing select options instead of rejecting with `INVALID_VALUE_FOR_COLUMN`.

---

## Filter Patterns

**Text/number fields**: use `operator: "="` with plain string/number value — no schema lookup needed.

**singleSelect/multipleSelects fields**: call `get_table_schema` first to get choice IDs, then use those choice IDs (`selXXX...`) in the filter.

```
// Example: filter posts by status = "planned"
// Step 1 — get choice ID:
get_table_schema(appgvQDqiFZ3ESigA, [{ tableId: "tblz0nikoZ89MHHTs", fieldIds: ["fldlC1PMzRw0z6cTR"] }])
// → returns choices including { id: "selXXX", name: "planned" }

// Step 2 — filter with choice ID:
list_records_for_table(appgvQDqiFZ3ESigA, "tblz0nikoZ89MHHTs", {
  filters: { operator: "=", operands: ["fldlC1PMzRw0z6cTR", "selXXX"] }
})
```

**Shortcut for non-select fields** (text, url, number, dateTime): pass the plain value directly — no `get_table_schema` needed.

```
// Filter brand by name (singleLineText — no schema lookup):
filters: { operator: "=", operands: ["fldsP8FwcTxJdkac8", "metaArchitect"] }

// Filter ideas by Status (singleSelect — needs schema lookup for choice ID first)
```

---

## Field ID Registry

### `brand` table (`tblwfU5EpDgOKUF7f`)

| Field Name | Field ID | Type |
|-----------|----------|------|
| name | `fldsP8FwcTxJdkac8` | singleLineText |
| colors | `fld9E3rY6tQfZDas6` | multilineText |
| typography | `fldMgky7tvS2Y877o` | multilineText |
| goals | `fld7N55IwEM8CQYW0` | multilineText |
| icp_short | `fldLYt1DMS1Fwd5Vy` | multilineText |
| icp_long | `fldIgCmPBohoEqet2` | multilineText |
| main_guidelines | `fldBtXwgSegiYP2pB` | multilineText |

---

### `ideas` table (`tblVKVojZscMG6gDk`)

| Field Name | Field ID | Type | Notes |
|-----------|----------|------|-------|
| Topic | `fldMtlpG32VKE0WkN` | singleLineText | Primary field — capital T |
| Status | `fld9frOZF4oaf3r6V` | singleSelect | capital S — New/Selected/Ready/Completed |
| Intelligence File | `fldQMArYmpP8s6VKb` | richText | UIF JSON string |
| Source | `fld7FkHIuCaZ47SyA` | url | |
| Idea Tags | `fldKlNHyRvqi2AXSt` | multipleSelects | |
| Summary (AI) | `fldCS8r2zHVVoxN98` | aiText | **never write** |
| Next Best Action (AI) | `fldGGeutXvC8udZlY` | aiText | **never write** |
| posts | `fldTiDp9W9smM5LYi` | multipleRecordLinks | |
| hooks_library | `fld2Y7Kc0XIncrPdF` | multipleRecordLinks | |
| workflow_id | `fldoREHCHsCU6pXuE` | singleLineText | |
| source_type | `fldBkIqNugXb4M5Fk` | singleSelect | text/youtube/blog |
| raw_input | `fldrQ3CDTEDuIhEsy` | multilineText | |
| intent | `fldF8BxXjbUiHCWIa` | singleSelect | authority/education/community/virality |
| content_brief | `fldBvV1FgpD1l2PG1` | multilineText | JSON string |
| score_brand_fit | `fldeYByfFx9xjFnnK` | number | 1–10 |
| score_originality | `fldquN4wVbd6eLKYF` | number | 1–10 |
| score_monetization | `fldnFzMf3h6L7ez0l` | number | 1–10 |
| score_production_effort | `fldrYVICu2Tg71Jrk` | number | 1–10 |
| score_virality | `fldvw93lwpYEqD5nX` | number | 1–10 |
| score_authority | `fld1L6eEoqpP6uxbX` | number | 1–10 |
| score_overall | `fldJatmYz453YGTyV` | number | 1–10 |
| score_rationales | `flddvjuABw1KBIf4K` | multilineText | JSON string |
| recommended_next_action | `fldgyi72BLytnCNPN` | singleLineText | |
| captured_at | `fldYU3CKk5HZAfrWo` | dateTime | |
| selected_at | `fldx3QLe3tKPmU88U` | dateTime | |
| research_started_at | `fldzWpw1NBIgxrduE` | dateTime | LOCK FIELD (ideas-level, legacy) |
| research_completed_at | `fldvnK9lQWpoJaL30` | dateTime | |
| planned_week | `fldQ4HAbKT4EpDHia` | singleLineText | |
| planned_order | `fldobKcPlvIW5JWYS` | number | |
| narrative_role | `fldzcXD1wJnhu5ZEs` | singleSelect | |
| series_id | `fldjo0FClUuE1zBNQ` | singleLineText | |
| series_part | `flduIvX09gNOJ7Dg0` | number | |
| series_total | `fldl5MtAuGBTFxsgb` | number | |
| selection_reason | `fld5Q97Lwm8ZzHpAK` | multilineText | |
| research_depth | `fldAwyDJrDdoyPmtR` | singleSelect | shallow / deep |
| score_audience_relevance | — | — | **NEVER READ OR WRITE** |

---

### `posts` table (`tblz0nikoZ89MHHTs`)

| Field Name | Field ID | Type | Notes |
|-----------|----------|------|-------|
| format | `fldNLoKpmKHPvxP4Q` | singleLineText | Primary field |
| status | `fldlC1PMzRw0z6cTR` | singleSelect | planned/researching/research_ready/drafted/approved/rejected/published/scored |
| idea_id | `fldlGGDwqp6Hy17jT` | multipleRecordLinks | write as array `["recXXX"]` |
| platform | `fldztvQenFV0pW44l` | singleSelect | linkedin/twitter |
| intent | `fldps8GeW62IjxTze` | singleSelect | |
| content_brief | `fldOz9xBFwXTHBMAR` | multilineText | |
| draft_content | `fldgVwvcXFDA7RCxf` | multilineText | |
| humanity_snippet_id | `fldNQw5L5KBFpFt5a` | multipleRecordLinks | |
| alt_snippet_ids | `fldmmLHwgsBpa6KP6` | multipleRecordLinks | |
| snippet_fit_score | `fld9OwHI6Z2Al3p7T` | number | 1–5 |
| hook_id | `fldRHUQer2GFyLieS` | multipleRecordLinks | |
| framework_id | `fldk046kLs4yG2p1Y` | multipleRecordLinks | |
| post_url | `fldphmqLqRe5j2m7m` | url | |
| performance_score | `fldIjahm90oqJEqHx` | number | 0–10 |
| score_source | `fldHUA73iAythfRsQ` | singleSelect | manual |
| impressions | `fldRyYfmhccOoey4l` | number | |
| likes | `fldCOE7QjPrgWhbbk` | number | |
| comments | `fld4oisT7v4LXXi9C` | number | |
| shares | `fldn7UrJDVcSLCgob` | number | |
| saves | `fld9VHOO3Buk7NVwN` | number | |
| drafted_at | `flde3pQnFHI8shfyX` | dateTime | |
| reviewed_at | `fldbADciv8HNH3Byd` | dateTime | |
| approved_at | `fldT83d0w0fpnPSLj` | dateTime | |
| published_at | `fldr6w1R6fRiGXyXp` | dateTime | |
| needs_snippet | `fldcQe7vI0lE6qqwQ` | checkbox | |
| planned_week | `fldViXirsiFl1j1w4` | singleLineText | |
| planned_order | `fldIqhg3WzB4vZfhl` | number | |
| narrative_role | `fldDNwByEQkXdq4lV` | singleSelect | |
| angle_index | `fldwDOdJgmbf2IZKv` | number | |
| series_id | `fldpBvFcdLC7HzPMW` | singleLineText | |
| series_part | `fldTRXgVNHg6xVty6` | number | |
| series_total | `fldrU6OKqbY0Ho1Zk` | number | |
| selection_reason | `fldoQ2b3a98KFqF76` | multilineText | |
| research_started_at | `fldC2PIfrupZA2Ohk` | singleLineText | **LOCK FIELD for /research** |
| research_completed_at | `fldzTm7FfPo9FtEYX` | singleLineText | |
| pillar | `fldoszwWyI2UBIIzu` | singleSelect | |
| thesis_angle | `fldQCAzyYIQIuCxuz` | multilineText | |
| source_angle_name | `fldytfAwg6mutdJyK` | multilineText | |
| post_class | `fldw3GtLHQeFtN9xl` | singleSelect | |
| territory_key | `fldrhO25vUB5CDjgt` | singleLineText | |

---

### `hooks_library` table (`tblWuQNSJ25bs18DZ`)

| Field Name | Field ID | Type |
|-----------|----------|------|
| hook_text | `fldSIjqzsFuxWOaYb` | multilineText |
| hook_type | `fldOvWxj7O0x51aIX` | singleSelect |
| source_idea | `fld3aBVety5oSAxKu` | multipleRecordLinks |
| angle_name | `fldnuhK79wUIKnrw4` | singleLineText |
| avg_score | `fld0b1nWNg3ZXT21f` | number |
| use_count | `fldfckbIwaSSebctW` | number |
| status | `fldVKrSnP34sofwZ7` | singleSelect |
| created_at | `fldvdfu2VmrMCiFUp` | dateTime |
| posts | `fldUhX4Ok8FusbGhb` | multipleRecordLinks |
| intent | `fld6UZ8Fy7q2cZQyF` | singleSelect |

---

### `framework_library` table (`tblYsys2ydvryVtmf`)

| Field Name | Field ID | Type |
|-----------|----------|------|
| framework_name | `fldcFJnXRemmm2PqU` | singleLineText |
| pattern_type | `fld92B4yioAGqEbfL` | singleSelect |
| template | `fldMPkk9oVvbqvTv5` | multilineText |
| best_for | `fldlCsQrc9GWIT1yg` | multipleSelects |
| avg_score | `fldoAs2QC066Th0x9` | number |
| use_count | `fldtVJ6vuENyFgz8A` | number |
| status | `fldBhDdj55AxwLEUl` | singleSelect |
| posts | `fldsoT3IJfFwUBJWr` | multipleRecordLinks |

---

### `humanity_snippets` table (`tblk8QpMOBOs6BMbF`)

| Field Name | Field ID | Type |
|-----------|----------|------|
| snippet_text | `fldaWegy2OyWpA28D` | multilineText |
| tags | `fldZFO5xKMiqBuUMY` | multipleSelects |
| used_count | `fldZ6ifFD4OW0PDOt` | number |
| avg_score | `fldiAFNJJZUcqhr7C` | number |
| last_used_at | `fldfqHyUlwn7JqBFn` | dateTime |
| status | `fld90hLmFbyPWvy59` | singleSelect |
| posts | `fldt8KvFx16GKiPYE` | multipleRecordLinks |

---

### `logs` table (`tblzT4NBJ2Q6zm3Qf`)

| Field Name | Field ID | Type |
|-----------|----------|------|
| step_name | `fldqFGc3QNHtYiPjp` | singleLineText |
| workflow_id | `fldp7Zsgs888JvnYq` | singleLineText |
| entity_id | `fldn6jkRqcSEpDcc7` | singleLineText |
| stage | `fldSFNnlFROARTXfE` | singleLineText |
| timestamp | `fldBxL1E3SVtJSVWj` | dateTime |
| output_summary | `fldrSZoPUa7UjNYbt` | multilineText |
| model_version | `fldymNXN8sOW1abY3` | singleLineText |
| status | `fldsP1V6BvOxeZ5l7` | singleSelect |

---

### `sessions` table (`tblcqd1u7lPHbLRDZ`)

| Field Name | Field ID | Type |
|-----------|----------|------|
| core_insight | `fldLPEsaae8WeDu3t` | multilineText |
| date | `fldH9soyr17SWtMwK` | date |
| humanity_snippet | `fldZPquZjCrtMf7XG` | multilineText | legacy text field — do not write |
| related_humanity_snippet | `fldDbA1GMpBsyUbfu` | multipleRecordLinks → `humanity_snippets` |
| icp_pain | `fldOPmlpP4IKsoIES` | singleSelect |
| tags | `fldGoAnyUdOjHxla8` | multipleSelects |
| pattern_confidence | `fldb7Xhw9KR4EGbbs` | singleSelect |
| full_log | `flduCUerEj69CqX7X` | multilineText |
| status | `fldGnEjn1ClybjRBe` | singleSelect |

---

## Common MCP Patterns

### Read brand record
```
mcp__claude_ai_Airtable__list_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblwfU5EpDgOKUF7f",
  fieldIds: ["fldsP8FwcTxJdkac8","fld9E3rY6tQfZDas6","fldMgky7tvS2Y877o","fld7N55IwEM8CQYW0","fldLYt1DMS1Fwd5Vy","fldIgCmPBohoEqet2","fldBtXwgSegiYP2pB"],
  filters: { operator: "=", operands: ["fldsP8FwcTxJdkac8", "metaArchitect"] }
)
→ brand = result.records[0]
```

### Create a log entry
```
mcp__claude_ai_Airtable__create_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblzT4NBJ2Q6zm3Qf",
  typecast: true,
  records: [{
    fields: {
      fldp7Zsgs888JvnYq: workflow_id,
      fldn6jkRqcSEpDcc7: entity_id,
      fldqFGc3QNHtYiPjp: step_name,
      fldSFNnlFROARTXfE: stage,
      fldBxL1E3SVtJSVWj: new Date().toISOString(),
      fldrSZoPUa7UjNYbt: output_summary,
      fldymNXN8sOW1abY3: model_version,
      fldsP1V6BvOxeZ5l7: "success" | "error"
    }
  }]
)
```

### Set research lock on post stub (before expensive op)
```
mcp__claude_ai_Airtable__update_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblz0nikoZ89MHHTs",
  typecast: true,
  records: [{ id: postStubId, fields: {
    fldC2PIfrupZA2Ohk: new Date().toISOString(),   // research_started_at
    fldlC1PMzRw0z6cTR: "researching"                // status
  }}]
)
```

### Clear lock on error
```
mcp__claude_ai_Airtable__update_records_for_table(
  baseId: "appgvQDqiFZ3ESigA",
  tableId: "tblz0nikoZ89MHHTs",
  typecast: true,
  records: [{ id: postStubId, fields: {
    fldC2PIfrupZA2Ohk: null,       // research_started_at cleared
    fldlC1PMzRw0z6cTR: "planned"   // status reverted
  }}]
)
```

---

## Safe Field Access

Always use nullish coalescing — fields missing from the MCP response return `undefined`, not `null`:

```javascript
const topic   = record.fields?.["Topic"] ?? null;             // ideas: capital T
const status  = record.fields?.status ?? null;                // posts: lowercase
const uif     = record.fields?.["Intelligence File"] ?? null; // ideas: spaced, capital I/F
const score   = record.fields?.score_overall ?? null;
const brief   = record.fields?.content_brief
  ? JSON.parse(record.fields.content_brief)
  : null;
```

**Airtable checkbox read-back**: `needs_snippet = false` (unchecked) does NOT appear in the API response — the field is absent, not `false`. This is correct Airtable behavior.

---

## Running Average Formula

Used by `/score` when updating `avg_score` after a new `performance_score`:

```javascript
function updateRunningAverage(oldAvg, oldCount, newScore) {
  if (oldCount === 0 || oldAvg === null) return newScore;
  return ((oldAvg * (oldCount - 1)) + newScore) / oldCount;
}
// Call AFTER incrementing use_count. oldCount = new (incremented) use_count.
// Example: use_count was 2, now 3. oldCount = 3.
// new_avg = ((old_avg * 2) + new_score) / 3
```

---

## Promote / Retire Thresholds

```javascript
function shouldPromote(avg, count) { return count >= 3 && avg >= 7.5; }
function shouldRetire(avg, count)  { return count >= 3 && avg < 4.0; }
```
