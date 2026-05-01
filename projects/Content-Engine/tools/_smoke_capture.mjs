#!/usr/bin/env node
/**
 * Smoke test for /capture's data path against pipeline.* on Supabase.
 * Mimics the createRecord → patchRecord → logEntry flow without making any LLM calls.
 *
 * Usage:  node tools/_smoke_capture.mjs
 * Exit:   0 = pass, 1 = fail
 */

import { randomUUID } from 'node:crypto';
import { createRecord, patchRecord, getRecord, logEntry, db, TABLES } from './supabase.mjs';

const wf = `smoke-capture-${Date.now()}`;
let entityId = null;
let logIds = [];
let pass = true;
const fail = (msg) => { console.error(`✗ ${msg}`); pass = false; };
const ok   = (msg) => console.log(`✓ ${msg}`);

try {
  // Step 3 — create draft row
  const draft = await createRecord(TABLES.IDEAS, {
    topic:       'Processing...',
    status:      'New',
    workflow_id: wf,
    source_type: 'text',
    raw_input:   'smoke test raw input',
  }, ['id', 'topic', 'status', 'workflow_id']);
  entityId = draft.id;
  if (!entityId) fail('createRecord returned no id');
  if (draft.topic !== 'Processing...') fail(`draft.topic mismatch: ${draft.topic}`);
  if (draft.status !== 'New')          fail(`draft.status mismatch: ${draft.status}`);
  ok(`Step 3: draft idea created id=${entityId.slice(0,8)}…`);

  // Steps 5/6 — log entries (mimic strategist + scorer)
  const l1 = await logEntry({
    workflow_id: wf, entity_id: entityId,
    step_name: 'brand_strategist', stage: 'refined',
    output_summary: 'smoke: strategist complete',
    model_version: 'claude-sonnet-4-6', status: 'success',
  });
  logIds.push(l1.id);
  const l2 = await logEntry({
    workflow_id: wf, entity_id: entityId,
    step_name: 'brand_scorer', stage: 'scored',
    output_summary: 'smoke: scorer overall=8.2',
    model_version: 'claude-sonnet-4-6', status: 'success',
  });
  logIds.push(l2.id);
  ok(`Steps 5–6: 2 log entries written`);

  // Step 6.5 — research log entries
  for (const step of ['nlm_research_start','nlm_research_import','nlm_angle_query','uif_compiler']) {
    const l = await logEntry({
      workflow_id: wf, entity_id: entityId,
      step_name: step, stage: 'deep_research',
      output_summary: `smoke: ${step}`,
      model_version: 'notebooklm-deep', status: 'success',
    });
    logIds.push(l.id);
  }
  ok(`Step 6.5: 4 deep-research log entries written`);

  // Step 7 — final write with all the snake_case fields /capture sets
  await patchRecord(TABLES.IDEAS, entityId, {
    topic: 'Smoke Test — State Beats Intelligence in CI Pipelines',
    status: 'New',
    intent: 'authority',
    content_brief: JSON.stringify({ working_title: 'Smoke', topic: 'smoke', core_angle: 'smoke' }),
    score_brand_fit: 9, score_originality: 8, score_monetization: 7,
    score_production_effort: 4, score_virality: 7, score_authority: 9,
    score_overall: 7.8,
    score_rationales: JSON.stringify({ brand_fit: 'aligned' }),
    recommended_next_action: 'smoke: schedule next week',
    intelligence_file: JSON.stringify({ angles: [], facts: [] }),
    notebook_id: 'nb-smoke-' + randomUUID().slice(0,8),
    research_depth: 'deep',
    captured_at: new Date().toISOString(),
  });

  // Verify the patch landed correctly
  const reread = await getRecord(TABLES.IDEAS, entityId, [
    'topic','status','intent','score_overall','intelligence_file','notebook_id','research_depth','captured_at'
  ]);
  if (reread.topic !== 'Smoke Test — State Beats Intelligence in CI Pipelines') fail(`topic mismatch: ${reread.topic}`);
  if (reread.intent !== 'authority')      fail(`intent mismatch: ${reread.intent}`);
  if (Number(reread.score_overall) !== 7.8) fail(`score_overall mismatch: ${reread.score_overall}`);
  if (reread.research_depth !== 'deep')   fail(`research_depth mismatch`);
  if (!reread.notebook_id?.startsWith('nb-smoke-')) fail(`notebook_id mismatch: ${reread.notebook_id}`);
  if (!reread.intelligence_file?.includes('"angles"')) fail(`intelligence_file roundtrip lost JSON`);
  ok(`Step 7: final patch written + read back`);

  // Verify all 6 logs are queryable by workflow_id
  const { data: logs, error: lerr } = await db.from('logs').select('id, step_name, status').eq('workflow_id', wf);
  if (lerr) fail(`log query: ${lerr.message}`);
  else if (logs.length !== 6) fail(`expected 6 logs for workflow ${wf}, got ${logs.length}`);
  else ok(`All 6 log entries queryable by workflow_id`);

} finally {
  // Cleanup
  if (logIds.length) await db.from('logs').delete().in('id', logIds);
  if (entityId)      await db.from('ideas').delete().eq('id', entityId);
  console.log('--- cleanup: test row + logs deleted ---');
}

if (!pass) { console.error('\nSMOKE TEST FAILED'); process.exit(1); }
console.log('\n/capture data path: PASS');
