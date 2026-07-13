/**
 * validate-manifest.mjs — the repurpose Carousel Mode C3 "Manifest Gate" as a callable
 * script. Spec: .claude/skills/repurpose/SKILL.md (C1 composition table, C2 route limits,
 * C3 gate). The slide routes render wrong data plausibly (silent clamps, silent truncation,
 * silently dropped lines) — this gate is the only thing that catches it. Born 2026-07-13
 * (post-Fable gate build, goal 3df3143e).
 *
 * CLI:
 *   node tools/validate-manifest.mjs <manifest.json> <draftId>      # fetches state_scores from pipeline.teardown_drafts
 *   node tools/validate-manifest.mjs <manifest.json> <scores.json>  # offline: file with state_scores (or {state_scores:...})
 *   node tools/validate-manifest.mjs --self-test                    # offline red-green harness
 *
 * Exit 0 = manifest safe to build. Exit 1 = at least one FAIL (fix the slide, re-run).
 * validateManifest(manifest, stateScores) is exported for reuse.
 */
import { readFileSync, existsSync } from 'node:fs';

const ORDER = ['cover', 'summary', 'pillar', 'pillar', 'mechanism', 'artifact', 'outro'];
const PILLAR_ORDER = ['s', 't', 'a', 'tol', 'e'];   // cover digit order: S, T, A, TOL, E
const LIMITS = {   // C2 route reference, verified against production 2026-07-06
  summary:   { title: 60, lines: { max: 5, len: 90 } },
  pillar:    { heading: 60, lines: { max: 4, len: 90 } },
  mechanism: { heading: 60, body: 280 },
  artifact:  { heading: 60, lines: { max: 8, len: 60 } },
};
// Banned-phrase pattern — verbatim from the shared LinkedIn gate (repurpose Step 5)
const BANNED = /comment yes|agree\?|thoughts\?|tag (a|someone)|repost if|let that sink in|read that again|excited to share|thrilled to announce|game.chang|revolutionary|groundbreaking|transformational|cutting.edge|state.of.the.art|in today's fast|in the age of ai/i;

const splitLines = (v) => (v == null || v === '') ? [] : String(v).split('|');

