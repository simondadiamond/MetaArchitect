# The Meta Architect — Roadmap

> Single source of truth. Updated at end of every session.
> Format: `- [ ]` not done | `- [x] ~~Item~~ ✓ YYYY-MM-DD` done

---

## CURRENT FOCUS
**Phase 3 v2: Distribution Reset.** 8 weeks of LinkedIn-only posting → 250 followers. Diagnosis: distribution problem, not content problem. Pivoting to three compounding plays — **blog**, **ICP commenting**, **bi-weekly teardowns** — plus one simple entry audit at $750 CAD. Cohort and workshop parked until audience supports them.

---

## QUICK REFERENCE (operational state — fast lookup)

| Thing | Value |
|---|---|
| Entry audit price | **$1,295 USD full / intro rate TBD** (locked 2026-05-09 — was $750 CAD) |
| Lead capture URL | `simonparis.ca/score` |
| Paid intake URL (private) | `simonparis.ca/readiness` — never linked from public surfaces |
| Active offer count | 1 (entry audit only — keep it simple) |
| Posting cadence | 2x/week LinkedIn (habit, not growth play) |
| Teardown cadence target | bi-weekly (not yet started) |
| Followers (last check) | ~250 LinkedIn |
| In flight | PR #8 on simonparis-website — blog OG fix + RSS feed + brand-suffix dedup (open, ready to review/merge) |
| Audience-growth handoff | `projects/Audience-Growth/superstar-list-activation.md` — pick-up point for the commenting cadence |

---

## Phase 1: Content Engine — ✅ DONE

