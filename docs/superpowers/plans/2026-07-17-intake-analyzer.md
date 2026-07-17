# STATE Intake Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the STATE intake analyzer (goal `a528feab`) per `projects/Productize-Offer/intake-analyzer-spec.md` — turns a `/readiness` intake row into three Simon-only prep artifacts: provisional scorecard, call brief, memo skeleton.

**Architecture:** A single Node CLI (`intake-analyzer.mjs`) with five STATE stages (fetch → score → brief → skeleton → deliver). LLM calls shell out to `claude -p --output-format json` (Claude Max subscription — the house rule forbids `ANTHROPIC_API_KEY`/SDK). Every LLM output passes a schema gate before use; invalid → one retry → error path. The rubric, runbook block table, and memo template are read from their canonical files at runtime — no forked copies.

**Tech Stack:** Node 24 (node:test, ESM), `claude` CLI 2.x, Content-Engine `tools/supabase.mjs` (pipeline.logs + public-schema read), website `messages/{en,fr}/readinessDiagnostic.json` for question copy.

## Global Constraints

- **No `ANTHROPIC_API_KEY`, never call the SDK directly** — LLM calls go through the `claude` CLI (Content-Engine CLAUDE.md).
- **STATE medium risk (S + T + E)**: state object per run; every LLM call + stage transition logged to `pipeline.logs` via `logEntry()`; every LLM output gated before use. No lock — outputs are files, overwrite-on-rerun is desired (spec §Pipeline E).
- **Error format verbatim**: `❌ intake-analyzer failed at [stage] — [error] — safe to retry (outputs overwrite on rerun)`.
- **Scorecard banner verbatim**: `PROVISIONAL — scored from self-report only; confirms nothing (rubric rule 3). For engagement prep, never client delivery.`
- **Skeleton tag verbatim**: `[ANALYZER — re-judge]` on every analyzer-filled value.
- **Artifacts never land in the repo** — default out dir `~/engagements/<slug>-<rowid8>/` (env `ENGAGEMENTS_DIR` overrides base, `--out` overrides fully). Tests write to temp dirs.
- **Anchor names stay in English verbatim** (`Absent/Ad-hoc/Systematic/Enforced`) even in FR outputs — they are part of the instrument. All prose follows the row's `locale` (en|fr).
- **Fixture data is synthetic** — fixtures live in the repo; no test ever inserts into `state_readiness_diagnostic` (the table has 0 rows and stays clean); stub-LLM tests use `--no-db-log` so `pipeline.logs` isn't polluted.
- **Form-def mirror**: the analyzer mirrors `ReadinessDiagnosticClient.tsx` `PILLAR_DEFS` (form v1). Form changes are explicitly v2 / out of scope.
- Row storage facts (verified live 2026-07-17): table `public.state_readiness_diagnostic` in the shared Supabase project (`ashwrqkoijzvakdmfskj`); columns `id, submitted_at, system_name, role, company_size, industry, system_description, prod_status, regulations(jsonb), pillar_structured..pillar_explicit(jsonb), engagement_context(jsonb), email, referral_source, locale, user_agent`. **select answers = option index (number); multiSelect = option label strings; scale = 1–5 number; textarea = string.**
- Worktree has no `node_modules`/`.env` — DB-touching runs need `ln -s /home/diamond/projects/MetaArchitect/node_modules` and `ln -s /home/diamond/projects/MetaArchitect/.env` at the worktree root (Task 7). Stub tests need neither (supabase import is lazy).

## File Structure

```
projects/Productize-Offer/tools/
  intake-analyzer.mjs          — CLI entry: args, state object, 5 stages, error path
  lib/form-schema.mjs          — form-def mirror, completeness check, index→label decode
  lib/llm.mjs                  — claude -p wrapper, JSON extraction, validated call w/ one retry
  lib/prompts.mjs              — canonical-doc paths, section extraction, 3 prompt builders
  lib/validate.mjs             — the three E-gates (score / brief / skeleton)
  lib/render.mjs               — markdown renderers (scorecard, brief)
  fixtures/calibration-intake.json    — rubric worked example (expect S1 T2 A1 Tol1 E2)
  fixtures/overconfident-intake.json  — scale-5s + ad-hoc narratives (expect optimism flags)
  fixtures/partial-intake.json        — missing required answers (fetch gate test)
  fixtures/stub-claude.mjs            — claude-CLI stand-in (valid | invalid | invalid-once)
  test/analyzer.test.mjs       — node:test suite (all stubbed, no network/env)
```

---

### Task 1: Form schema module + fixtures

**Files:**
- Create: `projects/Productize-Offer/tools/lib/form-schema.mjs`
- Create: `projects/Productize-Offer/tools/fixtures/calibration-intake.json`
- Create: `projects/Productize-Offer/tools/fixtures/overconfident-intake.json`
- Create: `projects/Productize-Offer/tools/fixtures/partial-intake.json`
- Create: `projects/Productize-Offer/tools/test/analyzer.test.mjs` (first tests)

**Interfaces:**
- Produces: `checkCompleteness(row) → string[]` (missing field paths like `pillar_tolerant.q1`); `decodeIntake(row, messages) → { intro: [{label,value}], pillars: [{key,title,qa:[{id,label,answer}]}], engagement: [{label,answer}], transcriptText: string }`; `loadMessages(locale) → object`; `PILLAR_COLUMNS`, `FORM_DEF`.

