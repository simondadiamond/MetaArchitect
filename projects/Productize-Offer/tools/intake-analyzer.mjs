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
