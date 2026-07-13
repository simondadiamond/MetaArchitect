---
name: blog-insert
description: Use when the blog pipeline dispatcher advances a blog_ideas row to the inserting stage — a transition Simon's own final-review approval performs, never this skill — or when Simon asks to insert an approved, fact-checked pipeline post into blog_posts as a gated draft. Consumes the newest optimized_draft and a passing factcheck_report artifact and produces the blog_posts draft row (idea stage + legacy status both flip to promoted_to_post). Do NOT trigger for the independent pre-insert claim verification (blog-factcheck) or for generating LinkedIn/derivative content from an already-published post (repurpose).
---

## Blog Insert Process

**Risk tier: medium (S + T + E)** — Supabase reads/writes (`blog_ideas` stage + legacy status, `blog_artifacts` reads, `public.blog_posts` insert) plus the shared LinkedIn gate. On any failure:

```
❌ blog-insert failed at [stage] — [error message] — row set to failed_inserting, safe to retry
```

This skill handles **article** rows only (`post_type:'article'`) — teardown rows never reach the `inserting` stage; teardown-generate runs its own separate insert path entirely outside the `blog_ideas` stage machine (its own claim-provenance check happens at generation time, not here).

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

Stages: `load_inputs → verify_factcheck → assemble_payload → linkedin_extract → insert_gate → persist`. Log via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there), `step_name: 'blog_insert'`, `stage` matching whichever phase failed or `'persist'` on success. **The final success log is the one exception to logging against `state.entityId`**: it records `entity_id` as the newly created `blog_posts` row id, not the idea id — this run's durable output is the post, and Traceability should point at what was actually created:

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId,
  step_name: 'blog_insert', stage: state.stage, output_summary: '<what happened>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
// on the success path only, entity_id becomes the new post row's id — see Phase 5.
```

---

### Stage Contract (pipeline mode)

The row must already be at `'inserting'` when this skill runs. The `awaiting_final_review → inserting` transition is **human-only** — Simon's own read of the `blog-factcheck` verdict and his go-ahead — this skill never performs it, no matter how clean the inputs look. Retrying a `failed_inserting` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'inserting') throw new Error(`row not at inserting (found: ${idea?.stage})`);
```

Any other stage (`awaiting_final_review`, `failed_inserting`, `promoted_to_post`, anything) → stop, touch nothing, report the mismatch.

**Resume check (Tolerant) — this is not optional here.** Unlike `blog_artifacts` (append-only, safe to double-write), a `blog_posts` insert is a one-shot side effect: a crash between a successful insert and the stage/status update would otherwise cause a retry to insert a **second** post row for the same idea. Before doing any other work, check for a prior insert:

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
const { data: existingPost } = await pub.from('blog_posts')
  .select('id, slug, title, status, pillar, cta_type, post_type')
  .eq('source_idea_id', ideaId).maybeSingle();
