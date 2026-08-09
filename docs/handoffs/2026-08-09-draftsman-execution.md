# Handoff — Execute the Draftsman rollout (spec + plan approved, build it)

status: queued
picked_up_by: nobody yet
updated: 2026-08-09
supersedes: `2026-08-09-operator-visual-rollout-draftsman.md` (design/context handoff — now the design authority, not the work queue)

## Start here

1. Read the plan: `docs/superpowers/plans/2026-08-09-draftsman-rollout.md` — Sonnet-ready (exact files, line numbers, full CSS/component code, per-page section maps).
2. **Tasks 0–2 are DONE** (Fable/CMO session 2026-08-09, merged to main): plugin check all-PASS (49 skills, symlinks good, marketplace current); brand-summary now carries `## Operator Lane — Draftsman System` (the design authority for builder prompts); the copy audit is at `funnel/setup-offer/copy-audit-2026-08-09.md` — apply its CURRENT→REPLACE pairs verbatim. **Start at Task 3** (worktree setup).
3. Invoke `superpowers:subagent-driven-development` and execute task-by-task. Simon chose subagent-driven execution explicitly (this session, 2026-08-09).
4. The spec (`docs/superpowers/specs/2026-08-09-draftsman-rollout-design.md`) is the approved design; the original handoff §"The approved system, concretely" is the visual authority; `docs/research/operator-trust-criteria-independent-2026-08-09.md` is the why.

## Late corrections (2026-08-09, Simon-approved — already folded into the plan)

- `/work-with-me` and `/about` are **practitioner pages** (enterprise ladder + STATE identity — see audit doc headline finding). They STAY in the rollout but get the **visual system only** — copy unchanged, no operatorizing, no-mono rule relaxed there. Simon: the whole public face goes Draftsman; practitioner lane stays open underneath until social proof.
- **Lane-aware nav**: on `/` and `/setup`, the nav "Work With Me" item points to `/setup`; elsewhere it keeps `/work-with-me` (plan Task 7 Step 1b).
- `StateGrid`/`FailureTrace`/`OfferCards` belong to `LegacyHomePractitioner` only — the original handoff's /setup component list was stale. Don't touch them.

## Decisions already made — do not re-open

- **Scope:** homepage (`HomeOperator`), `/setup`, `/work-with-me`, `/about`, both locales (en/fr). Blog **visuals deferred to phase 2** (Simon's call); blog gets copy-only fixes from the audit.
- **Order:** docs-first — plugin check (Task 0), brand-summary v-next (Task 1), copy audit (Task 2) BEFORE any website code. Brand-summary §"Operator Lane — Draftsman System" (Task 1 creates it) is what every builder prompt cites.
- **Theming mechanism:** locked in the plan — `@theme` token names + `.theme-draftsman` wrapper + `:where()` carve-out of the global `border-radius: 0 !important` reset + `body:has()` for Nav/Footer. Don't invent an alternative.
- Everything in the original handoff's "do not re-litigate" list still stands (rejected directions, no pill buttons/bordered grids/glow orbs/accent bars, practitioner door stays, mockup artifact unreachable → `design/draftsman-reference.html` gets rebuilt from the written description, Task 4).

## Execution notes

- **Tasks 0–2 are judgment work** (plugin check, brand doc, copy audit) — do them in the main session or with a single careful agent each, and have the copy audit reviewed against `.claude/product-marketing.md` v2 before page tasks consume it. The audit's discriminator format (CURRENT → REPLACE verbatim pairs) is a contract — page builders apply it literally, never improvise copy.
- **Tasks 4–11 (build):** dispatch sitemaster-profile subagents; every prompt includes: the plan task verbatim, brand-summary §Operator Lane — Draftsman System, and the don't-list. Review each page against the reference mockup + orange-budget/no-mono checks before starting the next.
- **Website work happens in a fresh worktree** (`git worktree add ../simonparis-website-draftsman -b draftsman-rollout origin/master` — Task 3). Never the primary checkout. Push via `gh`-wired remote.
- **Merge gate (hard):** the simonparis-website PR does NOT merge. Post the Vercel preview URL and report "pending Simon's live check" — discriminator: preview shows warm paper `#F3EEE1` on the four pages, production still shows dark `#0f0f0f`.
- Sterling memory: one `next build` at a time; don't parallelize page-build agents that each run builds.
- Watch the evidence line: 0 paying clients — no new proof/testimonial/number claims anywhere (plan Global Constraints).

## Done means

All 16 plan tasks checked; brand-summary v-next merged to MetaArchitect main; copy-audit doc committed; simonparis-website PR open with screenshots + QA log, awaiting Simon's preview check; both handoff docs' status lines updated.
