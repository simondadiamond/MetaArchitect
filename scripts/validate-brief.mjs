/**
 * validate-brief.mjs — the weekly-brief Step 4 validation gate as a callable script.
 * Spec: .claude/skills/weekly-brief/SKILL.md Step 4 ("Validation gate, then write"):
 * 3-5 tasks; ranks are 1..N with no gaps; every task non-empty; every task has payoff
 * and est_minutes; at least two distinct payoff values; every goal_id included exists
 * in the Step 1 goals response. Any failure -> fix or ABORT at `write`, never post junk.
 * Born 2026-07-13 (post-Fable gate build, goal 3df3143e). Fully offline.
 *
 * CLI:
 *   node scripts/validate-brief.mjs <payload.json> <goals.json>   # goals.json = the Step 1 GET /api/goals response
 *   node scripts/validate-brief.mjs --self-test
 *
 * Exit 0 = safe to POST to /api/briefs. Exit 1 = at least one FAIL.
 * validateBrief(payload, goals) is exported for reuse.
 */
import { readFileSync } from 'node:fs';

const PAYOFFS = ['revenue', 'compounding', 'system'];   // Step 3 enum

/** Extract goal ids from whatever shape the goals snapshot has (array, {goals:[]}, {data:[]}). */
export function goalIds(goalsDoc) {
  const list = Array.isArray(goalsDoc) ? goalsDoc : (goalsDoc?.goals ?? goalsDoc?.data ?? []);
  return new Set(list.map(g => g.id).filter(Boolean));
}

/** Run the Step 4 gate. Returns { errors: [] } — empty = safe to POST. */
export function validateBrief(payload, goalsDoc) {
  const errors = [];
  const err = (m) => errors.push(m);

  // Payload must be POSTable: {week_start, title, summary_md, tasks}
  for (const k of ['week_start', 'title', 'summary_md']) {
    if (typeof payload?.[k] !== 'string' || !payload[k].trim()) err(`${k} missing or empty`);
  }
  const tasks = payload?.tasks;
  if (!Array.isArray(tasks)) return { errors: [...errors, 'tasks must be an array'] };

  // 3-5 tasks
  if (tasks.length < 3 || tasks.length > 5) err(`${tasks.length} tasks; must be 3-5`);

  // ranks are 1..N with no gaps
  const ranks = tasks.map(t => t?.rank).sort((a, b) => a - b);
  const wantRanks = tasks.map((_, i) => i + 1);
  if (JSON.stringify(ranks) !== JSON.stringify(wantRanks)) {
    err(`ranks ${JSON.stringify(tasks.map(t => t?.rank))} must be exactly 1..${tasks.length} with no gaps or duplicates`);
  }

  const ids = goalIds(goalsDoc);
  tasks.forEach((t, i) => {
    const label = `task[${i}]${t?.rank != null ? ` (rank ${t.rank})` : ''}`;
    // every `task` non-empty
    if (typeof t?.task !== 'string' || !t.task.trim()) err(`${label}: task text missing or empty`);
    // every task has payoff + est_minutes
    if (!t?.payoff) err(`${label}: payoff missing`);
    else if (!PAYOFFS.includes(t.payoff)) err(`${label}: payoff ${JSON.stringify(t.payoff)} — must be one of ${PAYOFFS.join(' | ')}`);
    if (t?.est_minutes == null) err(`${label}: est_minutes missing`);
    else if (!Number.isInteger(t.est_minutes) || t.est_minutes < 1) err(`${label}: est_minutes ${JSON.stringify(t.est_minutes)} must be a positive integer`);
    // every goal_id you include exists in the goals snapshot
    if (t?.goal_id != null && !ids.has(t.goal_id)) err(`${label}: goal_id ${t.goal_id} not present in the goals snapshot`);
  });

  // at least two distinct payoff values across the set
  const distinct = new Set(tasks.map(t => t?.payoff).filter(p => PAYOFFS.includes(p)));
  if (tasks.length && distinct.size < 2) {
    err(`only ${distinct.size} distinct payoff value(s) (${[...distinct].join(', ') || 'none'}) — need at least 2; a padded or fake-diverse brief is worse than none, so fix honestly or ABORT`);
  }

  return { errors };
}

