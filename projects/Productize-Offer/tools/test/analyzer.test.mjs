import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCompleteness, decodeIntake, loadMessages } from '../lib/form-schema.mjs';
import { validatedLLMCall, parseJsonBlock, StageError } from '../lib/llm.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildScorePrompt, buildBriefPrompt, buildSkeletonPrompt, extractSection, RUBRIC_PATH, MEMO_TEMPLATE_PATH } from '../lib/prompts.mjs';
import { validateScore, validateBrief, validateSkeleton } from '../lib/validate.mjs';
import { renderBrief, renderScorecard } from '../lib/render.mjs';
import { spawnSync } from 'node:child_process';

const TOOLS = join(dirname(fileURLToPath(import.meta.url)), '..');
const cal = JSON.parse(readFileSync(join(TOOLS, 'fixtures', 'calibration-intake.json'), 'utf8'));
const partial = JSON.parse(readFileSync(join(TOOLS, 'fixtures', 'partial-intake.json'), 'utf8'));

test('calibration fixture is complete', () => {
  assert.deepEqual(checkCompleteness(cal), []);
});

test('partial fixture reports exact missing paths', () => {
  const missing = checkCompleteness(partial);
  assert.ok(missing.includes('pillar_tolerant.q1'));
  assert.ok(missing.includes('pillar_explicit.q3'));
  assert.ok(missing.includes('engagement_context.q4'));
});

test('decode maps select indices and scales to readable answers', () => {
  const d = decodeIntake(cal, loadMessages('en'));
  const structured = d.pillars.find(p => p.key === 'structured');
  assert.equal(structured.qa.find(q => q.id === 'q3').answer, 'Partial');       // index 1 → label
  assert.match(structured.qa.find(q => q.id === 'q4').answer, /^3\/5/);          // scale
  const traceable = d.pillars.find(p => p.key === 'traceable');
  assert.equal(traceable.qa.find(q => q.id === 'q2').answer, 'Langfuse');        // multiSelect passthrough
  assert.ok(traceable.qa.some(q => q.id === 'q2_capture'));                      // follow-up included
  assert.match(d.transcriptText, /quick-fix path a contractor added/);
});

// ── Task 2: LLM wrapper ───────────────────────────────────────────────────────

const STUB = join(TOOLS, 'fixtures', 'stub-claude.mjs');
const noopLog = async () => {};

