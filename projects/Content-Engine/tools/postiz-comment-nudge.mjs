#!/usr/bin/env node
/**
 * Postiz first-comment nudger.
 * Pings Simon's ntfy topic around each scheduled LinkedIn post:
 *   - ~30 min before publish ("upcoming: here's the first comment to have ready")
 *   - at/just after publish ("live now: drop the comment, stay 20 min")
 *
 * Reads the queue from the Postiz public API, comments from pipeline.posts.first_comment
 * (matched by postiz_id). Dedupes via .tmp/nudge-sent.json so overlapping runs
 * never double-ping (Tolerant). Run it on any cadence; it no-ops outside windows.
 *
 * Env: POSTIZ_API_URL, POSTIZ_API_KEY, NTFY_URL — from command-center/.env.
 * Usage: postiz-comment-nudge.mjs [--test]   (--test sends one ping and exits)
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
process.chdir(join(HERE, '..')); // Content-Engine — so supabase.mjs finds repo-root .env
const { db } = await import('./supabase.mjs');
const { config } = await import('dotenv');
config({ path: '/home/diamond/projects/MetaArchitect/projects/command-center/.env', quiet: true });

const API = process.env.POSTIZ_API_URL, KEY = process.env.POSTIZ_API_KEY, NTFY = process.env.NTFY_URL;
if (!API || !KEY || !NTFY) { console.error('missing POSTIZ_API_URL / POSTIZ_API_KEY / NTFY_URL'); process.exit(1); }

async function ping(title, body) {
  const r = await fetch(NTFY, { method: 'POST', headers: { Title: title, Priority: 'high', Tags: 'speech_balloon' }, body });
  if (!r.ok) throw new Error(`ntfy ${r.status}`);
}

if (process.argv.includes('--test')) {
  await ping('Postiz nudger test', 'Wiring works. You will get comment nudges ~30 min before and at post time.');
  console.log('test ping sent');
  process.exit(0);
}

const STATE_FILE = join(HERE, '..', '.tmp', 'nudge-sent.json');
const sent = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf8')) : {};

const now = Date.now();
const start = new Date(now - 2 * 3600e3).toISOString();
const end = new Date(now + 2 * 3600e3).toISOString();
const res = await fetch(`${API}/posts?startDate=${start}&endDate=${end}`, { headers: { Authorization: KEY } });
if (!res.ok) { console.error('postiz list failed', res.status); process.exit(1); }
const { posts } = await res.json();

for (const p of posts ?? []) {
  if (p.state === 'DRAFT') continue;
  const minsUntil = (new Date(p.publishDate).getTime() - now) / 60000;
  let phase = null;
  if (minsUntil > 15 && minsUntil <= 45) phase = 'before';
  else if (minsUntil <= 2 && minsUntil > -15) phase = 'live';
  if (!phase || sent[`${p.id}:${phase}`]) continue;

  const { data: row } = await db.from('posts').select('first_comment, thesis_angle').eq('postiz_id', p.id).maybeSingle();
  const comment = row?.first_comment ?? '(no first_comment stored for this post)';
  const hookLine = (p.content ?? '').split('\n')[0].slice(0, 80);

  if (phase === 'before') {
    await ping(`LinkedIn post in ~${Math.round(minsUntil)} min`, `"${hookLine}"\n\nFirst comment to have ready:\n${comment}`);
  } else {
    await ping('LinkedIn post is LIVE — drop the first comment now', `${comment}\n\nStay ~20 min and reply to early comments with added mechanism.`);
  }
  sent[`${p.id}:${phase}`] = new Date().toISOString();
  console.log(`pinged ${phase} for ${p.id}`);
}
writeFileSync(STATE_FILE, JSON.stringify(sent, null, 1));
console.log('done');