/** Run the C3 gate. Returns { errors: [] } — empty = PASS. */
export function validateManifest(manifest, stateScores) {
  const errors = [];
  const err = (m) => errors.push(m);

  if (!Array.isArray(manifest)) return { errors: ['manifest must be a JSON array of { slide, params }'] };

  // Exactly 7 slides, in the fixed C1 order; k = position, total = 7 on every slide
  if (manifest.length !== 7) err(`manifest has ${manifest.length} slides; must be exactly 7`);
  manifest.forEach((entry, i) => {
    const want = ORDER[i];
    if (want && entry.slide !== want) err(`slide ${i + 1} is "${entry.slide}"; position ${i + 1} must be "${want}"`);
    const p = entry.params ?? {};
    if (String(p.k) !== String(i + 1)) err(`slide ${i + 1} (${entry.slide}): k=${JSON.stringify(p.k)}; must equal position ${i + 1}`);
    if (String(p.total) !== '7') err(`slide ${i + 1} (${entry.slide}): total=${JSON.stringify(p.total)}; must be 7`);
  });

  // Cover pillars string matches state_scores (order S,T,A,TOL,E); score = pillar sum
  const cover = manifest[0]?.params ?? {};
  const scores = PILLAR_ORDER.map(k => stateScores?.[k]?.score);
  if (scores.some(s => ![0, 1, 2].includes(s))) {
    err(`state_scores incomplete — need s/t/a/tol/e each with score 0|1|2 (got ${JSON.stringify(scores)})`);
  } else {
    const wantPillars = scores.join('');
    if (String(cover.pillars) !== wantPillars) err(`cover pillars="${cover.pillars}"; state_scores say "${wantPillars}" (order S,T,A,TOL,E)`);
    const wantScore = scores.reduce((a, b) => a + b, 0);
    if (Number(cover.score) !== wantScore) err(`cover score=${cover.score}; pillar sum is ${wantScore}`);
    if (!/^[0-2]{5}$/.test(String(cover.pillars))) err(`cover pillars "${cover.pillars}" must be exactly 5 digits, each 0-2`);
    if (!String(cover.name ?? '').trim()) err('cover: name missing (the only route-validated slide — 400 without it)');

    // Each pillar slide's pscore equals that pillar's state_scores score (route silently clamps wrong ones)
    manifest.forEach((entry, i) => {
      if (entry.slide !== 'pillar') return;
      const p = entry.params ?? {};
      const key = String(p.pillar ?? '').toLowerCase();
      if (!PILLAR_ORDER.includes(key)) { err(`slide ${i + 1} (pillar): pillar=${JSON.stringify(p.pillar)}; must be S|T|A|TOL|E`); return; }
      const want = stateScores[key].score;
      if (Number(p.pscore) !== want) err(`slide ${i + 1} (pillar ${p.pillar}): pscore=${p.pscore}; state_scores.${key}.score is ${want}`);
    });
  }

  // Char/line limits (count them, don't eyeball — the route truncates/drops silently)
  manifest.forEach((entry, i) => {
    const lim = LIMITS[entry.slide];
    if (!lim) return;
    const p = entry.params ?? {};
    for (const field of ['title', 'heading']) {
      if (lim[field] && String(p[field] ?? '').length > lim[field]) {
        err(`slide ${i + 1} (${entry.slide}): ${field} is ${String(p[field]).length} chars; max ${lim[field]}`);
      }
    }
    if (lim.body && String(p.body ?? '').length > lim.body) {
      err(`slide ${i + 1} (${entry.slide}): body is ${String(p.body).length} chars; max ${lim.body}`);
    }
    if (lim.lines) {
      const lines = splitLines(p.lines);
      if (lines.length > lim.lines.max) err(`slide ${i + 1} (${entry.slide}): ${lines.length} lines; max ${lim.lines.max} (extras are dropped silently)`);
      lines.forEach((l, j) => {
        if (l.length > lim.lines.len) err(`slide ${i + 1} (${entry.slide}): line ${j + 1} is ${l.length} chars; max ${lim.lines.len}`);
      });
    }
  });

  // Zero em dashes anywhere; banned-phrase grep = 0 (whole manifest text)
  const text = JSON.stringify(manifest);
  const emCount = (text.match(/—/g) ?? []).length;
  if (emCount > 0) err(`${emCount} em dash(es) in slide text; must be 0 (use colons, commas, periods)`);
  const banned = text.match(BANNED);
  if (banned) err(`banned phrase in slide text: "${banned[0]}"`);

  return { errors };
}

async function fetchStateScores(draftId) {
  // Networked path: pipeline.teardown_drafts via the same client tools/supabase.mjs builds.
  const { db } = await import('./supabase.mjs');
  const { data, error } = await db.from('teardown_drafts').select('state_scores').eq('id', draftId).maybeSingle();
  if (error) throw new Error(`teardown_drafts read failed: ${error.message}`);
  if (!data?.state_scores) throw new Error(`draft ${draftId} not found or has no state_scores`);
  return data.state_scores;
}

// ------------------------------------------------------------------ self-test
function goodFixture() {
  const stateScores = {
    s: { score: 1 }, t: { score: 0 }, a: { score: 2 }, tol: { score: 0 }, e: { score: 1 },
  };
  const base = (k, extra) => ({ name: 'ExampleSys', k: String(k), total: '7', ...extra });
  const manifest = [
    { slide: 'cover',     params: base(1, { score: '4', pillars: '10201', verdict: 'State loss by design' }) },
    { slide: 'summary',   params: base(2, { title: 'What ExampleSys is', lines: 'Ingests invoices|Routes approvals|Solid retry queue' }) },
    { slide: 'pillar',    params: base(3, { pillar: 'T', pscore: '0', heading: 'No trace of any call', lines: 'No prompt logs|No tool-call records' }) },
    { slide: 'pillar',    params: base(4, { pillar: 'TOL', pscore: '0', heading: 'Crash restarts from step 1', lines: 'No resume point|Full re-run on failure' }) },
    { slide: 'mechanism', params: base(5, { heading: 'Where it breaks', body: 'A retry after a timeout replays the whole chain with fresh randomness. Same input, different output, no record of either.' }) },
    { slide: 'artifact',  params: base(6, { heading: 'The state object', lines: 'workflowId: uuid|stage: string|entityId: uuid' }) },
    { slide: 'outro',     params: base(7, { slug: 'examplesys-teardown' }) },
  ];
  return { manifest, stateScores };
}

