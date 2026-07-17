# STATE Intake Analyzer — Build Spec

> Turns a completed /readiness intake into Simon's pre-engagement kit: provisional scorecard, call brief, memo skeleton.
> Status: BUILT 2026-07-17 (goal a528feab) — `tools/intake-analyzer.mjs` in this folder. Run: `node projects/Productize-Offer/tools/intake-analyzer.mjs --row <uuid>` (repo root; needs `.env` + `node_modules` — in a worktree, symlink both from the primary checkout). Tests: `node --test tools/test/analyzer.test.mjs` (stubbed, no network).
> Consumers: `diagnostic/diagnostic-runbook.md` (Day 0) and `audit/engagement-runbook.md` (Phase 0). Scoring authority: `audit/state-scoring-rubric.md` — this tool proposes, the auditor disposes.

---

## Why this exists

The confirmation call must never be improvised. The analyzer reads the client's own answers, scores them provisionally against the rubric, and hands Simon a scripted call where every question is a targeted "show me." It converts prep time Simon doesn't have into prep work Claude does — and it is the seed of the eventual self-serve provisional audit (separate product decision, not this build).

**The hard rule (from lessons.md 2026-07-13, fabricated-empirics):** analyzer output is preparation, never scoring. Intake answers are self-report; under rubric rule 3 they confirm nothing alone. No analyzer-proposed score ships in any client-facing document without a human re-judgment against the anchors. The scorecard it emits is labeled PROVISIONAL — SELF-REPORT in the artifact itself, not just in process.

## Input

- Source: `state_readiness_diagnostic` table (simonparis-website Supabase project) — one row per submission: intro block (system name, role, company size, industry, prod status, regulations[]), five pillar sections (structured/traceable/auditable/tolerant/explicit: textarea narratives, selects, multiSelects, confidence scales), engagement context (4 narratives).
- Trigger: manual (`node tools/intake-analyzer.mjs --row <uuid>` or a slash command) after the ntfy "New /readiness submission" ping. No cron, no auto-fire — an engagement tool runs when an engagement exists.
- Locale: EN or FR row → all three outputs in the same language.

## Pipeline (STATE medium risk: S + T + E mandatory)

| Stage | What happens | Validation gate |
|---|---|---|
| 1 `fetch` | Pull the row by id; verify completeness (all required pillar answers present) | Missing required answers → error path naming the fields; never analyze a partial intake silently |
| 2 `score` | Per pillar: LLM call with (rubric anchors + scoring rules + the pillar's intake answers) → proposed level 0–3, the anchor line it matches, rationale quoting the client's own words, confidence LOW/MED/HIGH, and the **optimism flags** — claims that pattern-match "tooling installed ≠ property held" (confidence-scale 4–5 alongside a narrative that describes ad-hoc practice is the classic tell) | Output schema-validated (level ∈ 0–3, rationale non-empty, ≥1 quoted client phrase); invalid → retry once, then error path |
| 3 `brief` | LLM call: scorecard + answers → the call brief — per pillar: the claim held, the show-me ask (worded, screen-share-ready), what confirms it, what breaks it; ranked so the 2–3 most optimistic claims get the longest blocks; maps 1:1 onto the confirmation-call block table in the diagnostic runbook | Every pillar present; every ask actionable on a screen-share (no "discuss their approach") |
| 4 `skeleton` | Fill `diagnostic/findings-memo-template.md` placeholders that are knowable pre-call (engagement facts, workflow description, provisional scores + rationale, candidate named-risk sketches, page-5 confirmation table pre-populated with "pending call") — every filled value tagged `[ANALYZER — re-judge]` | Template placeholders either filled or left as {PLACEHOLDER}; no invented facts: every filled claim traces to an intake answer |
| 5 `deliver` | Write the three artifacts to the engagement notes dir; log run summary | Files exist, non-empty, language matches row locale |

- **S**: state object per run (workflowId, stage, entityType `intake`, entityId = row uuid, timestamps); stage updated per transition.
- **T**: every LLM call logged (workflow_id, step_name, model_version actually run, output_summary, status) to the standard logs table.
- **E**: gates per stage table above; any invalid output → `❌ intake-analyzer failed at [stage] — [error] — safe to retry` (no lock needed beyond idempotent re-run: outputs are files, overwrite-on-rerun is the desired behavior).
- Data handling: intake rows can contain client-sensitive narrative. Artifacts live in the engagement notes directory (local, encrypted machine), never in the repo, never in a hosted tool beyond the LLM call itself; the destruction clause in `audit/evidence-request-checklist.md` covers them.

## Outputs (all three, one run)

1. `provisional-scorecard.md` — header banner: "PROVISIONAL — scored from self-report only; confirms nothing (rubric rule 3). For engagement prep, never client delivery." Five pillars: proposed level + anchor name, rationale with client quotes, confidence, optimism flags. Footer: proposed total with the reminder that provisional totals are not bands — bands are earned live.
2. `call-brief.md` — the script: per confirmation-call block, the claim → the show-me ask → confirm/break criteria; top-3 optimism flags called out; one-line reminder of the two hardest asks to not skip under time pressure.
3. `memo-skeleton.md` — the template pre-filled per stage 4, every analyzer value tagged for re-judgment.

## Explicitly out of scope (this build)

- Any client-facing output. All three artifacts are Simon-only.
- Auto-scoring into `founding_clients`, the memo, or anywhere persistent — human hands only.
- The self-serve "automatic audit" product — separate decision with its own pricing/labeling questions (tracked on the goals board).
- /readiness form changes (artifact-upload fields, per-anchor multiple choice) — v2, queue as a sitemaster story only after the analyzer has run on ≥2 real intakes and shown what's missing.

## Acceptance (build session)

- [ ] Run against a synthetic intake row (fixture from the rubric's calibration case) → three artifacts, correct language, all gates exercised (including a forced-invalid LLM output hitting the error path).
- [ ] Provisional scores land within ±1 of the calibration case's audited scores on ≥4 of 5 pillars — not because self-report is trusted, but to prove the rubric prompt is faithful.
- [ ] A deliberately over-confident fixture (scale 5s + ad-hoc narratives) trips optimism flags on the inflated pillars.
- [ ] STATE checklist (S+T+E) passes; skill-lint if shipped as a skill.
