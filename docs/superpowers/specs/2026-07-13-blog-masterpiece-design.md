# Blog Masterpiece Pipeline — Design Spec

date: 2026-07-13
status: awaiting Simon's review
origin: docs/handoffs/2026-07-13-blog-masterpiece-handoff.md
inputs: docs/handoffs/2026-07-13-blog-gap-analysis.md, docs/handoffs/2026-07-13-sota-blog-pipeline-brief.md
decided with Simon in session 2026-07-13 (architecture, idea tables, meta-prompting, keyword API, brand veto, teardown merge, planning layer)

## 1. Goal

One stage-driven pipeline that turns an idea into a publish-ready `blog_posts`
draft that is **rank-worthy AND Meta-Architect-worthy** — SEO/AEO/GEO built in,
brand voice holding veto — for both post types: articles and teardowns
(~50:50 of future content). Skills do all the work; Command Center is a thin
interface (capture, promote, board, approve buttons, artifact viewer);
orchestration is a schedule that polls for rows in actionable stages, runs the
stage's skill, persists an artifact, advances the stage. Publishing stays
manual — the pipeline ends at `status='draft'` in `blog_posts`, as today.

## 2. Architecture (Simon's pattern, locked)

- **Skill-centric.** Generation happens in Claude Code sessions running stage
  skills. No generation logic in CC app code.
- **Status-driven queue.** `blog_ideas` is the queue; a `stage` column drives
  the worker. A CC schedule (kind `prompt`, every 20–30 min) fires a small
  `blog-pipeline-dispatch` skill: find the oldest row in an actionable stage,
  run that stage's skill on it, persist the artifact, advance the stage, exit.
  One row per fire; overlapping fires are already skipped by the scheduler
  (also respects sterling's memory headroom — never two generation sessions).
- **Artifact per stage, append-only.** Every stage's output is a durable
  `blog_artifacts` row. Nothing overwritten; re-runs append. This delivers
  crash-resumability (STATE Tolerant — resume from the last completed stage),
  inspectable provenance for every draft, and makes repurposing trivial:
  a finished row carries research doc, brief, and final text for the
  `repurpose` skill to consume.
- **Human checkpoints** are stages the worker never advances: Simon flips them
  with a button in CC (or in chat during manual runs).

## 3. Data model (additive migration only — worker auto-applies)

- `blog_ideas` (exists): add `stage text` (drives the worker; the existing
  coarse `status` enum stays for website/reporting and updates at the
  milestones it already names), `post_type text CHECK (post_type IN
  ('article','teardown')) DEFAULT 'article'`, `capture_id uuid` (link back to
  the `public.ideas` capture, nullable). Existing `pillar`, `geo_score`,
  `source_links`, `notes` are used as-is.
- `blog_artifacts` (new): `id uuid PK, idea_id uuid FK → blog_ideas, kind
  text, content text, meta jsonb DEFAULT '{}', created_at timestamptz DEFAULT
  now()`. Kinds: `research_doc | outline | writing_brief | draft |
  editorial_report | optimized_draft | factcheck_report`. Append-only; the
  newest row per kind is current.
- `blog_posts` (exists): add `post_type text` (same check/default). Insert
  stage now also populates `canonical_url` and `source_idea_id` (finally).
  `og_image_url` stays null → dynamic `/api/og` fallback (fine).
- `public.ideas` stays the universal quick-capture inbox. A CC "Send to blog
  pipeline" action creates the `blog_ideas` row (pillar picked at promote
  time) and records `capture_id`.
- Known drift handled separately: `cta_body` is read by the website but absent
  from the migration and never written — reconcile in a website/CC story
  (either add the column officially and let optimize fill it, or drop the
  read). Decision deferred to that story; not load-bearing for the pipeline.

## 4. Stage flow

Article path:

```
candidate ──[Simon: start]──▶ researching ▶ outlining ▶ awaiting_outline_approval
                                                            │ [Simon approves]
inserting ◀ awaiting_final_review ◀ fact_check ◀ optimizing ◀ editing ◀ drafting
    │ [gate passes]
promoted_to_post   (blog_posts draft row; status enum → 'promoted_to_post')
```

Teardown path (same tail, specialized front):

```
candidate ──[Simon: start]──▶ researching (teardown deep-source research)
          ▶ drafting (teardown-generate: scores + full post + structured fields)
          ▶ editing ▶ optimizing ▶ fact_check ▶ awaiting_final_review ▶ inserting
          ▶ promoted_to_post
```

