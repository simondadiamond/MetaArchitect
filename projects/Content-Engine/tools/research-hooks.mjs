/**
 * /research — extract hooks from UIF angles and write to hooks_library.
 * Args: workflowId ideaId ideaIntent
 */
import { createRecord, TABLES } from './airtable.mjs';

const [workflowId, ideaId, ideaIntent] = process.argv.slice(2);
if (!workflowId || !ideaId) throw new Error("Usage: node research-hooks.mjs <workflowId> <ideaId> <ideaIntent>");

// Hooks derived from UIF angles (generated inline by hook extraction step)
const hooksToWrite = [
  // Angle 0: AI widens the skill gap
  {
    hook_text: "AI tools were supposed to democratize expertise. The data says they're doing the opposite.",
    hook_type: "contrarian",
    angle_name: "AI widens the skill gap — it doesn't close it"
  },
  {
    hook_text: "Junior developers get zero productivity lift from AI tools. The Science journal said so.",
    hook_type: "stat_lead",
    angle_name: "AI widens the skill gap — it doesn't close it"
  },
  // Angle 1: Experienced engineers slow down
  {
    hook_text: "Experienced developers with AI tools took 19% longer on tasks than without. That's not a model problem.",
    hook_type: "stat_lead",
    angle_name: "Even experienced engineers slow down when they don't know what they're building"
  },
  {
    hook_text: "The bottleneck in your AI workflow isn't the model. It's what you bring to the first message.",
    hook_type: "contrarian",
    angle_name: "Even experienced engineers slow down when they don't know what they're building"
  },
  // Angle 2: Origin story
  {
    hook_text: "I didn't know what I wanted to build. So I asked an AI what question I should be asking.",
    hook_type: "story_open",
    angle_name: "The Meta Architect origin: I asked an AI what question I should be asking"
  },
  {
    hook_text: "The meta skill isn't prompting. It's knowing what to ask before you open the chat window.",
    hook_type: "provocative_claim",
    angle_name: "The Meta Architect origin: I asked an AI what question I should be asking"
  },
  // Angle 3: Problem architecture replaces prompt engineering
  {
    hook_text: "Prompt engineering is fading. The skill that replaces it isn't context engineering.",
    hook_type: "contrarian",
    angle_name: "The skill that replaces prompt engineering is problem architecture"
  },
  {
    hook_text: "What are you actually asking AI to do — before you write the first word of the prompt?",
    hook_type: "question",
    angle_name: "The skill that replaces prompt engineering is problem architecture"
  }
];

let written = 0;
for (const h of hooksToWrite) {
  await createRecord(TABLES.HOOKS, {
    hook_text: h.hook_text,
    hook_type: h.hook_type,
    source_idea: [ideaId],
    angle_name: h.angle_name,
    intent: ideaIntent ?? "authority",
    status: "candidate",
    use_count: 0,
  });
  written++;
}

// Log hook extraction
await createRecord(TABLES.LOGS, {
  workflow_id: workflowId,
  entity_id: ideaId,
  step_name: "hook_extraction",
  stage: "hook_extraction",
  timestamp: new Date().toISOString(),
  output_summary: `Extracted ${written} hooks across 4 angles and wrote to hooks_library as candidates.`,
  model_version: "claude-sonnet-4-6",
  status: "success"
});

console.log(`✅ ${written} hooks written to hooks_library.`);
