import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCompleteness, decodeIntake, loadMessages } from '../lib/form-schema.mjs';
import { validatedLLMCall, parseJsonBlock, StageError } from '../lib/llm.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { buildScorePrompt, extractSection, RUBRIC_PATH } from '../lib/prompts.mjs';
import { validateScore } from '../lib/validate.mjs';

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
