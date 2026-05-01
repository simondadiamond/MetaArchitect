# Supabase Skill — Pipeline Data Layer

All pipeline data ops go through `tools/supabase.mjs`. **No MCP from inside commands. No raw `@supabase/supabase-js` imports.**

Schema: `pipeline.*` (Supabase project `ashwrqkoijzvakdmfskj`, shared with simonparis-website which uses `public.*`).

---

## Helper API Reference

```javascript
import {
  getRecords, getRecord, createRecord, patchRecord, deleteRecord, upsertRecord,
  logEntry, setLock, clearLock,
  TABLES, db,
} from './tools/supabase.mjs';
```

| Function | Purpose |
|----------|---------|
| `getRecords(table, filter?, opts?)` | List rows. `filter` = column→value map (or `null` / `'__notnull'` / array for `in()`). `opts = { fields, limit, orderBy: {col, dir} }` — **always pass `fields`** to keep the read narrow. |
| `getRecord(table, id, fields?)` | Single row by `id`. Accepts UUID or legacy `recXXX` Airtable record ID; auto-routes via `airtable_record_id`. Returns `null` if not found. |
| `createRecord(table, row, fields?)` | Insert one row, returns inserted row (limited to `fields` if passed). |
| `patchRecord(table, id, fields, returnFields?)` | Update by id. Same UUID/recXXX dual lookup. |
| `deleteRecord(table, id)` | Delete by id. |
| `upsertRecord(table, row, onConflict='id', fields?)` | Insert or update on conflict column. |
| `logEntry({ workflow_id, step_name, status, … })` | Convenience write to `pipeline.logs` (STATE — Traceable). |
| `setLock(table, id, lockField, status?)` | Set timestamp lock + optional status atomically. |
| `clearLock(table, id, lockField, status?)` | Clear lock + optional status revert (failure path). |
| `db` | Raw `@supabase/supabase-js` client (default schema `pipeline`). Use only when the helpers don't fit. |

---

## TABLES Constants

```javascript
TABLES.IDEAS                     // 'ideas'
TABLES.POSTS                     // 'posts'
TABLES.HOOKS                     // 'hooks_library'
TABLES.FRAMEWORKS                // 'framework_library'
TABLES.SNIPPETS                  // 'humanity_snippets'
TABLES.LOGS                      // 'logs'
TABLES.BRAND                     // 'brand'
TABLES.SESSIONS                  // 'sessions'
TABLES.BLOG_IDEAS                // 'blog_ideas'           (Plan 5)
TABLES.BLOG_POSTS                // 'blog_posts'           (Plan 5)
TABLES.ENGAGEMENT_TARGETS        // 'engagement_targets'   (Plan 3)
TABLES.ENGAGEMENT_OPPORTUNITIES  // 'engagement_opportunities' (Plan 3)
```

---

## Column Registry

> **All columns are snake_case.** No more case-sensitive `Topic`/`Status` gotchas. Every table also has:
> - `id uuid PRIMARY KEY` (gen_random_uuid)
> - `airtable_record_id text UNIQUE` (cross-ref during 1-week fallback — drop after decommission)
> - `created_at timestamptz`
> - `updated_at timestamptz` (auto-updated via trigger)

### `brand`
| Column | Type | Notes |
|--------|------|-------|
| name | text | NOT NULL |
| colors | text | |
| typography | text | |
| goals | text | |
| icp_short | text | |
| icp_long | text | |
| main_guidelines | text | |

### `ideas`
| Column | Type | Notes |
|--------|------|-------|
| topic | text | NOT NULL — was Airtable `Topic` |
| status | text | New \| Selected \| Ready \| Completed \| Research_failed |
| intelligence_file | text | UIF JSON string |
| source | text | |
| idea_tags | text[] | |
| workflow_id | text | |
| source_type | text | text \| youtube \| blog |
| raw_input | text | |
| intent | text | authority \| education \| community \| virality |
| content_brief | text | JSON string |
| score_brand_fit / score_originality / score_monetization / score_production_effort / score_virality / score_authority / score_overall | numeric | 1–10 |
| score_rationales | text | JSON string |
| recommended_next_action | text | |
| captured_at / selected_at / research_started_at / research_completed_at / mined_at | timestamptz | |
| planned_week | text | |
| planned_order | numeric | |
| narrative_role | text | |
| series_id / series_part / series_total | text/numeric | |
| selection_reason | text | |
| research_depth | text | shallow \| deep |
| notebook_id | text | NLM notebook ID |

