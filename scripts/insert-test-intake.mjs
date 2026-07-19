#!/usr/bin/env node
/**
 * Insert a fixture /readiness intake row EXACTLY the way the website form does:
 * anon key, POST ?select=id, Prefer: return=representation — nothing more.
 *
 *   node scripts/insert-test-intake.mjs <fixture.json> [--name "Override Name"]
 *
 * Why the fidelity matters (lessons: RLS false alarm 2026-07-19): the table is
 * column-scoped — anon may only SELECT `id`. A test that asks for all columns
 * back (return=representation with no select list) gets 42501 and misreads a
 * healthy form as a production outage. This script IS the faithful reproduction;
 * use it after any /readiness form or RLS change.
 *
 * Prints the new row id. Cleanup is on you: delete the row (service key) AND its
 * pipeline.logs rows if the watcher processed it (attempt-once markers).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const args = process.argv.slice(2);
const fixturePath = args.find(a => !a.startsWith('--'));
const nameIdx = args.indexOf('--name');
if (!fixturePath) {
  console.error('usage: node scripts/insert-test-intake.mjs <fixture.json> [--name "Override Name"]');
  process.exit(2);
}

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^"|"$/g, '');
  }
  return out;
}
const env = { ...parseEnv(join(REPO_ROOT, '.env')), ...process.env };
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.error('insert-test-intake: SUPABASE_URL / SUPABASE_ANON_KEY missing from repo .env');
  process.exit(1);
}

const { id, submitted_at, ...row } = JSON.parse(readFileSync(fixturePath, 'utf8'));
if (nameIdx !== -1 && args[nameIdx + 1]) row.system_name = args[nameIdx + 1];

// Byte-faithful to ReadinessDiagnosticClient.tsx: .insert(row).select('id').single()
const res = await fetch(`${env.SUPABASE_URL}/rest/v1/state_readiness_diagnostic?select=id`, {
  method: 'POST',
  headers: {
    apikey: env.SUPABASE_ANON_KEY,
    authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    'content-type': 'application/json',
    prefer: 'return=representation',
    accept: 'application/vnd.pgrst.object+json',
  },
  body: JSON.stringify(row),
});
const body = await res.json();
if (!res.ok || !body?.id) {
  console.error(`insert failed (${res.status}): ${JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}
console.log(body.id);
