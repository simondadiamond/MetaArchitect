/**
 * /research — set lock + log STATE init
 * Run immediately before Perplexity calls.
 * Prints workflowId to stdout for use in subsequent steps.
 */
import { patchRecord, createRecord, TABLES } from './airtable.mjs';
import { randomUUID } from 'crypto';

const ideaId = process.argv[2];
const topic = process.argv[3];
if (!ideaId) throw new Error("Usage: node research-lock.mjs <ideaId> <topic>");

const workflowId = randomUUID();
const now = new Date().toISOString();

await patchRecord(TABLES.IDEAS, ideaId, {
  research_started_at: now,
  Status: "Researching",
});

const lockLog = await createRecord(TABLES.LOGS, {
  workflow_id: workflowId,
  entity_id: ideaId,
  step_name: "lock",
  stage: "locking",
  timestamp: now,
  output_summary: `Research locked for: ${topic}`,
  model_version: "n/a",
  status: "success"
});

console.log(JSON.stringify({ workflowId, lockLogId: lockLog.id, lockedAt: now }));
