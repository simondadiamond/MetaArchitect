/**
 * Push a generated pattern log to Supabase (pipeline.sessions).
 * Reads .pattern_log.md, parses fields, writes a sessions row.
 *
 * If a real humanity snippet is present:
 *   1. Creates a row in pipeline.humanity_snippets
 *   2. Links it via related_humanity_snippet (uuid array) on the session row
 *
 * Usage: node push_pattern_to_supabase.mjs [path/to/.pattern_log.md]
 * Defaults to .pattern_log.md in cwd. Data layer: Content-Engine tools/supabase.mjs
 * (reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env at repo root).
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createRecord, TABLES } from '../../../../projects/Content-Engine/tools/supabase.mjs';

// ── Parse ─────────────────────────────────────────────────────────────────────

const logPath = process.argv[2] || resolve(process.cwd(), '.pattern_log.md');
if (!existsSync(logPath)) {
  console.error(`Not found: ${logPath}`);
  process.exit(1);
}

const raw = readFileSync(logPath, 'utf8');

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

const fm       = extractFrontmatter(raw);
const section5 = extractSection(raw, '5\\. HUMANITY SNIPPET');
const section6 = extractSection(raw, '6\\. CONTENT SEEDS');

const coreInsight = section6 ? extractBoldField(section6, 'Core Insight') : null;
const icpPain     = section6 ? extractBoldField(section6, 'ICP Pain')     : null;

// ── Create humanity snippet row if real ───────────────────────────────────────

let snippetId = null;
const simonsReality = extractSimonsReality(section5);

if (simonsReality) {
  // Also grab AI's Confession if present
  const aiConfession = section5
    ? (() => {
        const m = section5.match(/\*\*The AI's Confession[^*]*\*\*[:\s]*(.+)/i);
        return m ? clean(m[1].trim()) : null;
      })()
    : null;

  const snippetText = aiConfession
    ? `${simonsReality}\n\n[AI's Confession] ${aiConfession}`
    : simonsReality;

  const snippet = await createRecord(TABLES.SNIPPETS, { snippet_text: snippetText }, ['id']);
  snippetId = snippet.id;
}

// ── Build session row ─────────────────────────────────────────────────────────

const fields = {};

if (fm.date)               fields.date               = fm.date;
if (fm.pattern_confidence) fields.pattern_confidence = fm.pattern_confidence;
if (fm.status)             fields.status             = fm.status;
if (Array.isArray(fm.tags) && fm.tags.length) fields.tags = fm.tags;

const ci = clean(coreInsight);
if (ci) fields.core_insight = ci;

const ip = clean(icpPain);
if (ip) fields.icp_pain = ip;

fields.full_log = raw;

if (snippetId) fields.related_humanity_snippet = [snippetId];

// ── Write session row ─────────────────────────────────────────────────────────

const row = await createRecord(TABLES.SESSIONS, fields, ['id']);

if (snippetId) {
  console.log(`✅ Pattern log pushed — session ${row.id} | snippet linked → ${snippetId}`);
} else {
  console.log(`✅ Pattern log pushed — session ${row.id} | no snippet (none extractable)`);
}
