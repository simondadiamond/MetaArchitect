# Brand Repositioning Plan — Operator ICP (Two-Audience Brand OS)

> Date: 2026-07-20 · Author: COO session · Status: awaiting Simon's approval on the ICP draft, then Phase 1 executes.
> Trigger: crawl-first strategy (locked 2026-07-19) made /setup the active offer, but the entire brand OS — ICP doc, voice gates, pillars, CTA routing, homepage — still targets the enterprise reliability lead.

## Decisions already locked (this session)

- Roadmap restructured: Setup Venture promoted to top-level initiative (2116b881), corporate ladder + ghostwriter + brain-as-a-product parked with re-entry triggers.
- /work-with-me stays live but orphaned — de-linked from nav, serves the corporate pull lane and /score's high-score CTA.
- Teardown engine stays practitioner-targeted; the LinkedIn derivative mix re-weights toward operator content.
- Homepage goes operator-first now (with a practitioner escape hatch), architected so a two-door/thesis-led version can return when enterprise pull resumes.
- Thesis, STATE framework, name, visual identity: unchanged. This is an ICP-layer repositioning, not a rebrand.

## Audience architecture

Two audiences under one thesis (State Beats Intelligence — structure/state beats raw model capability, at every scale):

| Lane | Audience | Status | Revenue surface | Public CTA |
|---|---|---|---|---|
| **Operator** (primary) | Owner-operator of an expertise/service business | ACTIVE — all new positioning | /setup ladder | `/setup` |
| **Practitioner** (pull) | LLM platform/reliability lead, data-sensitive enterprise | Warm-idle — authority engine only | /work-with-me (orphaned), /score funnel | `/score` |

Every content artifact declares its audience; gates and CTAs key off that field. Nothing practitioner-facing is deleted — it is demoted to the pull lane.

## Derived operator ICP (draft v1 — Simon edits, then it becomes brand/icp.md)

Derived from the offer itself, not aspiration:

