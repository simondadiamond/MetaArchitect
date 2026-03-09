/**
 * /draft — write pre-generated drafts to Airtable posts table.
 * Drafts are authored by Claude Code directly; no API call needed.
 */

import { randomUUID } from 'crypto';
import { getRecords, createRecord, TABLES } from './airtable.mjs';

const workflowId = randomUUID();

// ─── FIND IDEA ────────────────────────────────────────────────────────────────

const ideas = await getRecords(TABLES.IDEAS, `AND({Status} = "Ready", {research_completed_at} != "")`);
if (ideas.length === 0) throw new Error('No Ready ideas with research_completed_at. Run /research first.');
const idea = ideas[0];
console.log(`Idea: ${idea.fields?.Topic} (${idea.id})\n`);

// ─── DRAFT CONTENT ───────────────────────────────────────────────────────────

const drafts = [
  {
    angleIdx: 2,
    angle_name: "The Meta Architect origin: I asked AI what question I should be asking",
    platform: "linkedin",
    format: "story_arc",
    framework_id: "recwnJCw23pMd5b38",  // The Meta Play
    hook_id: "recTXdgQJEhSXgYlc",       // story_open
    draft_content: `I didn't know what I wanted to build. So I asked an AI what question I should be asking.

Not "help me brainstorm ideas." Not "what should I teach?" The exact meta question: given what you can infer about me, what problem am I actually positioned to solve — and what is the question that names it?

The answer came back structured. Diagnostic. It named the gap: production AI systems fail from architecture problems, not model weakness. Engineers were shipping pilots that worked in demos and broke in production. Nobody was teaching the layer between the model and the outcome.

That response became The Meta Architect.

The meta skill isn't prompting. It's knowing what to ask before you touch the keyboard. I used AI to architect my own question — not to execute a task I'd already defined.

State beats intelligence. The architecture of the question constrains every answer that follows. Get the framing wrong and no model can fix it downstream.

What question are you not asking?

#AIReliabilityEngineering #LLMOps #TheMetaArchitect #StateBeatsIntelligence`
  },
  {
    angleIdx: 0,
    angle_name: "The METR paradox: experienced engineers slowed down while thinking they sped up",
    platform: "linkedin",
    format: "contrarian",
    framework_id: "recXvAIbVnv3D7R9l",  // The Reframe
    hook_id: "recZMRYleqePm7tqx",        // stat_lead
    draft_content: `The engineers who thought AI made them 20% faster were actually 19% slower.

The standard read: the tools aren't working for these engineers. Swap the model, tune the prompts, try a different workflow.

METR ran a randomized controlled trial on experienced open-source developers. Task-level randomization, real output measured. The engineers self-reported a 20% speedup. Actual performance: 19% slower. That gap is the tell.

This isn't a tooling problem. It's a problem-architecture problem.

The engineers who slowed down were still producing code — just code for the wrong thing, framed incorrectly from the first message. AI accelerates execution. It doesn't correct a flawed problem definition upstream.

State beats intelligence. If the initial framing is wrong, a faster model produces wrong output faster. The bottleneck was never the tool. It was what the engineer brought to the first message.

Before you optimize the prompt, audit the question.

#AIReliabilityEngineering #LLMOps #StateManagement #ProductionAI`
  }
];

// ─── VALIDATE & WRITE ────────────────────────────────────────────────────────

function validatePost(draft_content) {
  const words = draft_content.trim().split(/\s+/).length;
  if (words < 100) return { valid: false, error: `Too short: ${words} words` };
  if (words > 280) return { valid: false, error: `Too long: ${words} words` };
  return { valid: true };
}

const results = [];

for (const d of drafts) {
  const check = validatePost(d.draft_content);
  if (!check.valid) {
    console.error(`❌ Validation failed for angle ${d.angleIdx}: ${check.error}`);
    continue;
  }

  const postRecord = await createRecord(TABLES.POSTS, {
    idea_id: [idea.id],
    platform: d.platform,
    intent: idea.fields?.intent ?? 'authority',
    format: d.format,
    draft_content: d.draft_content,
    hook_id: [d.hook_id],
    framework_id: [d.framework_id],
    humanity_snippet_id: [],
    needs_snippet: true,
    status: 'drafted',
    drafted_at: new Date().toISOString(),
  });

  await createRecord(TABLES.LOGS, {
    workflow_id: workflowId,
    entity_id: postRecord.id,
    step_name: 'draft_created',
    stage: 'complete',
    timestamp: new Date().toISOString(),
    output_summary: `Draft created: ${d.platform} / ${d.angle_name} / format: ${d.format}`,
    model_version: 'claude-sonnet-4-6',
    status: 'success'
  });

  results.push({ ...d, postId: postRecord.id });
  console.log(`✅ Draft created: ${postRecord.id}`);
  console.log(`   linkedin — ${d.angle_name}\n`);
}

// ─── REPORT ──────────────────────────────────────────────────────────────────

console.log(`${'='.repeat(60)}`);
console.log(`✅ ${results.length} draft(s) created. Run /review to approve.\n`);
results.forEach(r => {
  console.log(`  ✅ linkedin — ${r.angle_name}`);
  console.log(`     Framework: ${r.format} | Hook: stat_lead/story_open | Snippet: no`);
});
console.log(`\n⚠  needs_snippet = true for both drafts.`);
console.log(`   Angle 2 (origin story): the specific session where you asked AI what question`);
console.log(`   you should be asking — the moment that became the brand name.`);
console.log(`   Angle 0 (METR paradox): a moment where you shipped AI-augmented work feeling`);
console.log(`   fast, then discovered the output was worse — late-night, client-facing.`);