```

If `existingPost` is found, a prior run already inserted the post and crashed (or lost its report) before closing out — **do not insert again.** Skip straight to Phase 5 (stage + status + log), citing the existing row, and log this run's `output_summary` as `'blog_post_reused (post <id>, slug <slug>)'` so Traceability still holds.

**Exit — the success transition IS the atomic claim:** after the insert is verified (fresh insert or the resume-check's existing row), `claimStage(ideaId, 'inserting', 'promoted_to_post')`. If it returns `false`, another run already advanced the row past `inserting` — **and this run may have just inserted a second `blog_posts` row for the same idea, since that insert is not append-only-safe.** Report this exact situation to Simon explicitly (idea id, both post row ids if a fresh insert happened here, which one is now orphaned) so he can clean it up by hand; do NOT `setStage` or touch `status` in this branch.

**Failure:** re-check the row is still at `'inserting'` (`getIdea`), then `setStage(ideaId, 'failed_inserting')`; if it already moved, just report.

---

### PHASE 1 — Load Inputs and Verify the Factcheck Precondition

```javascript
const optimizedDraft = await latestArtifact(ideaId, 'optimized_draft');
const factcheckReport = await latestArtifact(ideaId, 'factcheck_report');
```

`optimizedDraft` is the **newest** version — `blog-factcheck`'s Phase 4 repair path saves a repaired text as a new `optimized_draft` version when it needs to cut or reattribute a claim, and `latestArtifact` orders `created_at desc`, so a repair automatically supersedes the version it fixed. This is the text that publishes; never reach further back for an earlier version.

**Missing `optimizedDraft` → `failed_inserting`** ("no optimized_draft found — run blog-optimize first"); stop.

**`factcheckReport` is REQUIRED and its verdict must be all-PASS.** A missing report, or one that isn't clean, means this row reached `inserting` without ever clearing the tripwire `blog-factcheck` exists to be (the 2026-07-07 Ramp incident, `docs/lessons.md`) — that is not a normal retry-safe failure, it is a process breach worth naming plainly:

- Missing `factcheckReport` → `failed_inserting`, log message verbatim: **"row reached inserting without a passing factcheck — investigate how"**.
- Present but stale — `factcheckReport.created_at` is older than `optimizedDraft.created_at` (something changed the draft after the report was written, without a fresh factcheck run) → same failure, same verbatim message; a report that doesn't describe the text actually about to publish is not a passing report.
- Present and current, but any row in its verdict table still reads `FAIL` → same failure, same verbatim message. (`blog-factcheck`'s Stage Contract only advances a row past `fact_check` on an all-PASS report, so a lingering FAIL row here means the report predates a repair that was never re-verified and re-persisted — exactly the kind of drift this precondition exists to catch, not paper over.)

Do not attempt to repair or reinterpret a failing/missing report yourself — that is `blog-factcheck`'s job, on a row the dispatcher will reset to `fact_check` after Simon looks at it.

---

### PHASE 2 — Assemble the Payload

Field names are `public.blog_posts` columns (registry: `projects/Content-Engine/.claude/skills/supabase.md`):

```javascript
const payload = {
  slug: optimizedDraft.meta.slug,
  title: optimizedDraft.meta.title,
  excerpt: optimizedDraft.meta.excerpt,
  body_markdown: optimizedDraft.content,
  pillar: optimizedDraft.meta.pillar,
  status: 'draft',   // always — publishing is Simon's separate, later, manual step
  seo_title: optimizedDraft.meta.seo_title,
  seo_description: optimizedDraft.meta.seo_description,
  cta_type: optimizedDraft.meta.cta_type,
  featured: optimizedDraft.meta.featured,
  reading_time_minutes: optimizedDraft.meta.reading_time_minutes,
  tags: optimizedDraft.meta.tags,
  geo_citability: optimizedDraft.meta.geo_citability,   // insert-blog-post.mjs's gate needs this
  canonical_url: optimizedDraft.meta.canonical_url,
  post_type: idea.post_type,
  source_idea_id: idea.id,
  // linkedin_extract added in Phase 3
};
```

Every metadata field here is `blog-optimize`'s own persisted `meta` verbatim (`optimized_draft` artifact) — this skill does not re-derive title/slug/tags/etc., it carries forward what Simon already saw at the `awaiting_final_review` checkpoint plus whatever `blog-factcheck` repaired.

---

### PHASE 3 — Generate and Gate the LinkedIn Extract

Read `.claude/skills/repurpose/references/linkedin-playbook.md` fresh this run for anatomy, hook patterns, and the anti-slop checklist — do not restate it here. This mirrors `write-post` Step 6's `LINKEDIN_EXTRACT` block exactly; that pointer covers the format.

**Claim provenance for this stage specifically:** every claim the extract makes must trace to a sentence already present in `optimizedDraft.content` — the text `blog-factcheck` just independently re-verified. **Introduce nothing new here.** An extract that sharpens or adds a claim not already sitting in the factcheck-verified body reopens exactly the hole `blog-factcheck` exists to close, one stage later where nothing will catch it.

Write the candidate to a temp file and gate it:

```bash
bash scripts/linkedin-gate.sh projects/Content-Engine/.tmp/blog-insert-linkedin-<ideaId>.txt
```

**Full LinkedIn mode — not `--blog`.** This is a standalone LinkedIn post (word count, hook length, em dashes, the lot), unlike the blog-mode gates upstream skills run on assembled article prose. Also apply the judgment checks in `.claude/skills/repurpose/references/linkedin-gate.md` (anatomy, close, save-worthy element, source-number fidelity, claim provenance, `/score` cadence). **Gate failure → rewrite and re-gate. Never save a failing extract, never lower the bar.**

Once it passes, set `payload.linkedin_extract` to the gated text.

---

### PHASE 4 — The Insert

Write the complete payload to a JSON file — **never embed the body in a bash heredoc**:

```javascript
import { writeFileSync } from 'node:fs';
writeFileSync(`projects/Content-Engine/.tmp/blog-insert-${ideaId}.json`, JSON.stringify(payload, null, 2));
```

```bash
node projects/Content-Engine/tools/insert-blog-post.mjs --require-faq --idea <ideaId> projects/Content-Engine/.tmp/blog-insert-<ideaId>.json
```

**The script IS the gate** (31 fixtures plus the `post_type` / `canonical_url` / `source_idea_id` / FAQ extension) — never hand-roll the insert, never edit the gate to make a payload pass. `--require-faq` additionally requires a `## FAQ` section with ≥3 ICP-phrased questions (already `blog-optimize`'s job to have added) and `canonical_url` + `source_idea_id` to be present and consistent with `--idea`.