- [ ] **Step 1: Write failing tests** (in `test/analyzer.test.mjs`)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCompleteness, decodeIntake, loadMessages } from '../lib/form-schema.mjs';

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
```

- [ ] **Step 2: Run tests to verify they fail** — `cd projects/Productize-Offer/tools && node --test test/` → FAIL (module not found)

- [ ] **Step 3: Write `lib/form-schema.mjs`**

```js
/**
 * Mirror of the /readiness form structure (simonparis-website
 * ReadinessDiagnosticClient.tsx PILLAR_DEFS, form v1 2026-07).
 * Storage: select = option index (number), multiSelect = label strings,
 * scale = 1–5 number, textarea = string. Question copy is read at runtime
 * from the website checkout's messages files — never duplicated here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const PILLAR_COLUMNS = {
  structured: 'pillar_structured',
  traceable:  'pillar_traceable',
  auditable:  'pillar_auditable',
  tolerant:   'pillar_tolerant',
  explicit:   'pillar_explicit',
};

export const FORM_DEF = {
  structured: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'textarea', required: true },
    { id: 'q3', type: 'select', required: true, followUp: { id: 'q3_detail', type: 'textarea' } },
    { id: 'q4', type: 'scale', required: true },
    { id: 'q5', type: 'textarea', required: false },
  ],
  traceable: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'multiSelect', required: true, followUp: { id: 'q2_capture', type: 'multiSelect' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'scale', required: true },
    { id: 'q6', type: 'textarea', required: false },
  ],
  auditable: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'select', required: true, followUp: { id: 'q2_detail', type: 'multiSelect' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'scale', required: true },
    { id: 'q6', type: 'textarea', required: false },
  ],
  tolerant: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'select', required: true, followUp: { id: 'q2_detail', type: 'textarea' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'scale', required: true },
    { id: 'q6', type: 'textarea', required: false },
  ],
  explicit: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'select', required: true, followUp: { id: 'q2_detail', type: 'textarea' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'select', required: true },
    { id: 'q6', type: 'scale', required: true },
    { id: 'q7', type: 'textarea', required: false },
  ],
};

const ENGAGEMENT_QS = ['q1', 'q2', 'q3', 'q4']; // all required textarea, minChars 10
const INTRO_REQUIRED = ['system_name', 'role', 'company_size', 'industry', 'system_description', 'prod_status', 'regulations'];

export function checkCompleteness(row) {
  const missing = [];
  for (const f of INTRO_REQUIRED) {
    const v = row[f];
    if (f === 'regulations') { if (!Array.isArray(v) || v.length === 0) missing.push(f); }
    else if (!v || String(v).trim() === '') missing.push(f);
  }
  if (!['en', 'fr'].includes(row.locale)) missing.push('locale');
  for (const [key, qs] of Object.entries(FORM_DEF)) {
    const col = PILLAR_COLUMNS[key];
    const answers = row[col] || {};
    for (const q of qs) {
      if (!q.required) continue;
      const v = answers[q.id];
      const bad =
        q.type === 'textarea' ? (!v || String(v).trim() === '') :
        q.type === 'multiSelect' ? (!Array.isArray(v) || v.length === 0) :
        typeof v !== 'number';
      if (bad) missing.push(`${col}.${q.id}`);
    }
  }
  const ec = row.engagement_context || {};
  for (const id of ENGAGEMENT_QS) {
    const v = ec[id];
    if (!v || String(v).trim().length < 10) missing.push(`engagement_context.${id}`);
  }
  return missing;
}

const MESSAGES_DIR = process.env.READINESS_MESSAGES_DIR
  ?? join(homedir(), 'projects/MetaArchitect/projects/simonparis-website/messages');

export function loadMessages(locale) {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, locale, 'readinessDiagnostic.json'), 'utf8'));
}

const isEmpty = (v) =>
  v === undefined || v === null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

export function decodeIntake(row, messages) {
  const byKey = Object.fromEntries(messages.pillars.map(p => [p.key, p]));
  const pillars = [];
  for (const [key, qs] of Object.entries(FORM_DEF)) {
    const copy = byKey[key];
    const answers = row[PILLAR_COLUMNS[key]] || {};
    const qa = [];
    for (const q of qs) {
      const qCopy = copy?.questions?.[q.id] ?? {};
      const raw = answers[q.id];
      let answer;
      if (isEmpty(raw)) {
        answer = '(not answered)';
      } else if (q.type === 'select') {
        const opts = qCopy.options ?? [];
        answer = typeof raw === 'number' && opts[raw] !== undefined
          ? opts[raw] : `(unrecognized option: ${JSON.stringify(raw)})`;
      } else if (q.type === 'scale') {
        answer = `${raw}/5  (1 = "${qCopy.scaleLow}", 5 = "${qCopy.scaleHigh}")`;
      } else if (q.type === 'multiSelect') {
        answer = raw.join('; ');
      } else {
        answer = String(raw).trim();
      }
      qa.push({ id: q.id, label: qCopy.label ?? q.id, answer });
      if (q.followUp && !isEmpty(answers[q.followUp.id])) {
        const fuRaw = answers[q.followUp.id];
        qa.push({
          id: q.followUp.id,
          label: qCopy.followUp?.label ?? q.followUp.id,
          answer: Array.isArray(fuRaw) ? fuRaw.join('; ') : String(fuRaw).trim(),
        });
      }
    }
    pillars.push({ key, title: copy?.title ?? key, qa });
  }
  const f = messages.intro?.fields ?? {};
  const intro = [
    { label: f.system_name?.label ?? 'System', value: row.system_name },
    { label: f.role?.label ?? 'Role', value: row.role },
    { label: f.company_size?.label ?? 'Company size', value: row.company_size },
    { label: f.industry?.label ?? 'Industry', value: row.industry },
    { label: f.description?.label ?? 'System description', value: row.system_description },
    { label: f.prod_status?.label ?? 'Production status', value: row.prod_status },
    { label: f.regulations?.label ?? 'Regulations', value: (row.regulations ?? []).join('; ') },
  ];
  const ecCopy = byKey.engagement_context;
  const engagement = ENGAGEMENT_QS.map(id => ({
    label: ecCopy?.questions?.[id]?.label ?? id,
    answer: String((row.engagement_context ?? {})[id] ?? '').trim(),
  }));
  const transcriptText = [
    ...intro.map(x => `${x.label}: ${x.value}`),
    ...pillars.flatMap(p => p.qa.map(q => `${q.label}\n${q.answer}`)),
    ...engagement.map(q => `${q.label}\n${q.answer}`),
  ].join('\n\n');
  return { intro, pillars, engagement, transcriptText };
}
```

- [ ] **Step 4: Write `fixtures/calibration-intake.json`** — the rubric's worked example (insurance intake summarizer; audited scores S1 T2 A1 Tol1 E2 = 7/15):

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "submitted_at": "2026-07-16T14:00:00Z",
  "system_name": "Claims Intake Summarizer",
  "role": "Engineering Manager, Claims Platform",
  "company_size": "201–1000",
  "industry": "Insurance",
  "system_description": "An email arrives in the claims inbox, an LLM extracts the claimant, policy number and loss details, and a claim record is created in our core system. A human adjuster reviews every claim downstream before payment.",
  "prod_status": "In production",
  "regulations": ["Law 25 (Québec)"],
  "email": "fixture@example.com",
  "referral_source": null,
  "locale": "en",
  "user_agent": "fixture",
  "pillar_structured": {
    "q1": "Each step writes to a Postgres intake_runs table with a typed status enum that is updated per step. There is also a quick-fix path a contractor added that writes free-form JSON into the same table for certain forwarded emails.",
    "q2": "The email is already marked consumed, so no claim gets created and nothing retries. We restart the workflow from the top and clean up any partial rows by hand.",
    "q3": 1,
    "q3_detail": "The intake_runs DDL defines the fields for the main path. The quick-fix path bypasses it entirely.",
    "q4": 3,
    "q5": ""
  },
  "pillar_traceable": {
    "q1": "We open Langfuse and pull the session by correlation ID. Every production call is traced with inputs, outputs and model version, with 90-day retention.",
    "q2": ["Langfuse"],
    "q2_capture": ["Full prompt", "Full response", "Model version", "Tool calls", "Session ID"],
    "q3": 0,
    "q4": 3,
    "q5": 4,
    "q6": "The nightly batch re-processor does not emit traces yet — it predates the Langfuse rollout."
  },
  "pillar_auditable": {
    "q1": "Honestly it would take an engineer a day or two to reconstruct the answer from traces. We have never received one, and there is no written procedure for it.",
    "q2": 2,
    "q3": 1,
    "q4": 2,
    "q5": 2,
    "q6": "Law 25 — claimants are Québec residents and personal data flows through the extraction step."
  },
  "pillar_tolerant": {
    "q1": "A crash mid-run leaves the email marked consumed with no claim created. On-call re-injects the stuck emails by hand, roughly a weekly ritual.",
    "q2": 3,
    "q3": 1,
    "q4": 1,
    "q5": 1,
    "q6": "The LLM client has 429 backoff, but there is no resume — a failed run is a manual cleanup."
  },
  "pillar_explicit": {
    "q1": "The extraction output is parsed against a Zod schema before the claim write. Invalid output goes to a dead-letter queue and pages the on-call channel.",
    "q2": 0,
    "q2_detail": "A schema-valid extraction contained a policy number that does not exist; it created an orphan claim that an adjuster caught two days later.",
    "q3": 0,
    "q4": 3,
    "q5": 2,
    "q6": 4,
    "q7": ""
  },
  "engagement_context": {
    "q1": "Risk committee review lands in September; the AI intake path is on the agenda and the CTO presents.",
    "q2": "We added Langfuse last year and wrote the Zod gate after the orphan-claim incident. The batch path and resume behaviour keep slipping down the backlog.",
    "q3": "One senior engineer at roughly half time for the next two months, plus me for reviews.",
    "q4": "A crash we can resume from, traces on every path including batch, and an answer we could give a regulator inside a day."
  }
}
```

- [ ] **Step 5: Write `fixtures/overconfident-intake.json`** — every confidence scale 5, best-case selects, narratives that describe ad-hoc practice (the classic optimism tell). Expected live behaviour: optimism flags on ≥2 pillars.

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "submitted_at": "2026-07-16T15:00:00Z",
  "system_name": "Contract Copilot",
  "role": "Head of Engineering",
  "company_size": "51–200",
  "industry": "LegalTech SaaS",
  "system_description": "An agent that reads inbound contracts, extracts key terms, and updates our CRM records automatically so account managers see deal risk without opening the document.",
  "prod_status": "In production",
  "regulations": ["None"],
  "email": "fixture@example.com",
  "referral_source": null,
  "locale": "en",
  "user_agent": "fixture",
  "pillar_structured": {
    "q1": "The agent keeps everything in the conversation context; the framework handles memory for us, so we have never needed a separate state store.",
    "q2": "We would just kick it off again — it has never been a problem in practice.",
    "q3": 0,
    "q3_detail": "It is implicit in the prompts; the model knows which fields it needs.",
    "q4": 5,
    "q5": ""
  },
  "pillar_traceable": {
    "q1": "We would grep the application logs on the pod, or ask whichever engineer deployed that day — they usually remember what changed.",
    "q2": ["Application logs only"],
    "q2_capture": ["Full response"],
    "q3": 0,
    "q4": 1,
    "q5": 5,
    "q6": ""
  },
  "pillar_auditable": {
    "q1": "Legal has never asked; we could pull something together from the logs if it ever came up.",
    "q2": 0,
    "q2_detail": ["Timestamp", "Output"],
    "q3": 0,
    "q4": 3,
    "q5": 5,
    "q6": ""
  },
  "pillar_tolerant": {
    "q1": "Someone restarts the service and the agent picks the work back up on its own as far as we can tell.",
    "q2": 3,
    "q3": 0,
    "q4": 0,
    "q5": 5,
    "q6": ""
  },
  "pillar_explicit": {
    "q1": "The model output goes straight into the CRM update; it is very reliable in practice so we have not needed a validation layer.",
    "q2": 1,
    "q3": 3,
    "q4": 1,
    "q5": 1,
    "q6": 5,
    "q7": ""
  },
  "engagement_context": {
    "q1": "A major enterprise customer is running a vendor security review of us this quarter.",
    "q2": "We tightened some prompts after a bad extraction last spring; that mostly fixed it.",
    "q3": "The whole team can pitch in if needed, we move fast.",
    "q4": "The vendor review passes and nobody has to think about this system again."
  }
}
```

- [ ] **Step 6: Write `fixtures/partial-intake.json`** — copy of `calibration-intake.json` with `id` `33333333-3333-4333-8333-333333333333`, `pillar_tolerant.q1` set to `""`, `pillar_explicit.q3` key deleted, and `engagement_context.q4` set to `"Fixed."`.

- [ ] **Step 7: Run tests** — `node --test test/` → all Task-1 tests PASS.

- [ ] **Step 8: Commit** — `git add projects/Productize-Offer/tools && git commit -m "feat(intake-analyzer): form schema mirror, decode, completeness gate + fixtures"`

---

### Task 2: LLM wrapper + stub

**Files:**
- Create: `projects/Productize-Offer/tools/lib/llm.mjs`
- Create: `projects/Productize-Offer/tools/fixtures/stub-claude.mjs` (chmod +x)
- Modify: `projects/Productize-Offer/tools/test/analyzer.test.mjs`

**Interfaces:**
- Consumes: nothing internal.
- Produces: `class StageError extends Error`; `callClaude(prompt, {timeoutMs}) → {text, model}`; `parseJsonBlock(text) → object`; `async validatedLLMCall({prompt, validate, stepName, log}) → object` (one retry with the validator's complaint appended; second failure throws `StageError`). Env seam: `ANALYZER_CLAUDE_CMD` (default `claude`).

- [ ] **Step 1: Write failing tests**

```js
// append to test/analyzer.test.mjs
import { validatedLLMCall, parseJsonBlock, StageError } from '../lib/llm.mjs';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';

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
```

Note: `llm.mjs` must read `ANALYZER_CLAUDE_CMD` at call time (inside `callClaude`), not at module load, so tests can flip it.

- [ ] **Step 2: Run tests** → FAIL (module not found).

- [ ] **Step 3: Write `lib/llm.mjs`**

```js
import { spawnSync } from 'node:child_process';

export class StageError extends Error {}

/** Shell out to the claude CLI (Max subscription — house rule: never the SDK). */
export function callClaude(prompt, { timeoutMs = 300_000 } = {}) {
  const cmd = process.env.ANALYZER_CLAUDE_CMD ?? 'claude';
  const res = spawnSync(cmd, ['-p', '--output-format', 'json'], {
    input: prompt, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) throw new StageError(`claude spawn failed: ${res.error.message}`);
  if (res.status !== 0) throw new StageError(`claude exited ${res.status}: ${(res.stderr || '').slice(0, 300)}`);
  let out;
  try { out = JSON.parse(res.stdout); } catch { throw new StageError('claude CLI did not return a JSON envelope'); }
  if (typeof out.result !== 'string') throw new StageError('claude CLI envelope missing result');
  return { text: out.result, model: Object.keys(out.modelUsage ?? {})[0] ?? 'unknown' };
}

export function parseJsonBlock(text) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in LLM output');
  return JSON.parse(stripped.slice(start, end + 1));
}