- [x] ~~Brand guidelines, ICP, STATE framework documented~~ ✓ 2026-02
- [x] ~~Airtable schema (ideas, posts, hooks, logs, brand, humanity_snippets)~~ ✓ 2026-02
- [x] ~~Content pipeline commands: /capture, /research, /draft, /review, /publish, /score~~ ✓ 2026-03
- [x] ~~/harvest command — autonomous idea generation (STATE-compliant, session integrity gate, specificity requirement)~~ ✓ 2026-03-18
- [x] ~~Pattern Guardian skill + Airtable push script~~ ✓ 2026-03-19
- [x] ~~Harvest-memory.json — cold start done (run #1 on 2026-03-17)~~ ✓
- [x] ~~Build idea backlog (target: 10+ ideas at Status=New)~~ ✓ 2026-03-19

---

## Phase 2: Content Production — ✅ DONE (pipeline)

**Pipeline is built and validated. Posts are getting written and shipped.**

- [x] ~~Origin story published + pinned~~ ✓ 2026-03-20
- [x] ~~/editorial-planner command~~ ✓ 2026-03-20
- [x] ~~Humanity snippet bank seeded~~ ✓ 2026-03-20
- [x] ~~2x/week cadence established~~ ✓ 2026-03

### Ongoing (run continuously)
- Run `/score` on every published post after 7 days
- Run `/harvest` when backlog drops below 5 ideas at Status=New

---

## Phase 3: LinkedIn Presence — 🔄 ACTIVE (cadence maintained, no growth play)

**Status: pipeline runs. The distribution layer (audience growth) moved to Phase 3.6.**
**Cadence is now a habit asset — keep it running, but stop expecting it to grow followers on its own.**

### 3a. Profile Optimization — DO THIS WEEK
- [ ] Headline: "AI Reliability Engineer | State Beats Intelligence | simonparis.ca"
- [ ] About section: lead with burned practitioner problem, name STATE and Law 25, link to simonparis.ca
- [ ] Featured section: origin story post pinned + first teardown when published
- [ ] Experience: add "The Meta Architect" as current role — practitioner + teacher framing
- [ ] Banner: brand-compliant visual (#0F0F0F background, orange accent, Merriweather wordmark)

### 3b. Posting Cadence — RUNNING (maintain, don't expand)
- 2x/week cadence — keep as habit, don't push to 3x until audience is growing
- Repurpose blog posts and teardowns into LinkedIn posts (one artifact, multiple channels)

---

## Phase 3.5: Lead Capture Infrastructure — ✅ DONE

- [x] ~~Email provider: MailerLite + sender domain authenticated~~ ✓ 2026-03-22
- [x] ~~/score quiz live (primary lead capture, replaces static PDF)~~ ✓ 2026-05-06
- [x] ~~/readiness diagnostic live (paid intake — sent manually, not public)~~ ✓ 2026-05-06
- [x] ~~Homepage redesign + CTA → /score~~ ✓ 2026-05-06
- [x] ~~Welcome sequence built in MailerLite (ID: 182570353596302575)~~ ✓ 2026-03-21
- [x] ~~Fix blog "audit" CTA to point at /score (not /readiness)~~ ✓ 2026-05-09

### Remaining 3.5 cleanup
- [ ] Verify Email 1 content reflects /score (not old checklist PDF)
- [ ] Activate MailerLite automation
- [ ] Add /score link to LinkedIn About / Featured section
- [ ] Every 3rd post: soft CTA pointing to /score

---

## Phase 3.6: Blog Infrastructure — 🔄 NEW PRIORITY

**Goal: own a publishing surface that compounds. SEO + permanent URLs + reusable artifacts for LinkedIn, comments, DMs.**
**Why now: LinkedIn-only distribution caps growth. Blog posts are the highest-ROI atomic content unit — they feed every other channel.**
**Reality check: SEO traffic is a 6-12 month bet. Near-term value = repurposable content + linkable artifacts. Don't expect Google traffic this quarter.**

### 3.6a. Blog Foundation
- [x] ~~Blog scaffolding live on simonparis.ca/blog~~ ✓ (already exists)
- [x] ~~First post live: `/blog/ai-told-the-truth-that-was-the-problem`~~ ✓ 2026-05-09
- [x] ~~Lock blog-first repurposing workflow (long-form anchors short-form; teardown-first added soon as second long-form unit)~~ ✓ 2026-05-09
- [x] ~~Decide: NEW `/blog-draft` pipeline (separate from `/draft`) — long-form ≠ LinkedIn shape~~ ✓ 2026-05-09 (build deferred until Plan 1 Supabase migration)
- [x] ~~URL/unfurl audit: linkable, no paywall, robots OK, sitemap.ts present, per-post OG image renders~~ ✓ 2026-05-09
- [ ] **OG image redesign + brand-suffix dedup + title-source fix** — `/api/og/route.tsx` had three problems: (a) it sourced `post.seo_title` (dry, Google-keyword-tuned) instead of `post.title` (catchy display H1) — wrong title shows on social cards; (b) the seo_title also contained `" | The Meta Architect"` suffix which made brand appear 2× alongside the top-right wordmark; (c) orange accent too thin to survive thumbnail crop. Fix: switch OG to `post.title`, defensive-strip suffix, redesign with right-side orange block (33% canvas), bigger pillar tag, drop redundant top-right eyebrow. Orange-only (no per-pillar variants). **Sitemaster job spawned 2026-05-09.**
- [ ] Add `app/rss.xml/route.ts` (Plan 5 spec gap). **Sitemaster job to dispatch.**
- [ ] Spec `projects/Content-Engine/.claude/commands/blog-draft.md` (defer build until `blog_posts` Supabase table exists)
- [x] ~~`/repurpose` command — N/A: blog-writer agent already owns the multi-platform repurposing pipeline~~ ✓ 2026-05-09 (decided)

### 3.6a-bis. Multi-Platform Publishing System (NEW)
**Decision (2026-05-09): blog-first → repurposed across multiple platforms. Soon: teardowns become a second long-form anchor.**
**Each platform gets its own pro-level workflow with up-to-date platform-specific guidelines (algorithm rules, length, formatting, hashtag/link rules, posting time). Eventually cron-scheduled and automatic.**

- [x] ~~Platforms in-scope (locked 2026-05-09): **LinkedIn, X/Twitter, Hacker News, dev.to, Reddit (r/MLOps + r/MachineLearning)**. Out: TikTok, Instagram, Facebook, Threads, Bluesky (deferred).~~ ✓
- [ ] For each in-scope platform (LI, X, HN, dev.to, Reddit), write a `projects/Content-Engine/docs/platforms/<platform>.md` containing: format rules, length, hooks that work, algo behaviors, hashtag/link policy, optimal posting windows, "as of" date. Re-audit quarterly.
- [ ] **Multi-platform repurposing lives in the blog-writer agent** (already has the pipeline) — Content-Engine should not duplicate. Coordinate with blog-writer agent to consume the per-platform docs.
- [ ] Cron scheduling: once a platform's draft passes review, scheduler posts at configured optimal window. Manual paste fallback for platforms where TOS forbids automation (LinkedIn). dev.to has API. HN/Reddit/X: depends on each TOS — research per-platform before building automation.
- [ ] Per-platform `/score`: each platform measures different signals (LI: dwell + reactions; X: replies + reposts; HN: comments + rank; Reddit: upvote ratio + comments; dev.to: reactions + reading time). Platform-specific score command needed.
- [ ] Sequencing: ship LinkedIn pro workflow first (already partly built); then dev.to (lowest-risk cross-post via canonical tag); then HN (event-driven, not cadence-driven, only on strong posts); then X; then Reddit (highest etiquette risk, latest). Don't fan out faster than cadence can hold.

### 3.6b. First Posts (target: 3 posts in 3 weeks)
- [ ] Post 1 — flagship piece (pillar: STATE Framework Applied — most evergreen)
- [ ] Post 2 — Production Failure Taxonomy entry
- [ ] Post 3 — Defensive Architecture pattern walk-through
- [ ] Each post: ends with audit CTA → /score

### 3.6c. Repurposing Loop
- [ ] Every blog post → derive 2-3 LinkedIn posts (different hooks, same insight)
- [ ] Every blog post → 1 candidate teardown angle if applicable

---

## Phase 3.7: Audience Growth System — 🔄 NEW PRIORITY

**Goal: borrow audiences you don't have yet. Two compounding mechanics — strategic commenting + bi-weekly teardowns.**
**Why now: posts into a void don't compound. 60 days of strategic commenting moves followers more than 8 more weeks of solo posting.**

### 3.7a. ICP Superstar List (build once, use forever)
- [ ] Identify 10-15 accounts in MLOps / production AI / LLM reliability space (5K+ followers)
- [ ] For each: post topics they cover, posting cadence, best time to comment
- [ ] Stored as `/app/data/projects/MetaArchitect/projects/Audience-Growth/superstar-list.md`

### 3.7b. Commenting Cadence
- [ ] Daily: 3-5 substantive comments on superstar list posts (within first hour when possible)
- [ ] Comment quality bar: insight or specific reference, never "great post"
- [ ] Weekly review: which comments drove profile visits / follows

### 3.7c. Bi-Weekly Teardowns (flagship credibility play)
- [ ] Define teardown format: target system + STATE scoring + 2-3 specific gaps + remediation
- [ ] Pick 6 teardown candidates (public AI systems, open repos, popular RAG starters)
- [ ] Cadence: one teardown every 2 weeks — published as blog post + repurposed LinkedIn post
- [ ] Each teardown links to entry audit offer

### 3.7d. LinkedIn Newsletter (separate product from posts)
- [ ] Set up LinkedIn newsletter — push notification distribution beats algorithmic feed
- [ ] Teardowns become the newsletter's core content
- [ ] Subscribe CTA on blog + bio

### 3.7e. Guest Posts (high-ceiling, low-volume)
- [ ] Identify 5-6 MLOps / AI Substacks or newsletters with 5K+ subscribers
- [ ] Cold pitch with one teardown as proof of work
- [ ] Goal: 1 yes per quarter

---

## Phase 6: Audit Offer — 🔄 NOW PRIORITIZED (one tier, simple)

**Goal: monetize the audience that exists, at a price that matches current trust level.**
**Strategy: ONE tier first. $750 CAD entry audit. Use `/readiness` to deliver tremendous value. Get testimonials. Raise prices later. Resist the urge to stack multiple offers.**
**Why one tier:** Simon's instinct, validated — multi-tier offers force prospects to think; single offer with overwhelming value forces them to decide yes/no. Easier close, easier marketing, easier to iterate the deliverable.

### 6a. Entry Audit Offer
- [ ] Define scope: 90-min call + STATE score (via /readiness intake) + top 3 gaps + remediation summary
- [x] ~~Price: $1,295 USD full + intro starter rate for first ~5 audits (CAD→USD migration locked 2026-05-09)~~ ✓
- [ ] Deliverable: short summary doc + recording (V1 — upgrade to PDF report once we have ≥3 audits delivered)
- [ ] Booking flow: Calendly link → discovery + delivery in same call (or split across two if needed)
- [ ] CTA target on blog posts and teardowns

### 6b. Consulting Page on Site
- [x] ~~Remove `/workshop` and `/cohort` surfaces — pages, nav, footer, sitemap, offerCards, i18n namespaces, redirects, dead subscribe groupMap~~ ✓ 2026-05-10 (PR #10 merged)
- [x] ~~Fix score-result CTAs (`ctaWorkshop`/`ctaCohort`) that still pointed at removed URLs in the diagnostic email + on-screen results~~ ✓ 2026-05-10 (PR #11 opened)
- [ ] Build /consulting (or rework offers section) — frame the single audit tier, process steps, Calendly CTA
- [ ] Sitemaster agent owns the build after Phase A plan is approved
- [ ] Editorial pass on `privacy.json` / `terms.json` to drop "workshops" / "cohort availability" generic mentions (forward-looking legal language, deferred for review)

### 6c. Audit Deliverable Quality (perceived value lever — V2 work, after first 3 audits)
- [ ] Build PDF report template — STATE score visualized per pillar, gap table, prioritized 30-day plan
- [ ] Add benchmark line ("median score for companies at your stage is X")
- [ ] Add named architecture risk per audit (custom, not generic)

### 6d. Testimonials Loop (priority — drives credibility for price increases)
- [ ] After every audit: ask for a written testimonial within 7 days
- [ ] Prepared ask template — make it easy (3 specific questions, not "say something nice")
- [ ] Publish testimonials to /consulting page + LinkedIn featured + DM signature
- [ ] Track: testimonials → next-audit close rate

### 6e. Pricing Tactics Research (priority — research, then decide)
- [x] ~~NotebookLM #1 deep-research complete 2026-05-09 — notebook `1c543c0b-6ff3-4714-b5b4-6284ffde4e46`~~ ✓
- [x] ~~Briefing-doc saved to `projects/Audience-Growth/pricing-tactics.md`~~ ✓ 2026-05-09
- [x] ~~**Pricing decision (locked 2026-05-09)**: $1,295 USD full price + intro starter rate for first ~5 audits to earn testimonials. Bill in USD. Intro price TBD pending NotebookLM #2 copy research (likely $750–$895 USD as founder rate).~~ ✓
- [x] ~~Risk reversal frame (locked): "better-than-risk-free" — client keeps deliverables on refund.~~ ✓
- [x] ~~Voice (locked): practitioner-to-practitioner, "I built this because I use it" — no marketer-speak.~~ ✓
- [x] ~~NotebookLM #2 dispatched 2026-05-09 — notebook `0a86ea2d-8f1a-4c57-8451-a23060042c4f` ("Consulting Page Copy — $1,295 USD Audit + Intro Rate")~~ ✓
- [ ] Once #2 sources import, generate report → save to `projects/Audience-Growth/consulting-page-copy.md`
- [ ] Apply locked pricing + copy to `/consulting` page (Phase 6b — sitemaster job)
- [ ] Update QUICK REFERENCE pricing line: $750 CAD → $1,295 USD (full) / intro rate TBD

### 6f. Full Audit Tier (LATER — not now)
- Reactivate when: ≥5 entry audits delivered AND ≥2 prospects asking for "more than the entry audit"
- Spec preserved: full /readiness intake + written report + 90-min delivery + 30-day check-in, $2,500–3,500 CAD, Stripe invoice
- Don't build this until demand signal is real

---

## Phase 6.5: Marketing Capability Build — 🔄 NEW PRIORITY

**Goal: COO agent (me) has actual marketing/growth/positioning knowledge to draw on, not just generic advice.**
**Why: Simon's words: "I'm not a marketing expert, I need you to be." Currently I rely on general principles. Need a reference knowledge base + ideally a skill or two.**

### 6.5a. Marketing knowledge base (start here — fast)
- [ ] Create `/app/data/projects/MetaArchitect/marketing/` directory
- [ ] Seed with reference docs:
  - `pricing-frameworks.md` — anchoring, decoy effects, intro pricing, value-based pricing
  - `positioning.md` — April Dunford-style category design, differentiation
  - `copy-frameworks.md` — PAS, AIDA, hook-setup-turn-lesson-close (already in brand)
  - `funnel-mechanics.md` — top/middle/bottom of funnel, what each stage needs
  - `audience-growth-playbooks.md` — borrowed audiences, content-led growth, distribution-first thinking
- [ ] Each doc: practitioner-level (not theory), with applicability notes for The Meta Architect

### 6.5b. Skill plugins for COO (slower — when knowledge base reveals what's missing)
- [ ] Identify 1-2 marketing skills that would meaningfully change my recommendations
- [ ] Candidates: `pricing-strategy`, `positioning-audit`, `funnel-diagnosis`
- [ ] Build as proper SKILL.md plugins in `skills/`, scope to coo agent
- [ ] Defer: build the knowledge base first, see what gaps actually emerge

---

## Phase 7: ICP Superstar List Execution — 🔄 ACTIVATION (list is done, cadence not started)

**Goal: turn the vetted list into 90 days of compounding comment-driven follows.**
**Activation handoff doc (read first):** `projects/Audience-Growth/superstar-list-activation.md` — single pick-up point with status table, top-3 anchors, step-by-step next actions, and instructions for future agents.

**Companion docs:**
- `projects/Audience-Growth/superstar-list-research-brief.md` — the rules (ICP, inclusion criteria, anti-patterns)
- `projects/Audience-Growth/superstar-list.md` — the vetted list (22 evaluated → 11 INCLUDE / 5 WATCH / 6 EXCLUDE, with honesty contract)
- `projects/Audience-Growth/pricing-tactics.md` — consulting psychographics, useful when commenting on consulting-adjacent posts

### 7a. Done
- [x] ~~Brief drafted (2026-05-09)~~ ✓
- [x] ~~Research executed — 22 candidates evaluated via subagent (2026-05-10)~~ ✓
- [x] ~~Vetted list published at `superstar-list.md` with honesty contract (2026-05-10)~~ ✓

### 7b. Manual verification (Simon, ~30 min) — DO BEFORE COMMENTING
- [ ] Verify top 3 anchors on LinkedIn: **Hamel Husain**, **Eugene Yan**, **Aishwarya Naresh Reganti** — confirm ≥30K followers + ≥30 substantive comments/post
- [ ] Re-check **Chip Huyen** cadence — promote WATCH→INCLUDE if posting weekly
- [ ] Verify **Charity Majors** is actually LinkedIn-active in 2026
- [ ] For every INCLUDE: scroll last 3 posts, confirm commenters are engineers/MLOps leads (not vendors). Demote if ICP density fails.

### 7c. Francophone gap (Simon, ~15 min) — moat work
- [ ] Triage **David Beauchemin**, **Foutse Khomh**, **Philippe Beaudoin** on LinkedIn. Add 1–2 to `superstar-list.md` if cadence + follower count qualify. Brief asked for 2–3 francophone seats; deliverable currently has 1.

### 7d. Follow + bio prep (Simon, ~10 min)
- [ ] Hit Follow on every INCLUDE account on LinkedIn (algorithmic signal)
- [ ] Confirm bio + featured section make value-prop legible — STATE framework + Law 25 + simonparis.ca. Profile is the conversion surface; comments drive clicks; bio converts clicks.

### 7e. Start the cadence (daily, recurring)
- [ ] Block 9:30–10:30 ET daily for commenting (aligns with US-based anchor post times)
- [ ] **Daily anchor**: 1 substantive comment < 1h old on Hamel/Eugene/Aishwarya
- [ ] **Topic rotation (other 8)**: Mon/Wed/Fri MLOps lane (Demetrios, Maria, Aurimas); Tue/Thu observability+eval lane (Aparna, Charity, Jason Liu, Shreya); Sat optional francophone
- [ ] **Quality bar**: every comment = insight or specific reference. Never "great post" (anti-pattern, reads as spam)
- [ ] **Never link** to simonparis.ca in comments unless explicitly invited

### 7f. Review loops
- [ ] **Weekly (Friday, ~10 min)**: LinkedIn analytics — which comments drove profile visits/follows. Update `superstar-list.md` with promotions/demotions.
- [ ] **Monthly (every 4 weeks)**: drop dormant accounts; add 1–2 new candidates; re-confirm follower counts.

---

## Phase 8: Admin Panel on simonparis.ca/admin — 🅿️ FUTURE (not started)

**Goal: one auth-gated surface to view all pipeline state and (later) trigger automations from anywhere — phone, road, desk.**
**Why on simonparis.ca: site is already deployed on Vercel and already wired to Supabase. No second host, no Tailscale, accessible from any device.**
**Why not inside popebot: popebot's UI ships from the npm package — forking it means upgrades crush local changes. Out.**

### 8a. Phase 1 — Viewer (read-only)
- [ ] Add `/admin` route group to `simonparis-website` with auth middleware (Supabase Auth, single-email allowlist)
- [ ] List views over Supabase tables: `posts` (LinkedIn), `blog_posts`, `blog_ideas`, `ideas`, `engagement_opportunities` (when Plan 3 lands)
- [ ] Filter + sort + status badges; brand-compliant styling (dark, #0F0F0F, Merriweather/Inter)
- [ ] Read-only — no write operations in Phase 1
- [ ] Depends on: Plan 1 (Supabase migration) so the data lives where the admin can read it

### 8b. Phase 2 — Action triggers via popebot webhooks
- [ ] Wire popebot remote-trigger webhook to spawn agent jobs from admin button clicks (e.g. "Draft this idea", "Score this post")
- [ ] Pattern: admin click → POST to popebot webhook → agent job runs CC CLI → writes result to Supabase → Supabase realtime pushes update to admin UI
- [ ] Job status surface: in-flight jobs visible in admin (queued → running → done/failed)
- [ ] STATE compliance: every triggered job uses workflow_id, locks the entity, logs decisions
- [ ] No browser → CC CLI direct path; popebot is the only execution surface
- [ ] (Eventually) auto-poster UI for scheduled LinkedIn posts — reads + writes posts table, popebot job handles the actual post

### Sequencing note
Parked behind Phase 3.6 (blog) and Phase 3.7 (audience growth). Distribution comes first; admin tooling is a productivity layer, not a growth lever. Revisit when blog cadence is steady and Plan 1 (Supabase migration) is complete.

---

## PARKING LOT

| Item | Reason parked |
|------|--------------|
| **Phase 4: Workshop** | Workshop requires audience to be viable. Revisit when followers ≥ 1K or teardown cadence is proven (≥ 4 published, ≥ 1 with strong engagement). |
| **Phase 4.5: Cohort Readiness** | Blocked on workshop. Curriculum work is real but premature without a paying cohort signal. |
| **Phase 5: Cohort Beta** | Same — needs audience + workshop validation first. |
| LinkedIn image pipeline | Images are broken — low priority vs. distribution. |
| `score_audience_relevance` field | Not blocking anything. |
| Workshop slide deck visual design | When workshop comes back, use Excalidraw for beta. |
| YouTube channel | Post-cohort. |
| Draft fact citation gate (BACKLOG GAP-2 in draft.md) | Low volume — revisit at high post count. |
| simonparis.ca full site build | Blog + consulting page are the active surfaces. Other expansion post-revenue. |

---

## LESSONS LOG (anti-recurrence)

> See `docs/lessons.md` for the full log. Add a one-liner here when something breaks.

| Date | What broke | Prevention |
|------|-----------|-----------|
| 2026-03-17 | Fabricated Airtable writes on context resumption | Session integrity gate (`session_verified` flag) in /harvest |
| 2026-03-17 | Generic harvest queries (no named entities) | Named entity requirement + self-check added to harvest.md |
| 2026-03-19 | Airtable `typecast` in query param silently ignored | Must be in JSON body — documented in lessons.md |
| 2026-03-19 | PAT "all permissions" ≠ having `schema.bases:write` scope | Scopes and access are separate axes — documented in lessons.md |
| 2026-03-20 | Cohort confidence is not a feeling problem | It's a preparation problem — fix is written curriculum + dry run, not more thinking |
| 2026-04-26 | Docker Desktop credential blob corruption blocked all CLI ops in Plan 0 | Plan specs that say "Docker" should be read as "container or process — pick what runs locally." Pivoted to npm n8n; 20-min cap on Docker yak-shaving |
| 2026-04-26 | Disabled n8n secure cookie when Tailscale Serve was one command away | When choosing between "drop a security default" and "front with TLS via existing infra," default to TLS. Tailscale Serve / Caddy / nginx are 1–2 commands; security tradeoffs deserve user-explicit consent |
| 2026-04-26 | Suppressing a security warning is not the same as closing the unsafe path | Before claiming "secure," run the three-way smoke test: intended path works, unintended path refused, alternate intended path works |
| 2026-05-09 | 8 weeks of LinkedIn-only posting → 250 followers | Distribution is its own problem, separate from content quality. Solo posting doesn't compound without an audience seed. Required mechanics: borrowed audiences (ICP commenting), proof-of-work artifacts (teardowns), owned distribution surface (blog + LinkedIn newsletter). |
| 2026-05-09 | Public blog CTA pointed at `/readiness` (paid intake form) | Public surfaces link to `/score` only. `/readiness` is operational tooling — never linked from anywhere a stranger could land. Convention documented in PostCTA.tsx header. |
| 2026-05-09 | Workshop / cohort built on roadmap before audience could support them | Sequencing rule: don't build the next-tier offer until the current tier has actual demand signal. Workshop needs ~1K followers OR proven teardown engagement before it returns to the active roadmap. |
| 2026-05-10 | Misdiagnosed "hung" sitemaster job as still running 6h in (it had completed and opened PR #8) | Before claiming a background job is hung, run `agent-job-background.js status` AND `gh pr list --repo <repo>` to check completion signals. Docker logs alone can be from earlier stages of a successful run. |
| 2026-05-10 | Misdiagnosed NotebookLM rate-limit as wrong-account auth issue | Verify the symptom against ground truth before proposing fixes — Simon could see my created notebooks in his Pro account, which falsifies "wrong cookies" outright. When two diagnoses are possible, ask Simon to check the cheap one (does the artifact appear in your account?) before committing to the expensive one (regenerate cookies). |
| 2026-05-10 | Two parallel agent PRs (#9, #10) opened for the same pivot cleanup; #9 had no Vercel preview (commit author email mismatch); both PRs left broken score-result URLs in scope | Before kicking off a chore PR, `gh pr list` to dedupe. Agent commits should use a Vercel-recognized author email. "Out of scope per brief" is not acceptable when the leftover code ships user-visible broken URLs — escalate, don't silently park. |