**Gate failure** (validation errors, not a slug conflict) → `failed_inserting`, with the script's stderr output **verbatim** in the log's `output_summary`. Do not retry silently — the payload has a real defect (missing FAQ, unticked GEO box, failing `linkedin_extract`, etc.) that needs fixing, not resubmitting as-is.

**Slug conflict** (the script's insert error names a duplicate-key/slug conflict): adjust the slug once — append a numeric suffix (`-2`; increment if that's also taken) — update `payload.slug` and `payload.canonical_url` to match, rewrite the payload file, and re-run the same command once. **A second failure of any kind → `failed_inserting`**, gate/error output verbatim in the log.

---

### PHASE 5 — Verify, Persist Stage + Status, Log, Report

**Post-insert verify** — read the row back by slug with a fresh query (belt-and-suspenders on top of the script's own verify):

```javascript
const { data: post, error } = await pub.from('blog_posts')
  .select('id, slug, title, status, pillar, cta_type, post_type').eq('slug', payload.slug).single();
if (error || !post) throw new Error(`post-insert verify failed: ${error?.message ?? 'row not found'}`);
```

**Close the run per the Stage Contract's exit transition:**

```javascript
const claimed = await claimStage(ideaId, 'inserting', 'promoted_to_post');
if (claimed) {
  await pub.from('blog_ideas').update({ status: 'promoted_to_post', updated_at: new Date().toISOString() }).eq('id', ideaId);
  // there is no setStatus helper in blog-artifacts.mjs — this legacy enum column
  // (candidate | researched | drafted | promoted_to_post | rejected, defined in
  // simonparis-website's 0001_blog_alignment.sql) is written directly here.
} else {
  // see Stage Contract exit note — report the duplicate-row situation, do not touch status
}
```

**Log** (`step_name: 'blog_insert'`, `entity_id: post.id` — the new post row, not the idea, per STEP 0):

```javascript
await logEntry({ workflow_id: state.workflowId, entity_id: post.id, step_name: 'blog_insert',
  stage: 'persist', output_summary: `blog_posts row created (slug ${post.slug}), idea ${ideaId} -> promoted_to_post`,
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

**Report to Simon:** use `write-post` SKILL.md **STEP 8**'s report block verbatim as the format — title, pillar, CTA, word/read-time, slug, preview URL, Supabase dashboard link, the `UPDATE blog_posts SET status='published', published_at=NOW() WHERE slug='<slug>';` publish SQL (this post's slug), confirmation the LinkedIn extract sits in `linkedin_extract` ready to copy, and a `Notes:` line for anything needing attention (slug adjusted, `skipped_optimizations` inherited from `optimized_draft.meta` worth resurfacing, or the resume-check/duplicate-row situations above). Read that block fresh each run rather than duplicating it here.

<!-- task-12 note: when write-post is rewritten as orchestrator, move Step 8's report block here and flip the pointer -->

**Rule: a pipeline insert run that ends without a verified `blog_posts` row is a failed run.** If the gate never passed or the post-insert verify fails, do not fabricate a report — set the row to `failed_inserting` and stop.