/**
 * E — Explicit: one LLM call behind a validation gate. Invalid output → one
 * retry carrying the validator's complaint; still invalid → StageError.
 * Never a silent continue. Every attempt is logged (T).
 */
export async function validatedLLMCall({ prompt, validate, stepName, log }) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const p = attempt === 1 ? prompt
      : `${prompt}\n\nYour previous output was rejected by a validation gate: ${lastErr}\nReturn ONLY the corrected JSON object.`;
    let model = 'unknown';
    try {
      const res = callClaude(p);
      model = res.model;
      const parsed = parseJsonBlock(res.text);
      validate(parsed); // throws with a reason
      await log({ step_name: stepName, model_version: model, status: 'success', output_summary: `attempt ${attempt}: valid` });
      return parsed;
    } catch (err) {
      lastErr = err.message;
      await log({ step_name: stepName, model_version: model, status: 'error', output_summary: `attempt ${attempt}: ${lastErr}`.slice(0, 500) });
    }
  }
  throw new StageError(`${stepName}: invalid LLM output after retry — ${lastErr}`);
}
```

- [ ] **Step 4: Write `fixtures/stub-claude.mjs`** — must be executable (`chmod +x`). Routes on task markers embedded in the prompts; canned outputs are crafted to pass the Task 3–5 validators against the calibration fixture (the score quote is a verbatim substring of `pillar_structured.q1`).

```js
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
```

- [ ] **Step 5: `chmod +x fixtures/stub-claude.mjs`**, run tests → PASS.

- [ ] **Step 6: Commit** — `git commit -m "feat(intake-analyzer): claude -p wrapper with validation-gated retry + test stub"`

---

### Task 3: Score stage — prompt builder + validator

**Files:**
- Create: `projects/Productize-Offer/tools/lib/prompts.mjs`
- Create: `projects/Productize-Offer/tools/lib/validate.mjs`
- Modify: `projects/Productize-Offer/tools/test/analyzer.test.mjs`

**Interfaces:**
- Consumes: `decodeIntake` output shape (Task 1).
- Produces: `prompts.mjs`: `RUBRIC_PATH`, `RUNBOOK_PATH`, `MEMO_TEMPLATE_PATH`, `extractSection(md, heading, depth=2) → string`, `buildScorePrompt({pillarKey, decoded, locale}) → string` (contains marker `STATE-SCORE-TASK`). `validate.mjs`: `validateScore(obj, transcriptText, locale)` — throws with reason on any violation. Score object shape: `{language, level:0-3, anchor, rationale, quotes:[…], confidence:'LOW|MED|HIGH', optimism_flags:[{claim,why}]}`.

- [ ] **Step 1: Write failing tests**

```js
// append to test/analyzer.test.mjs
import { buildScorePrompt, extractSection, RUBRIC_PATH } from '../lib/prompts.mjs';
import { validateScore } from '../lib/validate.mjs';

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
```

- [ ] **Step 2: Run tests** → FAIL.

- [ ] **Step 3: Write `lib/prompts.mjs`** (score parts; brief/skeleton builders arrive in Tasks 4–5)

```js
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RUBRIC_PATH = join(OFFER_ROOT, 'audit', 'state-scoring-rubric.md');
export const RUNBOOK_PATH = join(OFFER_ROOT, 'diagnostic', 'diagnostic-runbook.md');
export const MEMO_TEMPLATE_PATH = join(OFFER_ROOT, 'diagnostic', 'findings-memo-template.md');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Slice a markdown section: from `#{depth} heading` to the next same-depth heading. */
export function extractSection(md, heading, depth = 2) {
  const h = '#'.repeat(depth);
  const re = new RegExp(`^${h} +${esc(heading)}\\s*$`, 'm');
  const m = md.match(re);
  if (!m) throw new Error(`section not found: "${h} ${heading}"`);
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(new RegExp(`^${h} `, 'm'));
  return rest.slice(0, next === -1 ? undefined : next).trim();
}

