---
name: blog-optimize
description: Use when the blog pipeline dispatcher advances a blog_ideas row to the optimizing stage, or when Simon asks to optimize/SEO-pass a pipeline post — consumes the post-editorial draft and outline artifacts and produces the optimized_draft artifact (metadata, FAQ, internal links). Do NOT trigger for editing/reviewing a draft's prose (editorial) or for the post-optimization fact check (blog-factcheck).
---

## Blog Optimize Process

**Risk tier: medium (S + T + E)** — Supabase reads/writes (`blog_ideas` stage, `blog_artifacts`, public `blog_posts` link map) in pipeline mode only; no LLM external API calls beyond the reasoning done in this session. On any failure:

```
❌ blog-optimize failed at [stage] — [error message] — row set to failed_optimizing, safe to retry
```

This skill handles **both** `post_type` values. Teardown rows arrive at `optimizing` via `teardown-generate`'s handoff (its Step 4 `saveArtifact({ kind: 'draft', ... }); setStage(ideaId, 'editing')`, then `editorial` advances `editing → optimizing`) and share this stage with articles — same process below, with the input differences noted in the subsection immediately after this one.

---

### Teardown rows (`post_type:'teardown'`)

Teardown rows have **no `outline` artifact** — that is expected, not a failure. Teardowns skip `outlining`/`awaiting_outline_approval` entirely (the teardown format IS the outline; see design spec §4). Do **not** fail a teardown row in PHASE 1 for a missing outline. The differences from the article path:

- **Title / slug.** `title` comes from the draft artifact's top heading (teardown format: `"[System Name] STATE Teardown: [subtitle]"`) — parse it from the draft content, don't invent one. `slug` comes from the draft artifact's `meta.blog_slug` (set by `teardown-generate` at hand-off) — **never re-derive it**; reusing it is what keeps the eventual `blog_posts.slug` matching the `teardown_drafts.blog_slug` and the card-image URL already built against it.
- **`primary_keyword`.** No outline to read it from — derive it from the system name (e.g. `"<system name> STATE teardown"`). The DataForSEO volume check is optional here; `'unverified'` is an acceptable value in the metadata's keyword field for teardown rows.
- **Internal links.** There is no outline link plan to apply. `teardown-generate`'s own pre-write gate (`teardown-gate.py`, Gate 10b) already enforced 8–12 links including ≥1 internal link before the draft was written. This stage's job for a teardown row is to **verify** those links against the live link map (the same Phase 2 query, unchanged) and only **add** links if the post falls under the 2–5-per-1,000-words floor — there's nothing to "insert a plan" for.
- **FAQ.** The teardown format ships exactly 3 FAQ questions already (not the 3–5 an article FAQ may have). Verify each answer meets the 80–150-word self-contained rule; if one runs short, extend the **answer**, not the questions — the question count is part of the teardown format and isn't this stage's to change.
- **`cta_type` / `pillar`.** `cta_type` is `'audit'` for teardowns (they exist to drive `/score`) — don't parse it from a nonexistent outline `CTA TYPE:` line. `pillar` still comes from `idea.pillar` (by convention, `state_applied` for teardowns, same as every other row).

Everything else — voice veto, the mechanical gate (PHASE 4), metadata assembly, `geo_citability`, artifact persist, and the Stage Contract — is identical to the article path.

---

### STEP 0 — STATE Init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,          // set to the blog_ideas row id once known
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Stages: `load_inputs → verify_link_map → apply_optimizations → gate → persist`. Log via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there), `step_name: 'blog_optimize'`, `stage` matching whichever phase failed or `'persist'` on success:

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'blog_optimize',
  stage: state.stage, output_summary: '<what was produced>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

---

### Stage Contract (pipeline mode)

