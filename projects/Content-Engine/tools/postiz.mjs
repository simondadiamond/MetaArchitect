/**
 * postiz.mjs — the ONLY sanctioned path for scheduling/editing/cancelling LinkedIn
 * posts via Postiz. Replaces the ad-hoc .tmp/*.mjs scripts behind the 2026-07-06
 * (test content nearly published) and 2026-07-07 (invisible delete+recreate) incidents.
 *
 * Rules encoded here (lessons.md 2026-07-06 / 2026-07-07):
 *   - pipeline.posts is canonical; Postiz is delivery-only.
 *   - Every operation takes a pipeline.posts ROW ID — never a content/attribute query.
 *   - Any edit = delete + recreate + row update + pipeline.logs entry + ntfy ping, atomically here.
 *   - status 'scheduled' is set exactly (Command Center /content keys off it).
 *   - schedule: hard-errors if another pipeline.posts row sits within ±2h of the slot;
 *     warns (not errors) at 3+ posts in the same ISO week; warns if the row has a
 *     first_comment but the comment-nudger schedule isn't alive in Command Center.
 *   - edit --content: the new text must re-pass scripts/linkedin-gate.sh first
 *     (POSTIZ_SKIP_GATE=1 is the documented escape hatch). Guards live in
 *     tools/postiz-guards.mjs (offline-tested via --self-test).
 *
 * CLI:
 *   node tools/postiz.mjs schedule  <rowId> <ISO-date> [imagesJsonPath]
 *   node tools/postiz.mjs edit      <rowId> [--content file.txt] [--comment file.txt] [--date ISO] [--images file.json]
 *   node tools/postiz.mjs cancel    <rowId>
 *   node tools/postiz.mjs upload    <imagePath>
 *   node tools/postiz.mjs list                  # pipeline view of scheduled posts
 * All functions are also importable.
 */
import { readFileSync } from 'fs';
import { basename } from 'path';
import { db, logEntry } from './supabase.mjs';
import { findSlotConflicts, sameIsoWeekCount, isoWeek, nudgerScheduleStatus, runContentGate } from './postiz-guards.mjs';
import { config } from 'dotenv';
config({ path: new URL('../../command-center/.env', import.meta.url).pathname, quiet: true });

const API = process.env.POSTIZ_API_URL;
const KEY = process.env.POSTIZ_API_KEY;
const INTEGRATION = process.env.POSTIZ_LINKEDIN_INTEGRATION_ID || 'cmr9mqq1j0001pl79vupzw2id';
const NTFY = process.env.NTFY_URL;
const CC_URL = process.env.COMMAND_CENTER_URL || 'http://100.105.85.5:3737';

if (!API || !KEY) throw new Error('POSTIZ_API_URL / POSTIZ_API_KEY missing — source projects/command-center/.env');

async function ntfy(msg) {
  if (!NTFY) return;
  try { await fetch(NTFY, { method: 'POST', body: msg.slice(0, 300), signal: AbortSignal.timeout(10_000) }); }
  catch { /* a failed ping must never fail the operation */ }
}

async function log(rowId, step, summary, status = 'success') {
  await logEntry({ workflow_id: crypto.randomUUID(), entity_id: rowId, step_name: step, stage: 'schedule',
    output_summary: summary.slice(0, 500), model_version: 'n/a', status });
}

async function loadRow(rowId) {
  const { data, error } = await db.from('posts')
    .select('id, status, platform, draft_content, first_comment, postiz_id, scheduled_at, media, source_angle_name')
    .eq('id', rowId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`pipeline.posts row ${rowId} not found — operations take row IDs, never attribute queries`);
  return data;
}

