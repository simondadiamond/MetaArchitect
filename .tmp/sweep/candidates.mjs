#!/usr/bin/env node
// Session-sweep candidate enumerator. Deterministic; prints JSON.
import { readdirSync, statSync, readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';

const HOME = os.homedir();
const PROJ = join(HOME, '.claude', 'projects');
const PROCESSED = join(HOME, 'projects', 'brain', '.reconciler', 'processed.json');
const GRACE_MS = 24 * 60 * 60 * 1000;
const CAP = parseInt(process.env.CAP || '10', 10);
const NOW = Date.now();

let processed = {};
try {
  const raw = JSON.parse(readFileSync(PROCESSED, 'utf8'));
  const arr = Array.isArray(raw) ? raw : (raw.processed || raw.sessions || []);
  for (const e of arr) {
    const p = typeof e === 'string' ? e : (e.path || e.transcript);
    if (p) processed[p] = (typeof e === 'object' ? (e.lastLineTimestamp || e.last_line_timestamp || null) : null);
  }
} catch (e) { console.error('processed.json parse issue: ' + e.message); }

// read last line that has a timestamp, and first line timestamp
function scan(file) {
  const size = statSync(file).size;
  // first-line timestamp
  let firstTs = null;
  try {
    const fd = openSync(file, 'r');
    const buf = Buffer.alloc(Math.min(size, 65536));
    readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    const line = buf.toString('utf8').split('\n')[0];
    try { firstTs = JSON.parse(line).timestamp || null; } catch {}
  } catch {}
  // last timestamped line: read tail chunks growing until found
  let lastTs = null, lines = 0;
  try {
    const content = readFileSync(file, 'utf8');
    const all = content.split('\n').filter(Boolean);
    lines = all.length;
    for (let i = all.length - 1; i >= 0; i--) {
      try { const o = JSON.parse(all[i]); if (o.timestamp) { lastTs = o.timestamp; break; } } catch {}
    }
    if (!firstTs) {
      for (const l of all) { try { const o = JSON.parse(l); if (o.timestamp) { firstTs = o.timestamp; break; } } catch {} }
    }
  } catch {}
  return { firstTs, lastTs, lines, size };
}

const out = { skippedWorktree: [], skippedProcessed: 0, stubs: [], candidates: [], tooYoung: 0, total: 0 };
const processedFirstTs = new Set();

const dirs = readdirSync(PROJ, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
const all = [];
for (const d of dirs) {
  const dp = join(PROJ, d);
  let files;
  try { files = readdirSync(dp, { withFileTypes: true }); } catch { continue; }
  for (const f of files) {
    if (!f.isFile() || !f.name.endsWith('.jsonl')) continue;
    all.push({ dir: d, path: join(dp, f.name), id: f.name.replace(/\.jsonl$/, '') });
  }
}
out.total = all.length;

for (const c of all) {
  if (c.dir.includes('story-worktrees')) { out.skippedWorktree.push(c.path); continue; }
  const prevTs = Object.prototype.hasOwnProperty.call(processed, c.path) ? processed[c.path] : undefined;
  const info = scan(c.path);
  if (prevTs !== undefined) {
    if (info.firstTs) processedFirstTs.add(info.firstTs);
    // re-harvest only if last-line ts advanced
    if (!info.lastTs || !prevTs || new Date(info.lastTs) <= new Date(prevTs)) { out.skippedProcessed++; continue; }
  }
  if (!info.lastTs) { out.stubs.push({ path: c.path, id: c.id, mtime: statSync(c.path).mtime.toISOString(), lines: info.lines }); continue; }
  const age = NOW - new Date(info.lastTs).getTime();
  if (age < GRACE_MS) { out.tooYoung++; continue; }
  out.candidates.push({ ...c, ...info, prevTs: prevTs ?? null });
}

// dedupe resume-forks against processed first-line timestamps
out.resumeForks = [];
out.candidates = out.candidates.filter(c => {
  if (c.prevTs === null && c.firstTs && processedFirstTs.has(c.firstTs)) { out.resumeForks.push(c.path); return false; }
  return true;
});

out.candidates.sort((a, b) => new Date(a.lastTs) - new Date(b.lastTs));
out.candidateCount = out.candidates.length;
out.candidates = out.candidates.slice(0, CAP);
console.log(JSON.stringify(out, null, 2));
