/**
 * Push a generated pattern log to Supabase (pipeline.sessions).
 *
 * Usage:
 *   node push_pattern_to_supabase.mjs [path/to/pattern_log.md] [--model <model-id>]
 *   node push_pattern_to_supabase.mjs --skipped "<reason>" [--model <model-id>]
 *
 * Default artifact path: projects/Content-Engine/.tmp/pattern_log.md (gitignored).
 *
 * --skipped writes a well-formed Phase 2.5 gate-failure row directly
 * (date = today, status = "skipped", full_log = the reason) — no artifact needed.
 * --model must be the id of the model that actually ran the session — never hardcode it.
 *
 * STATE:
 *   E — validation gate runs BEFORE any import of the data layer or any network
 *       call; on failure it prints exactly what's missing and exits 1 without writing.
 *   T — one pipeline.logs entry (step_name "pattern_logged") after the push.
 *   Tolerant — session row is inserted FIRST, then the snippet, then the link is
 *       patched on; a mid-run failure can't orphan a snippet that a retry duplicates.
 *
 * Data layer: projects/Content-Engine/tools/supabase.mjs (SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY from .env at repo root) — imported only after validation.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const DEFAULT_LOG = resolve(REPO_ROOT, 'projects/Content-Engine/.tmp/pattern_log.md');
const SUPABASE_MJS = resolve(REPO_ROOT, 'projects/Content-Engine/tools/supabase.mjs');

const VALID_CONFIDENCE = ['High', 'Medium', 'Low'];
const VALID_STATUS = ['raw', 'skipped'];

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let modelVersion = null;
let skippedReason = null;
let logPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--model') modelVersion = args[++i] ?? null;
  else if (args[i] === '--skipped') skippedReason = args[++i] ?? '';
  else logPath = args[i];
}
logPath = logPath || DEFAULT_LOG;

const workflowId = randomUUID();
let stage = 'init';

function abort(msg) {
  console.error(`❌ /pattern failed at ${stage} — ${msg} — nothing written, safe to retry`);
  process.exit(1);
}

// ── Parse helpers ─────────────────────────────────────────────────────────────

function extractFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) out[kv[1]] = kv[2].trim();
    const tag = line.match(/^\s+-\s+#?(.+)$/);
    if (tag) {
      out.tags = out.tags || [];
      if (!Array.isArray(out.tags)) out.tags = [];
      // Strip any wrapping quotes (YAML sometimes serializes as "value")
      const tagVal = tag[1].trim().replace(/^["']|["']$/g, '');
      if (tagVal) out.tags.push(tagVal);
    }
  }
  return out;
}

function extractSection(text, heading) {
  const re = new RegExp(`## ${heading}[\\s\\S]*?(?=\\n## |$)`, 'i');
  const m = text.match(re);
  if (!m) return null;
  return m[0].replace(/^## .+\n/, '').trim();
}

function extractBoldField(text, label) {
  const re = new RegExp(`\\*\\*${label}[:\\s]+\\*\\*(.+)`, 'i');
  const m = text.match(re);
  if (m) return m[1].trim();
  const re2 = new RegExp(`\\*\\*${label}:\\*\\*\\s*(.+)`, 'i');
  const m2 = text.match(re2);
  return m2 ? m2[1].trim() : null;
}

// Returns null if value is N/A placeholder or empty
function clean(val) {
  if (!val) return null;
  if (/^\[N\/A/.test(val.trim())) return null;
  return val;
}

// Extracts Simon's Reality line from section 5 — returns null if N/A
function extractSimonsReality(section5) {
  if (!section5) return null;
  const m = section5.match(/\*\*Simon's Reality[^*]*\*\*[:\s]*(.+)/i);
  if (!m) return null;
  return clean(m[1].trim());
}

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// ── Build the row (skipped mode or artifact mode) ─────────────────────────────

let fields;
let simonsReality = null;
let snippetText = null;

if (skippedReason !== null) {
  stage = 'validate';
  if (!skippedReason.trim()) abort('--skipped requires a non-empty reason');
  fields = {
    date: new Date().toISOString().slice(0, 10),
    status: 'skipped',
    full_log: `Publication Viability Gate: FAILED — ${skippedReason.trim()}`,
  };
} else {
  stage = 'read';
  if (!existsSync(logPath)) abort(`artifact not found: ${logPath}`);
  const raw = readFileSync(logPath, 'utf8');

  stage = 'parse';
  const fm = extractFrontmatter(raw);
  const section5 = extractSection(raw, "5\\. HUMANITY SNIPPET");
  const section6 = extractSection(raw, '6\\. CONTENT SEEDS');
  const coreInsight = clean(section6 ? extractBoldField(section6, 'Core Insight') : null);
  const icpPain = clean(section6 ? extractBoldField(section6, 'ICP Pain') : null);
  simonsReality = extractSimonsReality(section5);

  // ── Validation gate (E) — before any data-layer import or network call ──────
  stage = 'validate';
  const problems = [];
  if (!fm.date) problems.push('frontmatter `date` missing');
  else if (!isDate(fm.date)) problems.push(`frontmatter \`date\` does not parse as YYYY-MM-DD: "${fm.date}"`);
  if (!fm.pattern_confidence) problems.push('frontmatter `pattern_confidence` missing');
  else if (!VALID_CONFIDENCE.includes(fm.pattern_confidence))
    problems.push(`\`pattern_confidence\` must be one of ${VALID_CONFIDENCE.join(' | ')}, got "${fm.pattern_confidence}"`);
  if (!fm.status) problems.push('frontmatter `status` missing');
  else if (!VALID_STATUS.includes(fm.status))
    problems.push(`\`status\` must be one of ${VALID_STATUS.join(' | ')}, got "${fm.status}"`);
  // Extraction assert: at least one non-trivial content field, or the regexes
  // silently missed and we'd write an empty row.
  if (!coreInsight && !icpPain && !simonsReality)
    problems.push('no content extracted — Core Insight, ICP Pain, and Simon\'s Reality all missing/N/A (regex miss or empty artifact)');

  if (problems.length) {
    console.error('Validation gate FAILED — refusing to write:');
    for (const p of problems) console.error(`  - ${p}`);
    abort(`${problems.length} validation problem(s), listed above`);
  }

  fields = { date: fm.date, pattern_confidence: fm.pattern_confidence, status: fm.status };
  if (Array.isArray(fm.tags) && fm.tags.length) fields.tags = fm.tags;
  if (coreInsight) fields.core_insight = coreInsight;
  if (icpPain) fields.icp_pain = icpPain;
  fields.full_log = raw;

  if (simonsReality) {
    const mConf = section5 ? section5.match(/\*\*The AI's Confession[^*]*\*\*[:\s]*(.+)/i) : null;
    const aiConfession = mConf ? clean(mConf[1].trim()) : null;
    snippetText = aiConfession ? `${simonsReality}\n\n[AI's Confession] ${aiConfession}` : simonsReality;
  }
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
  if (snippetText) {
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
    output_summary: fields.status === 'skipped'
      ? 'Pattern gate failed — skipped row written'
      : `Pattern log pushed (confidence: ${fields.pattern_confidence})${snippetId ? ', snippet linked' : ''}`,
    model_version: modelVersion, // the model that actually ran — passed via --model, never hardcoded
    status: 'success',
  });

  if (fields.status === 'skipped') {
    console.log(`✅ Skipped-session row written — session ${row.id}`);
  } else if (snippetId) {
    console.log(`✅ Pattern log pushed — session ${row.id} | snippet linked → ${snippetId}`);
  } else {
    console.log(`✅ Pattern log pushed — session ${row.id} | no snippet (none extractable)`);
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
  console.error(`❌ /pattern failed at ${stage} — ${e.message} — no lock held, safe to retry (a retry may leave a session row without a snippet link if it died after write_session; that is benign)`);
  process.exit(1);
}