const PILLAR_RUBRIC_HEADINGS = {
  structured: 'S — Structured',
  traceable:  'T — Traceable',
  auditable:  'A — Auditable',
  tolerant:   'T — Tolerant',
  explicit:   'E — Explicit',
};

function langLine(locale) {
  return locale === 'fr'
    ? 'The client answered in French. Write rationale, flags, and all prose in French (registre professionnel québécois). Quotes stay verbatim as the client wrote them. Keep anchor names and confidence values in English verbatim — they are part of the instrument.'
    : 'Write all output in English.';
}

export function buildScorePrompt({ pillarKey, decoded, locale }) {
  const rubric = readFileSync(RUBRIC_PATH, 'utf8');
  const scale = extractSection(rubric, 'The scale');
  const rules = extractSection(rubric, 'Scoring rules (read before scoring anything)');
  const calib = extractSection(rubric, 'Calibration notes — where two auditors diverge, and the tie-break');
  const pillarSection = extractSection(rubric, PILLAR_RUBRIC_HEADINGS[pillarKey]);
  const pillar = decoded.pillars.find(p => p.key === pillarKey);
  const qa = pillar.qa.map(q => `Q: ${q.label}\nA: ${q.answer}`).join('\n\n');
  const introTxt = decoded.intro.map(x => `${x.label}: ${x.value}`).join('\n');
  return `STATE-SCORE-TASK
You are scoring ONE pillar of the STATE rubric from a client's self-reported intake. This produces a PROVISIONAL score for engagement prep only — self-report confirms nothing (rubric rule 3). Your job: a faithful application of the anchors to what the client claims, plus flagging optimism.

## Rubric — the scale
${scale}

## Rubric — scoring rules
${rules}

## Rubric — calibration notes
${calib}

## Rubric — the pillar you are scoring
${pillarSection}

## Engagement context (intro block)
${introTxt}

## The client's intake answers for this pillar
${qa}

## Your task
1. Apply the anchors to the claims exactly as stated. All-criteria rule; torn between two levels → take the lower.
2. Optimism flags: any claim that pattern-matches "tooling installed ≠ property held". The classic tell is a confidence scale of 4–5 alongside a narrative that describes ad-hoc practice. Flag each with the claim and why it reads optimistic. An empty array is a valid answer.
3. ${langLine(locale)}

Return ONLY a JSON object (no markdown fence, no prose) with exactly this shape:
{"language":"${locale}","level":<integer 0-3>,"anchor":"<Absent|Ad-hoc|Systematic|Enforced — must match the level>","rationale":"<3-6 sentences applying the anchor criteria to their answers>","quotes":["<phrases copied character-for-character from the answers above; at least one>"],"confidence":"<LOW|MED|HIGH>","optimism_flags":[{"claim":"…","why":"…"}]}`;
}
```

- [ ] **Step 4: Write `lib/validate.mjs`** (score part)

```js
const ANCHORS = ['Absent', 'Ad-hoc', 'Systematic', 'Enforced'];
export const PILLAR_KEYS = ['structured', 'traceable', 'auditable', 'tolerant', 'explicit'];

