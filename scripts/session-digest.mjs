#!/usr/bin/env node
/**
 * session-digest.mjs — reduce a Claude Code transcript (.jsonl) to a harvestable digest.
 *
 * Usage: node scripts/session-digest.mjs <transcript.jsonl> [--max-bytes N]
 *
 * Emits markdown on stdout: user/assistant text turns, every Bash command run,
 * every file written or edited. Tool RESULTS are never included (they dominate
 * transcript size and contain nothing the harvest lanes need).
 *
 * Shared by two callers (one mechanism, per the 2026-07-10 unified-close spec):
 *   - session-close skill (interactive /end) — default 150KB cap
 *   - daily session sweep (RECONCILER-adjacent schedule) — pass a tighter cap
 *
 * Deterministic, no network, no LLM. Exit 1 with a clear message on bad input.
 */

import { createReadStream } from 'fs';
import { existsSync } from 'fs';
import { createInterface } from 'readline';

const args = process.argv.slice(2);
let maxBytes = 150_000;
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--max-bytes') maxBytes = parseInt(args[++i], 10);
  else file = args[i];
}
if (!file || !existsSync(file)) {
  console.error(`❌ session-digest failed at input — transcript not found: ${file ?? '(none given)'}`);
  process.exit(1);
}
if (!Number.isFinite(maxBytes) || maxBytes < 1000) {
  console.error('❌ session-digest failed at input — --max-bytes must be a number ≥ 1000');
  process.exit(1);
}

const PER_TURN = 2000; // chars per text turn — long pastes get elided, shape survives

const trunc = (s, n = PER_TURN) =>
  s.length <= n ? s : s.slice(0, n) + ` …[+${s.length - n} chars]`;

const out = [];
let written = 0;
let truncated = false;
function emit(line) {
  if (truncated) return;
  if (written + line.length > maxBytes) {
    out.push(`\n…[digest truncated at ${maxBytes} bytes — transcript continues]`);
    truncated = true;
    return;
  }
  out.push(line);
  written += line.length + 1;
}

const rl = createInterface({ input: createReadStream(file, 'utf8'), crlfDelay: Infinity });
let firstTs = null;
let lastTs = null;
let turns = 0;

for await (const raw of rl) {
  if (!raw.trim()) continue;
  let entry;
  try { entry = JSON.parse(raw); } catch { continue; } // tolerate partial/corrupt lines
  if (entry.timestamp) { firstTs ??= entry.timestamp; lastTs = entry.timestamp; }
  if (entry.type !== 'user' && entry.type !== 'assistant') continue;

  const content = entry.message?.content;
  const blocks = typeof content === 'string' ? [{ type: 'text', text: content }]
    : Array.isArray(content) ? content : [];

  for (const b of blocks) {
    if (b.type === 'text' && b.text?.trim()) {
      // Harness injections aren't conversation — skip or compress them
      const text = b.text.trim();
      if (entry.type === 'user') {
        if (/^<system-reminder>[\s\S]*<\/system-reminder>$/.test(text)) continue;
        if (text.startsWith('<local-command-caveat>')) continue;
        const cmd = text.match(/^<command-name>(.+?)<\/command-name>/);
        if (cmd) { emit(`→ command: ${cmd[1]}`); continue; }
        const skillLoad = text.match(/^Base directory for this skill: \S*\/skills\/([\w-]+)/);
        if (skillLoad) { emit(`→ skill content loaded: ${skillLoad[1]}`); continue; }
      }
      turns++;
      emit(`\n## ${entry.type.toUpperCase()}\n${trunc(text)}`);
    } else if (b.type === 'tool_use') {
      if (b.name === 'Bash' && b.input?.command) {
        emit(`→ bash: ${trunc(b.input.command, 400)}`);
      } else if ((b.name === 'Write' || b.name === 'Edit' || b.name === 'NotebookEdit') && b.input?.file_path) {
        emit(`→ ${b.name === 'Write' ? 'wrote' : 'edited'}: ${b.input.file_path}`);
      } else if (b.name === 'Skill' && b.input?.skill) {
        emit(`→ skill: ${b.input.skill}`);
      }
    }
    // tool_result blocks (inside user turns) are deliberately never emitted
  }
}

if (turns === 0) {
  console.error('❌ session-digest failed at parse — no user/assistant text turns found (wrong file or schema drift)');
  process.exit(1);
}

console.log(`# Session digest — ${file.split('/').pop()}`);
console.log(`Activity: ${firstTs ?? '?'} → ${lastTs ?? '?'} | ${turns} text turns${truncated ? ' | TRUNCATED' : ''}`);
console.log(out.join('\n'));