async function postizCreate(content, date, images) {
  const res = await fetch(`${API}/posts`, {
    method: 'POST', headers: { Authorization: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'schedule', date, shortLink: false, tags: [],
      posts: [{ integration: { id: INTEGRATION }, value: [{ content, image: images ?? [] }], group: '', settings: {} }] }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Postiz create ${res.status}: ${body.slice(0, 300)}`);
  const parsed = JSON.parse(body);
  const pid = Array.isArray(parsed) ? parsed[0]?.postId ?? parsed[0]?.id : parsed.postId ?? parsed.id;
  if (!pid) throw new Error(`Postiz create returned no post id: ${body.slice(0, 200)}`);
  return String(pid);
}

async function postizDelete(postizId) {
  const res = await fetch(`${API}/posts/${postizId}`, { method: 'DELETE', headers: { Authorization: KEY } });
  if (!res.ok) throw new Error(`Postiz delete ${postizId} failed: ${res.status}`);
}

/** Warn (never block) if the first-comment nudger schedule isn't alive in Command Center. */
async function warnIfNudgerDead(rowId) {
  let status;
  try {
    const res = await fetch(`${CC_URL}/api/schedules`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    status = nudgerScheduleStatus(body.schedules ?? body);
  } catch (e) {
    status = { alive: false, detail: `schedules API unreachable (${e.message})` };
  }
  if (!status.alive) {
    console.warn(`⚠ WARNING: this row has a first_comment but the comment nudger looks DEAD — ${status.detail}.`
      + ` Verify the "Postiz first-comment nudges" schedule on ${CC_URL}/schedules or the comment will need posting by hand.`);
    await ntfy(`⚠ Postiz: scheduled a post with a first_comment but the nudger looks dead (${status.detail}) — row ${rowId}`);
  }
}

/** Schedule a drafted/approved row. Refuses rows that already carry a postiz_id. */
export async function schedule(rowId, date, images = []) {
  const row = await loadRow(rowId);
  if (row.postiz_id) throw new Error(`row ${rowId} already scheduled (postiz ${row.postiz_id}) — use edit or cancel`);
  if (!row.draft_content?.trim()) throw new Error(`row ${rowId} has empty draft_content`);
  if (Number.isNaN(Date.parse(date))) throw new Error(`bad date: ${date}`);
  if (new Date(date) < new Date()) throw new Error(`date ${date} is in the past`);
  // Slot + cadence guards (logic in postiz-guards.mjs, offline-tested there)
  const { data: booked, error: qErr } = await db.from('posts')
    .select('id, scheduled_at, source_angle_name')
    .in('status', ['scheduled', 'published']).not('scheduled_at', 'is', null);
  if (qErr) throw qErr;
  const conflicts = findSlotConflicts(booked, date, { excludeRowId: rowId });
  if (conflicts.length) {
    throw new Error(`slot conflict — ${conflicts.length} other post(s) within ±2h of ${date}: `
      + conflicts.map(c => `${c.id.slice(0, 8)} (${c.source_angle_name ?? 'no angle'}) @ ${c.scheduled_at}`).join(', ')
      + ' — pick another slot or cancel the other post first');
  }
  const weekCount = sameIsoWeekCount(booked, date, { excludeRowId: rowId });
  if (weekCount >= 2) {
    console.warn(`⚠ WARNING: this would be post #${weekCount + 1} in ISO week ${isoWeek(date)} — target cadence is 2/week; proceeding anyway`);
  }
  if (row.first_comment?.trim()) await warnIfNudgerDead(rowId);
  const pid = await postizCreate(row.draft_content, date, images);
  const media = images.length ? { ...(row.media ?? {}), images, image_count: images.length } : row.media;
  // Re-queueing a row that ever published must null the reconciler-stamped fields
  // (lessons.md 2026-07-07 third entry: stale post_url/published_at made a correct publish look broken)
  const { error } = await db.from('posts').update({
    postiz_id: pid, scheduled_at: date, status: 'scheduled', sync_state: 'synced',
    post_url: null, published_at: null, ...(media ? { media } : {}),
  }).eq('id', rowId);
  if (error) { await ntfy(`postiz: row updated FAILED after scheduling ${pid} — pipeline.posts is now stale for ${rowId}`); throw error; }
  await log(rowId, 'postiz_scheduled', `scheduled → postiz ${pid} @ ${date} (${images.length} img, ${row.source_angle_name ?? 'no angle'})`);
  await ntfy(`Scheduled: "${row.draft_content.split('\n')[0].slice(0, 80)}" → ${date}`);
  return { rowId, postizId: pid, date };
}

/** Edit a scheduled post: delete + recreate + row update + log + ntfy, in one call. */
export async function edit(rowId, { content, comment, date, images } = {}) {
  const row = await loadRow(rowId);
  if (!row.postiz_id) throw new Error(`row ${rowId} has no postiz_id — nothing scheduled to edit`);
  if (content !== undefined) {
    // New content must re-pass the shared mechanical gate before touching Postiz.
    const gate = runContentGate(content);
    if (gate.skipped) console.warn('⚠ POSTIZ_SKIP_GATE=1 — linkedin-gate bypassed for this edit');
    else if (!gate.ok) {
      throw new Error('edit refused — new content FAILS scripts/linkedin-gate.sh:\n'
        + gate.output.split('\n').filter(l => l.startsWith('FAIL')).join('\n')
        + '\nFix the content and retry (POSTIZ_SKIP_GATE=1 is the documented escape hatch).');
    }
  }
  const newContent = content ?? row.draft_content;
  const newDate = date ?? row.scheduled_at;
  const newImages = images ?? row.media?.images ?? [];
  await postizDelete(row.postiz_id);
  let pid;
  try { pid = await postizCreate(newContent, newDate, newImages); }
  catch (e) {
    await db.from('posts').update({ sync_state: 'missing', postiz_id: null }).eq('id', rowId);
    await log(rowId, 'postiz_edit', `DELETED old post but recreate FAILED: ${e.message}`, 'error');
    await ntfy(`⚠ Postiz edit failed mid-flight: post for row ${rowId} was deleted and NOT recreated — reschedule needed`);
    throw e;
  }
  const { error } = await db.from('posts').update({
    draft_content: newContent, ...(comment !== undefined ? { first_comment: comment } : {}),
    postiz_id: pid, scheduled_at: newDate, sync_state: 'synced',
    ...(images ? { media: { ...(row.media ?? {}), images: newImages, image_count: newImages.length } } : {}),
  }).eq('id', rowId);
  if (error) throw error;
  await log(rowId, 'postiz_edited', `delete+recreate → postiz ${pid} @ ${newDate}; content ${content ? 'CHANGED' : 'kept'}, comment ${comment !== undefined ? 'CHANGED' : 'kept'}`);
  await ntfy(`Edited scheduled post (${row.source_angle_name ?? rowId.slice(0, 8)}): now postiz ${pid} @ ${newDate}${content ? ' — TEXT CHANGED' : ''}`);
  return { rowId, postizId: pid, date: newDate };
}

/** Cancel a scheduled post. Row returns to 'drafted' (or pass finalStatus e.g. 'rejected'). */
export async function cancel(rowId, finalStatus = 'drafted') {
  const row = await loadRow(rowId);
  if (row.postiz_id) await postizDelete(row.postiz_id);
  const { error } = await db.from('posts').update({
    postiz_id: null, scheduled_at: null, status: finalStatus, sync_state: null,
  }).eq('id', rowId);
  if (error) throw error;
  await log(rowId, 'postiz_cancelled', `unscheduled (postiz ${row.postiz_id ?? 'none'}) → status ${finalStatus}`);
  await ntfy(`Cancelled scheduled post ${row.source_angle_name ?? rowId.slice(0, 8)} → ${finalStatus}`);
  return { rowId, status: finalStatus };
}

/** Upload an image to Postiz; returns {id, path} for use in schedule/edit images arrays. */
export async function upload(filePath) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(filePath)], { type: 'image/png' }), basename(filePath));
  const res = await fetch(`${API}/upload`, { method: 'POST', headers: { Authorization: KEY }, body: form });
  const body = await res.text();
  if (!res.ok) throw new Error(`Postiz upload ${res.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body); // {id, path}
}

/** Pipeline view of everything scheduled. */
export async function list() {
  const { data, error } = await db.from('posts')
    .select('id, scheduled_at, postiz_id, status, sync_state, source_angle_name, draft_content')
    .eq('status', 'scheduled').order('scheduled_at');
  if (error) throw error;
  return data.map(r => ({ id: r.id, when: r.scheduled_at, postiz: r.postiz_id, sync: r.sync_state,
    angle: r.source_angle_name, hook: r.draft_content?.split('\n')[0].slice(0, 70) }));
}

// ---- CLI ----
const [cmd, ...args] = process.argv.slice(2);
if (cmd) {
  const readIf = (flag) => { const i = args.indexOf(flag); return i >= 0 ? readFileSync(args[i + 1], 'utf8').trim() : undefined; };
  const val = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
  const out = await ({
    schedule: () => schedule(args[0], args[1], args[2] ? JSON.parse(readFileSync(args[2], 'utf8')) : []),
    edit: () => edit(args[0], { content: readIf('--content'), comment: readIf('--comment'), date: val('--date'),
      images: val('--images') ? JSON.parse(readFileSync(val('--images'), 'utf8')) : undefined }),
    cancel: () => cancel(args[0], args[1] ?? 'drafted'),
    upload: () => upload(args[0]),
    list: () => list(),
  }[cmd] ?? (() => { throw new Error(`unknown command: ${cmd} (schedule|edit|cancel|upload|list)`); }))();
  console.log(JSON.stringify(out, null, 2));
}
