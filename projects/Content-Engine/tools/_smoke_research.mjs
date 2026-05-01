#!/usr/bin/env node
/**
 * Smoke test for /research's data path against pipeline.* on Supabase.
 * Mimics: load idea + UIF → set lock → log NLM steps → write deepened UIF
 * → create hooks → clear status. No LLM/NLM calls.
 *
 * Usage: node tools/_smoke_research.mjs
 * Exit:  0 = pass, 1 = fail
 */

import {
  getRecords, getRecord, createRecord, patchRecord,
  logEntry, setLock, clearLock, db, TABLES,
} from './supabase.mjs';

const wf = `smoke-research-${Date.now()}`;
let ideaId = null, postId = null, hookIds = [], logIds = [];
let pass = true;
const fail = (msg) => { console.error(`✗ ${msg}`); pass = false; };
const ok   = (msg) => console.log(`✓ ${msg}`);

try {
  // ── Setup: create one idea + one post stub linked to it ───────────────────
  const seedUIF = {
    angles: [
      { angle_name: 'smoke-angle-A', contrarian_take: 'state beats intelligence' },
      { angle_name: 'smoke-angle-B', contrarian_take: 'observability beats heroics' },
    ],
    core_knowledge: { facts: [{ statement: 'seed fact' }] },
    meta: { provenance_log: 'smoke:seed' },
  };
  const idea = await createRecord(TABLES.IDEAS, {
    topic:             'Smoke /research target',
    status:            'Selected',
    intelligence_file: JSON.stringify(seedUIF),
    content_brief:     JSON.stringify({ topic: 'smoke', core_angle: 'smoke' }),
    intent:            'authority',
    notebook_id:       'nb-smoke-existing',  // forces FAST PATH
    workflow_id:       wf,
  }, ['id']);
  ideaId = idea.id;
  ok(`Setup: idea created id=${ideaId.slice(0,8)}…`);

  const post = await createRecord(TABLES.POSTS, {
    format:        'longform',
    status:        'planned',
    idea_id:       ideaId,
    angle_index:   1,                     // target second angle
    planned_week:  '2026-W18',
    planned_order: 1,
  }, ['id']);
  postId = post.id;
  ok(`Setup: post stub created id=${postId.slice(0,8)}… angle_index=1`);

  // ── Step 2: find target post stub by filter ───────────────────────────────
  const candidates = await getRecords(TABLES.POSTS,
    { status: 'planned', research_started_at: null },
    { fields: ['id','status','idea_id','angle_index','planned_week'], limit: 50 });
  const found = candidates.find(p => p.id === postId);
  if (!found) fail(`step 2: query did not return our planned/unlocked post`);
  else ok(`Step 2: planned/unlocked filter returned our stub (${candidates.length} total candidates)`);

  // ── Step 3: load idea + UIF ───────────────────────────────────────────────
  const ideaRead = await getRecord(TABLES.IDEAS, ideaId,
    ['id','topic','intelligence_file','content_brief','intent','notebook_id']);
  if (!ideaRead) fail('step 3: idea not found by uuid');
  if (!ideaRead.intelligence_file?.includes('smoke-angle-B')) fail('step 3: intelligence_file roundtrip failed');
  const parsedUIF = JSON.parse(ideaRead.intelligence_file);
  const targetAngle = parsedUIF.angles[found?.angle_index ?? 0];
  if (targetAngle.angle_name !== 'smoke-angle-B') fail(`step 3: targetAngle mismatch: ${targetAngle.angle_name}`);
  else ok(`Step 3: idea + UIF loaded; targetAngle = ${targetAngle.angle_name}`);

  // ── Step 4: setLock ───────────────────────────────────────────────────────
  const locked = await setLock(TABLES.POSTS, postId, 'research_started_at', 'researching');
  if (locked.status !== 'researching') fail(`step 4: status should be researching, got ${locked.status}`);
  if (!locked.research_started_at)     fail('step 4: research_started_at not set');
  else ok(`Step 4: lock set; status=researching`);
  logIds.push((await logEntry({
    workflow_id: wf, entity_id: postId,
    step_name: 'lock', stage: 'locking',
    output_summary: `smoke lock for ${postId.slice(0,8)}`, status: 'success',
  })).id);

  // ── Step 6 (fast path): one notebook_query log ────────────────────────────
  logIds.push((await logEntry({
    workflow_id: wf, entity_id: postId,
    step_name: 'nlm_angle_query', stage: 'nlm_angle_query',
    output_summary: 'smoke fast-path query', model_version: 'notebooklm-deep', status: 'success',
  })).id);
  ok(`Step 6 (fast path): nlm_angle_query log written`);

  // ── Step 9: write deepened UIF + flip statuses ────────────────────────────
  const updatedUIF = JSON.parse(JSON.stringify(parsedUIF));
  updatedUIF.core_knowledge.facts.push({ statement: 'deepened fact 1' });
  updatedUIF.core_knowledge.facts.push({ statement: 'deepened fact 2' });
  updatedUIF.angles[1].supporting_facts = [1, 2];
  updatedUIF.meta.provenance_log = `${parsedUIF.meta.provenance_log},nlm:nb-smoke-existing`;

  await patchRecord(TABLES.IDEAS, ideaId, {
    intelligence_file:     JSON.stringify(updatedUIF),
    research_depth:        'deep',
    research_completed_at: new Date().toISOString(),
    status:                'Ready',
  });
  await patchRecord(TABLES.POSTS, postId, {
    status:                'research_ready',
    research_completed_at: new Date().toISOString(),
  });

  const ideaCheck = await getRecord(TABLES.IDEAS, ideaId, ['status','research_depth','intelligence_file']);
  if (ideaCheck.status !== 'Ready')        fail(`step 9: idea.status mismatch: ${ideaCheck.status}`);
  if (ideaCheck.research_depth !== 'deep') fail(`step 9: research_depth mismatch`);
  if (!JSON.parse(ideaCheck.intelligence_file).core_knowledge.facts.find(f => f.statement === 'deepened fact 2'))
    fail('step 9: deepened UIF not persisted');

  const postCheck = await getRecord(TABLES.POSTS, postId, ['status','research_completed_at']);
  if (postCheck.status !== 'research_ready') fail(`step 9: post.status mismatch: ${postCheck.status}`);
  if (!postCheck.research_completed_at)      fail('step 9: research_completed_at not set');
  else ok(`Step 9: deepened UIF written; idea Ready, post research_ready`);

  // ── Step 10: hooks_library writes with FK to ideas ────────────────────────
  for (const hook_text of ['smoke hook A', 'smoke hook B']) {
    const h = await createRecord(TABLES.HOOKS, {
      hook_text,
      hook_type: 'contrarian',
      source_idea_id: ideaId,
      angle_name: targetAngle.angle_name,
      intent: 'authority',
      status: 'candidate',
    }, ['id','source_idea_id']);
    if (h.source_idea_id !== ideaId) fail(`step 10: FK mismatch on hook`);
    hookIds.push(h.id);
  }
  if (hookIds.length === 2) ok(`Step 10: 2 hooks created with source_idea_id FK`);

  // ── Error path: clearLock ─────────────────────────────────────────────────
  // We're past step 9 (post is research_ready), but exercise clearLock against a fresh stub
  // to confirm the helper actually flips fields back.
  const tmpPost = await createRecord(TABLES.POSTS, { status: 'researching', research_started_at: new Date().toISOString(), idea_id: ideaId }, ['id']);
  await clearLock(TABLES.POSTS, tmpPost.id, 'research_started_at', 'planned');
  const cleared = await getRecord(TABLES.POSTS, tmpPost.id, ['status','research_started_at']);
  if (cleared.status !== 'planned')         fail(`error path: clearLock didn't revert status`);
  if (cleared.research_started_at !== null) fail(`error path: clearLock didn't null lock`);
  else ok(`Error path: clearLock reverts status + nulls lock`);
  await db.from('posts').delete().eq('id', tmpPost.id);

  // ── Final: query logs by workflow_id ──────────────────────────────────────
  const { data: logs } = await db.from('logs').select('id, step_name').eq('workflow_id', wf);
  if (logs.length !== logIds.length) fail(`expected ${logIds.length} logs, got ${logs.length}`);
  else ok(`All ${logs.length} log entries queryable by workflow_id`);

} finally {
  if (hookIds.length) await db.from('hooks_library').delete().in('id', hookIds);
  if (logIds.length)  await db.from('logs').delete().in('id', logIds);
  if (postId)         await db.from('posts').delete().eq('id', postId);
  if (ideaId)         await db.from('ideas').delete().eq('id', ideaId);
  console.log('--- cleanup: idea, post, hooks, logs deleted ---');
}

if (!pass) { console.error('\nSMOKE TEST FAILED'); process.exit(1); }
console.log('\n/research data path: PASS');
