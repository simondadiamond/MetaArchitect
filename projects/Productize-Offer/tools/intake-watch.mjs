#!/usr/bin/env node
/**
 * Intake analyzer watcher — attempt-once auto-run for new /readiness submissions.
 * Scheduled via Command Center (script kind, every 15 min). Flow per new
 * state_readiness_diagnostic row:
 *   1. write a `watch_dispatch` marker to pipeline.logs (attempt-once: rows with
 *      ANY logs entry — marker, manual run, or analyzer stages — are never retried)
 *   2. run intake-analyzer.mjs --row <id> --model <pinned>
 *   3. ntfy the outcome either way; after a failure, reruns stay manual
 *      (diagnostic-runbook Day 0 — the human re-judgment is mandatory regardless)
 *
 * T: the marker + the analyzer's own per-stage logging are the trace; E: REST
 * responses are shape-checked before use, and a row is only dispatched once its
 * marker write succeeded.
 */
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const TOOLS = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(TOOLS, '..', '..', '..');
const MODEL = process.env.ANALYZER_MODEL ?? 'claude-sonnet-5';

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
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('intake-watch: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from repo .env');
  process.exit(1);
}
const NTFY_URL = env.NTFY_URL
  ?? parseEnv(join(homedir(), 'command-center', '.env')).NTFY_URL
  ?? parseEnv(join(homedir(), 'command-center', '.env.local')).NTFY_URL;

const headers = { apikey: SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` };

async function ntfy(title, body) {
  if (!NTFY_URL) { console.log(`[ntfy skipped] ${title}: ${body}`); return; }
  try {
    // HTTP headers are ByteStrings — anything beyond latin1 in Title throws.
    const asciiTitle = title.replace(/[^\x20-\x7e]/g, '-');
    await fetch(NTFY_URL, { method: 'POST', headers: { Title: asciiTitle }, body, signal: AbortSignal.timeout(10_000) });
  } catch (e) { console.error(`[ntfy failed] ${e.message}`); }
}

async function getJson(url, extraHeaders = {}) {
  const res = await fetch(url, { headers: { ...headers, ...extraHeaders }, signal: AbortSignal.timeout(30_000) });
  const body = await res.json();
  if (!res.ok || !Array.isArray(body)) throw new Error(`bad response from ${url.split('?')[0]}: ${JSON.stringify(body).slice(0, 200)}`);
  return body;
}

const rows = await getJson(`${SUPABASE_URL}/rest/v1/state_readiness_diagnostic?select=id,system_name,locale,submitted_at&order=submitted_at.asc`);
if (rows.length === 0) { console.log('intake-watch: no intake rows'); process.exit(0); }

const ids = rows.map(r => r.id).join(',');
const attempted = await getJson(
  `${SUPABASE_URL}/rest/v1/logs?entity_id=in.(${ids})&select=entity_id`,
  { 'Accept-Profile': 'pipeline' },
);
const done = new Set(attempted.map(l => l.entity_id));
const fresh = rows.filter(r => !done.has(r.id));
console.log(`intake-watch: ${rows.length} intake row(s), ${fresh.length} unattempted`);

for (const row of fresh) {
  // Marker first: if this write fails, we skip the row rather than risk a
  // retry storm of full analyzer runs on the next fires.
  const marker = await fetch(`${SUPABASE_URL}/rest/v1/logs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Profile': 'pipeline', 'content-type': 'application/json' },
    body: JSON.stringify({
      workflow_id: randomUUID(), entity_id: row.id, step_name: 'watch_dispatch',
      stage: 'dispatch', status: 'success', output_summary: `auto-dispatch --model ${MODEL}`,
      timestamp: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!marker.ok) {
    console.error(`intake-watch: marker write failed for ${row.id} (${marker.status}) — skipping this cycle`);
    continue;
  }

  console.log(`intake-watch: running analyzer for ${row.id} (${row.system_name}, ${row.locale})`);
  const res = spawnSync('node', [join(TOOLS, 'intake-analyzer.mjs'), '--row', row.id, '--model', MODEL], {
    cwd: TOOLS, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`.trim();
  console.log(out);
  if (res.status === 0) {
    const dirLine = (res.stdout?.match(/artifacts written to (.+)/) ?? [])[1] ?? '~/engagements/';
    await ntfy('Intake analyzed — prep kit ready',
      `${row.system_name} (${row.locale})\n${dirLine}\nDay 0: read the scorecard skeptically, finalize the brief, schedule the call.`);
  } else {
    const errLine = (out.match(/❌.*$/m) ?? [out.slice(-300)])[0];
    await ntfy('Intake analyzer FAILED',
      `${row.system_name} (${row.locale}) — ${errLine}\nRerun manually: node projects/Productize-Offer/tools/intake-analyzer.mjs --row ${row.id} --model ${MODEL}`);
  }
}