- The dispatcher selects the stage skill by `(stage, post_type)`.
- Teardowns skip `outlining`/`awaiting_outline_approval` — the teardown format
  IS the outline, and `teardown-gate.py` already enforces its structure. Their
  research stage persists a `research_doc` artifact (source_urls, verbatim
  quotes, preliminary scores) instead of today's `.tmp` checkpoint file.
- Failure: any skill error sets `stage = 'failed_<stage>'`, logs to
  `pipeline.logs`, leaves artifacts intact. Retry (CC button or chat) resets
  the stage to the failed one; the skill re-runs from durable inputs.
- Both checkpoints and `candidate → researching` are Simon-initiated; the
  worker only ever advances machine stages.

## 5. Stage skills (session work, this repo)

`write-post` is decomposed; `editorial` and the insert gate survive. Every
skill: STATE medium (state object, every LLM/API call logged to
`pipeline.logs`, validation before any write), and standalone-invocable on a
named `blog_ideas` row for testing and manual runs.

1. **blog-research** (upgrade of `research`; keeps its standalone trigger):
   NotebookLM flow (unchanged four-step rule) + **web-search SERP grounding**
   (fetch what ranks for the candidate primary keyword; record titles/URLs/
   angles verbatim in the doc) + **DataForSEO volume check** (Basic auth from
   `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` in repo-root `.env` — verified
   live 2026-07-13; on API failure the run proceeds and the doc marks volume
   "unverified", never a hard failure) + existing Supabase context pulls
   (humanity snippets, hooks, overlap check). Output: **`research_doc`
   artifact** — evidence-tiered (T1 verbatim sentence + URL rule unchanged),
   SERP snapshot, keyword candidates with volumes, angles, hooks, snippet.
   This replaces the chat-summary ending everywhere, not just for blogs.
2. **blog-outline**: consumes the research doc. Must state its **information
   gain** over the recorded SERP results (what this post adds that none of
   them have — the outline is rejected if the answer is "nothing"). Produces
   the write-post Step 3 outline (pillar, CTA, keyword, hook, BLUF,
   fact-blocks, 5–7 insights) plus an **internal-link plan** drawn from a live
   link map (published `blog_posts` slugs/titles/pillars). Artifact:
   `outline`. Advances to the approval checkpoint.
3. **blog-draft** (meta-prompting, persisted): composes a complete **writing
   brief** from research doc + approved outline + brand files + link plan +
   ICP pain points — persists it as the `writing_brief` artifact — then
   executes it. write-post Step 4 rules (voice, stat provenance origin gate,
   BLUF, fact-blocks, code-block rules) ride into the brief verbatim.
   Artifact: `draft`.
4. **editorial** (existing skill, run as a stage): three passes unchanged.
   New blocking rule: any fidelity dimension still `< 7` after Pass 3 →
   `failed_editorial`, never silent continue. Artifact: `editorial_report`
   (scores + changes) alongside the revised `draft`.
5. **blog-optimize**: metadata (write-post Step 6 block) + `canonical_url` +
   AEO alignment (answer-first fact-blocks confirmed, question-form H2/H3
   where natural) + **FAQ section** (3–5 questions phrased as the ICP asks
   them, 80–150-word self-contained answers) + inserts the planned internal
   links (2–5 per 1,000 words, varied anchors) + external citation links
   confirmed present. **Brand veto rule (written into the skill): an
   optimization that would cost voice is skipped and noted in the artifact.**
   Everything it adds passes the mechanical prohibitions gate
   (`linkedin-gate.sh --blog`). Artifact: `optimized_draft` (+ metadata in
   `meta`).
6. **blog-factcheck** (new — the SOTA fact-checker role): independent pass
   over the FINAL text: every number, narrative, and attribution is chased to
   the research doc's fetched sources (re-fetch if needed); scope qualifiers
   verified; conclusions-from-silence attributed to the author; plus a re-grep
   of brand prohibitions on the assembled text. Any unresolvable claim →
   `failed_fact_check` with the claim named. Artifact: `factcheck_report`.
   (The 2026-07-07 Ramp failure class gets a dedicated tripwire.)
7. **blog-insert**: `insert-blog-post.mjs` extended with `post_type`,
   `canonical_url`, `source_idea_id`, FAQ presence check for the new fields —
   gate stays the spec, `--self-test` extended red/green. Inserts
   `status='draft'`, verifies by read-back, sets the idea's stage/status to
   `promoted_to_post`.
8. **teardown-research / teardown-generate** (existing, edges adapted): keep
   their machinery and `teardown-gate.py` intact. Changes only: research notes
   persist as a `research_doc` artifact (not `.tmp`), the generated post
   persists as a `draft` artifact, stages advance on the `blog_ideas` row, and
   the final website insert goes through the shared tail instead of stranding
   in `teardown_drafts.full_content`. The `teardown_drafts` row (structured
   scores/gaps/remediation, LinkedIn post, outreach kit) continues to be
   written — the LinkedIn/outreach half of teardown-generate is untouched.
