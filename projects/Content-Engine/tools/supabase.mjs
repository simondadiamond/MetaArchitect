/**
 * Supabase pipeline helper — token-conscious replacement for Airtable MCP calls.
 *
 *   import { getRecords, getRecord, createRecord, patchRecord, deleteRecord,
 *            upsertRecord, logEntry, setLock, clearLock, TABLES, db } from './tools/supabase.mjs';
 *
 *   All reads accept `fields: ['col1', 'col2']` to limit columns — never SELECT *.
 *   ID arguments accept both UUIDs and legacy Airtable record IDs (`recXXXXXXXXXXXXXX`),
 *   resolved via the `airtable_record_id` column during the fallback window.
 *
 *   Schema: `pipeline` (must be in Supabase Dashboard → API → Exposed schemas).
 *   Auth:   service_role key (bypasses RLS).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Walk up from this script to find .env (repo root).
{
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const p = resolve(dir, '.env');
    if (existsSync(p)) { config({ path: p, quiet: true }); break; }
    dir = resolve(dir, '..');
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('supabase.mjs: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env');
}

/** Raw client for advanced use. Default schema = pipeline. */
export const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  db: { schema: 'pipeline' },
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Table names — same shape as the old TABLES export so call sites change minimally. */
export const TABLES = {
  IDEAS:      'ideas',
  POSTS:      'posts',
  HOOKS:      'hooks_library',
  FRAMEWORKS: 'framework_library',
  SNIPPETS:   'humanity_snippets',
  LOGS:       'logs',
  BRAND:      'brand',
  SESSIONS:   'sessions',
  BLOG_IDEAS:              'blog_ideas',
  BLOG_POSTS:              'blog_posts',
  ENGAGEMENT_TARGETS:      'engagement_targets',
  ENGAGEMENT_OPPORTUNITIES:'engagement_opportunities',
};

const AIRTABLE_ID_RE = /^rec[A-Za-z0-9]{14}$/;
const isAirtableId = (id) => typeof id === 'string' && AIRTABLE_ID_RE.test(id);

function applyFilter(query, filter) {
  if (!filter) return query;
  for (const [k, v] of Object.entries(filter)) {
    if (v === null)            query = query.is(k, null);
    else if (v === '__notnull') query = query.not(k, 'is', null);
    else if (Array.isArray(v))  query = query.in(k, v);
    else                        query = query.eq(k, v);
  }
  return query;
}

function selectClause(fields) {
  if (!fields || !fields.length) return '*';     // explicit opt-in to wide selects
  return fields.join(',');
}

/**
 * GET — list rows.
 * @param {string} table
 * @param {object} [filter] — column→value (use null / '__notnull' / array for in())
 * @param {object} [opts]   — { fields: [...], limit: 100, orderBy: { col, dir: 'asc'|'desc' } }
 */
export async function getRecords(table, filter = null, opts = {}) {
  const { fields, limit, orderBy } = opts;
  let q = db.from(table).select(selectClause(fields));
  q = applyFilter(q, filter);
  if (orderBy) q = q.order(orderBy.col, { ascending: (orderBy.dir ?? 'asc') === 'asc' });
  if (limit)   q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(`supabase.getRecords(${table}): ${error.message}`);
  return data;
}

/**
 * GET — single row by id (UUID) or legacy Airtable record ID.
 * Returns null if not found.
 */
export async function getRecord(table, id, fields = null) {
  const col = isAirtableId(id) ? 'airtable_record_id' : 'id';
  const { data, error } = await db.from(table).select(selectClause(fields)).eq(col, id).maybeSingle();
  if (error) throw new Error(`supabase.getRecord(${table}, ${id}): ${error.message}`);
  return data;
}

/** POST — insert one row, return inserted row. */
export async function createRecord(table, row, fields = null) {
  const { data, error } = await db.from(table).insert(row).select(selectClause(fields)).single();
  if (error) throw new Error(`supabase.createRecord(${table}): ${error.message}`);
  return data;
}

/** PATCH — update row by id (UUID or Airtable rec). Returns updated row. */
export async function patchRecord(table, id, fields, returnFields = null) {
  const col = isAirtableId(id) ? 'airtable_record_id' : 'id';
  const { data, error } = await db.from(table).update(fields).eq(col, id).select(selectClause(returnFields)).single();
  if (error) throw new Error(`supabase.patchRecord(${table}, ${id}): ${error.message}`);
  return data;
}

/** DELETE — remove row by id (UUID or Airtable rec). */
export async function deleteRecord(table, id) {
  const col = isAirtableId(id) ? 'airtable_record_id' : 'id';
  const { error } = await db.from(table).delete().eq(col, id);
  if (error) throw new Error(`supabase.deleteRecord(${table}, ${id}): ${error.message}`);
  return true;
}

/** UPSERT — insert or update by conflict column (default: id). */
export async function upsertRecord(table, row, onConflict = 'id', returnFields = null) {
  const { data, error } = await db.from(table).upsert(row, { onConflict }).select(selectClause(returnFields)).single();
  if (error) throw new Error(`supabase.upsertRecord(${table}): ${error.message}`);
  return data;
}

// ============================================================
// STATE Framework helpers — used by every pipeline command
// ============================================================

/**
 * Append a log entry to pipeline.logs (T — Traceable).
 * Required: workflow_id, step_name, status. Others optional.
 */
export async function logEntry({
  workflow_id,
  entity_id = null,
  step_name,
  stage = null,
  output_summary = null,
  model_version = null,
  status = 'success',
  timestamp = new Date().toISOString(),
}) {
  if (!workflow_id) throw new Error('logEntry: workflow_id required');
  if (!step_name)   throw new Error('logEntry: step_name required');
  if (!['success','error'].includes(status)) {
    throw new Error(`logEntry: status must be success|error, got ${status}`);
  }
  return createRecord(TABLES.LOGS, {
    workflow_id, entity_id, step_name, stage,
    output_summary, model_version, status, timestamp,
  });
}

/**
 * Set a lock + status atomically before an expensive op.
 *   await setLock(TABLES.POSTS, postId, 'research_started_at', 'researching');
 */
export async function setLock(table, id, lockField, status = null) {
  const fields = { [lockField]: new Date().toISOString() };
  if (status !== null) fields.status = status;
  return patchRecord(table, id, fields);
}

/**
 * Clear a lock + revert status on failure.
 *   await clearLock(TABLES.POSTS, postId, 'research_started_at', 'planned');
 */
export async function clearLock(table, id, lockField, status = null) {
  const fields = { [lockField]: null };
  if (status !== null) fields.status = status;
  return patchRecord(table, id, fields);
}
