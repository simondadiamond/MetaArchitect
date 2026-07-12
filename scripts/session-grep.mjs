#!/usr/bin/env node
/**
 * session-grep.mjs — keyword-search past Claude Code session transcripts.
 *
 * Usage: node scripts/session-grep.mjs <keyword> [keyword...] [--dir <transcripts-dir>] [--any]
 *
 * Scans user turns in every .jsonl transcript for the project. A transcript
 * matches when ALL keywords appear (case-insensitive) across its user turns
 * (--any relaxes to at-least-one). Prints one block per match, oldest first:
 * path, last-activity date, and the first matching user turn (truncated).
 *
 * Born 2026-07-10 from session-close friction: "which past session discussed X"
 * took six ad-hoc greps before this existed. Deterministic, no network, no LLM.
 */

import { readdirSync, statSync, createReadStream, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const DEFAULT_DIR = join(
  process.env.HOME,
  '.claude/projects/-home-diamond-projects-MetaArchitect',
);

const args = process.argv.slice(2);
let dir = DEFAULT_DIR;
let anyMode = false;
const keywords = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dir') dir = args[++i];
  else if (args[i] === '--any') anyMode = true;
  else keywords.push(args[i].toLowerCase());
}
if (!keywords.length) {
  console.error('❌ session-grep failed at input — no keywords given. Usage: session-grep.mjs <keyword> [keyword...] [--dir d] [--any]');
  process.exit(1);
}
if (!existsSync(dir)) {
  console.error(`❌ session-grep failed at input — transcripts dir not found: ${dir}`);
  process.exit(1);
}

function userText(entry) {
  if (entry.type !== 'user') return null;
  const c = entry.message?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join(' ');
  }
  return null;
}

async function scan(file) {
  const found = new Set();
  let firstHit = null;
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const text = userText(entry);
    if (!text) continue;
    // Skip harness-injected content masquerading as user turns
    if (text.startsWith('<local-command') || text.startsWith('<system-reminder')) continue;
    const low = text.toLowerCase();
    const hits = keywords.filter((k) => low.includes(k));
    if (!hits.length) continue;
    hits.forEach((k) => found.add(k));
    if (!firstHit && (anyMode || hits.length === keywords.length)) firstHit = text;
    if (anyMode ? found.size > 0 : found.size === keywords.length) {
      // ALL mode: keep reading only if we still need a single-turn preview
      if (firstHit) break;
    }
  }
  const matched = anyMode ? found.size > 0 : found.size === keywords.length;
  if (!matched) return null;
  // Fallback preview when keywords matched across different turns
  return { preview: firstHit ?? '(keywords matched across separate turns)' };
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith('.jsonl'))
  .map((f) => join(dir, f))
  .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);

let matches = 0;
for (const file of files) {
  const res = await scan(file);
  if (!res) continue;
  matches++;
  const mtime = statSync(file).mtime.toISOString().slice(0, 16).replace('T', ' ');
  const preview = res.preview.replace(/\s+/g, ' ').slice(0, 200);
  console.log(`${file}\n  last activity: ${mtime}\n  first hit: ${preview}\n`);
}
console.log(`${matches} matching session(s) of ${files.length} scanned — keywords: ${keywords.join(', ')} (${anyMode ? 'ANY' : 'ALL'})`);
