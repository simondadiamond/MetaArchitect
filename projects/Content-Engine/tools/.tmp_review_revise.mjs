/**
 * /review — apply revisions to 3 posts and log
 */
import { patchRecord, createRecord, TABLES } from './airtable.mjs';
import { randomUUID } from 'crypto';

const WF_ID = randomUUID();

const revisions = [
  {
    id: 'recYbhj0Sz1ReRF2U',
    notes: 'Rephrase problem definition section to focus on Structured State / stateless execution',
    content: `The engineers who thought AI made them 20% faster were actually 19% slower.

This wasn't a model failure. METR ran a randomized controlled trial — 16 experienced open-source developers, real codebases, real tasks. The confidence interval: +2% to +39% slower. Developer confidence was elevated throughout.
They weren't just moving fast. They were moving stateless — no explicit requirements, no typed schema of what done actually looked like.

For two weeks I thought the model was hallucinating. Turned out it was my architecture.
Without a structured state object grounding the task, the LLM reconstructs requirements from context on every call. That's not intelligence. It's controlled hallucination at execution speed.
The faster you move without that schema, the more confident tokens you waste solving the wrong problem. Experienced engineers are most exposed — they trust their own mental model of the task, and never make it explicit.

The diagnosis comes before the model. Define the state schema first.

#AIReliabilityEngineering #LLMOps #ProductionFailure #StateManagement #METR`
  },
  {
    id: 'rec87tmFYC84zpsYd',
    notes: 'Name STATE Explicit pillar, use deterministic boundaries framing, new close from Simon',
    content: `MIT found the model wasn't the variable. The lack of deterministic boundaries was.

95% of corporate GenAI pilots fail to deliver business value. MIT studied 800 deployments. The default read: wrong model, wrong prompts, not enough fine-tuning.
Teams swap providers, rebuild the retrieval pipeline, add few-shot examples. The failure rate holds.

MIT's 2025 analysis named the real causes: workflow misalignment, cultural resistance, no process boundaries. The model wasn't the variable. The organization's lack of explicit structure was.
For two weeks I thought the model was hallucinating. Turned out it was my architecture.
The STATE Explicit pillar asks one question before every LLM call: what is the worst this model could output, and what gate stops it from becoming a real-world action? Most pilots skip this gate entirely.

If your process isn't Explicit, your agent is just guessing at the seams.

#AIReliabilityEngineering #LLMOps #STATEFramework #ExplicitBoundaries #ProductionAI`
  },
  {
    id: 'recSepsdBJFm8sjuG',
    notes: 'Keep snippet as The Turn at line 6, add Law 25 angle to lines 7-8',
    content: `Your SOPs are a state schema. If they don't exist, the agent has nothing reliable to work with.

SOPs get treated as bureaucratic overhead. "We know the process — let's just automate it." The team builds the workflow, ships the integration, and wonders why outputs are inconsistent.
There was no state to encode. What felt like a "known process" was dozens of people doing it slightly differently, with the variation living in their heads. You handed the agent a hallucinated schema.

Everyone wanted a smarter model. What they actually needed was a state machine.

SOPs are the organizational equivalent of a typed state object — the schema for a business process. Without them, there is no stable behavior to automate. Only the current practitioner's interpretation.
In Quebec, Law 25 makes this concrete: you can't just trust the process. You need an auditable trail of how that state changed — what data was used, what decision was made, and why.

Audit the process before you architect the agent.

#AIReliabilityEngineering #LLMOps #StateManagement #STATEFramework #Law25`
  }
];

for (const r of revisions) {
  await patchRecord(TABLES.POSTS, r.id, { draft_content: r.content });
  await createRecord(TABLES.LOGS, {
    workflow_id: WF_ID,
    entity_id: r.id,
    step_name: 'review_revised',
    stage: 'revising',
    timestamp: new Date().toISOString(),
    output_summary: `Post revised (pass 1): ${r.notes.slice(0, 100)}`,
    model_version: 'claude-sonnet-4-6',
    status: 'success'
  });
  console.log('revised', r.id);
}

console.log('All 3 revised.');
