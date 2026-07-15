# Handoff — Command Center blog creation: make it a masterpiece

status: done (pipeline built + e2e post published 2026-07-15 at /blog/meta-prompting-three-layer-contract; all 10 UI stories merged; follow-ups tracked in session close-out: pillar seeding, teardown e2e, derivatives)
goal_id: none
picked_up_by: blog-writer session 2026-07-13
updated: 2026-07-15

**From session:** 2026-07-11/12 (COO worktree `ade/coo-f25d292c`)
**For:** fresh session, any agent. Read this whole file before acting.
**Simon's directive (verbatim intent):** "lets make this blog creation from the command center a fucking masterpiece — links, SEO, AEO, GEO etc." Integrate research properly. Test it end-to-end with the meta-prompting post.

---

## 1. The mission

Command Center has a blog section (idea → outline → generated post). Simon has **never used it** and suspects it's weaker than his 2025 n8n "Blog Maker" workflow. The job:

1. **Explore** the CC blog feature first — nobody has assessed it yet. Find the pages, API routes, prompts, and where output lands (`public.blog_posts` in the CC Supabase; the website reads from there). Also read the `blog-writer` agent (`.claude/agents/blog-writer.md`, symlinked from MetaArchitect) and the `write-post` / `editorial` skills — there may be three overlapping blog paths that need consolidating into one.
2. **Benchmark it against the n8n Blog Maker feature list** (section 3) — that workflow is the bar to beat.
3. **Design and build the masterpiece pipeline**: durable research doc → outline → draft → editorial loop → SEO/AEO/GEO layer → internal/external links → draft in `blog_posts`. Decide per piece: in-session build vs story-pipeline stories (CC code changes without migrations = stories; skills/agents = session work).
4. **Test with the meta-prompting post** (research already done — section 4) and judge output quality against the brand bar (`brand/brand-summary.md`, editorial skill).

## 2. What "masterpiece" means (Simon's requirements, expanded)