The row must already be at `'optimizing'` when this skill runs. The `editing → optimizing` transition is `editorial`'s exit claim — this skill never performs it. Retrying a `failed_optimizing` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'optimizing') throw new Error(`row not at optimizing (found: ${idea?.stage})`);
```

Any other stage (`editing`, `failed_optimizing`, anything) → stop, touch nothing, report the mismatch. Exclusivity is the dispatcher layer's job (single scheduled dispatcher, one row per fire, overlapping fires skipped) — and a double-run is safe anyway because artifacts are append-only.

**Resume check (Tolerant):** after verifying, `latestArtifact(ideaId, 'optimized_draft')` — if one exists from a prior crashed run, compare its `created_at` against `latestArtifact(ideaId, 'draft').created_at`. If the optimized_draft is newer than (or same-run as) the draft, the draft hasn't changed since — reuse it and skip straight to the exit claim, saying so in 2-3 lines in the report (still log this run, `output_summary: 'optimized_draft_reused (artifact <id>)'`, so Traceability holds). If the draft is newer, the optimized_draft is stale — redo this skill's work against the current draft.

**Exit — the success transition IS the atomic claim:** after persisting the `optimized_draft` artifact, `claimStage(ideaId, 'optimizing', 'fact_check')`. If it returns `false`, another run already advanced the row — report that this run's artifact is a redundant extra version and stop; do NOT `setStage`.

**Failure:** re-check the row is still at `'optimizing'` (`getIdea`), then `setStage(ideaId, 'failed_optimizing')`; if it already moved, just report.

---

### PHASE 1 — Load Inputs

```javascript
const draft = await latestArtifact(ideaId, 'draft');
const outline = await latestArtifact(ideaId, 'outline');
```

`draft` here is the **post-editorial** draft — `editorial` saves its revised text as a new `draft` version, and `latestArtifact` orders by `created_at desc`, so the newest version (the one editorial revised) is what you get automatically. `outline` supplies the INTERNAL LINK PLAN and the `primary_keyword` (from its persisted `meta`).

**`draft` is REQUIRED for both post_types.** Missing → `failed_optimizing` ("no draft found — run editorial first"); stop.

**`outline` is REQUIRED only when `idea.post_type === 'article'`.** Missing on an article row → `failed_optimizing` ("no outline found — run blog-outline first"); stop — do not optimize an article against a partial input set. On a **teardown** row (`idea.post_type === 'teardown'`), `outline` will be `null` and that is **expected-absent, never a failure** — teardowns skip the outlining stages entirely; every outline-sourced value below has an explicit teardown branch (PHASE 2 note, PHASE 3 item 1, and the Teardown rows subsection).

---

### PHASE 2 — Verify the Link Map

The outline's INTERNAL LINK PLAN was built against the live link map at outline time — it may have gone stale (a linked post could have been unpublished or renamed since). Do **not** re-derive or re-query beyond the plan itself; just re-check it's still true. Use the same one-off public-schema client pattern as `blog-outline` SKILL.md Phase 2 (read it fresh this run):

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
const { data: linkMap } = await pub.from('blog_posts')
  .select('slug, title, pillar, post_type').eq('status', 'published');
```

For each `[anchor text] → /blog/<slug> — why here` line in the outline's INTERNAL LINK PLAN: keep it only if `<slug>` is still in `linkMap`. If a planned slug's context vanished (post unpublished, slug changed), drop that link — do not invent a replacement — and record it in `meta.skipped_optimizations` (e.g. `"dropped link to /blog/old-slug — no longer published"`).

**Teardown rows:** there is no outline link plan — run the same `linkMap` query, but verify the internal links already present in the **draft body** against it instead (per the Teardown rows subsection): a draft link to a slug not in `linkMap` is dropped and recorded in `meta.skipped_optimizations` the same way.

---

### PHASE 3 — Apply the Optimizations

Work items, in order:

1. **Metadata block.** Populate these fields:

   ```
   TITLE:            [final chosen title]
   SLUG:             [kebab-case, ≤60 chars, no stop words]
   EXCERPT:          [40–80 words. Hook + mechanism. A reason to read, not a summary.]
   SEO_TITLE:        [title | The Meta Architect — ≤60 chars total]
   SEO_DESCRIPTION:  [120–155 chars. Names the problem and the reader type. Specific.]
   READING_TIME:     [ceil(word_count / 225)] minutes
   PILLAR:           [enum value]
   CTA_TYPE:         [audit | subscribe]
   FEATURED:         false  [true only if Simon explicitly says so]
   PRIMARY_KEYWORD:  [the 501-2,400 volume term — confirm it appears in title + first H2 + body]
   TAGS:             [include both brand terms (state-beats-intelligence) and search terms (llmops, production-ai)]

   GEO CITABILITY CHECK (required before insert):
     [ ] BLUF: core insight in first 150 words
     [ ] Every H2 opens with a 40-50 word standalone fact-block
     [ ] H2/H3 headings reviewed — question-based where natural
     [ ] Named failure mode defined (failure_taxonomy posts)
     [ ] 5-7 distinct non-obvious insights confirmed
     [ ] Entity density: specific tools/versions/error codes named throughout
     [ ] Primary keyword in title, first H2, and naturally in body
   ```

   The canonical `geo_citability` attestation keys (do not invent your own names) are defined in `projects/Content-Engine/tools/insert-blog-post.mjs`'s `GEO_BOXES` export — currently `bluf_first_150`, `fact_blocks_open_h2s`, `question_headings_reviewed`, `named_failure_mode_defined`, `distinct_insights_5_to_7`, `entity_density`, `primary_keyword_placed`. Read the export fresh each run in case it's changed. `named_failure_mode_defined` may be `"n/a"` only when `pillar !== 'failure_taxonomy'`. Every other box must be `true` — an unticked box is a reason to fix the post, not to ship the box unticked.

   `pillar` comes from `idea.pillar` (the `getIdea` result from the Stage Contract) for both post_types. The remaining fields branch on `idea.post_type`:

   **Article rows:** `cta_type` comes from the outline artifact's own `CTA TYPE:` line (the outline template `blog-outline` Phase 3 builds) — parse it from there, do not re-derive it. `primary_keyword` comes from `outline.meta.primary_keyword`. **`title` and `slug` start from `outline.meta.title_options` and `outline.meta.working_slug`** — these are what Simon approved at the outline checkpoint, not yours to invent: pick the title from `title_options` (or keep the working slug's implied one) and refine either ONLY if the final draft content genuinely requires it, noting any such refinement in the final report to Simon (same transparency spirit as `meta.skipped_optimizations`).

   **Teardown rows** (no outline exists — per the Teardown rows subsection): `title` is the draft's top heading (`"[System Name] STATE Teardown: [subtitle]"` — parse, don't invent); `slug` is `draft.meta.blog_slug` verbatim — never re-derived; `cta_type` is `'audit'`; `primary_keyword` is derived from the system name (volume check optional, `'unverified'` acceptable).

   For both: `canonical_url` is always `https://simonparis.ca/blog/<slug>` using the slug chosen in this step. `featured` is `false` unless Simon has explicitly said otherwise for this post.

