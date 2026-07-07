---
name: repurpose
description: Use when Simon says "repurpose [something]", "/repurpose", "turn this teardown/blog post into LinkedIn posts", or asks for "derivatives" of existing long-form content (a teardown, a blog post, a file, pasted text). Do NOT trigger for writing new long-form content (write-post), editing an existing draft (editorial), or generating a teardown (teardown-generate).
---

# /repurpose <platform> <source>

## Purpose

Convert one piece of existing long-form content into 2–3 platform-native candidate posts, each a **different angle** on the source using a **different hook pattern**. Present candidates to Simon; on approval, save the chosen post(s) as LinkedIn drafts in `pipeline.posts`.

This skill holds the **process**. Platform mechanics (algorithm reality, hook library, post anatomy, anti-slop checklist, format ranking) live in per-platform playbooks under `references/` — read the playbook, don't restate it.

**Risk tier: medium (S + T + E)** — LLM generation + Supabase writes. Full spec: `brand/state-framework.md`. Validate every generated candidate before any write; fail loudly naming the stage.

---

## Platform Registry

| Platform | Playbook | Status |
|----------|----------|--------|
| `linkedin` | `references/linkedin-playbook.md` (this skill's directory) | live |
| `carousel` | **Carousel Mode** section below — a mode, not a playbook | live |
| `newsletter` | `references/newsletter-playbook.md` | not yet — add the playbook file + a row here |
| `x` | `references/x-playbook.md` | not yet — same |

The process below is platform-agnostic; only the playbook changes. `carousel` is the exception: it produces a slide-image set (PNGs for Postiz multi-image scheduling; optional PDF for a native document post), not text candidates — after Step 0 (STATE init) and Step 2 (source load), jump to the **Carousel Mode** section below instead of Steps 3–8. If the requested platform has no playbook file and is not `carousel`:

```
❌ /repurpose failed at platform_resolve — no playbook for "<platform>" (supported: linkedin, carousel)
```

---

## Supabase Access

All pipeline reads/writes go through `projects/Content-Engine/tools/supabase.mjs` — **run every node snippet from `projects/Content-Engine/`** (deps + `.env` resolution live there). Column registry: `projects/Content-Engine/.claude/skills/supabase.md`.

- Teardown tables are not in `TABLES` — use the raw client: `db.from('teardown_drafts')` (schema `pipeline` is the client default).
- Website blog posts live in **`public.blog_posts`** (the write-post pipeline's table). `pipeline.blog_posts` also exists but is unwired Plan 5 prep — do not read it. For the public schema, build a one-off read client (see Step 2); this is website data, not pipeline data, so the helper's pipeline-only rule doesn't apply.

---

## Step 0 — STATE Init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "post",
  entityId: null,          // set once the source row is known; stays null for file/text sources
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Update `stage` at every transition: `platform_resolve → source_load → angle_select → generate → candidate_gate → approval → save → complete`.

---

## Step 1 — Resolve Platform Playbook

Read the playbook file **in full** before generating anything. It is the source of truth for platform mechanics.

**Where the playbook conflicts with `brand/brand-summary.md`, the playbook wins.** As of 2026-07-07 the two are in sync (hashtags 0–3, length 180–300 words, scar-tissue close) — if you find a new conflict, follow the playbook and flag the drift to Simon. Two Simon-decided overrides sit above both documents:

1. **Zero em dashes** in post text and first comments (stricter than the playbook's max-2; 2026-07-05).
2. **Body links allowed** — max one bare URL; see the link rule in `references/linkedin-gate.md` (2026-07-07).

Brand voice rules (`brand/brand-summary.md`: prohibitions, burned-practitioner / specificity / thesis tests) always apply on top — the playbook's anti-slop checklist includes them.

---

## Step 2 — Detect and Load the Source

Detect which source type the argument is, in this order:

1. **Teardown draft** — argument matches a row in `pipeline.teardown_drafts` (UUID, `blog_slug`, or the candidate's name):

```javascript
const { db } = await import('./tools/supabase.mjs');
const FIELDS = 'id, blog_slug, status, system_summary, state_scores, gaps, remediation, linkedin_post, outreach, post_angle, full_content';
// UUID arg → .eq('id', arg). Otherwise slugify the arg and match blog_slug:
const slug = arg.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
let { data } = await db.from('teardown_drafts').select(FIELDS).ilike('blog_slug', `%${slug}%`);
if (!data?.length) {
  // fall back to the candidate name
  const { data: cands } = await db.from('teardown_candidates').select('id').ilike('name', `%${arg}%`);
  if (cands?.length) ({ data } = await db.from('teardown_drafts').select(FIELDS).in('candidate_id', cands.map(c => c.id)));
}
```

2. **Blog post** — argument matches a slug in `public.blog_posts`, or is a markdown file inside `projects/simonparis-website/`:

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
const { data: post } = await pub.from('blog_posts')
  .select('id, slug, title, excerpt, body_markdown, pillar, status, linkedin_extract')
  .eq('slug', slug).maybeSingle();
```

3. **File path** — the argument is an existing file: Read it. `state.entityId` stays null.

4. **Pasted text** — multi-line argument ≥ ~150 words: use verbatim as the source.

Nothing matched, or matched >1 row ambiguously:

```
❌ /repurpose failed at source_load — "<arg>" matched no teardown_draft, blog_post, file, or usable text (list what was tried)
```

Set `state.entityId` to the source row's id when there is one. Log the load:

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'repurpose_source_loaded',
  stage: 'source_load', output_summary: `<type>: <identifier>, ${sourceText.length} chars`, model_version: 'n/a', status: 'success' });
```

**Teardown sources**: also read the existing `linkedin_post` and `outreach.alt_hooks` — those angles are already taken. Candidates must complement them (different pillar emphasis, different hook patterns), not duplicate them. Never modify `teardown_drafts` from this skill.

---

## Step 3 — Choose 2–3 Angles

Each candidate = one distinct slice of the source + one distinct hook pattern from the playbook's 12-pattern hook library. No two candidates share a pattern or an angle.

Default angle sets (adapt to what the source actually supports — never force an angle the evidence can't carry):

| Source | Angle candidates |
|--------|-----------------|
| Teardown | the score/receipts angle (pattern 4 territory) · the single-worst-gap angle · the remediation-pattern angle (patterns 6/12) · the strongest verbatim quote (pattern 10) |
| Blog post | the contrarian thesis · the sharpest single mechanism/failure mode · the checklist/taxonomy (save-worthy) · the cost-of-the-gap number |
| File / text | same logic: lead claim, best mechanism, most referenceable artifact |

Assign each candidate an intent (`authority` / `education` / `community` / `virality`) — repurposed technical content is usually authority or education.

---

## Step 4 — Generate Candidates

Write each candidate against the playbook's **post anatomy** (hook fold-check, setup, turn = the dwell-time payload, save-worthy lesson, close). Hard rules on top of the playbook:

- **Every specific comes from the source.** Numbers, quotes, failure modes, names — pulled verbatim from the source material. Never fabricate an anecdote or a stat.
- **No "it's not X, it's Y" shape anywhere in a hook** — LinkedIn's publicly named AI-tell (playbook explains). This includes the brand's own "not about the model, about the plumbing" phrasing; vary it ("The model was fine. The plumbing wasn't.").
- **Zero em dashes** in the post and the first comment. Simon's call, 2026-07-05: the ICP reads em dashes as the ChatGPT signature — stricter than the playbook's max-2 budget; the stricter rule wins. Short sentences do the emphasis work.
- **Links**: the blog/teardown link may sit in the body (max one bare URL, never in the hook, no markdown syntax — LinkedIn strips it) or in the first comment. Either way the post must deliver its core insight without the click. Name sources in prose ("ZenML's write-up says…").
- Line break every 1–2 sentences. No decorative-symbol bullets. Hashtags: default 0, max 3 niche.

Each candidate ships as a package:

1. **Hook pattern** — number + name from the playbook library
2. **Rationale** — one line: which slice of the source and why this angle
3. **Post text** — 180–300 words
4. **Suggested first comment** — the author's seed comment: added mechanism, a supporting detail, or the source link. Never filler ("Thanks for reading!").

Log the generation step (T — this is the LLM call of this workflow):

```javascript
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'repurpose_candidates_generated',
  stage: 'generate', output_summary: `<n> candidates, patterns: <ids>`, model_version: '<current model>', status: 'success' });
```

---

## Step 5 — Validation Gate (E — Explicit)

Every candidate passes this gate **before being shown to Simon** and re-passes it (post-edit) before any write. A failure means rewrite the offending line and re-run the gate — never present or save a failing candidate, never silently lower the bar. If a candidate can't pass after two rewrites, drop it; if fewer than 2 candidates survive, fail loudly:

```
❌ /repurpose failed at candidate_gate — [which check failed on which candidate] — nothing written
```

**Run the full shared gate** — `references/linkedin-gate.md` (mechanical greps + judgment checks, including claim provenance, source-number fidelity, no implied incidents, and the `/score` CTA cadence). That file is the single canonical copy of the gate for every LinkedIn-copy producer; never re-derive or fork the checks locally.

**Repurpose-specific checks on top of the shared gate:**

- [ ] Candidates are actually distinct: different hook patterns, different angles, and (for teardowns) none duplicates the draft's existing `linkedin_post` angle
- [ ] **No sentence (≥6 words) reused verbatim from the source's existing derivative posts** (`teardown_drafts.linkedin_post`, `outreach.alt_hooks`, `blog_posts.linkedin_extract`). Quoting the *source system's* evidence is fine; recycling your own shipped post lines is not — the 2026-07-05 test run caught two of these on the first pass. Check mechanically: split candidates into sentences and search each against the shipped texts.
- [ ] First comment adds mechanism or the link — the post stands alone without it
- [ ] **Set-level dedupe** (2026-07-06 review): across the full set *including the teardown's own `linkedin_post`*, no two posts share their lesson paragraph's core dichotomy or closing move — serialized posts each carry ONE distinct payload; the reader of Monday's post must not get déjà vu Wednesday
- [ ] **First comments as a set**: zero em dashes (same rule as bodies), structures varied (never the same "link + payoff clause" template every time), `/score` CTA cadence per the shared gate

---

## Step 6 — Present for Approval (STOP)

Show Simon the candidates and **stop**. Nothing is written to `pipeline.posts` before an explicit pick.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/repurpose linkedin — <source identifier>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CANDIDATE 1 — pattern <n>: <name> | intent: <intent> | <words>w | gate: PASS
Angle: <one-line rationale>

<post text>

First comment: <seed comment>
---
CANDIDATE 2 — ...
---
CANDIDATE 3 — ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pick 1+ to save as drafts (e.g. "save 1 and 3"), edit, or reject.
```

If Simon edits a candidate, re-run the Step 5 gate on the edited text before saving.

---

## Step 7 — Save Approved Drafts

For each approved candidate, **create** a row in `pipeline.posts` — the same table and shape the `/draft` flow uses for LinkedIn drafts. (`/draft`'s "patch, don't create" rule applies to its pre-planned stubs; a repurposed post has no stub, so `createRecord` is correct here.)

```javascript
const { createRecord, logEntry, TABLES } = await import('./tools/supabase.mjs');
const row = await createRecord(TABLES.POSTS, {
  platform:          'linkedin',
  status:            'drafted',
  intent:            candidate.intent,                    // authority | education | community | virality
  format:            'text',                              // playbook format: text | document | image
  pillar:            sourcePillar ?? null,                // teardowns → 'STATE Framework Applied' unless a gap angle fits another pillar
  post_class:        'repurposed',
  source_angle_name: candidate.hookPatternName,           // e.g. "receipts/scored-teardown"
  thesis_angle:      candidate.rationale,
  draft_content:     candidate.postText,                  // post text ONLY — first comment is not part of it
  first_comment:     candidate.firstComment,              // column live since 2026-07-06 (migration 0010)
  drafted_at:        new Date().toISOString(),
});
await logEntry({ workflow_id: state.workflowId, entity_id: row.id, step_name: 'repurpose_draft_created',
  stage: 'save', output_summary: `linkedin draft from <source type> <source id/slug>, pattern: ${candidate.hookPatternName}`,
  model_version: '<current model>', status: 'success' });
```

**Storage note**: `first_comment` and `media` are real columns now (2026-07-06 migrations) — the first comment goes ON the row, where `tools/postiz-comment-nudge.mjs` reads it at publish time. Still also write the full run record to `projects/Content-Engine/.tmp/repurpose-<YYYYMMDD>-<source-slug>.md` (all candidates incl. unsaved ones, gate results, source id). Source provenance goes in the `pipeline.logs` `output_summary` (above). Scheduling happens via the `linkedin-publish` skill (`tools/postiz.mjs`) — never an ad-hoc script.

Never touch the source row (`teardown_drafts` / `blog_posts`) from this skill.

**Multi-candidate saves are NOT atomic** — the loop above inserts one row at a time. Capture each returned `row.id` as you go. If insert *k* fails: report exactly which rows WERE written (with ids), log the error, and resume by inserting only the missing candidates — never blind-retry the whole loop (that duplicates the rows that succeeded). Any later action on these rows (scheduling, editing, deleting) uses the **captured ids** — never re-query by `source_angle_name` or another non-unique attribute (lessons.md 2026-07-06: an attribute re-query grabbed a stale test draft and nearly published it).

**Test-run hygiene (lessons.md 2026-07-06):** any test or dry run of this skill that writes to `pipeline.posts` ends by marking its rows `status: 'rejected'` (using the captured ids) before the session moves on. Test rows left `drafted` in a production table are live ammunition for every future query.

---

## Step 8 — Report

```
✅ /repurpose linkedin — <n> draft(s) saved to pipeline.posts (status: drafted)
   <post id> — pattern <n>: <name> — "<hook first ~60 chars…>"
   Full run record: projects/Content-Engine/.tmp/repurpose-<date>-<slug>.md
   Next: schedule via the linkedin-publish skill (tools/postiz.mjs) — Tue/Thu 10:30 ET slots; the nudger pings the first comment at publish time; stay 20 min post-publish per playbook
```

---

## Carousel Mode — `/repurpose carousel <teardown>`

Builds a 7-slide LinkedIn carousel (PNG set by default; optional PDF document post) from a teardown draft, using the live brand-styled OG image routes on simonparis.ca and `projects/Content-Engine/tools/carousel.mjs` (fetch + stitch, pdf-lib installed at repo root). Teardown drafts only — the manifest needs `state_scores`, `gaps`, `remediation`, `blog_slug`; any other source type fails at `source_load`.

Shared steps: **Step 0** (STATE init — stages for this mode: `platform_resolve → source_load → compose → manifest_gate → approval → build → save → complete`) and **Step 2** (source detection/loading + the source-load log entry). Steps 3–8 do not apply; this section replaces them.

### C1 — Compose the 7-slide manifest

A manifest is an ordered JSON array of `{ "slide": <type>, "params": {...} }`. Fixed composition:

| # | Slide | Content — everything pulled from the draft, nothing invented |
|---|-------|--------------------------------------------------------------|
| 1 | `cover` | `name` (candidate/system name), `score` (total from `state_scores`), `pillars` (5 digits 0–2 in order **S, T, A, TOL, E** — derived from `state_scores.s/t/a/tol/e.score`), `verdict` (the draft's one-line subtitle, shortened) |
| 2 | `summary` | What the system is + what it gets right: `title` + up to 5 `lines` from `system_summary` and the "gets right" section |
| 3 | `pillar` | Highest-severity gap: `pillar`, `pscore` (that pillar's score from `state_scores`), `heading`, up to 4 evidence `lines` compressed from the gap's text + the pillar's `state_scores` reasoning |
| 4 | `pillar` | Second-highest-severity gap, same shape |
| 5 | `mechanism` | The visceral failure-mechanism passage from `full_content`, compressed to ≤280 chars `body` + `heading` |
| 6 | `artifact` | The remediation schema/field list as mono `lines` (e.g. the state-object fields from "What Good Looks Like") |
| 7 | `outro` | `slug` = `blog_slug` (renders `simonparis.ca/blog/<slug>`) |

Every slide also carries `name`, `k` (its 1-based index), `total` (7). Save the manifest to `projects/Content-Engine/.tmp/carousel-manifest-<blog_slug>.json`.

**Slide text rules** (on top of brand voice, `brand/brand-summary.md`):

- **Zero em dashes** anywhere in slide text — same rule as Step 4; use colons, commas, periods.
- **No engagement bait** — no "follow for more"-style lines beyond what the outro slide itself renders, no "agree?", no CTAs in slide bodies.
- **Every specific from the source** — numbers, quotes, failure modes verbatim from the draft. Never fabricate.
- **Stay strictly inside the char limits below.** The server truncates overlong text mid-word with `...` — it will not error, it will just look broken. Truncation is a composition failure, not a safety net.

### C2 — Route reference (tested against production, 2026-07-06)

Route: `https://simonparis.ca/api/og/teardown-slide?slide=<type>&...` — all slides render 1080×1350 PNG. (The standalone card lives at `/api/og/teardown` with the same params as `cover`.)

| Slide | Params | Limits |
|-------|--------|--------|
| `cover` | `name`, `score` (0–10), `pillars` (exactly 5 digits, each 0–2), optional `n`, `verdict` | **strictly validated — HTTP 400** on missing/invalid `name`/`score`/`pillars` |
| `summary` | `title`, `lines` (pipe-separated) | title ≤60 chars, max 5 lines × ≤90 chars |
| `pillar` | `pillar` = `S\|T\|A\|TOL\|E`, `pscore` 0–2, `heading`, `lines` | heading ≤60, max 4 lines × ≤90 |
| `mechanism` | `heading`, `body` | heading ≤60, body ≤280 |
| `artifact` | `heading`, `lines` | heading ≤60, max 8 lines × ≤60, rendered mono in a panel |
| `outro` | `slug` | renders the teardown URL + follow line |

Shared params: `name`, `n`, `k`/`total` (the "k/N" index; the cover renders without it).

**Quirks (verified):**

- Only `cover` validates its params (400). **Every other slide type returns 200 no matter what**: missing params render empty, an out-of-range `pscore` (e.g. 5) silently **clamps to 2/2**, an unknown `pillar` value still renders. Wrong data produces a plausible-looking wrong slide — the manifest gate below is the only thing that catches it.
- Overlong `title`/`heading`/`lines`/`body` truncate server-side with `...`, mid-word.
- Lines beyond the max (5/4/8) are **dropped silently**.
- Unknown `slide` type → HTTP 400 `text/plain`.

### C3 — Manifest Gate (E — Explicit)

Before showing Simon anything, verify mechanically (node one-liner against the manifest file):

- Exactly 7 slides, in the order above; `k` = position, `total` = 7 on every slide.
- Cover `pillars` string matches `state_scores` (order S,T,A,TOL,E) and `score` equals the pillar sum.
- Each `pillar` slide's `pscore` equals that pillar's `state_scores` score — the route will happily render a wrong one.
- All char/line limits above hold (count them, don't eyeball).
- `grep -c '—'` on the manifest file = 0; banned-phrase grep from Step 5 = 0.

Failure → rewrite the offending slide and re-run. Cannot pass → `❌ /repurpose failed at manifest_gate — [slide k: which check] — nothing written`.

### C4 — Present for Approval (STOP)

Same pattern as Step 6: show the manifest **content** slide-by-slide (slide type, heading/title, every line, the body text) plus the cover score/pillars string, and **stop**. No PDF is built, nothing is written, before Simon approves. If he edits slide text, re-run C3 on the edited manifest.

### C5 — Build + Verify

**Primary output is the PNG set** — Simon schedules posts through Postiz, which handles LinkedIn multi-image posts but NOT PDF document uploads (Simon, 2026-07-06). The PDF is optional, only for manually uploading a native document post.

```bash
cd projects/Content-Engine
node tools/carousel.mjs .tmp/carousel-manifest-<slug>.json .tmp/carousel-<slug>/     # PNGs (default deliverable)
node tools/carousel.mjs .tmp/carousel-manifest-<slug>.json .tmp/carousel-<slug>.pdf  # PDF (only if Simon asks)
```

The tool enforces per-slide HTTP 200 + `image/png` + non-empty body and fails loudly naming the slide index (its own E gate). Verify: 7 numbered PNGs exist, each 1080×1350 (`file` output), then **visually inspect every PNG** (Read each file) — the routes render whatever params arrive, so a wrong-but-plausible slide passes every mechanical check.

**Preview channel rule (lessons.md 2026-07-06): humans never preview via raw slide URLs.** These URLs run 500–900 chars; SSH terminals truncate them at click time, silently cutting query params mid-percent-escape — the route then renders a plausible slide with missing lines or literal `%3`-style junk, and it looks like a generation bug. The slide URLs are machine-facing only (the tool, Postiz, `media.carousel_slide_urls`). For Simon's preview, present the rendered PNGs directly (e.g. an Artifact page with the images embedded as data URIs — works over SSH with zero file access). Log the build to `pipeline.logs` (`step_name: 'carousel_built'`, stage `build`).

### C6 — Save to pipeline.posts (graceful on missing column)

Attach the artifacts to the teardown's existing LinkedIn draft row in `pipeline.posts` — find its id in the `.tmp/repurpose-<date>-<slug>.md` run record, or via `pipeline.logs` (`step_name: 'repurpose_draft_created'`, slug in `output_summary`). If no posts row exists for this teardown yet, skip the DB write and report (the artifacts stay in `.tmp`; run `/repurpose linkedin` first or ask Simon).

`media` is jsonb-merged client-side (read → spread → update) via the raw client:

```javascript
const { db, logEntry } = await import('./tools/supabase.mjs');
const { data: row, error: readErr } = await db.from('posts').select('id, media').eq('id', postId).maybeSingle();
const colMissing = (e) => e && /column .*media.* does not exist/i.test(e.message);
if (readErr && !colMissing(readErr)) throw readErr;
if (!readErr) {
  const media = { ...(row?.media ?? {}), carousel_manifest: manifest, carousel_dir: pngDir, carousel_slide_urls: slideUrls };
  const { error } = await db.from('posts').update({ media }).eq('id', postId);
  if (error && !colMissing(error)) throw error;
}
```

**The `media` column may not exist yet** (migration pending; the Supabase management API was erroring when this mode shipped — confirmed missing 2026-07-06). On "column … does not exist": **do not fail the run.** Keep the manifest + PDF in `.tmp`, log the step with `output_summary: 'media column missing — artifacts in .tmp only'`, and say so in the report. Never touch `teardown_drafts`.

### C7 — Report

```
✅ /repurpose carousel — <slug>
   PNGs: projects/Content-Engine/.tmp/carousel-<slug>/ (7 slides, 1080x1350, visually verified) — schedule via Postiz as a multi-image post
   Preview: <Artifact link with embedded slides — never raw slide URLs>
   Manifest: projects/Content-Engine/.tmp/carousel-manifest-<slug>.json
   pipeline.posts <id>: media updated | media column missing — artifacts in .tmp only
   Caption comes from /repurpose linkedin, not this mode.
   (Native PDF document posts get better reach/saves than multi-image — if Simon wants that for a given teardown, build the .pdf variant and he uploads it manually.)
```

---

## Error Path

No lock is needed — pipeline writes happen only in Step 7 after approval, one row per candidate (see Step 7 for partial-failure handling; "safe to retry" means *resume the missing inserts by captured id*, not re-run the loop). On any failure:

```javascript
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'error',
  stage: state.stage, output_summary: `Error: ${err.message}`, model_version: 'n/a', status: 'error' });
```

```
❌ /repurpose failed at [stage] — [error message] — nothing written, safe to retry
```

---

## Adding a Platform Later

1. Research and write `references/<platform>-playbook.md` (same shape as the LinkedIn one: mechanics with sources, hook/format guidance, anatomy, anti-slop checklist).
2. Add the row to the Platform Registry table.
3. Done — Steps 0–8 are platform-agnostic. Only revisit Step 7 if the platform needs a different storage target than `pipeline.posts` (`platform` column currently allows `linkedin | twitter`; extend the column's accepted values first).
