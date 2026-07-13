# Handoff — Offer-Ladder Sales Artifacts: Audit Methodology + Diagnostic Collateral

status: queued
goal_id: e18c302f-e395-4f56-aecc-283262b5ab38
updated: 2026-07-13

> Goal: `e18c302f` (child of Fable 5 Final Week initiative `646c7760`).
> Written 2026-07-13 by COO session. Intended to be handed to a fresh Fable 5 session verbatim.
> Siblings #1 (`4af99947`) and #2 (`3df3143e`) are DONE — story pipeline hardened, mechanical guards live.

## Mission

Write the artifacts that ARE the product. The offer ladder (diagnostic → audit → retainer) is priced and positioned, but the things a buyer actually receives — the audit methodology, the scoring rubric, the deliverable templates, the one-pagers — mostly don't exist. These are judgment-dense, written once, and sell for years: the highest direct-revenue-per-token work on the board, which is why it gets Fable 5's last week.

The quality bar, stated as a buyer test: **would a VP of Engineering at a data-sensitive enterprise, reading the audit methodology, conclude that $9,500 is obviously cheap for this?** If a deliverable reads like generic consulting collateral, it has failed. Every artifact must pass the brand's burned-practitioner and specificity tests (brand-summary.md — auto-loaded in your context).

## Read first (in this order)

1. `projects/Productize-Offer/offer-ladder.md` — **the source of truth for all prices, scopes, and terms** (confirmed 2026-07-03). Several goals-table descriptions carry corrupted/conflicting dollar values; the ladder file wins, always.
2. `projects/Productize-Offer/founding-client-program.md` — founding-tier terms (discounts in exchange for case study rights + recommendation + referrals).
3. `projects/Productize-Offer/discovery-call-script.md` + `prospect-map.md` — how these artifacts get used in a sale.
4. `brand/state-framework.md` — the audit scores against STATE pillars; the rubric must be this framework operationalized, not a parallel invention.
5. `brand/icp.md` — the buyer these are written for.
6. Goals for full context: `9b14a63a` (Production AI Audit), `e41c5c8e`/`56b1820f` (Founding/Standard Diagnostic), `ebd496f4` (audit scope+template), `5936e5e2` (diagnostic one-pager+FAQ), `98bef577`+`36e13607` (institutional artifacts + surfacing), `52c8750c`/`78e45f63` (bilingual one-pagers), `dab3f5f2` (parent initiative), `4c128ac7`/`58b20d81` (dual-market framing).

## Task 0 — Pin the numbers (do this before writing anything)

Reconcile every price/scope claim against `offer-ladder.md`. The goals table disagrees with itself (e.g. `dab3f5f2` says Diagnostic $3.5k→$7.5k while `e41c5c8e`/`56b1820f` say $2,500 founding → $3,500 standard; three goals literally say "original source values appear corrupted in DB"). Produce a one-screen pinned table (tier, founding price, standard price, raise triggers, scope, duration, deliverables), append it as a dated note to the affected goals via the API, and treat it as frozen for every artifact you write. **No artifact ships with an unpinned number.** Also note: the $1,295 audit PDF goals (`4579249a`, `0a617d7a`) belong to the separate readiness/score product — out of scope here; don't conflate the two audits.

## Deliverables

### 1. Production AI Audit methodology + deliverable kit (the crown jewel — $9,500, 2 weeks)
The complete engagement, written so Simon can run it under time pressure and so a buyer excerpt makes the price feel cheap:
- Engagement runbook: day-by-day 2-week structure — scoping call, evidence request, codebase review, telemetry review, 3–5 engineer interviews, scoring, synthesis, readout.
- Evidence-request checklist the client receives before day 1 (repo access, traces/logs, incident history, prompt/version inventory — what to ask for and why).
- Engineer interview guides (the questions that surface state failures: reproducibility, silent-fallback, observability gaps, compliance pressure).
- **STATE scoring rubric**: per pillar, 0–3 scale, with concrete anchor descriptions per level ("what a 1 looks like in the wild") so two different auditors would land on the same score. This rubric is the defensible core of the whole ladder.
- Findings-doc template (10–20 pages): structure, per-pillar sections, named-risk format, benchmark placeholder.
- 90-day remediation roadmap template (prioritized, effort-tagged).
- Readout-call structure, ending with the retainer conversation (per goal `46d6fc61`: the retainer is pitched at the end of a successful audit, never cold).

