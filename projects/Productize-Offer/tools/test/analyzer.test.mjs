import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCompleteness, decodeIntake, loadMessages } from '../lib/form-schema.mjs';
import { validatedLLMCall, parseJsonBlock, StageError } from '../lib/llm.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

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
