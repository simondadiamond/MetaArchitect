/**
 * research-complete.mjs — Writes research results to pipeline DB.
 *
 * Reads JSON payload from stdin:
 * {
 *   workflowId: string,
 *   stubs: [{
 *     stubId: string,          // pipeline.posts UUID
 *     ideaId: string,          // pipeline.ideas UUID
 *     notebookId: string,      // NLM notebook_id
 *     uif: object,             // updated UIF v3.0
 *     hooks: [{                // extracted hooks to write
 *       hook_text, hook_type, angle_name, intent
 *     }]
 *   }]
 * }
 *
 * Usage:
 *   echo '<json>' | node tools/research-complete.mjs
 *   cat payload.json | node tools/research-complete.mjs
 */

import { readFileSync } from 'node:fs';
import { patchRecord, createRecord, logEntry, TABLES } from './supabase.mjs';

const raw = readFileSync('/dev/stdin', 'utf8').trim();
const { workflowId, stubs } = JSON.parse(raw);

if (!workflowId) throw new Error('workflowId required');
if (!Array.isArray(stubs) || stubs.length === 0) throw new Error('stubs array required');

function validateUIF(uif) {
  const errors = [];
  if (!uif?.meta?.topic) errors.push('meta.topic missing');
  if (!uif?.meta?.research_date) errors.push('meta.research_date missing');
  if (!uif?.meta?.provenance_log) errors.push('meta.provenance_log missing');
  const facts = uif?.core_knowledge?.facts ?? [];
  if (!Array.isArray(facts) || facts.length < 1) errors.push('core_knowledge.facts min 1 item');
  for (const f of facts) {
    if (!f.statement || !f.source_url) errors.push('fact missing statement or source_url');
  }
  const angles = uif?.angles ?? [];
  if (!Array.isArray(angles) || angles.length < 1) errors.push('angles min 1 item');
  for (const a of angles) {
    if (!a.angle_name || !a.contrarian_take) errors.push('angle missing angle_name or contrarian_take');
    const max = facts.length - 1;
    for (const idx of a.supporting_facts ?? []) {
      if (idx < 0 || idx > max) errors.push(`angle "${a.angle_name}" supporting_facts[${idx}] out of bounds (max ${max})`);
    }
  }
  if (!Array.isArray(uif?.humanity_snippets)) errors.push('humanity_snippets must be array');
  return { valid: errors.length === 0, errors };
}

const now = new Date().toISOString();

for (const stub of stubs) {
  const { stubId, ideaId, notebookId, uif, hooks = [] } = stub;
  if (!stubId || !ideaId || !uif) throw new Error(`stub missing stubId, ideaId, or uif: ${JSON.stringify(stub).slice(0, 80)}`);

  const check = validateUIF(uif);
  if (!check.valid) {
    console.error(`❌ UIF validation failed for stub ${stubId}: ${check.errors.join('; ')}`);
    process.exit(1);
  }

  await Promise.all([
    patchRecord(TABLES.IDEAS, ideaId, {
      intelligence_file: JSON.stringify(uif),
      research_depth: 'deep',
      research_completed_at: now,
      status: 'Ready',
    }),
    patchRecord(TABLES.POSTS, stubId, {
      status: 'research_ready',
      research_started_at: null,
      research_completed_at: now,
    }),
  ]);

  for (const h of hooks) {
    await createRecord(TABLES.HOOKS, {
      hook_text: h.hook_text,
      hook_type: h.hook_type,
      source_idea_id: ideaId,
      angle_name: h.angle_name,
      intent: h.intent ?? 'authority',
      status: 'candidate',
    }, ['id']);
  }

  const totalFacts = uif.core_knowledge.facts.length;
  await logEntry({
    workflow_id: workflowId,
    entity_id: stubId,
    step_name: 'complete',
    stage: 'complete',
    timestamp: now,
    output_summary: `Research complete via research-complete.mjs — ${totalFacts} facts | ${hooks.length} hooks | notebook: ${notebookId ?? 'n/a'}`,
    model_version: 'n/a',
    status: 'success',
  });

  console.log(`✅ ${stubId} → research_ready (${totalFacts} facts, ${hooks.length} hooks)`);
}

console.log(`Done. ${stubs.length} stub(s) written.`);