// ------------------------------------------------------------------ self-test
function goodFixture() {
  const goals = { goals: [{ id: 'g-1', title: 'Ship the audit' }, { id: 'g-2', title: 'Grow the list' }] };
  const payload = {
    week_start: '2026-07-13',
    title: 'Week of 2026-07-13: close the audit loop',
    summary_md: 'Ranked by revenue proximity; engage inventory was stale so it sits at #3.',
    tasks: [
      { rank: 1, task: 'Deliver the readiness audit to the beta client', why: 'Only revenue-adjacent item.', payoff: 'revenue', est_minutes: 180, goal_id: 'g-1' },
      { rank: 2, task: 'Queue two teardown posts for the week', why: 'Cadence below 2/week target.', payoff: 'compounding', est_minutes: 90, goal_id: 'g-2' },
      { rank: 3, task: 'Backfill lessons.md from Friday incidents', why: 'Anti-recurrence loop is behind.', payoff: 'system', est_minutes: 45 },
    ],
  };
  return { payload, goals };
}

function selfTest() {
  let pass = 0, fail = 0;
  const expect = (name, payload, goals, wantOk, wantErrMatch) => {
    const { errors } = validateBrief(payload, goals);
    const ok = errors.length === 0;
    const matched = wantErrMatch ? errors.some(e => e.includes(wantErrMatch)) : true;
    if (ok === wantOk && matched) { console.log(`PASS self-test: ${name}`); pass++; }
    else { console.log(`FAIL self-test: ${name} — errors: ${JSON.stringify(errors)}`); fail++; }
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));

  { const { payload, goals } = goodFixture(); expect('good payload passes', payload, goals, true); }
  { const { payload, goals } = goodFixture(); expect('goals as bare array also works', payload, goals.goals, true); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.tasks = p.tasks.slice(0, 2);
    expect('2 tasks fails', p, goals, false, 'must be 3-5'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload);
    p.tasks = [...p.tasks, ...clone(payload).tasks.map((t, i) => ({ ...t, rank: 4 + i }))];
    expect('6 tasks fails', p, goals, false, 'must be 3-5'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.tasks[2].rank = 5;
    expect('rank gap fails', p, goals, false, 'no gaps'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.tasks[1].rank = 1;
    expect('duplicate rank fails', p, goals, false, 'no gaps'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.tasks[0].task = '  ';
    expect('empty task text fails', p, goals, false, 'task text'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); delete p.tasks[1].payoff;
    expect('missing payoff fails', p, goals, false, 'payoff missing'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.tasks[1].payoff = 'vibes';
    expect('bad payoff enum fails', p, goals, false, 'payoff'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); delete p.tasks[2].est_minutes;
    expect('missing est_minutes fails', p, goals, false, 'est_minutes missing'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload);
    p.tasks.forEach(t => t.payoff = 'system');
    expect('single payoff kind fails', p, goals, false, 'distinct payoff'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.tasks[0].goal_id = 'g-404';
    expect('unknown goal_id fails', p, goals, false, 'goals snapshot'); }
  { const { payload, goals } = goodFixture(); const p = clone(payload); p.summary_md = '';
    expect('empty summary_md fails', p, goals, false, 'summary_md'); }

  console.log(`\nvalidate-brief self-test: ${pass} pass, ${fail} fail`);
  return fail === 0;
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b] = process.argv.slice(2);
  if (a === '--self-test') process.exit(selfTest() ? 0 : 1);
  if (!a || !b) { console.error('usage: validate-brief.mjs <payload.json> <goals.json> | --self-test'); process.exit(2); }
  const payload = JSON.parse(readFileSync(a, 'utf8'));
  const goals = JSON.parse(readFileSync(b, 'utf8'));
  const { errors } = validateBrief(payload, goals);
  for (const e of errors) console.log(`FAIL ${e}`);
  if (errors.length) {
    console.log(`\n❌ weekly-brief failed at write — validation gate: ${errors.length} check(s) failed — do not POST`);
    process.exit(1);
  }
  console.log('PASS validation gate — payload safe to POST to /api/briefs');
}
