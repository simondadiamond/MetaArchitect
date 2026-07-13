/**
 * postiz-guards.mjs — pure validation guards for tools/postiz.mjs (schedule/edit paths).
 * Split out so the logic is offline-testable with fixtures: this module has NO env, DB,
 * or API dependencies (the one spawn is the local linkedin-gate script). postiz.mjs does
 * the fetching and calls these. Born 2026-07-13 (post-Fable gate build, goal 3df3143e).
 *
 *   node tools/postiz-guards.mjs --self-test    # offline red-green harness
 */
import { writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Rows scheduled within ±windowHours of dateIso. rows: [{id, scheduled_at, ...}]. */
export function findSlotConflicts(rows, dateIso, { windowHours = 2, excludeRowId } = {}) {
  const t = Date.parse(dateIso);
  const win = windowHours * 3600_000;
  return (rows ?? []).filter(r => r.id !== excludeRowId && r.scheduled_at
    && Math.abs(Date.parse(r.scheduled_at) - t) <= win);
}

/** ISO-8601 week key, e.g. "2026-W29" (UTC). */
export function isoWeek(dateIso) {
  const d = new Date(Date.parse(dateIso));
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = day.getUTCDay() || 7;                     // Mon=1..Sun=7
  day.setUTCDate(day.getUTCDate() + 4 - dow);           // nearest Thursday
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day - yearStart) / 86400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** How many rows already land in the same ISO week as dateIso. */
export function sameIsoWeekCount(rows, dateIso, { excludeRowId } = {}) {
  const wk = isoWeek(dateIso);
  return (rows ?? []).filter(r => r.id !== excludeRowId && r.scheduled_at
    && isoWeek(r.scheduled_at) === wk).length;
}

/**
 * Inspect a Command Center /api/schedules response for the first-comment nudger
 * (tools/postiz-comment-nudge.mjs). Returns { alive, detail }.
 */
export function nudgerScheduleStatus(schedules) {
  const hit = (schedules ?? []).find(s => (s.script_path ?? '').includes('postiz-comment-nudge'));
  if (!hit) return { alive: false, detail: 'no schedule runs postiz-comment-nudge.mjs' };
  if (!hit.enabled) return { alive: false, detail: `schedule "${hit.name}" exists but is DISABLED` };
  return { alive: true, detail: `schedule "${hit.name}" enabled (cron ${hit.cron})` };
}

function gatePath() {
  for (const p of [resolve(HERE, '../../../scripts/linkedin-gate.sh'),
                   join(homedir(), 'projects/MetaArchitect/scripts/linkedin-gate.sh')]) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Run scripts/linkedin-gate.sh (post mode) on content. Honors POSTIZ_SKIP_GATE=1
 * (documented escape hatch). Returns { ok, skipped, output }.
 */
export function runContentGate(content, { env = process.env } = {}) {
  if (env.POSTIZ_SKIP_GATE === '1') return { ok: true, skipped: true, output: 'POSTIZ_SKIP_GATE=1 — gate bypassed' };
  const gate = gatePath();
  if (!gate) return { ok: false, skipped: false, output: 'scripts/linkedin-gate.sh not found' };
  const dir = mkdtempSync(join(tmpdir(), 'postiz-gate-'));
  try {
    const f = join(dir, 'content.txt');
    writeFileSync(f, content);
    const r = spawnSync('bash', [gate, f], { encoding: 'utf8', timeout: 30_000 });
    return { ok: r.status === 0, skipped: false, output: (r.stdout ?? '') + (r.stderr ?? '') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ------------------------------------------------------------------ self-test
function selfTest() {
  let pass = 0, fail = 0;
  const ok = (name, cond, detail = '') => {
    if (cond) { console.log(`PASS self-test: ${name}`); pass++; }
    else { console.log(`FAIL self-test: ${name}${detail ? ` — ${detail}` : ''}`); fail++; }
  };

  const rows = [
    { id: 'a', scheduled_at: '2026-07-14T14:00:00.000Z' },
    { id: 'b', scheduled_at: '2026-07-16T14:00:00.000Z' },
    { id: 'c', scheduled_at: null },
  ];
  ok('conflict inside ±2h detected', findSlotConflicts(rows, '2026-07-14T15:30:00.000Z').length === 1);
  ok('exactly 2h away still conflicts', findSlotConflicts(rows, '2026-07-14T16:00:00.000Z').length === 1);
  ok('outside ±2h is clear', findSlotConflicts(rows, '2026-07-14T18:30:00.000Z').length === 0);
  ok('own row excluded', findSlotConflicts(rows, '2026-07-14T14:00:00.000Z', { excludeRowId: 'a' }).length === 0);
  ok('null scheduled_at ignored', findSlotConflicts([{ id: 'x', scheduled_at: null }], '2026-07-14T14:00:00.000Z').length === 0);

  ok('isoWeek: mid-week', isoWeek('2026-07-14T14:00:00.000Z') === '2026-W29', isoWeek('2026-07-14T14:00:00.000Z'));
  ok('isoWeek: Sunday belongs to same ISO week', isoWeek('2026-07-19T14:00:00.000Z') === '2026-W29', isoWeek('2026-07-19T14:00:00.000Z'));
  ok('isoWeek: next Monday rolls over', isoWeek('2026-07-20T14:00:00.000Z') === '2026-W30', isoWeek('2026-07-20T14:00:00.000Z'));
  ok('sameIsoWeekCount counts both W29 rows', sameIsoWeekCount(rows, '2026-07-17T09:00:00.000Z') === 2);
  ok('sameIsoWeekCount: other week is 0', sameIsoWeekCount(rows, '2026-07-22T09:00:00.000Z') === 0);

  ok('nudger: missing schedule -> not alive', nudgerScheduleStatus([{ name: 'x', script_path: '/bin/other.sh', enabled: true }]).alive === false);
  ok('nudger: disabled schedule -> not alive', nudgerScheduleStatus([{ name: 'Nudges', script_path: '/a/postiz-comment-nudge.mjs', enabled: false }]).alive === false);
  ok('nudger: enabled schedule -> alive', nudgerScheduleStatus([{ name: 'Nudges', script_path: '/a/postiz-comment-nudge.mjs', enabled: true, cron: '0,35 14 * * *' }]).alive === true);
  ok('nudger: empty list -> not alive', nudgerScheduleStatus([]).alive === false);

  const goodPost = 'Your agent failed at 2am and the logs show nothing.\n\n'
    + Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
  const g1 = runContentGate(goodPost, { env: {} });
  ok('content gate: good post passes', g1.ok === true && g1.skipped === false, g1.output.split('\n').filter(l => l.startsWith('FAIL')).join('; '));
  const g2 = runContentGate(goodPost + ' — with an em dash', { env: {} });
  ok('content gate: em dash fails', g2.ok === false);
  const g3 = runContentGate('anything at all', { env: { POSTIZ_SKIP_GATE: '1' } });
  ok('content gate: POSTIZ_SKIP_GATE=1 bypasses', g3.ok === true && g3.skipped === true);

  console.log(`\npostiz-guards self-test: ${pass} pass, ${fail} fail`);
  return fail === 0;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv[2] === '--self-test') {
  process.exit(selfTest() ? 0 : 1);
}