test('parseJsonBlock strips fences and prose', () => {
  assert.deepEqual(parseJsonBlock('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonBlock('Here you go: {"a":1}'), { a: 1 });
  assert.throws(() => parseJsonBlock('no json here'));
});

test('validatedLLMCall retries once then succeeds (invalid-once)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'stub-'));
  process.env.ANALYZER_CLAUDE_CMD = STUB;
  process.env.STUB_LLM_MODE = 'invalid-once';
  process.env.STUB_STATE_FILE = join(dir, 'count');
  const out = await validatedLLMCall({
    prompt: 'STATE-SCORE-TASK', validate: () => {}, stepName: 't', log: noopLog,
  });
  assert.equal(out.anchor, 'Ad-hoc');
  delete process.env.STUB_LLM_MODE; delete process.env.STUB_STATE_FILE;
});

test('validatedLLMCall throws StageError after two invalid attempts', async () => {
  process.env.ANALYZER_CLAUDE_CMD = STUB;
  process.env.STUB_LLM_MODE = 'invalid';
  await assert.rejects(
    validatedLLMCall({ prompt: 'STATE-SCORE-TASK', validate: () => {}, stepName: 't', log: noopLog }),
    StageError,
  );
  delete process.env.STUB_LLM_MODE;
});

// ── Task 3: score stage ───────────────────────────────────────────────────────

const decodedCal = decodeIntake(cal, loadMessages('en'));

test('extractSection pulls exactly one pillar section', () => {
  const md = readFileSync(RUBRIC_PATH, 'utf8');
  const tol = extractSection(md, 'T — Tolerant');
  assert.match(tol, /Reboot Test/);
  assert.doesNotMatch(tol, /E — Explicit/);
});

test('score prompt embeds rubric anchors, rules, and the pillar answers', () => {
  const p = buildScorePrompt({ pillarKey: 'structured', decoded: decodedCal, locale: 'en' });
  assert.match(p, /STATE-SCORE-TASK/);
  assert.match(p, /All-criteria rule|award only if ALL hold/i);
  assert.match(p, /quick-fix path a contractor added/);
  assert.doesNotMatch(p, /Reboot Test/); // other pillars' sections stay out
});

test('validateScore accepts the stub score and rejects violations', () => {
  const good = { language: 'en', level: 1, anchor: 'Ad-hoc', confidence: 'MED',
    rationale: 'A persisted status exists on the main path, but a second path bypasses the schema entirely.',
    quotes: ['a quick-fix path a contractor added that writes free-form JSON'], optimism_flags: [] };
  validateScore(good, decodedCal.transcriptText, 'en'); // no throw
  assert.throws(() => validateScore({ ...good, anchor: 'Systematic' }, decodedCal.transcriptText, 'en'), /anchor/);
  assert.throws(() => validateScore({ ...good, level: 4 }, decodedCal.transcriptText, 'en'), /level/);
  assert.throws(() => validateScore({ ...good, quotes: ['never said this by anyone'] }, decodedCal.transcriptText, 'en'), /quote/);
  assert.throws(() => validateScore({ ...good, quotes: [] }, decodedCal.transcriptText, 'en'), /quote/);
  assert.throws(() => validateScore({ ...good, language: 'fr' }, decodedCal.transcriptText, 'en'), /language/);
});

// ── Task 4: brief stage ───────────────────────────────────────────────────────

function stubOutput(marker) {
  const r = spawnSync('node', [STUB], { input: marker, encoding: 'utf8' });
  return JSON.parse(JSON.parse(r.stdout).result);
}

test('validateBrief accepts the stub brief, rejects vague or unranked blocks', () => {
  const good = stubOutput('CALL-BRIEF-TASK');
  validateBrief(good, 'en'); // no throw
  const vague = structuredClone(good);
  vague.blocks.tolerant.ask = 'Discuss their approach to failure handling in general terms.';
  assert.throws(() => validateBrief(vague, 'en'), /screen-share|actionable/i);
  const dupRank = structuredClone(good);
  dupRank.blocks.explicit.rank = 1;
  assert.throws(() => validateBrief(dupRank, 'en'), /rank/);
  const missing = structuredClone(good);
  delete missing.blocks.auditable;
  assert.throws(() => validateBrief(missing, 'en'), /auditable/);
});

test('renderBrief orders blocks by rank and carries flags + hardest asks', () => {
  const md = renderBrief({ brief: stubOutput('CALL-BRIEF-TASK'), row: cal, workflowId: 'wf-test' });
  assert.ok(md.indexOf('STRUCTURED') < md.indexOf('EXPLICIT')); // rank 1 before rank 5
  assert.match(md, /Do not skip under time pressure/);
  assert.match(md, /show-me ask/i);
});

test('brief prompt embeds the runbook call-block table', () => {
  const scorecard = { pillars: {}, total: 7 };
  const p = buildBriefPrompt({ scorecard, decoded: decodedCal, locale: 'en' });
  assert.match(p, /CALL-BRIEF-TASK/);
  assert.match(p, /the state ask|trace pull/i);
});

// ── Task 5: skeleton stage ────────────────────────────────────────────────────

const template = readFileSync(MEMO_TEMPLATE_PATH, 'utf8');

test('validateSkeleton accepts stub, rejects invented placeholders and missing tags', () => {
  const good = stubOutput('MEMO-SKELETON-TASK');
  validateSkeleton(good, template, 'en'); // no throw
  const invented = { ...good, markdown: good.markdown + '\n{MADE_UP_FIELD}' };
  assert.throws(() => validateSkeleton(invented, template, 'en'), /invented placeholder/);
  const untagged = { ...good, markdown: good.markdown.replaceAll('[ANALYZER — re-judge]', '') };
  assert.throws(() => validateSkeleton(untagged, template, 'en'), /re-judge/);
});

test('skeleton prompt carries the template and the no-invention rule', () => {
  const p = buildSkeletonPrompt({ scorecard: { pillars: {}, total: 7 }, decoded: decodedCal, row: cal, locale: 'en' });
  assert.match(p, /MEMO-SKELETON-TASK/);
  assert.match(p, /NEVER invent a fact/);
  assert.match(p, /PAGE 1 — Engagement & Verdict/);
});

// ── Task 6: CLI end-to-end (stubbed) ──────────────────────────────────────────

function runCli(cliArgs, env = {}) {
  return spawnSync('node', [join(TOOLS, 'intake-analyzer.mjs'), ...cliArgs], {
    encoding: 'utf8',
    env: { ...process.env, ANALYZER_CLAUDE_CMD: STUB, STUB_LLM_MODE: 'valid', ...env },
  });
}
const CAL = join(TOOLS, 'fixtures', 'calibration-intake.json');

test('usage error when neither/both of --row and --fixture', () => {
  assert.equal(runCli([]).status, 2);
});

test('partial intake fails at fetch naming the missing fields', () => {
  const out = mkdtempSync(join(tmpdir(), 'ia-'));
  const r = runCli(['--fixture', join(TOOLS, 'fixtures', 'partial-intake.json'), '--out', out, '--no-db-log']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /❌ intake-analyzer failed at fetch/);
  assert.match(r.stderr, /pillar_tolerant\.q1/);
  assert.match(r.stderr, /never analyze a partial intake silently/);
});

test('persistently invalid LLM output → error path in ❌ format at score', () => {
  const out = mkdtempSync(join(tmpdir(), 'ia-'));
  const r = runCli(['--fixture', CAL, '--out', out, '--no-db-log'], { STUB_LLM_MODE: 'invalid' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /❌ intake-analyzer failed at score — score_structured: invalid LLM output after retry/);
  assert.match(r.stderr, /safe to retry/);
});

test('invalid-once → retry recovers and the run completes', () => {
  const out = mkdtempSync(join(tmpdir(), 'ia-'));
  const r = runCli(['--fixture', CAL, '--out', out, '--no-db-log'],
    { STUB_LLM_MODE: 'invalid-once', STUB_STATE_FILE: join(out, 'count') });
  assert.equal(r.status, 0, r.stderr);
});

test('valid run writes all three artifacts + run-state with required banners/tags', () => {
  const out = mkdtempSync(join(tmpdir(), 'ia-'));
  const r = runCli(['--fixture', CAL, '--out', out, '--no-db-log']);
  assert.equal(r.status, 0, r.stderr);
  const sc = readFileSync(join(out, 'provisional-scorecard.md'), 'utf8');
  assert.match(sc, /PROVISIONAL — scored from self-report only; confirms nothing \(rubric rule 3\)\. For engagement prep, never client delivery\./);
  assert.match(sc, /Proposed total: 5\/15/); // stub scores every pillar 1
  assert.match(sc, /bands are earned live/);
  assert.match(readFileSync(join(out, 'call-brief.md'), 'utf8'), /show-me ask/i);
  assert.match(readFileSync(join(out, 'memo-skeleton.md'), 'utf8'), /\[ANALYZER — re-judge\]/);
  const rs = JSON.parse(readFileSync(join(out, 'run-state.json'), 'utf8'));
  assert.equal(rs.state.stage, 'done');
  assert.equal(rs.state.entityType, 'intake');
  assert.equal(rs.scorecard.total, 5);
});

// ── Review fixes: regression coverage ─────────────────────────────────────────

import { FORM_DEF } from '../lib/form-schema.mjs';

test('FORM_DEF stays in sync with both locales of the readiness form copy', () => {
  for (const locale of ['en', 'fr']) {
    const msgs = loadMessages(locale);
    const byKey = Object.fromEntries(msgs.pillars.map(p => [p.key, p]));
    for (const [key, qs] of Object.entries(FORM_DEF)) {
      const copy = byKey[key];
      assert.ok(copy, `${locale}: pillar ${key} missing from messages`);
      for (const q of qs) {
        const qc = copy.questions[q.id];
        assert.ok(qc?.label, `${locale}: ${key}.${q.id} has no label in messages`);
        if (q.type === 'select') assert.ok(Array.isArray(qc.options) && qc.options.length >= 2, `${locale}: ${key}.${q.id} select lacks options`);
        if (q.type === 'scale') assert.ok(qc.scaleLow && qc.scaleHigh, `${locale}: ${key}.${q.id} scale lacks endpoint labels`);
      }
      const qids = new Set(qs.flatMap(q => [q.id, q.followUp?.id].filter(Boolean)));
      for (const qid of Object.keys(copy.questions)) {
        assert.ok(qids.has(qid), `${locale}: messages has ${key}.${qid} unknown to FORM_DEF`);
      }
    }
  }
});

test('out-of-range select index is reported as unrecognized, out-of-range scale fails completeness', () => {
  const bad = structuredClone(cal);
  bad.pillar_structured.q3 = 9;        // only 4 options exist
  bad.pillar_traceable.q5 = 42;        // scale is 1–5
  assert.ok(checkCompleteness(bad).includes('pillar_traceable.q5'));
  const d = decodeIntake(bad, loadMessages('en'));
  assert.deepEqual(d.unrecognized, ['pillar_structured.q3']);
});

test('FR vous-form asks pass the screen-share gate', () => {
  const frBrief = stubOutput('CALL-BRIEF-TASK');
  frBrief.language = 'fr';
  const frAsks = [
    'Montrez-moi la ligne intake_runs d’une exécution en cours, à l’écran.',
    'Partagez votre écran et affichez la trace complète d’une exécution de la semaine dernière.',
    'Ouvrez le code de validation à la frontière d’écriture de la réclamation.',
    'Exécutez la requête et montrez-moi le verrou dans la table, étape par étape.',
    'Choisissez une décision du mois dernier et affichez, à l’écran, les données personnelles utilisées.',
  ];
  Object.values(frBrief.blocks).forEach((b, i) => { b.ask = frAsks[i]; });
  validateBrief(frBrief, 'fr'); // must not throw
});

test('validateBrief rejects extra blocks and non-string flags', () => {
  const extra = stubOutput('CALL-BRIEF-TASK');
  extra.blocks.summary = { note: 'wrap-up' };
  assert.throws(() => validateBrief(extra, 'en'), /unexpected blocks/);
  const objFlags = stubOutput('CALL-BRIEF-TASK');
  objFlags.top_flags = [{ flag: 'stage-confidence 4/5' }];
  assert.throws(() => validateBrief(objFlags, 'en'), /top_flags/);
});

test('quote gate survives em-dash→hyphen and accent drift', () => {
  const good = {
    language: 'en', level: 1, anchor: 'Ad-hoc', confidence: 'HIGH',
    rationale: 'The client names a manual weekly recovery ritual, which caps the pillar at the ad-hoc anchor.',
    quotes: ['Law 25 - claimants are Quebec residents'],   // intake has "Law 25 — claimants are Québec residents"
    optimism_flags: [],
  };
  validateScore(good, decodedCal.transcriptText, 'en'); // must not throw
});

test('parseJsonBlock skips braces in preamble prose', () => {
  assert.deepEqual(parseJsonBlock('Applying rule {3} of the rubric: {"a":1}'), { a: 1 });
});

test('skeleton placeholder gate ignores prose braces without terminator, still catches inventions', () => {
  const good = stubOutput('MEMO-SKELETON-TASK');
  const withProse = { ...good, markdown: good.markdown + '\nThe state object looks like {WORKFLOW was here' };
  validateSkeleton(withProse, template, 'en'); // "{WORKFLOW " has no } or : terminator — not a token
  const invented = { ...good, markdown: good.markdown + '\n{MADE_UP_FIELD}' };
  assert.throws(() => validateSkeleton(invented, template, 'en'), /invented placeholder/);
});

test('FR skeleton pending gate and renderers produce French scaffolding', () => {
  const frRow = { ...cal, locale: 'fr' };
  const frSkeleton = { language: 'fr', markdown: stubOutput('MEMO-SKELETON-TASK').markdown.replace(/pending call/g, 'à confirmer sur l’appel') };
  validateSkeleton(frSkeleton, template, 'fr');
  const frDecoded = decodeIntake(frRow, loadMessages('fr'));
  const score = { language: 'fr', level: 1, anchor: 'Ad-hoc', confidence: 'MED', rationale: 'x'.repeat(50), quotes: ['a'], optimism_flags: [] };
  const sc = renderScorecard({ scorecard: { pillars: { structured: score }, total: 1 }, row: frRow, decoded: frDecoded, workflowId: 'wf' });
  assert.match(sc, /PROVISOIRE — noté à partir de l’auto-déclaration/);
  assert.doesNotMatch(sc, /PROVISIONAL — scored from self-report/);
  const frB = stubOutput('CALL-BRIEF-TASK');
  const br = renderBrief({ brief: frB, row: frRow, workflowId: 'wf' });
  assert.match(br, /Brief d’appel de confirmation/);
});

test('valueless --out is a usage error, not a silent fallback', () => {
  const r = runCli(['--fixture', CAL, '--out', '--no-db-log']);
  assert.equal(r.status, 2);
});