9. **blog-pipeline-dispatch** (new, small): the poller the schedule fires.
   Reads actionable rows, picks by (stage, post_type), runs the skill,
   advances, exits. Logs every dispatch.

Derivatives stay the `repurpose` skill's job — it already handles blog→
LinkedIn. The artifact model is what makes it cheap: it reads the row's
research doc + final text instead of re-deriving context. No new derivative
skill needed now; if a `derivatives` auto-stage earns its keep later, it
bolts onto `promoted_to_post` without redesign.

## 6. Brand bar (blocking, three layers + two human gates)

1. Editorial fidelity scores block advance (< 7 unrepaired → failed stage).
2. blog-optimize: voice veto + mechanical gate on everything it adds.
3. blog-factcheck: prohibition re-grep + provenance on the final text.
Plus Simon approves the outline and the final draft. Rank-worthy never
outranks brand-worthy.

## 7. Command Center work (story pipeline, `target_repo: command-center`)

1. Additive migration: `blog_ideas.stage/post_type/capture_id`,
   `blog_artifacts`, `blog_posts.post_type`.
2. "Send to blog pipeline" action on the ideas inbox (creates `blog_ideas`
   row, pillar + post_type picked in a small dialog).
3. Pipeline board on the blog page: rows grouped by stage, pillar visible,
   **post_type filter/tab (article | teardown)**, per-pillar counts (makes the
   content plan and the ~50:50 teardown cadence checkable at a glance).
4. Approve/retry/reject buttons + API routes (flip checkpoint stages, reset
   failed stages) — server-validated stage transitions only.
5. Artifact viewer: per-row list of `blog_artifacts`, rendered markdown.
6. The schedule row itself (dispatcher, every 20–30 min) — created via the
   schedules API once skills exist.

Story routing: migration/API/dispatch-logic stories → `agent_target: coo`;
anything touching the board UI → `agent_target: sitemaster` with brand
acceptance criteria spelled out (dark mode, #E04500 actions, #C97A1A links,
zero border-radius, default/hover/selected/active states).

## 8. Website work (story pipeline, `target_repo: simonparis-website`)

1. Real `/llms.txt` route (currently a dead revalidation target).
2. FAQ rendering on posts + FAQPage JSON-LD (rich results are dead per
   May 2026; the schema remains an LLM-citation vector).
3. Person schema with `sameAs` → LinkedIn; Organization with `knowsAbout`
   (AI reliability domains).
4. "Last updated" surfaced from `updated_at` on post pages.
5. Teardown treatment: `post_type`-aware badge/styling + a teardown index
   page; pillar pages unaffected.
6. `cta_body` reconciliation (see §3).
All independently shippable; none block the skills.

## 9. Testing

- Each stage skill runs standalone on a designated test `blog_ideas` row;
  its artifact is the observable output.
- Gates keep/extend red-green self-tests (`insert-blog-post.mjs --self-test`,
  `teardown-gate.py --self-test`, wired into `gate-selftest.sh`).
- Dispatcher dry-run mode (report what it WOULD run, no session spawn).
- End-to-end acceptance: the **meta-prompting post** (research notebook
  `b5e122c1-e8d1-47d3-8301-06e38b57a49f`) runs `candidate → promoted_to_post`
  through the real schedule, judged against the brand bar. A teardown e2e
  follows once the merge stages land.

## 10. Build order

1. Skills (session work): blog-research upgrade first (Simon's standing
   requirement — useful standalone immediately), then outline / draft /
   optimize / factcheck / insert-extension / dispatch, adapting editorial and
   teardown-generate edges.
2. CC stories (migration first, then promote action, board, approve routes,
   artifact viewer).
3. Schedule wiring.
4. E2E meta-prompting post; then the pillar-seeding planning session
   (2–3 vetted candidates per pillar, teardown:article cadence set there).

The pipeline is useful before CC catches up — stages are manually invocable
in-session from day one.

## 11. Out of scope (explicit)

- Publishing automation (stays manual SQL, as today).
- LinkedIn derivative generation (exists: `repurpose`) and scheduling
  (exists: `linkedin-publish`/Postiz).
- Citation-rate / Share-of-Model tracking, freshness review cycle, AI-content
  disclosure page — real SOTA items, deliberately deferred; revisit after the
  pipeline ships.
- `pipeline.blog_posts` (unwired Plan 5 prep) stays unread.
