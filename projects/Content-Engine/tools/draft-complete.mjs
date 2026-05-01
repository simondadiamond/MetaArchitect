/**
 * draft-complete.mjs — Writes a drafted post to pipeline DB.
 *
 * Reads JSON payload from stdin:
 * {
 *   workflowId: string,
 *   stubId: string,           // pipeline.posts UUID
 *   draft_content: string,
 *   intent: string,
 *   format: string,
 *   platform: string,         // default: "linkedin"
 *   hook_id: string|null,
 *   framework_id: string|null,
 *   humanity_snippet_id: string|null,
 *   alt_snippet_ids: string[],
 *   needs_snippet: boolean,
 *   snippet_id: string|null   // alias for humanity_snippet_id (used to update last_used_at)
 * }
 *
 * Usage:
 *   echo '<json>' | node tools/draft-complete.mjs
 */

import { readFileSync } from 'node:fs';
import { patchRecord, logEntry, TABLES } from './supabase.mjs';

const raw = readFileSync('/dev/stdin', 'utf8').trim();
const payload = JSON.parse(raw);

const {
  workflowId, stubId, draft_content,
  intent, format, platform = 'linkedin',
  hook_id = null, framework_id = null,
  humanity_snippet_id = null, alt_snippet_ids = [],
  needs_snippet = false,
} = payload;

if (!workflowId || !stubId || !draft_content) {
  throw new Error('workflowId, stubId, and draft_content are required');
}

function validatePost(content, plat) {
  const words = content.split(/\s+/).filter(Boolean);
  const lines = content.split('\n');
  const errors = [];
  if (!lines[0]?.trim()) errors.push('Line 1 (hook) is empty');
  if (plat === 'linkedin') {
    if (words.length < 150) errors.push(`Word count ${words.length} below min (150)`);
    if (words.length > 250) errors.push(`Word count ${words.length} exceeds max (250)`);
  }
  return { valid: errors.length === 0, errors, wordCount: words.length };
}

const check = validatePost(draft_content, platform);
if (!check.valid) {
  console.error(`❌ Post validation failed: ${check.errors.join('; ')}`);
  process.exit(1);
}

const now = new Date().toISOString();

await patchRecord(TABLES.POSTS, stubId, {
  draft_content,
  intent,
  format,
  platform,
  hook_id: hook_id ?? null,
  framework_id: framework_id ?? null,
  humanity_snippet_id: humanity_snippet_id ?? null,
  alt_snippet_ids: alt_snippet_ids ?? [],
  needs_snippet,
  status: 'drafted',
  drafted_at: now,
});

if (humanity_snippet_id) {
  await patchRecord(TABLES.SNIPPETS, humanity_snippet_id, { last_used_at: now });
}

await logEntry({
  workflow_id: workflowId,
  entity_id: stubId,
  step_name: 'draft_created',
  stage: 'complete',
  timestamp: now,
  output_summary: `Draft written via draft-complete.mjs — ${check.wordCount} words | platform: ${platform} | intent: ${intent}`,
  model_version: 'claude-sonnet-4-6',
  status: 'success',
});

console.log(`✅ ${stubId} → drafted (${check.wordCount} words)`);
