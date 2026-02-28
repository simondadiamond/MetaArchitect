/**
 * /research pipeline — split execution
 *
 * Usage:
 *   node .tmp_research.mjs phase1          — load context, lock record, output for Claude
 *   node .tmp_research.mjs phase2          — run Perplexity with queries from .research_queries.json
 *   node .tmp_research.mjs phase3          — validate UIF from .research_uif.json, write to Airtable
 *   node .tmp_research.mjs phase4          — write hooks from .research_hooks.json to hooks_library
 *   node .tmp_research.mjs unlock          — clear lock (error recovery)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomUUID } from 'crypto';

// Load .env
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const PAT = process.env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID;
const IDEAS_TABLE = process.env.AIRTABLE_TABLE_IDEAS;
const LOGS_TABLE = process.env.AIRTABLE_TABLE_LOGS;
const BRAND_TABLE = process.env.AIRTABLE_TABLE_BRAND;
const HOOKS_TABLE = process.env.AIRTABLE_TABLE_HOOKS;
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;

if (!PAT || !BASE) throw new Error('Missing AIRTABLE_PAT or AIRTABLE_BASE_ID in .env');

const AT_HEADERS = {
  'Authorization': `Bearer ${PAT}`,
  'Content-Type': 'application/json'
};

async function createRecord(tableId, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}`, {
    method: 'POST', headers: AT_HEADERS, body: JSON.stringify({ fields })
  });
  return res.json();
}

async function patchRecord(tableId, recordId, fields) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}/${recordId}`, {
    method: 'PATCH', headers: AT_HEADERS, body: JSON.stringify({ fields })
  });
  return res.json();
}

async function getRecords(tableId, formula, sort = []) {
  const params = new URLSearchParams();
  if (formula) params.append('filterByFormula', formula);
  sort.forEach((s, i) => {
    params.append(`sort[${i}][field]`, s.field);
    params.append(`sort[${i}][direction]`, s.direction || 'asc');
  });
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}?${params}`, {
    headers: { 'Authorization': `Bearer ${PAT}` }
  });
  return (await res.json()).records || [];
}

// ─── UIF VALIDATION ───────────────────────────────────────────────────────────
function validateUIF(json) {
  const errors = [];
  if (!json.meta) errors.push("Missing: meta");
  if (!json.core_knowledge) errors.push("Missing: core_knowledge");
  if (!Array.isArray(json.angles)) errors.push("Missing or invalid: angles");

  if (json.meta) {
    if (!json.meta.topic?.trim()) errors.push("meta.topic is empty");
    if (!json.meta.research_date?.trim()) errors.push("meta.research_date is empty");
    if (!json.meta.provenance_log?.trim()) errors.push("meta.provenance_log is empty");
  }
  if (json.core_knowledge) {
    if (!Array.isArray(json.core_knowledge.facts) || json.core_knowledge.facts.length < 1)
      errors.push("core_knowledge.facts must be array with min 1 item");
    else json.core_knowledge.facts.forEach((f, i) => {
      if (!f.statement?.trim()) errors.push(`facts[${i}].statement is empty`);
      if (!f.source_url?.trim()) errors.push(`facts[${i}].source_url is empty`);
    });
  }
  if (Array.isArray(json.angles)) {
    if (json.angles.length < 1) errors.push("angles must have at least 1 item");
    json.angles.forEach((a, i) => {
      if (!a.angle_name?.trim()) errors.push(`angles[${i}].angle_name is empty`);
      if (!a.contrarian_take?.trim()) errors.push(`angles[${i}].contrarian_take is empty`);
      if (Array.isArray(a.supporting_facts) && json.core_knowledge?.facts) {
        const maxIdx = json.core_knowledge.facts.length - 1;
        a.supporting_facts.forEach((idx, j) => {
          if (!Number.isInteger(idx)) errors.push(`angles[${i}].supporting_facts[${j}] not integer`);
          else if (idx < 0 || idx > maxIdx) errors.push(`angles[${i}].supporting_facts[${j}]=${idx} out of bounds (max ${maxIdx})`);
        });
      }
    });
  }
  if (json.distribution_formats) {
    const df = json.distribution_formats;
    if (df.linkedin_post && !Array.isArray(df.linkedin_post)) errors.push("linkedin_post must be array");
    if (Array.isArray(df.linkedin_post)) df.linkedin_post.forEach((item, i) => {
      if (typeof item !== "string") errors.push(`linkedin_post[${i}] must be string`);
    });
    if (df.twitter_thread && !Array.isArray(df.twitter_thread)) errors.push("twitter_thread must be array");
    if (Array.isArray(df.twitter_thread)) df.twitter_thread.forEach((item, i) => {
      if (typeof item !== "string") errors.push(`twitter_thread[${i}] must be string`);
      else if (item.length > 280) errors.push(`twitter_thread[${i}] exceeds 280 chars`);
    });
    if (df.youtube_angle && typeof df.youtube_angle !== "string") errors.push("youtube_angle must be string");
  }
  return { valid: errors.length === 0, errors };
}

// ─── PHASE 1: Load context, lock record, output everything Claude needs ───────
async function phase1() {
  console.log('[PHASE 1] Loading context...\n');

  const brands = await getRecords(BRAND_TABLE, `{name} = "metaArchitect"`);
  const brand = brands[0];
  if (!brand) throw new Error("Brand record not found");

  // Find the captured idea (Proposed status = pending_selection equivalent)
  const ideas = await getRecords(IDEAS_TABLE, `{Topic} = "I Didn't Know What I Wanted to Build — So I Asked an AI What Question I Should Be Asking"`);
  if (!ideas.length) throw new Error("Idea not found");
  const idea = ideas[0];

  if (idea.fields?.research_started_at) {
    console.log(`⚠ Already locked at ${idea.fields.research_started_at}. Unlock with: node .tmp_research.mjs unlock`);
    process.exit(0);
  }

  const contentBrief = idea.fields?.content_brief ? JSON.parse(idea.fields.content_brief) : null;
  if (!contentBrief) throw new Error("content_brief is null");

  // Lock
  const workflowId = randomUUID();
  await patchRecord(IDEAS_TABLE, idea.id, {
    research_started_at: new Date().toISOString(),
    Status: 'Researching'
  });
  await createRecord(LOGS_TABLE, {
    workflow_id: workflowId,
    entity_id: idea.id,
    step_name: 'lock',
    stage: 'locking',
    timestamp: new Date().toISOString(),
    output_summary: `Research locked for: ${idea.fields?.Topic}`,
    model_version: 'n/a',
    status: 'success'
  });

  // Save state for subsequent phases
  const ctx = { workflowId, ideaId: idea.id, contentBrief };
  writeFileSync('.research_ctx.json', JSON.stringify(ctx, null, 2));

  console.log('✅ Locked. Record ID:', idea.id);
  console.log('   Workflow ID:', workflowId);
  console.log('\n=== BRAND CONTEXT ===');
  console.log('main_guidelines:', brand.fields?.main_guidelines);
  console.log('\ngoals:', brand.fields?.goals);
  console.log('\nicp_short:', brand.fields?.icp_short);
  console.log('\n=== CONTENT BRIEF ===');
  console.log(JSON.stringify(contentBrief, null, 2));
  console.log('\n→ Claude: generate 3 queries and save to .research_queries.json, then run phase2');
}

// ─── PHASE 2: Run Perplexity with queries Claude generated ───────────────────
async function phase2() {
  console.log('[PHASE 2] Running Perplexity...\n');

  if (!existsSync('.research_queries.json')) throw new Error("Missing .research_queries.json — run phase1 first and have Claude generate queries");
  if (!existsSync('.research_ctx.json')) throw new Error("Missing .research_ctx.json — run phase1 first");

  const { workflowId, ideaId } = JSON.parse(readFileSync('.research_ctx.json', 'utf8'));
  const { queries } = JSON.parse(readFileSync('.research_queries.json', 'utf8'));

  if (!queries || queries.length !== 3) throw new Error("queries must be array of 3 items");
  if (!PERPLEXITY_KEY) throw new Error("PERPLEXITY_API_KEY not set");

  const results = [];
  const logIds = [];

  for (let i = 0; i < 3; i++) {
    const q = queries[i];
    console.log(`[Q${i+1}] ${q.query}`);

    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "user", content: q.query }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(`Perplexity Q${i+1}: ${JSON.stringify(data.error)}`);

    const content = data.choices?.[0]?.message?.content ?? "";
    const citations = data.citations ?? [];
    results.push({ query: q.query, intent: q.intent, content, citations });

    const log = await createRecord(LOGS_TABLE, {
      workflow_id: workflowId,
      entity_id: ideaId,
      step_name: `perplexity_q${i+1}`,
      stage: 'researching',
      timestamp: new Date().toISOString(),
      output_summary: `Q${i+1}: ${content.slice(0, 200)}... Citations: ${citations.length}`,
      model_version: 'sonar-pro',
      status: 'success'
    });
    logIds.push(log.id);
    console.log(`   ✅ ${citations.length} citations`);
  }

  writeFileSync('.research_results.json', JSON.stringify({ results, logIds }, null, 2));
  console.log('\n✅ All 3 Perplexity calls complete. Results in .research_results.json');
  console.log('→ Claude: compile UIF and save to .research_uif.json, then run phase3');
}

// ─── PHASE 3: Validate UIF, write to Airtable ────────────────────────────────
async function phase3() {
  console.log('[PHASE 3] Validating and writing UIF...\n');

  if (!existsSync('.research_uif.json')) throw new Error("Missing .research_uif.json");
  if (!existsSync('.research_ctx.json')) throw new Error("Missing .research_ctx.json");
  if (!existsSync('.research_results.json')) throw new Error("Missing .research_results.json");

  const { workflowId, ideaId } = JSON.parse(readFileSync('.research_ctx.json', 'utf8'));
  const { logIds } = JSON.parse(readFileSync('.research_results.json', 'utf8'));
  const uif = JSON.parse(readFileSync('.research_uif.json', 'utf8'));

  // E — Explicit gate
  const validation = validateUIF(uif);
  if (!validation.valid) throw new Error(`UIF validation failed: ${validation.errors.join("; ")}`);
  console.log('✅ UIF validation passed');

  // Set provenance_log
  uif.meta.provenance_log = logIds.join(',');

  await patchRecord(IDEAS_TABLE, ideaId, {
    'Intelligence File': JSON.stringify(uif),
    research_completed_at: new Date().toISOString(),
    Status: 'Ready'
  });

  await createRecord(LOGS_TABLE, {
    workflow_id: workflowId,
    entity_id: ideaId,
    step_name: 'uif_compiler',
    stage: 'writing',
    timestamp: new Date().toISOString(),
    output_summary: `UIF written: ${uif.angles.length} angles, ${uif.core_knowledge.facts.length} facts`,
    model_version: 'claude-sonnet-4-6',
    status: 'success'
  });

  console.log(`✅ UIF written to Airtable (${uif.angles.length} angles, ${uif.core_knowledge.facts.length} facts)`);
  console.log('\n=== ANGLES FOR HOOK EXTRACTION ===');
  uif.angles.forEach((a, i) => {
    const facts = (a.supporting_facts || []).map(idx => uif.core_knowledge.facts[idx]?.statement).filter(Boolean);
    console.log(`\nAngle ${i}: ${a.angle_name}`);
    console.log(`  Take: ${a.contrarian_take}`);
    console.log(`  Facts: ${facts.join(' | ')}`);
  });
  console.log('\n→ Claude: generate hooks and save to .research_hooks.json, then run phase4');
}

// ─── PHASE 4: Write hooks to hooks_library ───────────────────────────────────
async function phase4() {
  console.log('[PHASE 4] Writing hooks...\n');

  if (!existsSync('.research_hooks.json')) throw new Error("Missing .research_hooks.json");
  if (!existsSync('.research_ctx.json')) throw new Error("Missing .research_ctx.json");
  if (!existsSync('.research_uif.json')) throw new Error("Missing .research_uif.json");

  const { workflowId, ideaId } = JSON.parse(readFileSync('.research_ctx.json', 'utf8'));
  const uif = JSON.parse(readFileSync('.research_uif.json', 'utf8'));
  const { hooks } = JSON.parse(readFileSync('.research_hooks.json', 'utf8'));

  let count = 0;
  for (const h of hooks) {
    await createRecord(HOOKS_TABLE, {
      hook_text: h.hook_text,
      hook_type: h.hook_type,
      source_idea: [ideaId],
      angle_name: h.angle_name,
      intent: 'authority',
      status: 'candidate',
      use_count: 0
    });
    count++;
    console.log(`  [${h.hook_type}] ${h.hook_text.slice(0, 80)}...`);
  }

  await createRecord(LOGS_TABLE, {
    workflow_id: workflowId,
    entity_id: ideaId,
    step_name: 'complete',
    stage: 'complete',
    timestamp: new Date().toISOString(),
    output_summary: `Research complete: ${uif.meta.topic} — ${uif.angles.length} angles, ${uif.core_knowledge.facts.length} facts, ${count} hooks`,
    model_version: 'n/a',
    status: 'success'
  });

  console.log(`\n✅ Research complete: ${uif.meta.topic}`);
  console.log(`   Angles: ${uif.angles.length} | Facts: ${uif.core_knowledge.facts.length} | Hooks: ${count}`);
  console.log('   Run /draft to create posts.');
}

// ─── UNLOCK: Error recovery ───────────────────────────────────────────────────
async function unlock() {
  if (!existsSync('.research_ctx.json')) throw new Error("No .research_ctx.json to unlock");
  const { workflowId, ideaId } = JSON.parse(readFileSync('.research_ctx.json', 'utf8'));
  await patchRecord(IDEAS_TABLE, ideaId, { research_started_at: null, Status: 'Proposed' });
  await createRecord(LOGS_TABLE, {
    workflow_id: workflowId, entity_id: ideaId,
    step_name: 'unlock', stage: 'error_recovery',
    timestamp: new Date().toISOString(),
    output_summary: 'Lock cleared manually', model_version: 'n/a', status: 'error'
  });
  console.log('✅ Lock cleared. Safe to retry phase1.');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const phase = process.argv[2];
const runners = { phase1, phase2, phase3, phase4, unlock };

if (!runners[phase]) {
  console.error('Usage: node .tmp_research.mjs <phase1|phase2|phase3|phase4|unlock>');
  process.exit(1);
}

runners[phase]().catch(async err => {
  console.error(`\n❌ /research failed — ${err.message}`);
  if (existsSync('.research_ctx.json')) {
    const { workflowId, ideaId } = JSON.parse(readFileSync('.research_ctx.json', 'utf8'));
    if (ideaId) {
      await patchRecord(IDEAS_TABLE, ideaId, { research_started_at: null, Status: 'Proposed' });
      await createRecord(LOGS_TABLE, {
        workflow_id: workflowId, entity_id: ideaId,
        step_name: 'error', stage: phase,
        timestamp: new Date().toISOString(),
        output_summary: `Error: ${err.message}`, model_version: 'n/a', status: 'error'
      });
      console.error('   Lock cleared, safe to retry.');
    }
  }
  process.exit(1);
});
