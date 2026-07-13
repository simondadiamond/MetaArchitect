# Blog pipeline gap analysis — CC + skills vs n8n Blog Maker vs 2026 SOTA

status: done (feeds the design brainstorm)
parent: 2026-07-13-blog-masterpiece-handoff.md
updated: 2026-07-13
author: blog-writer session (Explore agent report + skill reads)

## What actually exists (the surprise)

The "CC blog feature" is mostly aspirational. Command Center has only: an idea
capture form (writes `public.ideas`), a read-only `blog_posts` table, and one
"Expand into outline" button that streams a Claude CLI outline to the browser
and **persists nothing**. There is no outline→draft→publish workflow in CC code.

The real generator is the `write-post` skill (agent session) + the
`insert-blog-post.mjs` validation gate. That path is already *stronger than the
n8n bar on reliability*: STATE state object, per-stage `pipeline.logs`, stat
provenance rules, three-pass editorial, mechanical validation gate with
self-test, post-insert verify, draft-only writes. The n8n workflow had none of
that.

## Broken / disconnected today (facts, not design opinions)

1. **Two forked idea tables.** CC capture writes `public.ideas`; the schema and
   `blog_posts.source_idea_id` FK expect `blog_ideas`. The FK is never
   populated. CC-captured ideas never reach the generator.
2. **Outline is orphaned.** CC's expand-idea outline (its only LLM feature) is
   display-only — never saved, never handed to `write-post`. Two disconnected
   generation systems with different prompts, models, logging.
3. **Schema drift.** Website reads `cta_body` (rendered in PostCTA) but the
   column is absent from `0001_blog_alignment.sql` and never written.
   `og_image_url` and `canonical_url` exist, are read, and are never populated
   (silent fallbacks). `status='review'` exists but nothing writes it.
4. **Dead `/llms.txt`.** The revalidate webhook revalidates `/llms.txt` but no
   such route exists on the website.
5. **Crash-safe, not crash-resumable.** A crash mid-draft loses all in-session
   research/draft/editorial work (nothing partial hits the DB — good — but
   Tolerant pillar is only half-met). Research findings die with the session:
   the `research` skill ends in a chat summary, nothing durable.

## Gaps vs the n8n Blog Maker feature bar (handoff §3)

| n8n had | We have | Gap |
|---|---|---|
| Meta-prompting core (prompt-writer agent → writer agent) | Direct generation by session model | Design decision: adopt loop-engineering layer or not |
| Pillar vs cluster routing + sibling-title interlinking | Nothing. `RelatedPosts` is render-time, same-pillar, no in-body links | **Biggest structural gap** |
| FAQ agent | No FAQ section anywhere; website never renders FAQ schema on posts | Missing |
| Key-takeaways + intro agents | Covered by write-post structure rules | OK |
| Image captions/alt agent | No images at all; `og_image_url` never filled (dynamic /api/og fallback) | Missing (severity: low-medium) |
| Meta title/desc/slug/canonical agent | Meta title/desc/slug yes; canonical never written | Partial |
| CTA injection from CTA table | `cta_type` routing (audit→/score, subscribe) | OK, simpler by design |
| Tavily SERP research | NotebookLM only. "Primary keyword 501–2,400 volume" is asserted with **no data source** — keyword volume is vibes | Missing verification layer |
| Ghost auto-publish, zero gates | Draft-only, hard gate | We win — keep it |

## Gaps vs 2026 SOTA brief

1. **Durable research doc** — missing; Simon's explicit requirement. Research
   must persist evidence-tiered findings (verbatim quotes + URLs) somewhere the
   pipeline and future sessions can consume.
2. **Information Gain outline criterion** — no comparison against existing top
   SERP content; outline quality is judged only against brand rules.
3. **Internal linking architecture** — SOTA: pillar pages ↔ 8–12 cluster pages,
   2–5 contextual internal links per 1,000 words, varied anchors. We have zero
   in-body internal links and no site link map for the writer to draw from.
4. **AEO** — BLUF + fact-blocks + question headings already enforced (good).
   Missing: FAQ section (80–150-word answers; FAQ *rich results* are dead per
   May 2026 but FAQPage schema remains an LLM-citation vector), and answer-first
   40–60-word blocks per H2 are close to our fact-block rule (40–50) — align.
5. **GEO** — T1 stat rules already produce quotable stat-anchored sentences
   (good). Missing: `/llms.txt` (currently a dead route reference), freshness /
   "Last Reviewed" cycle, citation tracking.
6. **Schema** — Article + BreadcrumbList live. Missing per brief: Person with
   `sameAs` (LinkedIn) on author, Organization with `knowsAbout`, dateModified
   surfacing, editorial-policy / AI-disclosure page ("Last Reviewed" labels).
7. **Fact-checker as a distinct role** — editorial Pass 2 dim 9 checks
   provenance, but there's no independent verification pass of the *final* text
   against the fetched sources.
8. **HITL confidence gating** — outline approval exists (good); nothing else is
   confidence-gated.

## Where we already beat both bars

Validation gate with red/green self-test; STATE S+T+E; stat-provenance origin
gate; three-pass editorial with mechanical greps; draft-only inserts with
post-insert verify; LinkedIn extract gated by shared gate script.

## Design decision points for the brainstorm (Simon in the loop)

1. **Architecture center of gravity:** skill-centric pipeline (CC = capture +
   dashboard + trigger, artifacts in DB) vs building generation into CC code.
2. **Research doc home:** DB rows (CC-visible) vs repo files vs both.
3. **Unify the idea tables** (`public.ideas` vs `blog_ideas`) — which wins.
4. **Internal-link layer mechanics:** link map source (published `blog_posts`
   slugs/titles/pillars), who inserts links (writer vs dedicated pass), and
   whether pillar/cluster post types become an explicit field.
5. **Meta-prompting layer:** adopt the prompt-writer→writer split (the test
   post's own subject) or keep direct generation.
6. **Keyword/SERP verification:** add a real data source or drop the fake
   volume claim from the skill.
7. **Website-side stories:** llms.txt route, FAQ render + schema, Person/Org
   schema, cta_body reconciliation, canonical/og_image population — all clean
   story-pipeline candidates once the pipeline decides what fills them.
