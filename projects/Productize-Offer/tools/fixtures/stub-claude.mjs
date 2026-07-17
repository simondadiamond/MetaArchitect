#!/usr/bin/env node
// Stand-in for the claude CLI in tests. Modes via STUB_LLM_MODE:
//   valid (default) | invalid | invalid-once (needs STUB_STATE_FILE)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const prompt = readFileSync(0, 'utf8');
const mode = process.env.STUB_LLM_MODE ?? 'valid';

let invalid = mode === 'invalid';
if (mode === 'invalid-once' && process.env.STUB_STATE_FILE) {
  const f = process.env.STUB_STATE_FILE;
  const n = existsSync(f) ? Number(readFileSync(f, 'utf8')) : 0;
  writeFileSync(f, String(n + 1));
  invalid = n === 0;
}

const SCORE = {
  language: 'en', level: 1, anchor: 'Ad-hoc', confidence: 'MED',
  rationale: 'A persisted status exists on the main path, but the client names a second path that bypasses the schema, so the persisted position is not reliable across the workflow. The all-criteria rule caps this at Ad-hoc.',
  quotes: ['a quick-fix path a contractor added that writes free-form JSON'],
  optimism_flags: [],
};
const BRIEF = {
  language: 'en',
  hardest_asks: ['S — pull up a mid-flight run yourself', 'Tol — walk the crash step-by-step, no hand-waving past the lock'],
  top_flags: ['Stage-confidence 3/5 next to an admitted schema-bypass path'],
  blocks: {
    structured: { rank: 1, claim: 'Postgres intake_runs with a status enum, plus an admitted bypass path', ask: 'Share your screen and pull up a run that is mid-flight or died recently; from the intake_runs row only, tell me which step it is at and what it has produced.', confirms: 'The row names the exact step and its outputs without transcript scrolling', breaks: 'Transcript scrolling, or free-form JSON rows from the bypass path appear' },
    traceable:  { rank: 2, claim: 'Langfuse on every call with correlation IDs and model versions', ask: 'I will pick an execution from last week; show me its complete trace on screen — every LLM call, tool call, and model version — with the clock running.', confirms: 'A complete trace in under 10 minutes including the batch path', breaks: 'Missing calls, or the nightly batch path has no trace at all' },
    auditable:  { rank: 3, claim: 'Logs exist but no structured decision records and no procedure', ask: 'Pick one claim created last month and show me, on screen, what personal data was used and the model version that ran.', confirms: 'A record retrievable in minutes with the principal factors visible', breaks: 'Reconstruction turns into an engineering project on the call' },
    tolerant:   { rank: 4, claim: 'Call-level retries only; weekly hand re-injection admitted', ask: 'Walk me step-by-step through a crash at the claim-write step and show me the lock or checkpoint row in the table as you go.', confirms: 'Resume from the failed step with the lock visible in the data', breaks: 'Restart from the top or a manual cleanup ritual' },
    explicit:   { rank: 5, claim: 'Zod gate before the claim write, dead-letter queue on invalid', ask: 'Open the validation code at the claim-write boundary and show me what stops a schema-valid but nonexistent policy number.', confirms: 'Content checks beyond shape — referential check against policy data', breaks: 'The gate checks structure only; schema-valid nonsense passes' },
  },
};
const SKELETON = {
  language: 'en',
  markdown: [
    '# AI Readiness Diagnostic — Findings Memo', '',
    '| **Client** | Acme Insurance [ANALYZER — re-judge] |',
    '| **Workflow scored** | **Claims Intake Summarizer** — email → LLM extraction → claim record in core system [ANALYZER — re-judge] |', '',
    '**Claims Intake Summarizer scores 7/15 — High Risk [ANALYZER — re-judge] ({N_PROVISIONAL} of 5 scores provisional).**', '',
    '| **S — Structured** | 1/3 [ANALYZER — re-judge] | Ad-hoc | {S_PROV} | intake claim — NOT confirmed live |',
    '| **T — Traceable** | 2/3 [ANALYZER — re-judge] | Systematic | {T_PROV} | intake claim — NOT confirmed live |', '',
    '### 1. The Consumed-Email Gap [ANALYZER — re-judge]', '',
    'A crash mid-run leaves the email marked consumed with no claim created; on-call re-injects by hand weekly. [ANALYZER — re-judge]', '',
    '| S — Structured | 1/3 | intake self-report only | pending call |',
  ].join('\n'),
};

let result;
if (invalid) result = 'this is not JSON at all';
else if (prompt.includes('STATE-SCORE-TASK')) result = JSON.stringify(SCORE);
else if (prompt.includes('CALL-BRIEF-TASK')) result = JSON.stringify(BRIEF);
else if (prompt.includes('MEMO-SKELETON-TASK')) result = JSON.stringify(SKELETON);
else result = JSON.stringify({ error: 'unknown task marker' });

process.stdout.write(JSON.stringify({ type: 'result', result, modelUsage: { 'stub-model': {} } }));
