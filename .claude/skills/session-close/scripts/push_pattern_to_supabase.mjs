/**
 * Push a session content seed to Supabase (pipeline.sessions + optional humanity snippet).
 *
 * Usage:
 *   node push_pattern_to_supabase.mjs [path/to/session_seed.json] --model <model-id>
 *
 * Default seed path: projects/Content-Engine/.tmp/session_seed.json (gitignored).
 * Seed schema (lane 8–9 of .claude/skills/session-close/references/harvest-lanes.md):
 * {
 *   "date": "YYYY-MM-DD",
 *   "status": "raw" | "skipped",
 *   "skipped_reason": "<required when skipped>",
 *   "pattern_confidence": "High" | "Medium" | "Low",   // required when raw
 *   "tags": ["state-failure", ...],                     // optional
 *   "core_insight": "...",                              // raw: ≥1 of these three
 *   "icp_pain": "...",
 *   "snippet_text": "...",                              // optional → humanity_snippets row
 *   "one_line_lesson": "..."                            // optional, folded into full_log
 * }
 *
 * STATE:
 *   E — validation gate runs BEFORE any data-layer import or network call; on failure
 *       it prints exactly what's missing and exits 1 without writing.
 *   T — one pipeline.logs entry (step_name "pattern_logged") after the push.
 *   Tolerant — session row FIRST, then snippet, then the link is patched on; a mid-run
 *       failure can't orphan a snippet that a retry duplicates.
 *
 * Data layer: projects/Content-Engine/tools/supabase.mjs (SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY from .env at repo root) — imported only after validation.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const DEFAULT_SEED = resolve(REPO_ROOT, 'projects/Content-Engine/.tmp/session_seed.json');
const SUPABASE_MJS = resolve(REPO_ROOT, 'projects/Content-Engine/tools/supabase.mjs');

const VALID_CONFIDENCE = ['High', 'Medium', 'Low'];
const VALID_STATUS = ['raw', 'skipped'];

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let modelVersion = null;
let seedPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model') modelVersion = args[++i] ?? null;
  else seedPath = args[i];
}
seedPath = seedPath || DEFAULT_SEED;

const workflowId = randomUUID();
let stage = 'init';

function abort(msg) {
  console.error(`❌ session-close content push failed at ${stage} — ${msg} — nothing written, safe to retry`);
  process.exit(1);
}

// ── Read + validate (E) — before any data-layer import or network call ────────

stage = 'read';
if (!existsSync(seedPath)) abort(`seed not found: ${seedPath}`);
let seed;
try { seed = JSON.parse(readFileSync(seedPath, 'utf8')); } catch (e) { abort(`seed is not valid JSON: ${e.message}`); }

stage = 'validate';
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const problems = [];

if (!seed.date) problems.push('`date` missing');
else if (!isDate(seed.date)) problems.push(`\`date\` does not parse as YYYY-MM-DD: "${seed.date}"`);
if (!VALID_STATUS.includes(seed.status)) problems.push(`\`status\` must be one of ${VALID_STATUS.join(' | ')}, got "${seed.status}"`);

const coreInsight = str(seed.core_insight);
const icpPain = str(seed.icp_pain);
const snippetText = str(seed.snippet_text);
const oneLineLesson = str(seed.one_line_lesson);
const skippedReason = str(seed.skipped_reason);

if (seed.status === 'raw') {
  if (!VALID_CONFIDENCE.includes(seed.pattern_confidence))
    problems.push(`raw seed requires \`pattern_confidence\` ∈ ${VALID_CONFIDENCE.join(' | ')}, got "${seed.pattern_confidence}"`);
  if (!coreInsight && !icpPain && !snippetText)
    problems.push('raw seed has no content — core_insight, icp_pain, and snippet_text all missing/empty');
}
if (seed.status === 'skipped' && !skippedReason) problems.push('skipped seed requires a non-empty `skipped_reason`');

if (problems.length) {
  console.error('Validation gate FAILED — refusing to write:');
  for (const p of problems) console.error(`  - ${p}`);
  abort(`${problems.length} validation problem(s), listed above`);
}

// ── Build the row ─────────────────────────────────────────────────────────────

const fields = { date: seed.date, status: seed.status };
if (seed.status === 'skipped') {
  fields.full_log = `Content seed skipped — ${skippedReason}`;
} else {
  fields.pattern_confidence = seed.pattern_confidence;
  if (Array.isArray(seed.tags) && seed.tags.length) fields.tags = seed.tags.map((t) => String(t).replace(/^#/, ''));
  if (coreInsight) fields.core_insight = coreInsight;
  if (icpPain) fields.icp_pain = icpPain;
  fields.full_log = [
    `# Session seed — ${seed.date}`,
    coreInsight && `**Core insight:** ${coreInsight}`,
    icpPain && `**ICP pain:** ${icpPain}`,
    oneLineLesson && `**One-line lesson:** ${oneLineLesson}`,
    snippetText && `**Humanity snippet:** ${snippetText}`,
  ].filter(Boolean).join('\n\n');
}

// ── Write (session row FIRST, then snippet, then link — Tolerant) ─────────────

stage = 'import_data_layer';
let createRecord, patchRecord, logEntry, TABLES;
try {
  ({ createRecord, patchRecord, logEntry, TABLES } = await import(SUPABASE_MJS));
} catch (e) {
  abort(`data layer import failed: ${e.message}`);
}

try {
  stage = 'write_session';
  const row = await createRecord(TABLES.SESSIONS, fields, ['id']);

  let snippetId = null;
  if (seed.status === 'raw' && snippetText) {
    stage = 'write_snippet';
    const snippet = await createRecord(TABLES.SNIPPETS, { snippet_text: snippetText }, ['id']);
    snippetId = snippet.id;
    stage = 'link_snippet';
    await patchRecord(TABLES.SESSIONS, row.id, { related_humanity_snippet: [snippetId] });
  }

  stage = 'log';
  await logEntry({
    workflow_id: workflowId,
    entity_id: String(row.id),
    step_name: 'pattern_logged',
    stage: 'complete',
    output_summary: seed.status === 'skipped'
      ? `Content seed skipped — ${skippedReason}`.slice(0, 500)
      : `Content seed pushed (confidence: ${fields.pattern_confidence})${snippetId ? ', snippet linked' : ''}`,
    model_version: modelVersion, // the model that actually ran — passed via --model, never hardcoded
    status: 'success',
  });

  if (seed.status === 'skipped') {
    console.log(`✅ Skipped-session row written — session ${row.id}`);
  } else {
    console.log(`✅ Content seed pushed — session ${row.id}${snippetId ? ` | snippet linked → ${snippetId}` : ' | no snippet'}`);
  }
} catch (e) {
  // Best-effort error trace (T) — never mask the original failure.
  try {
    await logEntry({
      workflow_id: workflowId, step_name: 'pattern_logged', stage,
      output_summary: `failed at ${stage}: ${e.message}`.slice(0, 500),
      model_version: modelVersion, status: 'error',
    });
  } catch { /* logging is best-effort on the error path */ }
  console.error(`❌ session-close content push failed at ${stage} — ${e.message} — no lock held, safe to retry (a retry may leave a session row without a snippet link if it died after write_session; that is benign)`);
  process.exit(1);
}