- **Research integration:** the current `research` skill ends in a chat summary — nothing durable. Simon: "the research should usually make a document." Fix: research must persist a structured research doc (file or DB row) with evidence tiers + verbatim quotes + URLs that the blog pipeline consumes. It was optimized for LinkedIn; a blog needs more robust/deeper evidence.
- **Links:** internal links (pillar/cluster structure between posts — the n8n workflow had a Cluster Post agent that aggregated sibling titles for interlinking), plus external citation links to primary sources (T1 evidence style).
- **SEO:** keywords, meta title/description, slug, canonical, heading structure, image alt text — the n8n workflow generated ALL of these; CC's version must too.
- **AEO** (answer engine optimization): direct-answer blocks, FAQ section with FAQPage schema.org markup, question-shaped H2/H3s.
- **GEO** (generative engine optimization): quotable stat-anchored sentences with named sources, clear definitions near the top, structure that LLMs can cite (the post itself should be T1 material for someone else's RAG).
- **STATE compliance:** medium risk (LLM calls + DB writes) — state object, log every LLM call to `pipeline.logs`, validation gate before any `blog_posts` write. The n8n workflow's fatal flaw was zero gates; don't rebuild that.

## 2b. The gold standard: 2026 state of the art (deep research DONE)

Simon's call: the n8n workflow is a year old — a good bar, **not** the gold standard. A NotebookLM deep research on SOTA AI blog pipelines + SEO/AEO/GEO 2026 is complete:

- **Full design requirements brief:** `docs/handoffs/2026-07-13-sota-blog-pipeline-brief.md` (read it before designing anything).
- **Notebook for follow-up queries:** `69695efc-7994-40de-a513-3bc491152d1f` (81 sources).
- Headlines: agentic content ops with distinct research/outliner/writer/SEO-optimizer/fact-checker roles + confidence-gated HITL checkpoints; "Information Gain" as the outline criterion; the one-third human-contribution rule; Google penalizes low-effort not AI per se (E-E-A-T signals are infrastructure); FAQ rich results are DEAD in 2026 (schema deprecations — check the brief before building FAQPage markup); GEO = quotable stats + definitions + citation tracking, llms.txt is contested; AI-content disclosure expectations tightened July 2026.

## 3. The bar: Simon's 2025 n8n "Blog Maker" (primary artifact)

**Location:** Simon's PC, SSH host `win40` (configured in `~/.ssh/config`), path `C:\repos\n8n workflows\blog-content\` — three files: `Blog Maker.json` (80 nodes), `Blog Writer.json` (69), `Final Blog Assembly.json` (13). Fetch with: `ssh win40 'type "C:\repos\n8n workflows\blog-content\Blog Maker.json"' > local.json`.

**What it had (feature bar to meet or beat):**
- **Meta-prompting core:** a "Main Body Prompt Writer" agent ("You are an AI Prompt Engineering Specialist…") consumed outline + keywords + semantic analysis + search intent + brand voice + ICP pain points + a "hidden insight" field, and wrote the complete prompt that the "Content Writer Agent" executed verbatim. This predates the 2026 "loop engineering" discourse — Simon was doing it before it had a name.
- Pillar vs cluster post routing; cluster posts pulled sibling titles for internal linking.
- Dedicated agents: title refinement, key takeaways, introduction, FAQ, image captions/alt text, meta title/description/slug/canonical, CTA injection (from an Airtable CTA table), article assembly, final edit. ~16 LLM nodes (OpenAI + Gemini) per run. Tavily for SERP research.
- Published straight to Ghost CMS + Airtable.

**What it lacked (the pitfalls — do not rebuild these):** no validation gate anywhere between LLM output and CMS write; no state object / resume (crash at node 60 = full rerun); no trace log; no memory between runs (mistakes recurred forever).

## 4. The test case: meta-prompting post (research COMPLETE)

- **NotebookLM notebook:** `b5e122c1-e8d1-47d3-8301-06e38b57a49f` ("Meta-prompting — Blog Research 2026-07-12", 97 sources incl. deep-research import). Query it via `mcp__notebooklm-mcp__notebook_query` for anything below.
- **Recommended angle:** "I was meta-prompting before it had a name" — 2025 Blog Maker (proof of origin, zero gates) → 2026 weekly-brief skill (goal + invariants + accumulated domain facts, agent writes its own sub-prompts) → the two first-day failures, both missing STATE not intelligence. Pillar: The Meta Layer. Save-worthy element: the three-layer contract (fixed shell / accumulated domain facts / open middle).
- **Key T1:** arXiv 2607.01641 "When Agents Do Not Stop" — 6,549 repos scanned, 68 confirmed infinite agentic loops across 47 projects, 91.9% precision.
- **Strong T2 (fetch primary URLs before using numbers):** Clinejection Feb 2026 (prompt injection → npm package on ~4,000 dev machines; Snyk writeup); Berkeley MAST taxonomy (step repetition 17.14%, reasoning-action mismatch 13.98%, "simple fixes are insufficient… fundamental changes in system design are required"); Anthropic multi-agent (~15x tokens, +90.2% vs single-agent, anthropic.com engineering blog); compounding cascade 0.85^10=0.197 (Atlan); Karpathy autoresearch three-file contract (goals file / one editable file / untouchable eval).
- **Weekly-brief failure receipts (internal, first-person):** (1) ranked 4-day-old engage drafts #1 — missing fact: engagement decays ~48h; skips lived in `engage_comments` unseen. (2) ranked testimonial asks #1 by title+RICE — trigger "within 7 days of audit delivery" never happened (zero audits). Both fixed by writing state (lessons.md 2026-07-11 entry, domain-facts blocks), not by better models. Full story: `docs/lessons.md` 2026-07-11 + `.claude/skills/weekly-brief/SKILL.md`.
- **Humanity snippet (unused, fits):** "I once spent three days debugging an agent's prompt because it kept misfiring an API call. The prompt wasn't the problem…" (pipeline.humanity_snippets).
- **Overlap check:** clean; only `ramp-financial-automation-agent` (published) is adjacent.
- **Hook candidates:** story_open — "In 2025 I built an 80-node n8n workflow where one AI's only job was writing the prompt for another AI. It worked. It also had no validation gate, no state, and no memory that it had ever been wrong." / stat_lead — "Researchers scanned 6,549 agent repos and confirmed 68 infinite loops. Not one was fixed by a better prompt."

## 5. Session context you'll need (built 2026-07-11/12)

- **Weekly brief system (shipped, live):** `public.briefs` + `GET/POST /api/briefs` + `POST /api/briefs/generate` (fires the `weekly-brief` schedule via run-now machinery) + "This week" card on CC home (CC PR #67). `/weekly-brief` skill in this repo (meta-designed; goal + invariants + domain-facts block). Schedule: Mondays 06:00, agent coo (id `90546355-…`). Current brief row v3: #1 founding-client outreach. Monday's cron will generate a fresh one.
- **Engage fixes:** skills now show post age, never hide inventory, skips are the only retirement (MetaArchitect PRs #8, #9, #10 all merged). Story `4c8d034a` queued in CC: per-target posting-pattern adaptive sweep timing. Story `2346ba3b` = cancelled (auto-stale was rejected as symptom treatment).
- **Anti-recurrence entries:** `docs/lessons.md` 2026-07-11 (stale engage drafts). Goals rows 0893410c + related carry one-liners.
- **Conventions that bit us:** command-center squash-merges leave session branches diverged — `git merge origin/main` into the branch (never force-push), resolve, re-merge PR. CC deploy: deploy-sync timer auto pulls/builds/restarts after merge (verify with a curl to the new route). CC migrations: additive-only, apply via Supabase Management API (token `~/.supabase/access-token`, project `ashwrqkoijzvakdmfskj`) — same path `worker/migrations.ts` uses. Memory headroom on sterling is tight: don't run heavy parallel builds/agents (see memory).
- **Simon's communication rule (memory `plain-short-answers`):** short plain paragraphs, lead with the answer, no header/bullet trees in chat replies. Docs like this one may be structured; chat may not.

## 6. Suggested opening move for the new session

1. Dispatch one Explore agent over CC's blog section (pages, API routes, prompts, `blog_posts` schema, how the website consumes drafts) + read `write-post`/`editorial` skills and the `blog-writer` agent.
2. Compare against section 3's feature bar; write the gap list.
3. Brainstorm/design the pipeline with Simon (he wants to be in the loop on this one — it's his flagship content system), then split: CC code → stories where clean, skills/agents → session work.
4. First deliverable candidate: a `research` skill upgrade that persists a durable research document (evidence-tiered, URL-verified) — Simon explicitly asked for this regardless of the rest.

## Queued stories (2026-07-13 build session)

Command Center (`command-center`):
- `f471ff8e` promote action (ideas → blog_ideas) — coo
- `eb7be899` stage-transition API routes — coo
- `1cbec2b5` pipeline board on /blog (depends on eb7be899) — sitemaster
- `dcda7824` artifact viewer (depends on the board) — sitemaster

Website (`simonparis-website`, all sitemaster):
- `6962d862` real /llms.txt route
- `30b37c18` FAQ render + FAQPage JSON-LD
- `6cbf1814` Person sameAs + Organization knowsAbout schema
- `dd2cf63a` "Last updated" label
- `ea9b6b27` teardown badge + /blog/teardowns index
- `bf000eac` cta_body drift reconciliation