### `posts`
| Column | Type | Notes |
|--------|------|-------|
| format | text | |
| status | text | planned \| researching \| research_ready \| drafted \| approved \| rejected \| published \| scored |
| idea_id | uuid | FK → ideas.id |
| platform | text | linkedin \| twitter |
| intent | text | |
| content_brief | text | |
| draft_content | text | |
| humanity_snippet_id | uuid | FK → humanity_snippets.id |
| alt_snippet_ids | uuid[] | |
| snippet_fit_score | numeric | 1–5 |
| hook_id | uuid | FK → hooks_library.id |
| framework_id | uuid | FK → framework_library.id |
| post_url | text | |
| performance_score | numeric | 0–10 — only scoring signal for the self-improvement loop |
| score_source | text | manual \| metrics \| metrics_override |
| impressions / likes / comments / shares / saves | numeric | |
| drafted_at / reviewed_at / approved_at / published_at | timestamptz | |
| needs_snippet | boolean | |
| planned_week | text | |
| planned_order | numeric | |
| narrative_role | text | |
| angle_index | numeric | 0-based into UIF angles |
| series_id / series_part / series_total | text/numeric | |
| selection_reason | text | |
| research_started_at / research_completed_at | timestamptz | **research_started_at = lock field for /research** |
| pillar | text | |
| thesis_angle / source_angle_name | text | |
| post_class | text | |
| territory_key | text | |

### `hooks_library`
| Column | Type | Notes |
|--------|------|-------|
| hook_text | text | NOT NULL |
| hook_type | text | contrarian \| stat_lead \| question \| story_open \| provocative_claim |
| source_idea_id | uuid | FK → ideas.id (was `source_idea` linked record) |
| angle_name | text | |
| avg_score | numeric | |
| use_count | numeric | |
| status | text | candidate \| proven \| retired |
| avg_impressions / avg_engagement_rate | numeric | EMA |
| intent | text | |

### `framework_library`
| Column | Type | Notes |
|--------|------|-------|
| framework_name | text | NOT NULL |
| pattern_type | text | |
| template | text | |
| best_for | text[] | |
| avg_score / use_count / avg_impressions / avg_engagement_rate | numeric | |
| status | text | |

### `humanity_snippets`
| Column | Type | Notes |
|--------|------|-------|
| snippet_text | text | NOT NULL |
| tags | text[] | |
| used_count | numeric | |
| avg_score / avg_impressions / avg_engagement_rate | numeric | |
| last_used_at | timestamptz | |
| status | text | |

### `logs`
| Column | Type | Notes |
|--------|------|-------|
| workflow_id | text | NOT NULL |
| entity_id | text | the affected record's id (UUID or legacy recXXX) |
| step_name | text | NOT NULL |
| stage | text | |
| timestamp | timestamptz | default now() |
| output_summary | text | |
| model_version | text | |
| status | text | success \| error |

### `sessions` (used by `/pattern` + pattern-guardian)
| Column | Type | Notes |
|--------|------|-------|
| date | date | |
| core_insight | text | |
| related_humanity_snippet | uuid[] | FKs → humanity_snippets.id |
| icp_pain | text | |
| tags | text[] | |
| pattern_confidence | text | |
| full_log | text | |
| status | text | |

### Plan 5 prep — `blog_ideas` / `blog_posts`
See `infra/supabase/schema.sql`. Not yet wired into commands.

### Plan 3 prep — `engagement_targets` / `engagement_opportunities`
See `infra/supabase/schema.sql`. Not yet wired into commands.

---

## Common Patterns