2. **AEO structural pass.** Confirm the BLUF sits in the first 150 words, every H2 opens with its 40-50 word fact-block, and headings are question-form where natural — per the SEO/GEO rules canonical at the top of `write-post` SKILL.md. **Fix only mechanically** (move a fact-block back to the top of its section, rephrase a heading into question form) — never rewrite the argument or add a claim that wasn't already in the draft.

3. **FAQ section.** Add a `## FAQ` section (if one doesn't already exist) with 3-5 questions phrased the way the ICP would ask an AI assistant (not the way a marketer would phrase an FAQ). Each answer is 80-150 words and **self-contained** — citable and understandable on its own, without the rest of the post as context. Do not introduce new factual claims that aren't already supported by the draft; if a natural FAQ question would require a new claim, phrase the answer around what the post already established, or drop that question.

4. **Insert the internal link plan.** Place the surviving links from Phase 2 into the body — 2-5 per 1,000 words (already sized by the outline against its own word estimate), varied anchor text (never the same anchor phrase twice), placed where the linked post is genuinely the natural next read. A planned link with nowhere natural to sit is another one to skip and record in `meta.skipped_optimizations`, not force in.

5. **Confirm T1 claim links survived.** Editorial Pass 2 (dimension 9, stat provenance) already required every external number / attributed claim in the draft to carry its primary-source URL in-body before this stage started. Re-scan: if any edit you made in items 2-4 touched a sentence carrying one of those links, confirm the link is still there and still adjacent to the claim. Never let a heading fix or a link insertion silently drop an existing citation.

**Voice veto rule (verbatim):**

> If an optimization would cost voice — a keyword-stuffed heading, an FAQ answer that reads like a marketer wrote it, an anchor that breaks a sentence — skip it and record it in `meta.skipped_optimizations`. Brand outranks rank.

---

### PHASE 4 — Gate, then Persist

**Gate:** write the full new/changed prose from this stage — the FAQ section plus any rewritten headings or anchor sentences from items 2-4 — to a temp file at `projects/Content-Engine/.tmp/optimize-gate-<ideaId>.md` (create `.tmp/` if it doesn't exist; it's gitignored runtime state), then run:

```bash
bash scripts/linkedin-gate.sh --blog projects/Content-Engine/.tmp/optimize-gate-<ideaId>.md
```

This is blog mode (prohibitions + AI-tell shape only; em dashes and word count aren't checked — those rules are LinkedIn-scoped). **Gate failure → fix the offending prose and re-run. Never persist text that failed the gate.**

**Persist:**

```javascript
const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
const meta = {
  workflowId: state.workflowId,
  title, slug, excerpt, seo_title, seo_description,
  reading_time_minutes, pillar, cta_type, featured,
  canonical_url: `https://simonparis.ca/blog/${slug}`,
  tags, primary_keyword,
  geo_citability: { bluf_first_150, fact_blocks_open_h2s, question_headings_reviewed,
    named_failure_mode_defined, distinct_insights_5_to_7, entity_density, primary_keyword_placed },
  skipped_optimizations,   // array of strings; [] if nothing was vetoed or dropped
};
// meta carries workflowId in addition to the insert-stage fields — sibling-skill
// convention (every artifact records its producing run); the insert script ignores extras.
await saveArtifact({ ideaId: state.entityId, kind: 'optimized_draft', content: finalBodyMarkdown, meta });
```

**Rule: a pipeline optimize run that ends without an `optimized_draft` artifact is a failed run.** If the gate never passed, or persistence fails, do not fabricate a partial artifact — set the row to `failed_optimizing` and stop.

Close the run per the Stage Contract's exit transition (`claimStage` to `'fact_check'`), then report to Simon: the metadata chosen (title/slug/pillar/cta_type), FAQ question count, links inserted vs. planned, and the full `skipped_optimizations` list (empty is worth stating explicitly — "no optimizations skipped") — the row now waits on the `blog-factcheck` skill.
