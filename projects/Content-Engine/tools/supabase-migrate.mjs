#!/usr/bin/env node
/**
 * Airtable → Supabase pipeline migration.
 *
 *   Usage:
 *     node tools/supabase-migrate.mjs [--dry-run] [--table=<name>] [--limit=<N>]
 *
 *   --dry-run        Print intended writes, hit no DB.
 *   --table=ideas    Migrate one table only. Repeat order matters for FKs.
 *   --limit=N        Per-table cap (debugging only — default = no cap).
 *
 *   Order is enforced (parents before children):
 *     brand → framework_library → humanity_snippets → ideas
 *       → hooks_library (FK ideas)
 *       → posts        (FK ideas, hooks, humanity_snippets, framework_library)
 *       → logs, sessions (no FK deps)
 *
 *   Idempotent: upserts on `airtable_record_id` (unique). Re-running is safe;
 *   second pass refreshes data without duplicating rows.
 *
 *   Prereq: `pipeline` schema must be exposed via PostgREST
 *   (Supabase Dashboard → Settings → API → Exposed schemas → add `pipeline`).
 *   RLS stays enabled; service-role bypasses.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Walk up from this script to find .env (repo root).
{
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const p = resolve(dir, '.env');
    if (existsSync(p)) { config({ path: p, quiet: true }); break; }
    dir = resolve(dir, '..');
  }
}

// ---------------- CLI args ----------------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const DRY = !!args['dry-run'];
const ONLY_TABLE = typeof args.table === 'string' ? args.table : null;
const LIMIT = args.limit ? Number(args.limit) : null;

// ---------------- Env ----------------
const need = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env var: ${k}`);
  return v;
};
const AIRTABLE_PAT  = need('AIRTABLE_PAT');
const AIRTABLE_BASE = need('AIRTABLE_BASE_ID');
const SUPABASE_URL  = need('SUPABASE_URL');
const SERVICE_KEY   = need('SUPABASE_SERVICE_ROLE_KEY');

const TABLES = {
  IDEAS:      need('AIRTABLE_TABLE_IDEAS'),
  POSTS:      need('AIRTABLE_TABLE_POSTS'),
  HOOKS:      need('AIRTABLE_TABLE_HOOKS'),
  FRAMEWORKS: need('AIRTABLE_TABLE_FRAMEWORKS'),
  SNIPPETS:   need('AIRTABLE_TABLE_SNIPPETS'),
  LOGS:       need('AIRTABLE_TABLE_LOGS'),
  BRAND:      need('AIRTABLE_TABLE_BRAND'),
  SESSIONS:   need('AIRTABLE_TABLE_SESSIONS'),
};

// ---------------- Supabase client ----------------
const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: 'pipeline' },
  auth: { persistSession: false, autoRefreshToken: false }
});

// ---------------- Airtable read helper ----------------
async function airtableAll(tableId) {
  let records = [], offset;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}?${params}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } }
    );
    const data = await res.json();
    if (data.error) throw new Error(`Airtable read ${tableId}: ${JSON.stringify(data.error)}`);
    records = records.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  return records;
}

// ---------------- FK resolver ----------------
// Airtable linked records arrive as ["recXXX"]. Resolve recXXX → uuid via airtable_record_id.
const fkCache = new Map();   // tableName -> Map<airtableId, uuid>
async function loadFkMap(tableName) {
  if (fkCache.has(tableName)) return fkCache.get(tableName);
  const { data, error } = await supa.from(tableName).select('id, airtable_record_id');
  if (error) throw new Error(`FK load ${tableName}: ${error.message}`);
  const map = new Map(data.filter(r => r.airtable_record_id).map(r => [r.airtable_record_id, r.id]));
  fkCache.set(tableName, map);
  return map;
}
async function resolveOne(tableName, airtableIds) {
  if (!airtableIds || !airtableIds.length) return null;
  const map = await loadFkMap(tableName);
  return map.get(airtableIds[0]) ?? null;
}
async function resolveMany(tableName, airtableIds) {
  if (!airtableIds || !airtableIds.length) return null;
  const map = await loadFkMap(tableName);
  return airtableIds.map(id => map.get(id)).filter(Boolean);
}

// ---------------- Field mappers (Airtable record → Supabase row) ----------------
function pickDate(v)   { return v ?? null; }
function pickText(v)   { return v == null ? null : String(v); }
function pickNum(v)    { return v == null || v === '' ? null : Number(v); }
function pickBool(v)   { return v === true; }
function pickArr(v)    { return Array.isArray(v) ? v : (v == null ? null : [v]); }

const MAPPERS = {
  // brand
  async brand(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      name:            pickText(f.name),
      colors:          pickText(f.colors),
      typography:      pickText(f.typography),
      goals:           pickText(f.goals),
      icp_short:       pickText(f.icp_short),
      icp_long:        pickText(f.icp_long),
      main_guidelines: pickText(f.main_guidelines),
    };
  },

  // framework_library
  async framework_library(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      framework_name:      pickText(f.framework_name),
      pattern_type:        pickText(f.pattern_type),
      template:            pickText(f.template),
      best_for:            pickArr(f.best_for),
      avg_score:           pickNum(f.avg_score),
      use_count:           pickNum(f.use_count),
      status:              pickText(f.status),
      avg_impressions:     pickNum(f.avg_impressions),
      avg_engagement_rate: pickNum(f.avg_engagement_rate),
    };
  },

  // humanity_snippets
  async humanity_snippets(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      snippet_text:        pickText(f.snippet_text),
      tags:                pickArr(f.tags),
      used_count:          pickNum(f.used_count),
      avg_score:           pickNum(f.avg_score),
      avg_impressions:     pickNum(f.avg_impressions),
      avg_engagement_rate: pickNum(f.avg_engagement_rate),
      last_used_at:        pickDate(f.last_used_at),
      status:              pickText(f.status),
    };
  },

  // ideas
  async ideas(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      topic:                    pickText(f['Topic']),
      status:                   pickText(f['Status']),
      intelligence_file:        pickText(f['Intelligence File']),
      source:                   pickText(f['Source']),
      idea_tags:                pickArr(f['Idea Tags']),
      workflow_id:              pickText(f.workflow_id),
      source_type:              pickText(f.source_type),
      raw_input:                pickText(f.raw_input),
      intent:                   pickText(f.intent),
      content_brief:            pickText(f.content_brief),
      score_brand_fit:          pickNum(f.score_brand_fit),
      score_originality:        pickNum(f.score_originality),
      score_monetization:       pickNum(f.score_monetization),
      score_production_effort:  pickNum(f.score_production_effort),
      score_virality:           pickNum(f.score_virality),
      score_authority:          pickNum(f.score_authority),
      score_overall:            pickNum(f.score_overall),
      score_rationales:         pickText(f.score_rationales),
      recommended_next_action:  pickText(f.recommended_next_action),
      captured_at:              pickDate(f.captured_at),
      selected_at:              pickDate(f.selected_at),
      research_started_at:      pickDate(f.research_started_at),
      research_completed_at:    pickDate(f.research_completed_at),
      planned_week:             pickText(f.planned_week),
      planned_order:            pickNum(f.planned_order),
      narrative_role:           pickText(f.narrative_role),
      series_id:                pickText(f.series_id),
      series_part:              pickNum(f.series_part),
      series_total:             pickNum(f.series_total),
      selection_reason:         pickText(f.selection_reason),
      research_depth:           pickText(f.research_depth),
      notebook_id:              pickText(f.notebook_id),
      mined_at:                 pickDate(f.mined_at),
    };
  },

  // hooks_library — FK to ideas via source_idea
  async hooks_library(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      hook_text:           pickText(f.hook_text),
      hook_type:           pickText(f.hook_type),
      source_idea_id:      await resolveOne('ideas', f.source_idea),
      angle_name:          pickText(f.angle_name),
      avg_score:           pickNum(f.avg_score),
      use_count:           pickNum(f.use_count),
      status:              pickText(f.status),
      avg_impressions:     pickNum(f.avg_impressions),
      avg_engagement_rate: pickNum(f.avg_engagement_rate),
      intent:              pickText(f.intent),
    };
  },

  // posts — multiple FKs
  async posts(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      format:                pickText(f.format),
      status:                pickText(f.status),
      idea_id:               await resolveOne('ideas', f.idea_id),
      platform:              pickText(f.platform),
      intent:                pickText(f.intent),
      content_brief:         pickText(f.content_brief),
      draft_content:         pickText(f.draft_content),
      humanity_snippet_id:   await resolveOne('humanity_snippets', f.humanity_snippet_id),
      alt_snippet_ids:       await resolveMany('humanity_snippets', f.alt_snippet_ids),
      snippet_fit_score:     pickNum(f.snippet_fit_score),
      hook_id:               await resolveOne('hooks_library', f.hook_id),
      framework_id:          await resolveOne('framework_library', f.framework_id),
      post_url:              pickText(f.post_url),
      performance_score:     pickNum(f.performance_score),
      score_source:          pickText(f.score_source),
      impressions:           pickNum(f.impressions),
      likes:                 pickNum(f.likes),
      comments:              pickNum(f.comments),
      shares:                pickNum(f.shares),
      saves:                 pickNum(f.saves),
      drafted_at:            pickDate(f.drafted_at),
      reviewed_at:           pickDate(f.reviewed_at),
      approved_at:           pickDate(f.approved_at),
      published_at:          pickDate(f.published_at),
      needs_snippet:         pickBool(f.needs_snippet),
      planned_week:          pickText(f.planned_week),
      planned_order:         pickNum(f.planned_order),
      narrative_role:        pickText(f.narrative_role),
      angle_index:           pickNum(f.angle_index),
      series_id:             pickText(f.series_id),
      series_part:           pickNum(f.series_part),
      series_total:          pickNum(f.series_total),
      selection_reason:      pickText(f.selection_reason),
      research_started_at:   pickDate(f.research_started_at),
      research_completed_at: pickDate(f.research_completed_at),
      pillar:                pickText(f.pillar),
      thesis_angle:          pickText(f.thesis_angle),
      source_angle_name:     pickText(f.source_angle_name),
      post_class:            pickText(f.post_class),
      territory_key:         pickText(f.territory_key),
    };
  },

  // logs
  async logs(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      workflow_id:    pickText(f.workflow_id) ?? '',
      entity_id:      pickText(f.entity_id),
      step_name:      pickText(f.step_name) ?? 'unknown',
      stage:          pickText(f.stage),
      timestamp:      pickDate(f.timestamp) ?? new Date().toISOString(),
      output_summary: pickText(f.output_summary),
      model_version:  pickText(f.model_version),
      status:         pickText(f.status) ?? 'success',
    };
  },

  // sessions
  async sessions(r) {
    const f = r.fields || {};
    return {
      airtable_record_id: r.id,
      date:                     pickDate(f.date),
      core_insight:             pickText(f.core_insight),
      related_humanity_snippet: await resolveMany('humanity_snippets', f.related_humanity_snippet),
      icp_pain:                 pickText(f.icp_pain),
      tags:                     pickArr(f.tags),
      pattern_confidence:       pickText(f.pattern_confidence),
      full_log:                 pickText(f.full_log),
      status:                   pickText(f.status),
    };
  },
};

// ---------------- Migration order (parents before children) ----------------
const ORDER = [
  ['brand',             TABLES.BRAND],
  ['framework_library', TABLES.FRAMEWORKS],
  ['humanity_snippets', TABLES.SNIPPETS],
  ['ideas',             TABLES.IDEAS],
  ['hooks_library',     TABLES.HOOKS],
  ['posts',             TABLES.POSTS],
  ['logs',              TABLES.LOGS],
  ['sessions',          TABLES.SESSIONS],
];

// ---------------- Run ----------------
console.log(`[migrate] mode=${DRY ? 'DRY-RUN' : 'WRITE'} only=${ONLY_TABLE ?? '(all)'} limit=${LIMIT ?? 'none'}`);
console.log(`[migrate] supabase=${SUPABASE_URL}`);

const summary = [];
for (const [name, atId] of ORDER) {
  if (ONLY_TABLE && ONLY_TABLE !== name) continue;
  process.stdout.write(`[${name}] reading airtable… `);
  let recs;
  try {
    recs = await airtableAll(atId);
  } catch (e) {
    console.log(`✗ ${e.message}`);
    summary.push({ name, total: 0, written: 0, error: e.message });
    continue;
  }
  if (LIMIT) recs = recs.slice(0, LIMIT);
  console.log(`${recs.length} records`);

  // Map
  const rows = [];
  for (const r of recs) {
    try {
      rows.push(await MAPPERS[name](r));
    } catch (e) {
      console.log(`  [map err ${r.id}] ${e.message}`);
    }
  }

  if (DRY) {
    console.log(`  DRY: would upsert ${rows.length} rows. Sample[0]:`, JSON.stringify(rows[0], null, 2)?.slice(0, 600));
    summary.push({ name, total: recs.length, written: 0, dry: rows.length });
    continue;
  }

  // Upsert in chunks (PostgREST has practical request size limits)
  const CHUNK = 100;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const { error } = await supa.from(name).upsert(batch, { onConflict: 'airtable_record_id' });
    if (error) {
      console.log(`  [upsert err ${i}-${i+batch.length}] ${error.message}`);
      summary.push({ name, total: recs.length, written, error: error.message });
      break;
    }
    written += batch.length;
    process.stdout.write(`  upserted ${written}/${rows.length}\r`);
  }
  console.log(`  upserted ${written}/${rows.length} ✓`);
  summary.push({ name, total: recs.length, written });

  // Invalidate FK cache for downstream tables
  fkCache.delete(name);
}

console.log('\n[migrate] summary:');
console.table(summary);

// Verify final row counts (skip in dry-run)
if (!DRY && !ONLY_TABLE) {
  console.log('\n[verify] supabase row counts:');
  for (const [name] of ORDER) {
    const { count, error } = await supa.from(name).select('*', { count: 'exact', head: true });
    if (error) console.log(`  ${name}: ERR ${error.message}`);
    else console.log(`  ${name}: ${count}`);
  }
}