### Read brand (pipeline commands — narrow select)
```javascript
const [brand] = await getRecords(TABLES.BRAND,
  { name: 'metaArchitect' },
  { fields: ['name','goals','icp_short','main_guidelines'], limit: 1 });
```

### Read brand (design/UI — full record)
```javascript
const [brand] = await getRecords(TABLES.BRAND,
  { name: 'metaArchitect' },
  { fields: ['name','colors','typography','goals','icp_short','icp_long','main_guidelines'], limit: 1 });
```

### Filter ideas by status
```javascript
const newIdeas = await getRecords(TABLES.IDEAS,
  { status: 'New' },
  { fields: ['id','topic','intent','captured_at'], limit: 20, orderBy: { col: 'captured_at', dir: 'desc' } });
```

### Fetch a single record (legacy Airtable rec ID still works during fallback)
```javascript
const idea = await getRecord(TABLES.IDEAS, 'rec0CMdThT89QOvnO', ['id','topic','intelligence_file']);
const same = await getRecord(TABLES.IDEAS, idea.id, ['topic','status']); // UUID also works
```

### Set/clear lock on the post stub for /research
```javascript
// Before expensive op:
await setLock(TABLES.POSTS, postStubId, 'research_started_at', 'researching');

// On failure:
await clearLock(TABLES.POSTS, postStubId, 'research_started_at', 'planned');
```

### Log an LLM/API call (STATE — Traceable)
```javascript
await logEntry({
  workflow_id: state.workflowId,
  entity_id:   state.entityId,
  step_name:   'perplexity_research',
  stage:       'research',
  output_summary: `${result.queries.length} queries, ${result.totalTokens} tokens`,
  model_version: 'sonar-pro',
  status: 'success',
});
```

### Create with FK to ideas
```javascript
const idea = await getRecord(TABLES.IDEAS, ideaId, ['id']);
const hook = await createRecord(TABLES.HOOKS, {
  hook_text: '...',
  hook_type: 'contrarian',
  source_idea_id: idea.id,           // UUID FK, not the Airtable array form
  intent: 'authority',
  status: 'candidate',
});
```

### Multi-link writes
Multi-link Airtable fields became `uuid[]` columns. Pass an array of UUIDs:
```javascript
await patchRecord(TABLES.POSTS, postId, {
  alt_snippet_ids: [snippetA.id, snippetB.id, snippetC.id],
});
```

---

## Safe Field Access

PostgREST returns columns that exist as `null` (not `undefined`). Still use nullish coalescing for safety, especially when fields are filtered out by the `select`:

```javascript
const topic   = idea?.topic ?? null;
const uif     = idea?.intelligence_file ? JSON.parse(idea.intelligence_file) : null;
const brief   = idea?.content_brief ? JSON.parse(idea.content_brief) : null;
const score   = idea?.score_overall ?? null;
```

**No more case-sensitive Airtable gotchas**: `topic` is always `topic`, `intelligence_file` is always `intelligence_file`, etc.

---

## Averaging Formulas

Same as the Airtable era — these live in `/score`:

```javascript
function updateRunningAverage(oldAvg, oldCount, newScore) {
  if (oldCount === 0 || oldAvg == null) return newScore;
  return ((oldAvg * (oldCount - 1)) + newScore) / oldCount;
}
function updateEMA(oldAvg, newValue, alpha = 0.3) {
  if (oldAvg == null) return newValue;
  return (alpha * newValue) + ((1 - alpha) * oldAvg);
}
```

Promote/retire thresholds (avg_score only — multi-dimensional fields inform selection, not lifecycle):
```javascript
function shouldPromote(avg, count) { return count >= 3 && avg >= 7.5; }
function shouldRetire(avg, count)  { return count >= 3 && avg < 4.0; }
```

---

## When MCP IS acceptable

- One-shot DDL (creating tables / indexes / functions). Use `mcp__supabase__apply_migration`.
- Interactive diagnostics where Simon asks you a question. Use `mcp__supabase__execute_sql` for ad-hoc queries.
- **Never inside a recurring pipeline command.** Helper-only. (See `feedback_token_conscious_helper_over_mcp.md`.)