- The offer's named workflows (invoices, client follow-ups in "my voice", onboarding checklists, workshop emails, "what did we decide about fall pricing") are the daily reality of someone who **sells expertise and runs their own delivery, marketing, and admin**.
- Delivery is single-machine, single-Claude-account, personal handover ("you drive, I navigate"). The buyer IS the operator. A 5–25-person firm needs multi-seat, shared permissions, staff training — a different product. That segment is a future variant, not the target.
- Price logic: $6,500 pays back only for someone whose time bills at roughly $100–250/hr and who personally loses 3–5 hrs/week to context-re-explaining and admin — payback inside a quarter. That means an established owner-operator, roughly $100K–$1M revenue. Below that, the $125/hr working sessions are the honest entry (this is how indie founders/creators enter the funnel without distorting the flagship's targeting).

**Label**: The Expertise Operator — owner-operator of a service/expertise business (solo up to ~5 people): consultants, coaches, trainers/facilitators, fractional executives, boutique agency principals, solo professionals. Sister = archetype client #0.

**Defining sentence**:
> "I'm paying for Claude and I know it should be saving me hours, but every chat starts from zero — I re-explain my business, re-paste the same three documents, and the draft still doesn't sound like me. I don't need another AI tool. I need my business set up so the AI I already pay for actually knows it."

**5 core frustrations**:
1. **Groundhog-day context** — every session starts from zero; re-explaining the business for the hundredth time.
2. **Generic output** — drafts read like a press release from a company they've never met; editing takes longer than writing would have.
3. **Owner-as-bottleneck** — invoices, proposals, follow-ups, onboarding all wait on the owner's evenings.
4. **Paying for 10%** — real money going to AI subscriptions that don't compound; quiet guilt about underuse.
5. **No memory** — decisions get re-litigated because nothing persists; "where did we land on that?"

**Language that lands**: "I re-explain my business every single time" · "It sounds like AI wrote it" · "I'm the bottleneck" · "Admin eats my evenings" · "I'm using maybe 10% of what I pay for" · "Where did we land on that?"

**Voice test (replaces the burned-practitioner test for operator content)** — *Busy owner test*: would an owner who spent last Sunday night doing invoices read this and think "that's my Tuesday"? (Specificity test and thesis-alignment test carry over unchanged.)

**Ladder → segment mapping**: Working Sessions $125/hr = entry for anyone, including indie/curious; Audit + Roadmap $2.5K = operators with an established mess; Business OS Setup $6.5K (founding $5K) = operators whose billable rate makes it rational.

**Secondary (do not target, absorb on pull)**: small firms 5–25 staff (future multi-seat variant); enterprise practitioner lane (unchanged, /score funnel).

## Pillar re-weighting

| Pillar | New role |
|---|---|
| The Meta Layer | **Primary operator pillar** — "my Tuesday", build-stories, before/after workflow demos, business-OS patterns |
| Production Failure Taxonomy | Practitioner spine, reduced share |
| STATE Framework Applied | Practitioner spine + neutral IP (operator posts may reference structure-beats-model in plain language) |
| Defensive Architecture | Practitioner spine, reduced share |
| Regulated AI & Law 25 | **Parked** with the corporate lane |

Proposed LinkedIn mix: ~60% operator / 40% practitioner, revisit after first founding client. Spine check stays: ≥2 posts/week land on State Beats Intelligence (either altitude).

**CTA routing table** (replaces the single /score rule):
- Operator-audience post → soft CTA to `/setup`, every ~3rd operator post (mechanical check against pipeline.posts, same as the /score rule today)
- Practitioner-audience post → `/score`, every ~3rd practitioner post (unchanged)
- `/readiness` never public (unchanged)

## Phases — what gets modified, where

### Phase 1 — Brand source-of-truth (MetaArchitect, session work, ~1–2h) — DO FIRST
1. `brand/icp.md` — rewrite as two-audience doc: operator ICP (above) primary; enterprise ICP preserved verbatim in a "Pull lane (parked)" section, not deleted.
2. `brand/brand-summary.md` — highest leverage (@-imported by both CLAUDE.md files): new ICP block, audience-field convention, both voice tests scoped by audience, re-weighted pillar table, CTA routing table, Write-This/Not-This rows gain operator examples.
3. `brand/brand-guidelines.md` — align voice tests + pillars; add operator Write-This/Not-This rows.

### Phase 2 — Skills, gates, agent profiles (MetaArchitect, session work, ~1–2h)
4. `editorial/SKILL.md` — fidelity check becomes audience-parameterized: busy-owner test for operator drafts, burned-practitioner test for practitioner drafts.
5. `write-post/SKILL.md` — pillar table + CTA logic per audience.
6. `repurpose/references/linkedin-playbook.md` + `linkedin-gate.md` + `repurpose/SKILL.md` — audience line, per-audience CTA cadence checks.
7. `session-close/references/harvest-lanes.md` — `icp_pain` enum gains operator pains.
8. `weekly-review` + `weekly-brief` — "ICP conversations" metric split per lane.
9. `.claude/agents/blog-writer.md` — dual mandate (audience field decides the standard); `.claude/agents/sitemaster.md` — inline ICP anchor updated, conversion map re-pointed (/setup primary, /score secondary).
10. `teardown-research`/`teardown-generate` — UNCHANGED (practitioner lane by decision). `build-story` — verify its /setup CTA rules match the new routing table (likely already compliant).
11. Run `scripts/skill-lint.sh` after skill edits.

### Phase 3 — Website (simonparis-website repo, mixed routing)
12. **Homepage rebuild — operator-first** (`messages/{en,fr}/home.json` + layout): hero on the operator pain (groundhog-day context → business running on Claude), primary CTA → /setup, practitioner escape hatch in sub-hero or footer ("Run production LLM systems? → STATE Score"). NEW conversion page ⇒ **in-session with ui-ux-pro-max + frontend-design loaded** (per CLAUDE.md rule), not a story.
13. **Nav story** (sitemaster): "Work With Me" nav item → `/setup`; /work-with-me stays live, orphaned. Brand acceptance criteria spelled out.
14. **Metadata sweep stories** (after Phase 1 locks language): `metadata.json`, `layout.tsx` keywords/OG, `llms.txt/route.ts` ("Who This Is For" gains the operator, enterprise moves to secondary), `about.json` (soften to two-audience).
15. Untouched: `/score` tool + score.json (practitioner funnel intact), `/work-with-me`, blog, state-rubric artifact. Delete dead `app/page.tsx.bak`.

### Phase 4 — Data + funnel (propose-first, later)
16. `engage_targets` — ADD ~10 operator-side anchors (solopreneur/creator-business accounts) alongside the MLOps anchors; COO proposes the list, Simon approves (data edit, never from the skill).
17. Operator lead magnet — the Ask-for-Anything Cheatsheet (already a /setup bonus) excerpted as email-capture magnet on /setup. Backlog goal, not now.
18. Field Guide + readiness checklists — stay practitioner collateral, no rework.

## Sequencing

Phase 1 → then homepage (12) and Phase 2 in parallel → nav story (13) can ship immediately after homepage decision is final → metadata stories (14) after Phase 1 → Phase 4 on pull/backlog.

## Open items for Simon
- Approve/edit the operator ICP draft (label, defining sentence, frustrations) — the one blocking item.
- Confirm 60/40 operator/practitioner LinkedIn mix.
- Nav label: keep "Work With Me" (pointing at /setup) vs rename to "Setup".
- Phase 4 superstar additions: want the proposed list this week or after first founding client?