### 2. Diagnostic collateral (founding $2,500 / standard $3,500 — verify against ladder)
- 3–5 day diagnostic runbook (a scoped-down subset of the audit methodology — same rubric, less evidence).
- 5-page findings-memo template.
- One-pager + FAQ, **EN + FR** — FR leans Loi 25/Law 25, EN leans regulated industries (NIST AI RMF, FFIEC/HIPAA/SOC2). Founding-tier framing per `founding-client-program.md` (social-proof play, not cheap consulting).

### 3. Institutional artifacts for /audit ("What you keep")
Goal `98bef577`: three reference artifacts the buyer keeps. Read sitemaster PR #17 in simonparis-website + its DESIGN.md notes to see what was reserved. Strong candidates fall straight out of deliverable 1 (e.g. the STATE scoring rubric as a public excerpt, the evidence-request checklist, a failure-mode taxonomy card) — but choosing the three is a judgment call: pick what raises perceived value without giving away the paid synthesis. Per goal `36e13607`, **don't wait for all three**: the moment the first artifact is real, queue a story to surface the "What you keep" section on /audit (EN + FR via next-intl).

### 4. Bilingual sales one-pager (stretch, if the week allows)
Goal `52c8750c`: one page covering all three tiers + Founding Client framing — the artifact sent to every warm lead. If time is short, prefer finishing 1–3 to excellence over starting this.

You have discovery room here: if while writing the methodology you see an artifact that obviously belongs in the kit and isn't listed (calibration examples, a sample anonymized findings page, an objection-handling sheet for the FAQ), add it. List additions in your handback.

## Success criteria

- [ ] Task 0 pinned-price table exists; affected goals annotated; zero conflicting numbers across everything shipped.
- [ ] Audit methodology kit committed under `projects/Productize-Offer/` (subdirectory per tier is fine) — runbook, evidence checklist, interview guides, scoring rubric with per-level anchors, findings template, roadmap template, readout structure.
- [ ] Scoring rubric passes the two-auditor test: a subagent given only the rubric and a synthetic case scores within ±1 of another subagent on every pillar (run this — it's cheap and it's the proof the rubric is real).
- [ ] Diagnostic runbook, memo template, and EN+FR one-pager + FAQ drafted.
- [ ] **Adversarial buyer review, documented**: a subagent playing the ICP (skeptical LLM Platform/Reliability Lead who's been burned by consultants) attacks each client-facing artifact — at least 3 specific weaknesses found and fixed per artifact, per the critique contract (CLAUDE.md rule 7: docs are claims under test, not ground truth).
- [ ] First institutional artifact shipped + sitemaster story queued for the /audit "What you keep" section (agent_target `sitemaster`, brand acceptance criteria spelled out: dark mode, zero border-radius, #E04500 actions, #C97A1A links, #1F1F1F elevated tiles per DESIGN.md, default/hover states).
- [ ] Everything brand-clean: no prohibited phrases, no public CTA ever points at `/readiness` (`/score` is canonical), FR copy is real French tuned to Loi 25 vocabulary — not translated filler.
- [ ] **Simon review gate**: nothing client-facing is final without his pass — these documents carry his name into sales conversations. Present drafts in batches with the discriminating choices called out (what you'd change if he disagrees).
- [ ] Related goals annotated with artifact paths; goal `e18c302f` proposed done; lessons/friction harvested at close.

## Constraints & standing rules

- This is content/judgment work in MetaArchitect — **session work, not stories** — EXCEPT /audit page changes (the "What you keep" section, and dual-market framing `58b20d81` if you get there), which go to the story pipeline as simonparis-website stories with `agent_target: sitemaster` + explicit brand criteria.
- `offer-ladder.md` is the single source of truth on prices/terms. If you believe the ladder itself is wrong or stale, flag it to Simon — don't silently "fix" it.
- Artifacts must be deliverable by one person in the stated engagement windows (2 weeks audit, 3–5 days diagnostic). A methodology Simon can't actually execute at that speed is a liability, not an asset — bias toward checklists and templates over prose.
- Voice: practitioner-to-practitioner throughout. FAQ answers in the brand's diagnostic register ("Can we log why the agent did this?"), never corporate reassurance.
- Commit completed work proactively (Simon's rule 2026-07-13); `gh` for any pushes.
- PDFs/visual formatting: brand palette + typography from brand-summary.md; zero border-radius; always dark where the medium allows. If a print-light variant is genuinely needed for a sales PDF, ask Simon rather than inventing one.

## Process

Read-first list → Task 0 → then use your process skills as you judge appropriate. Natural shape: short brainstorm with Simon only if the artifact set needs re-scoping (the what is largely settled above); the writing itself parallelizes well — subagent per artifact with the rubric written FIRST (everything else references it), then the adversarial buyer review pass, then the Simon gate. The rubric two-auditor test and the ICP attack review are not optional polish — they're the difference between collateral and product.