const norm = (s) => s.toLowerCase().replace(/[\s ]+/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').trim();

export function validateScore(obj, transcriptText, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (!Number.isInteger(obj.level) || obj.level < 0 || obj.level > 3) throw new Error('level must be an integer 0–3');
  if (obj.anchor !== ANCHORS[obj.level]) throw new Error(`anchor must be "${ANCHORS[obj.level]}" for level ${obj.level}`);
  if (typeof obj.rationale !== 'string' || obj.rationale.trim().length < 40) throw new Error('rationale missing or too thin');
  if (!Array.isArray(obj.quotes) || obj.quotes.length < 1) throw new Error('at least one client quote required');
  const hay = norm(transcriptText);
  for (const q of obj.quotes) {
    if (typeof q !== 'string' || q.trim().length < 8) throw new Error('quote too short to be evidence');
    if (!hay.includes(norm(q))) throw new Error(`quote not found verbatim in the intake: "${String(q).slice(0, 60)}"`);
  }
  if (!['LOW', 'MED', 'HIGH'].includes(obj.confidence)) throw new Error('confidence must be LOW|MED|HIGH');
  if (!Array.isArray(obj.optimism_flags)) throw new Error('optimism_flags must be an array');
  for (const f of obj.optimism_flags) {
    if (typeof f?.claim !== 'string' || !f.claim || typeof f?.why !== 'string' || !f.why)
      throw new Error('each optimism flag needs non-empty claim and why');
  }
}
```

- [ ] **Step 5: Run tests** → PASS. **Step 6: Commit** — `git commit -m "feat(intake-analyzer): score stage — rubric-faithful prompt + quote-verified gate"`

---

### Task 4: Brief stage — prompt, validator, renderer

**Files:**
- Modify: `projects/Productize-Offer/tools/lib/prompts.mjs` (add `buildBriefPrompt`)
- Modify: `projects/Productize-Offer/tools/lib/validate.mjs` (add `validateBrief`)
- Create: `projects/Productize-Offer/tools/lib/render.mjs` (add `renderBrief`)
- Modify: `projects/Productize-Offer/tools/test/analyzer.test.mjs`

**Interfaces:**
- Consumes: scorecard `{pillars: {structured: <score obj>, …}, total}`, `decoded` (Task 1).
- Produces: `buildBriefPrompt({scorecard, decoded, locale})` (marker `CALL-BRIEF-TASK`); `validateBrief(obj, locale)`; `renderBrief({brief, row, workflowId}) → string`. Brief shape: `{language, blocks: {<pillar>: {rank:1-5 unique, claim, ask, confirms, breaks}}, top_flags: [≤3], hardest_asks: [2]}`.

- [ ] **Step 1: Write failing tests**

```js
// append
import { buildBriefPrompt } from '../lib/prompts.mjs';
import { validateBrief } from '../lib/validate.mjs';
import { renderBrief } from '../lib/render.mjs';
import { spawnSync } from 'node:child_process';

function stubBrief() { // pull the canned brief straight from the stub
  const r = spawnSync('node', [STUB], { input: 'CALL-BRIEF-TASK', encoding: 'utf8' });
  return JSON.parse(JSON.parse(r.stdout).result);
}

test('validateBrief accepts the stub brief, rejects vague or unranked blocks', () => {
  const good = stubBrief();
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
  const md = renderBrief({ brief: stubBrief(), row: cal, workflowId: 'wf-test' });
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
```

- [ ] **Step 2: Run tests** → FAIL.

- [ ] **Step 3: Add `buildBriefPrompt` to `prompts.mjs`**

```js
export function buildBriefPrompt({ scorecard, decoded, locale }) {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  const callSection = extractSection(runbook, '1. The confirmation call — 60–90 min, day 1 of the engagement window', 3);
  return `CALL-BRIEF-TASK
You are writing Simon's confirmation-call brief from a provisional STATE scorecard and the client's own intake answers. The call is never improvised: every block opens with a claim the client already made, and the block's only job is show-me — confirm it or break it, on a screen-share.

## The call structure this brief maps onto (from the diagnostic runbook — one block per pillar)
${callSection}

## Provisional scorecard (JSON — self-report only, confirms nothing)
${JSON.stringify(scorecard, null, 1)}

## The client's intake (decoded)
${decoded.transcriptText}

## Rules
- One block per pillar: structured, traceable, auditable, tolerant, explicit — mapping 1:1 onto the call blocks above.
- Every ask must be actionable on a screen-share: demand a specific thing on screen ("pull up", "show me", "open the code at"). Never "discuss their approach".
- rank 1 = the most optimistic claim; it gets the longest block on the call. The 2–3 most optimistic claims get the sharpest, most specific asks.
- confirms / breaks: the concrete on-screen observation that confirms the claim, and the one that breaks it.
- hardest_asks: the two asks most likely to be skipped under time pressure — one line each, as reminders.
- ${langLine(locale)}

Return ONLY a JSON object:
{"language":"${locale}","blocks":{"structured":{"rank":<1-5, unique across blocks>,"claim":"…","ask":"…","confirms":"…","breaks":"…"},"traceable":{…},"auditable":{…},"tolerant":{…},"explicit":{…}},"top_flags":["<at most 3 one-line optimism flags>"],"hardest_asks":["<exactly two>"]}`;
}
```

- [ ] **Step 4: Add `validateBrief` to `validate.mjs`**

```js
const FORBIDDEN_ASK = /\b(discuss|talk about|explore|tell me about your approach|discutez|parlez[- ]moi de)\b/i;
const VISIBLE_DEMAND = /\b(show|share|pull up|open|screen|run|point (me|at)|montre|affiche|partage|ouvre|exécute)\b/i;

export function validateBrief(obj, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (!obj.blocks || typeof obj.blocks !== 'object') throw new Error('blocks object required');
  const ranks = new Set();
  for (const key of PILLAR_KEYS) {
    const b = obj.blocks[key];
    if (!b) throw new Error(`missing block: ${key}`);
    for (const f of ['claim', 'ask', 'confirms', 'breaks']) {
      if (typeof b[f] !== 'string' || b[f].trim().length < 15) throw new Error(`${key}.${f} missing or too thin`);
    }
    if (FORBIDDEN_ASK.test(b.ask) || !VISIBLE_DEMAND.test(b.ask))
      throw new Error(`${key}.ask is not screen-share actionable — it must demand something visible on screen ("${b.ask.slice(0, 60)}…")`);
    if (!Number.isInteger(b.rank) || b.rank < 1 || b.rank > 5 || ranks.has(b.rank))
      throw new Error(`${key}.rank must be a unique integer 1–5`);
    ranks.add(b.rank);
  }
  if (!Array.isArray(obj.top_flags) || obj.top_flags.length > 3) throw new Error('top_flags must be an array of at most 3');
  if (!Array.isArray(obj.hardest_asks) || obj.hardest_asks.length !== 2) throw new Error('hardest_asks must list exactly 2');
}
```

- [ ] **Step 5: Create `lib/render.mjs`** with `renderBrief`

```js
export function renderBrief({ brief, row, workflowId }) {
  const order = Object.entries(brief.blocks).sort((a, b) => a[1].rank - b[1].rank);
  const lines = [
    `# Confirmation-Call Brief — ${row.system_name}`, '',
    '> Run the call FROM THIS BRIEF (diagnostic runbook block table). Blocks ordered most-optimistic first — rank 1 gets the longest block.',
    `> Intake row: ${row.id} · analyzer run ${workflowId}`, '',
    '**Top optimism flags:**',
    ...brief.top_flags.map(f => `- ${f}`), '',
    `**Do not skip under time pressure:** ${brief.hardest_asks.join(' · ')}`, '',
  ];
  for (const [key, b] of order) {
    lines.push(`## ${b.rank}. ${key.toUpperCase()} block`, '',
      `**The claim held:** ${b.claim}`, '',
      `**The show-me ask:** ${b.ask}`, '',
      `**Confirms it:** ${b.confirms}`, '',
      `**Breaks it:** ${b.breaks}`, '');
  }
  return lines.join('\n');
}
```

- [ ] **Step 6: Run tests** → PASS. **Step 7: Commit** — `git commit -m "feat(intake-analyzer): call-brief stage — show-me gate + rank-ordered renderer"`

---

### Task 5: Skeleton stage — prompt + validator

**Files:**
- Modify: `projects/Productize-Offer/tools/lib/prompts.mjs` (add `buildSkeletonPrompt`)
- Modify: `projects/Productize-Offer/tools/lib/validate.mjs` (add `validateSkeleton`)
- Modify: `projects/Productize-Offer/tools/test/analyzer.test.mjs`

**Interfaces:**
- Consumes: scorecard, decoded, row, locale; `MEMO_TEMPLATE_PATH` (Task 3).
- Produces: `buildSkeletonPrompt({scorecard, decoded, row, locale})` (marker `MEMO-SKELETON-TASK`); `validateSkeleton(obj, templateText, locale)`. Skeleton shape: `{language, markdown}`.

- [ ] **Step 1: Write failing tests**

```js
// append
import { buildSkeletonPrompt, MEMO_TEMPLATE_PATH } from '../lib/prompts.mjs';
import { validateSkeleton } from '../lib/validate.mjs';

const template = readFileSync(MEMO_TEMPLATE_PATH, 'utf8');

function stubSkeleton() {
  const r = spawnSync('node', [STUB], { input: 'MEMO-SKELETON-TASK', encoding: 'utf8' });
  return JSON.parse(JSON.parse(r.stdout).result);
}

test('validateSkeleton accepts stub, rejects invented placeholders and missing tags', () => {
  const good = stubSkeleton();
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
```

- [ ] **Step 2: Run tests** → FAIL.

- [ ] **Step 3: Add `buildSkeletonPrompt` to `prompts.mjs`**

```js
export function buildSkeletonPrompt({ scorecard, decoded, row, locale }) {
  const template = readFileSync(MEMO_TEMPLATE_PATH, 'utf8');
  const pendingCall = locale === 'fr' ? 'à confirmer sur l’appel' : 'pending call';
  return `MEMO-SKELETON-TASK
Pre-fill the findings-memo template below from a client intake and a provisional scorecard. This is Day-0 prep: fill ONLY what is knowable before the confirmation call, and append the literal tag [ANALYZER — re-judge] to every value you fill.

## Rules
- Fill: engagement facts (client, owner, workflow line), the workflow description, provisional pillar scores + anchor names + one-line rationale summaries, candidate named-risk sketches on page 3 (drawn only from intake answers), and page 5's confirmation-table rows for intake-only evidence (entry: "${pendingCall}").
- Leave untouched (as {PLACEHOLDER} tokens): anything only knowable at or after the call — dates, call timestamps, artifact counts, attendee names, quiz delta, first moves.
- NEVER invent a fact. Every filled claim must trace to an intake answer. When in doubt, leave the placeholder.
- Do not add placeholders that are not already in the template. Keep the template's structure, headings, comment blocks and order intact.
- ${langLine(locale)}

## Provisional scorecard (JSON)
${JSON.stringify(scorecard, null, 1)}

## Intake (decoded)
${decoded.transcriptText}

## Row facts
Client email: ${row.email} | Submitted: ${row.submitted_at ?? '(fixture)'} | Locale: ${locale}

## The template
${template}

Return ONLY a JSON object: {"language":"${locale}","markdown":"<the full pre-filled template as one markdown string>"}`;
}
```

- [ ] **Step 4: Add `validateSkeleton` to `validate.mjs`**

```js
export function validateSkeleton(obj, templateText, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (typeof obj.markdown !== 'string' || obj.markdown.trim().length < 500) throw new Error('markdown missing or implausibly short');
  const names = (t) => new Set([...t.matchAll(/\{([A-Z0-9_]+)/g)].map(m => m[1]));
  const allowed = names(templateText);
  for (const n of names(obj.markdown)) {
    if (!allowed.has(n)) throw new Error(`invented placeholder {${n}} — not in the template`);
  }
  if (!obj.markdown.includes('[ANALYZER — re-judge]'))
    throw new Error('no [ANALYZER — re-judge] tags — every filled value must be tagged for re-judgment');
  const pending = locale === 'fr' ? /à confirmer/i : /pending call/i;
  if (!pending.test(obj.markdown)) throw new Error('page-5 confirmation entries must be pre-populated as pending the call');
}
```

- [ ] **Step 5: Run tests** → PASS. **Step 6: Commit** — `git commit -m "feat(intake-analyzer): memo-skeleton stage — no-invention gate, re-judge tags"`

---

### Task 6: CLI orchestration + scorecard renderer + deliver + E2E stub tests

**Files:**
- Create: `projects/Productize-Offer/tools/intake-analyzer.mjs`
- Modify: `projects/Productize-Offer/tools/lib/render.mjs` (add `renderScorecard`)
- Modify: `projects/Productize-Offer/tools/test/analyzer.test.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: CLI `node intake-analyzer.mjs (--row <uuid> | --fixture <path>) [--out <dir>] [--no-db-log]`. Writes `provisional-scorecard.md`, `call-brief.md`, `memo-skeleton.md`, `run-state.json`. Exit 0 success / 1 stage failure / 2 usage. Supabase import is **lazy** (`await import`) so `--fixture --no-db-log` runs need no `.env`/`node_modules`.

- [ ] **Step 1: Write failing E2E tests**

```js
// append
import { existsSync } from 'node:fs';

function runCli(args, env = {}) {
  return spawnSync('node', [join(TOOLS, 'intake-analyzer.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, ANALYZER_CLAUDE_CMD: STUB, ...env },
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
  const state = JSON.parse(readFileSync(join(out, 'run-state.json'), 'utf8'));
  assert.equal(state.state.stage, 'done');
  assert.equal(state.state.entityType, 'intake');
  assert.ok(existsSync(join(out, 'run-state.json')));
});
```

- [ ] **Step 2: Run tests** → FAIL.

- [ ] **Step 3: Add `renderScorecard` to `render.mjs`**

```js
export function renderScorecard({ scorecard, row, decoded, workflowId }) {
  const lines = [
    `# Provisional STATE Scorecard — ${row.system_name}`, '',
    '> **PROVISIONAL — scored from self-report only; confirms nothing (rubric rule 3). For engagement prep, never client delivery.**',
    '>',
    `> Intake row: ${row.id} · submitted ${row.submitted_at ?? '(fixture)'} · locale ${row.locale} · analyzer run ${workflowId}`, '',
  ];
  for (const [key, p] of Object.entries(scorecard.pillars)) {
    const title = decoded.pillars.find(d => d.key === key)?.title ?? key;
    lines.push(`## ${title} — proposed ${p.level}/3 (${p.anchor}) · confidence ${p.confidence}`, '', p.rationale, '');
    for (const q of p.quotes) lines.push(`> "${q}"`);
    if (p.optimism_flags.length) {
      lines.push('', '**Optimism flags:**');
      for (const f of p.optimism_flags) lines.push(`- ${f.claim} — ${f.why}`);
    }
    lines.push('');
  }
  lines.push('---',
    `**Proposed total: ${scorecard.total}/15.** Provisional totals are not bands — bands are earned live. Every score above gets re-judged by hand against the anchors before it goes anywhere: the analyzer proposes, the auditor disposes.`);
  return lines.join('\n');
}
```

- [ ] **Step 4: Write `intake-analyzer.mjs`**

```js
#!/usr/bin/env node
/**
 * STATE Intake Analyzer — /readiness intake row → three Simon-only prep artifacts.
 * Spec: ../intake-analyzer-spec.md. STATE medium risk (S+T+E); no lock —
 * outputs are files, overwrite-on-rerun is the desired behaviour.
 *
 *   node intake-analyzer.mjs --row <uuid>            # live row (needs .env + node_modules)
 *   node intake-analyzer.mjs --fixture <path> [--no-db-log] [--out <dir>]
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { checkCompleteness, decodeIntake, loadMessages } from './lib/form-schema.mjs';
import { validatedLLMCall, StageError } from './lib/llm.mjs';
import { buildScorePrompt, buildBriefPrompt, buildSkeletonPrompt, MEMO_TEMPLATE_PATH } from './lib/prompts.mjs';
import { validateScore, validateBrief, validateSkeleton, PILLAR_KEYS } from './lib/validate.mjs';
import { renderScorecard, renderBrief } from './lib/render.mjs';

const SUPABASE_MJS = '../../Content-Engine/tools/supabase.mjs';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? null : (args[i + 1] ?? null); };
const rowId = flag('--row');
const fixturePath = flag('--fixture');
const outFlag = flag('--out');
const noDbLog = args.includes('--no-db-log');
if (!!rowId === !!fixturePath) {
  console.error('usage: node intake-analyzer.mjs (--row <uuid> | --fixture <path>) [--out <dir>] [--no-db-log]');
  process.exit(2);
}

// S — Structured: one state object per run, stage always current.
const state = {
  workflowId: randomUUID(),
  stage: 'init',
  entityType: 'intake',
  entityId: rowId ?? null,
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};

// T — Traceable: pipeline.logs via Content-Engine logEntry (lazy import so
// fixture+--no-db-log runs need no .env/node_modules).
let _logEntry = null;
async function log(fields) {
  const entry = { workflow_id: state.workflowId, entity_id: state.entityId, stage: state.stage, ...fields };
  if (noDbLog) { console.error(`[log] ${entry.step_name} ${entry.status} — ${entry.output_summary ?? ''}`); return; }
  if (!_logEntry) ({ logEntry: _logEntry } = await import(SUPABASE_MJS));
  await _logEntry(entry);
}
async function setStage(stage) {
  state.stage = stage;
  state.lastUpdatedAt = new Date().toISOString();
  await log({ step_name: 'stage_transition', status: 'success', output_summary: `→ ${stage}` });
}

try {
  // 1 — fetch
  await setStage('fetch');
  let row;
  if (fixturePath) {
    row = JSON.parse(readFileSync(fixturePath, 'utf8'));
  } else {
    const { db } = await import(SUPABASE_MJS);
    const { data, error } = await db.schema('public').from('state_readiness_diagnostic')
      .select('*').eq('id', rowId).maybeSingle();
    if (error) throw new StageError(`fetch failed: ${error.message}`);
    if (!data) throw new StageError(`no intake row with id ${rowId}`);
    row = data;
  }
  state.entityId = row.id ?? state.entityId;
  const missing = checkCompleteness(row);
  if (missing.length) {
    throw new StageError(`intake incomplete — missing/invalid: ${missing.join(', ')} — never analyze a partial intake silently`);
  }
  const locale = row.locale;
  const decoded = decodeIntake(row, loadMessages(locale));
  await log({ step_name: 'fetch_complete', status: 'success', output_summary: `row ${row.id} (${locale}) decoded, ${decoded.transcriptText.length} chars` });

  // 2 — score (one gated LLM call per pillar)
  await setStage('score');
  const pillars = {};
  for (const key of PILLAR_KEYS) {
    pillars[key] = await validatedLLMCall({
      prompt: buildScorePrompt({ pillarKey: key, decoded, locale }),
      validate: (o) => validateScore(o, decoded.transcriptText, locale),
      stepName: `score_${key}`, log,
    });
  }
  const scorecard = { pillars, total: PILLAR_KEYS.reduce((s, k) => s + pillars[k].level, 0) };

  // 3 — brief
  await setStage('brief');
  const brief = await validatedLLMCall({
    prompt: buildBriefPrompt({ scorecard, decoded, locale }),
    validate: (o) => validateBrief(o, locale),
    stepName: 'brief', log,
  });

  // 4 — skeleton
  await setStage('skeleton');
  const template = readFileSync(MEMO_TEMPLATE_PATH, 'utf8');
  const skeleton = await validatedLLMCall({
    prompt: buildSkeletonPrompt({ scorecard, decoded, row, locale }),
    validate: (o) => validateSkeleton(o, template, locale),
    stepName: 'skeleton', log,
  });

  // 5 — deliver (artifacts stay OUT of the repo; overwrite-on-rerun)
  await setStage('deliver');
  const slug = (row.system_name ?? 'intake').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  const outDir = outFlag
    ?? join(process.env.ENGAGEMENTS_DIR ?? join(homedir(), 'engagements'), `${slug}-${String(row.id ?? 'fixture').slice(0, 8)}`);
  mkdirSync(outDir, { recursive: true });
  const files = {
    'provisional-scorecard.md': renderScorecard({ scorecard, row, decoded, workflowId: state.workflowId }),
    'call-brief.md': renderBrief({ brief, row, workflowId: state.workflowId }),
    'memo-skeleton.md': skeleton.markdown,
  };
  for (const [name, content] of Object.entries(files)) {
    const p = join(outDir, name);
    writeFileSync(p, content);
    if (statSync(p).size === 0) throw new StageError(`delivered file is empty: ${name}`);
  }
  state.stage = 'done';
  state.lastUpdatedAt = new Date().toISOString();
  writeFileSync(join(outDir, 'run-state.json'), JSON.stringify({ state, scorecard }, null, 2));
  await log({ step_name: 'run_summary', status: 'success', output_summary: `provisional total ${scorecard.total}/15; artifacts in ${outDir}` });
  console.log(`✔ intake-analyzer — 3 artifacts written to ${outDir}`);
  console.log(`  provisional total: ${scorecard.total}/15 — PROVISIONAL; re-judge every score against the anchors before it goes anywhere`);
} catch (err) {
  const msg = err instanceof StageError ? err.message : (err?.stack ?? String(err));
  try { await log({ step_name: 'run_failed', status: 'error', output_summary: String(msg).slice(0, 500) }); } catch { /* logging must not mask the failure */ }
  console.error(`❌ intake-analyzer failed at ${state.stage} — ${msg} — safe to retry (outputs overwrite on rerun)`);
  process.exit(1);
}
```

- [ ] **Step 5: Run full suite** — `node --test test/` → ALL PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(intake-analyzer): CLI orchestration, deliver stage, E2E stub tests"`

---

### Task 7: Live acceptance + docs

**Files:**
- Modify: `projects/Productize-Offer/intake-analyzer-spec.md:4` (status line)
- Modify: `projects/Productize-Offer/diagnostic/diagnostic-runbook.md:81` (Day 0 — add the exact run command)

- [ ] **Step 1: Wire worktree for DB access** (gitignored files, safe):
```bash
cd <worktree-root>
ln -sfn /home/diamond/projects/MetaArchitect/node_modules node_modules
ln -sfn /home/diamond/projects/MetaArchitect/.env .env
```

- [ ] **Step 2: Live calibration run** (real `claude -p`, DB logging ON — exercises T):
```bash
node projects/Productize-Offer/tools/intake-analyzer.mjs \
  --fixture projects/Productize-Offer/tools/fixtures/calibration-intake.json \
  --out <scratchpad>/cal-run
```
Expected: exit 0, three artifacts + run-state.json. **Acceptance: proposed scores within ±1 of S1 T2 A1 Tol1 E2 on ≥4 of 5 pillars** (proves the rubric prompt is faithful, not that self-report is trusted).

- [ ] **Step 3: Over-confident run** — same command with `overconfident-intake.json`, `--out <scratchpad>/oc-run`. **Acceptance: optimism flags on ≥2 pillars** (structured/tolerant/explicit are the planted tells: scale 5s + ad-hoc narratives).

- [ ] **Step 4: FR smoke** — copy calibration fixture to scratchpad with `"locale": "fr"`, run it. Acceptance: scorecard rationale/brief prose in French; anchors still `Absent/Ad-hoc/…` in English.

- [ ] **Step 5: Verify T** — query `pipeline.logs` for the calibration run's `workflow_id`: stage transitions + one row per LLM attempt + `run_summary` present, `model_version` populated.

- [ ] **Step 6: S+T+E checklist against the spec** (state object ✔, stage transitions logged ✔, LLM calls logged ✔, gates per stage ✔, error format ✔, artifacts non-empty + language ✔, no repo artifacts ✔).

- [ ] **Step 7: Docs** — spec line 4: `> Status: BUILT 2026-07-17 — tools/intake-analyzer.mjs (this folder). Run: node projects/Productize-Offer/tools/intake-analyzer.mjs --row <uuid>`; runbook Day-0 first bullet: append the same command after "run the analyzer".

- [ ] **Step 8: Final commit** — `git add -A && git commit -m "feat(intake-analyzer): live acceptance passed; docs point at the built tool"`

---

## Self-Review (done at plan time)

- **Spec coverage**: fetch gate (Task 1/6), score + optimism flags + schema gate + retry (2/3), brief with 1:1 block mapping + actionable-ask gate (4), skeleton no-invention gate + re-judge tags (5), deliver + logs + error format (6), acceptance incl. forced-invalid path, calibration ±1, over-confident flags, EN/FR (6/7). Out-of-scope items (client-facing output, auto-scoring, self-serve product, form changes) — not built, by design. "skill-lint if shipped as a skill" — shipped as a CLI, not a skill; N/A.
- **Type consistency**: score obj keys (`level/anchor/rationale/quotes/confidence/optimism_flags`), brief keys (`blocks/<pillar>/{rank,claim,ask,confirms,breaks}`, `top_flags`, `hardest_asks`), skeleton (`language/markdown`) used identically across prompts, validators, stub, renderers, and tests. Stub score total = 5×1 = 5/15 matches the Task 6 assertion.
- **Placeholder scan**: all code complete; no TBDs.
