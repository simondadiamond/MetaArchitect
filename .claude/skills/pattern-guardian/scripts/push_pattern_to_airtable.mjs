/**
 * Push a generated pattern log to Airtable.
 * Reads .pattern_log.md from the repo root, parses fields, writes to the sessions table.
 *
 * If a real humanity snippet is present:
 *   1. Creates a record in humanity_snippets table
 *   2. Links it via related_humanity_snippet (linked record) in the session record
 *
 * Usage: node push_pattern_to_airtable.mjs [path/to/.pattern_log.md]
 * Defaults to .pattern_log.md in cwd.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { createRequire } from 'module';

// Load .env via dotenv (handles CRLF correctly)
const require = createRequire(import.meta.url);
try {
  const dotenv = require(resolve(process.cwd(), 'node_modules/dotenv/lib/main.js'));
  dotenv.config({ path: resolve(process.cwd(), '.env') });
} catch {
  // dotenv not available — fall back to manual parse
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

const PAT       = process.env.AIRTABLE_PAT;
const BASE      = process.env.AIRTABLE_BASE_ID;
const TABLE     = process.env.AIRTABLE_TABLE_SESSIONS
               || process.env.AIRTABLE_TABLE_PATTERNS
               || 'tblcqd1u7lPHbLRDZ';
const SNIPPETS  = process.env.AIRTABLE_TABLE_SNIPPETS || 'tblk8QpMOBOs6BMbF';

if (!PAT || !BASE) {
  console.error('Missing: AIRTABLE_PAT or AIRTABLE_BASE_ID');
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function airtablePost(tableId, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ fields, typecast: true }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data;
}

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

// ── Create humanity snippet record if real ────────────────────────────────────

let snippetRecordId = null;
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

  const snippetRecord = await airtablePost(SNIPPETS, {
    snippet_text: snippetText,
  });
  snippetRecordId = snippetRecord.id;
}

// ── Build session record fields ───────────────────────────────────────────────

const fields = {};

if (fm.date)               fields['date']               = fm.date;
if (fm.pattern_confidence) fields['pattern_confidence'] = fm.pattern_confidence;
if (fm.status)             fields['status']             = fm.status;
if (Array.isArray(fm.tags) && fm.tags.length) fields['tags'] = fm.tags;

const ci = clean(coreInsight);
if (ci) fields['core_insight'] = ci;

const ip = clean(icpPain);
if (ip) fields['icp_pain'] = ip;

fields['full_log'] = raw;

// Link the snippet record if one was created
if (snippetRecordId) {
  fields['related_humanity_snippet'] = [snippetRecordId];
}

// ── Write session record ──────────────────────────────────────────────────────

const data = await airtablePost(TABLE, fields);

if (snippetRecordId) {
  console.log(`✅ Pattern log pushed — record ${data.id} | snippet linked → ${snippetRecordId}`);
} else {
  console.log(`✅ Pattern log pushed — record ${data.id} | no snippet (none extractable)`);
}
