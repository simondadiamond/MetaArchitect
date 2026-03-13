/**
 * /draft — write pre-generated drafts to Airtable posts table.
 * Idea: recVz1WFtmcStziwn — "I Didn't Know What I Wanted to Build — So I Asked an AI What Question I Should Be Asking"
 * Drafts authored by Claude Code agent (Layer 2); no external API call needed.
 */

import { randomUUID } from 'crypto';
import { getRecords, createRecord, TABLES } from './airtable.mjs';

const workflowId = randomUUID();
const IDEA_ID = 'recVz1WFtmcStziwn';

// ─── VERIFY IDEA ──────────────────────────────────────────────────────────────

const ideas = await getRecords(TABLES.IDEAS, `AND({Status} = "Ready", {research_completed_at} != "")`);
const idea = ideas.find(i => i.id === IDEA_ID);
if (!idea) throw new Error(`Idea ${IDEA_ID} not found or not Ready.`);
console.log(`Idea: ${idea.fields?.Topic} (${idea.id})\n`);

// ─── DRAFT CONTENT ────────────────────────────────────────────────────────────

const drafts = [
  {
    angle_name: "The Meta Architect origin: I asked AI what question I should be asking",
    platform: "linkedin",
    format: "story_arc",
    framework_id: "recwnJCw23pMd5b38",   // The Meta Play
    hook_id: "rec0VgeV2aU9pjVEu",         // story_open — "I didn't know what I wanted to build..."
    snippet_id: "recpXiS77eVop8dHC",      // "I used to think better prompts would fix everything. They didn't."
    alt_snippet_ids: ["recsWvG7Y31WYWNL6", "reczZEpaZFqDJCIeF"],
    draft_content: `I didn't know what I wanted to build. So I asked an AI what question I should be asking.

Most people start with the solution. They open the chat window and start describing what they want to build — before they've decided what problem they're actually solving.
The framing comes from whatever they already know. It inherits every assumption they haven't examined.

I used to think better prompts would fix everything. They didn't.
The real constraint wasn't the model. It was the question I hadn't asked yet — the one upstream of every decision that followed.
When I stopped trying to build something and asked "what question should I be asking right now?", the answer became the brand: State Beats Intelligence. Not "how do I get better model outputs?" — but "what does the system around the model need to be?"

The meta skill isn't prompting. It's knowing what to ask before you open the chat window.

#AIReliabilityEngineering #LLMOps #StateManagement #TheMetaLayer #ProductionAI`
  },
  {
    angle_name: "The METR paradox: experienced engineers slowed down while thinking they sped up",
    platform: "linkedin",
    format: "problem_solution",
    framework_id: "reckdGbr9q3BBBukK",   // Failure Autopsy
    hook_id: "recZMRYleqePm7tqx",         // stat_lead — "The engineers who thought AI made them 20% faster were actually 19% slower."
    snippet_id: "recWOQBuRzLrCPPti",      // "For two weeks I thought the model was hallucinating. Turned out it was my architecture."
    alt_snippet_ids: ["recJDwNapaYl6SpMg", "recwzQpYipl0SUQ2F"],
    draft_content: `The engineers who thought AI made them 20% faster were actually 19% slower.

This wasn't a model failure. METR ran a randomized controlled trial — 16 experienced open-source developers, real codebases, real tasks. The confidence interval: +2% to +39% slower. Developer confidence was elevated throughout.
They were optimizing execution before the problem was defined. Moving fast in the wrong direction.

For two weeks I thought the model was hallucinating. Turned out it was my architecture. I hadn't built a clear enough problem definition to know what correct output was supposed to look like.
This is the failure mode. AI accelerates the execution layer while the problem layer stays undefined. If the framing is wrong, every output is technically valid and completely useless.
Experienced engineers are most exposed — they trust their own mental models. The faster they move, the further they get before discovering the direction was wrong.

The diagnosis comes before the model. Always.

#AIReliabilityEngineering #LLMOps #ProductionFailure #StateManagement #METR`
  }
];

// ─── VALIDATE & WRITE ─────────────────────────────────────────────────────────

function validatePost(draft_content, platform) {
  const lines = (draft_content ?? '').split('\n');
  const words = (draft_content ?? '').split(/\s+/).filter(Boolean);
  const nonBlank = lines.filter(l => l.trim() !== '');
  const errors = [];

  if (!lines[0]?.trim()) errors.push('Line 1 (hook) is empty');
  if (nonBlank.length < 5) errors.push('Post body too short — missing sections');
  if (!nonBlank[nonBlank.length - 1]?.trim()) errors.push('Last line (close) is empty');

  if (platform === 'linkedin') {
    if (words.length < 150) errors.push(`Word count ${words.length} below minimum (150)`);
    if (words.length > 250) errors.push(`Word count ${words.length} exceeds maximum (250)`);
  }
  return { valid: errors.length === 0, errors };
}

const results = [];
const skipped = [];

for (const d of drafts) {
  const check = validatePost(d.draft_content, d.platform);
  if (!check.valid) {
    console.error(`❌ Validation failed for "${d.angle_name}": ${check.errors.join('; ')}`);
    skipped.push(d);
    continue;
  }

  const postFields = {
    idea_id:              [IDEA_ID],
    platform:             d.platform,
    intent:               idea.fields?.intent ?? 'authority',
    format:               d.format,
    draft_content:        d.draft_content,
    hook_id:              [d.hook_id],
    framework_id:         [d.framework_id],
    humanity_snippet_id:  d.snippet_id ? [d.snippet_id] : [],
    alt_snippet_ids:      d.alt_snippet_ids ?? [],
    needs_snippet:        !d.snippet_id,
    status:               'drafted',
    drafted_at:           new Date().toISOString(),
  };

  const postRecord = await createRecord(TABLES.POSTS, postFields);

  await createRecord(TABLES.LOGS, {
    workflow_id:    workflowId,
    entity_id:      postRecord.id,
    step_name:      'draft_created',
    stage:          'complete',
    timestamp:      new Date().toISOString(),
    output_summary: `Draft created: ${d.platform} / ${d.angle_name} / framework: ${d.format} / hook: ${d.hook_id} / snippet: ${d.snippet_id}`,
    model_version:  'claude-sonnet-4-6',
    status:         'success'
  });

  results.push({ ...d, postId: postRecord.id });
  console.log(`✅ Draft created: ${postRecord.id}`);
  console.log(`   ${d.platform} — ${d.angle_name}`);
  console.log(`   Framework: ${d.format} | Hook: ${d.hook_id} | Snippet: ${d.snippet_id}\n`);
}

// ─── REPORT ───────────────────────────────────────────────────────────────────

console.log('='.repeat(60));
console.log(`✅ ${results.length} draft(s) created. Run /review to approve.`);
if (skipped.length) {
  console.log(`⚠  ${skipped.length} skipped (validation failed).`);
}