function selfTest() {
  let pass = 0, fail = 0;
  const expect = (name, manifest, scores, wantOk, wantErrMatch) => {
    const { errors } = validateManifest(manifest, scores);
    const ok = errors.length === 0;
    const matched = wantErrMatch ? errors.some(e => e.includes(wantErrMatch)) : true;
    if (ok === wantOk && matched) { console.log(`PASS self-test: ${name}`); pass++; }
    else { console.log(`FAIL self-test: ${name} — errors: ${JSON.stringify(errors)}`); fail++; }
  };
  const clone = (m) => JSON.parse(JSON.stringify(m));

  { const { manifest, stateScores } = goodFixture();
    expect('good manifest passes', manifest, stateScores, true); }
  { const { manifest, stateScores } = goodFixture();
    expect('6 slides fails', manifest.slice(0, 6), stateScores, false, 'exactly 7'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    [m[2], m[4]] = [m[4], m[2]];
    expect('wrong slide order fails', m, stateScores, false, 'position'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[3].params.k = '9';
    expect('wrong k fails', m, stateScores, false, 'k='); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[0].params.pillars = '11201';
    expect('pillars/state_scores mismatch fails', m, stateScores, false, 'pillars'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[0].params.score = '9';
    expect('cover score != pillar sum fails', m, stateScores, false, 'pillar sum'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[2].params.pscore = '2';
    expect('pillar pscore mismatch fails', m, stateScores, false, 'pscore'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[1].params.title = 'x'.repeat(61);
    expect('summary title >60 fails', m, stateScores, false, 'title'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[1].params.lines = ['a', 'b', 'c', 'd', 'e', 'f'].join('|');
    expect('summary >5 lines fails', m, stateScores, false, 'lines'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[4].params.body = 'y'.repeat(281);
    expect('mechanism body >280 fails', m, stateScores, false, 'body'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[5].params.lines = 'z'.repeat(61);
    expect('artifact line >60 fails', m, stateScores, false, 'line 1'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[4].params.body = 'Same input — different output.';
    expect('em dash in slide text fails', m, stateScores, false, 'em dash'); }
  { const { manifest, stateScores } = goodFixture(); const m = clone(manifest);
    m[1].params.lines = 'Solid retry queue|Let that sink in';
    expect('banned phrase fails', m, stateScores, false, 'banned phrase'); }

  console.log(`\nvalidate-manifest self-test: ${pass} pass, ${fail} fail`);
  return fail === 0;
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b] = process.argv.slice(2);
  if (a === '--self-test') process.exit(selfTest() ? 0 : 1);
  if (!a || !b) { console.error('usage: validate-manifest.mjs <manifest.json> <draftId|scores.json> | --self-test'); process.exit(2); }
  const manifest = JSON.parse(readFileSync(a, 'utf8'));
  let stateScores;
  if (existsSync(b)) {
    const parsed = JSON.parse(readFileSync(b, 'utf8'));
    stateScores = parsed.state_scores ?? parsed;
  } else {
    stateScores = await fetchStateScores(b);
  }
  const { errors } = validateManifest(manifest, stateScores);
  for (const e of errors) console.log(`FAIL ${e}`);
  if (errors.length) {
    console.log(`\n❌ /repurpose failed at manifest_gate — ${errors.length} check(s) failed — nothing written`);
    process.exit(1);
  }
  console.log('PASS manifest gate — all C3 checks hold (7 slides, scores consistent, limits respected, 0 em dashes)');
}
