# Findings Memo Template — AI Readiness Diagnostic

> The 5-page deliverable skeleton. Fill every {PLACEHOLDER}; delete every instruction line (marked `<!-- -->`) before delivery.
> Part of the AI Readiness Diagnostic kit — prices per `../pricing-pinned.md`.
> Scores come from `../audit/state-scoring-rubric.md` via `diagnostic-runbook.md`. Anchor names and band names are part of the instrument — use them verbatim.

<!-- Rules for filling this in:
     - 5 pages means 5 pages. If page 3 wants to be longer, the risks aren't named sharply enough yet.
     - Every score cites a pointer the client can check themselves (their artifact, their screen, their call — with timestamp).
     - Pointers must be checkable, not decorative: the call recording — or timestamped transcript excerpts covering every cited moment — is delivered WITH the memo. Where consent limits sharing, the pointer format becomes "auditor's notes @00:47 — recording held by {CLIENT} attendees."
     - Single-point-of-failure findings are stated by ROLE ("one engineer carries it"), never by name — the memo circulates beyond the room that earned the trust.
     - Provisional flags appear in three places and must agree: page 1 count, page 2 flags, page 5 table.
     - Intake answers (state_readiness_diagnostic) are self-report: cite them only as "intake, confirmed on call @{TS}" or "intake claim — NOT confirmed live" (which is a provisional flag, never a confirmed pointer). Where the confirmed score differs from the intake's self-assessment, state the delta plainly, without gloating — it is evidence.
     - Analyzer-prefilled text is a draft: every score and sentence re-judged by hand before it survives. No analyzer output ships unreviewed.
     - Voice: diagnostic register. No hedging ("somewhat", "may want to consider"), no reassurance ("overall a solid foundation").
     - EN/FR: deliver in the client's language per booking; structure identical. -->

---

## PAGE 1 — Engagement & Verdict

# AI Readiness Diagnostic — Findings Memo

| | |
|---|---|
| **Client** | {CLIENT_COMPANY} |
| **Prepared for** | {OWNER_NAME}, {OWNER_TITLE} |
| **Prepared by** | Simon Paris — The Meta Architect, simonparis.ca |
| **Engagement** | AI Readiness Diagnostic ({N_DAYS} days, {DATE_START}–{DATE_READOUT}) |
| **Workflow scored** | **{WORKFLOW_NAME}** — {ONE_LINE_WORKFLOW: trigger → LLM step(s) → real-world effect} |
| **Evidence base** | STATE intake completed by {OWNER_NAME} ({INTAKE_DATE}), one {CALL_LENGTH}-min confirmation call ({OWNER_NAME} + {ENGINEER_NAME}, recorded — recording delivered with this memo), {N_ARTIFACTS} of 6 requested artifacts received within the 48-hour window |
| **Not received** | {MISSING_ARTIFACTS: list missing artifacts and the pillar each affected — or "none"} |
| **Instrument** | STATE scoring rubric — same rubric, same anchors, same scale as the Production AI Audit; reduced evidence depth |

### Verdict

<!-- One paragraph. Score + band in the first sentence. Then: what holds the workflow up today (usually a person or a single mechanism), what the score says about it, and the one sentence the owner will repeat in their own words to their boss. No recommendations here — pages 3–4 carry those. -->

**{WORKFLOW_NAME} scores {TOTAL}/15 — {BAND_NAME} ({N_PROVISIONAL} of 5 scores provisional).** {VERDICT_PARAGRAPH: 4–6 sentences. Name what actually carries the workflow (the mechanism or the person — by role, never by name), name the failure mode that is currently active and invisible, and state the delta plainly — e.g., "The workflow works because one engineer carries it, not because the system holds it."} The rubric's live test for the provisional scores could not run at diagnostic evidence depth; page 5 states exactly which, and exactly what would confirm each.

<!-- If A scored N/A: report {TOTAL}/12 with the one-line reason per rubric rule 5. Never rescale, never project. -->

---

## PAGE 2 — STATE Score

<!-- Scale reminder for the reader lives in the caption, not a lecture. Anchor names verbatim from the rubric: Absent / Ad-hoc / Systematic / Enforced. Provisional = the rubric's rule-4 flag: live test could not run at diagnostic evidence depth; score reflects best available evidence and is capped by what was corroborated. -->

Scale: 0 Absent · 1 Ad-hoc · 2 Systematic · 3 Enforced. A score is awarded only when **every** criterion of that level held on the evidence — when torn, the rubric takes the lower.

| Pillar | Score | Level | Provisional | Evidence pointer |
|---|---|---|---|---|
| **S — Structured** | {S_SCORE}/3 | {S_ANCHOR} | {S_PROV: — / PROVISIONAL} | {S_POINTER: e.g., "state ask, call @00:14 — last saved row named step and outputs in 40 s" / "schema DDL artifact #2 vs. sampled row"} |
| **T — Traceable** | {T_SCORE}/3 | {T_ANCHOR} | {T_PROV} | {T_POINTER: e.g., "live trace pull, call @00:31 — complete trace in 7 min incl. model versions"} |
| **A — Auditable** | {A_SCORE}/3 or N/A | {A_ANCHOR_OR_NA} | {A_PROV} | {A_POINTER: e.g., "no decision record produced on request, call @01:02; no inventory exists — its absence is the finding"} |
| **T — Tolerant** | {TOL_SCORE}/3 | {TOL_ANCHOR} | {TOL_PROV} | {TOL_POINTER: e.g., "paper-form reboot test, call @00:47 — owner and engineer gave divergent answers for a crash at step {N}"} |
| **E — Explicit** | {E_SCORE}/3 | {E_ANCHOR} | {E_PROV} | {E_POINTER: e.g., "boundary walk enumerated {N} LLM→action points; validation code seen for 1 of {N} (artifact #4)"} |
| **Total** | **{TOTAL}/15** | **{BAND_NAME}** | {N_PROVISIONAL} provisional | |

{BAND_LINE: the band's one-line meaning, verbatim from the rubric — e.g., "High Risk — held together by individuals, not systems; fails under turnover or scale."}

<!-- Optional, include only if the client took the public quiz: -->
{QUIZ_DELTA_LINE: "Your self-assessed score at simonparis.ca/score was {QUIZ_SCORE} — the gap between self-assessment and evidence is itself a finding: '{EXAMPLE: we have logging}' and '{EXAMPLE: we reconstructed last Tuesday's run in 7 minutes}' are different claims."}

**What provisional means here:** the score stands on the evidence collected, but its live test did not run. A provisional 2 has not earned the confidence of a confirmed 2 — properties that were built to be tested tend to survive testing; properties that have never been tested tend not to.

---

## PAGE 3 — What We Found

<!-- 2–3 findings, never more. Each gets: a specific memorable NAME (theirs, not generic — "The Consumed-Email Gap", not "Resilience Issue"), the concrete scenario in their system with their component names, and the blast radius (who eats it, what it costs, who answers for it). 120–180 words each — shorter than the audit version: no remediation detail, no architecture alternatives. The fix lives on page 4; this page only makes the risk impossible to un-see. -->

### 1. {RISK_1_NAME}

{RISK_1_SCENARIO: 3–5 sentences. The concrete sequence, using their component names and the evidence pointer that surfaced it. Written so the engineer who was on the call reads it and says "yes, exactly that."}

**Blast radius:** {RISK_1_BLAST: who is affected when it fires, what it costs in hours/records/exposure, and who answers the question afterward — name the role, e.g., "{OWNER_TITLE} answers to {RISK_FUNCTION} with no trace to point at."}

### 2. {RISK_2_NAME}

{RISK_2_SCENARIO}

**Blast radius:** {RISK_2_BLAST}

### 3. {RISK_3_NAME} <!-- delete this block if only two findings earned a name — two sharp beats three padded -->

{RISK_3_SCENARIO}

**Blast radius:** {RISK_3_BLAST}

---

## PAGE 4 — First Moves

<!-- Exactly three. Constraint set: each move (a) targets the weakest pillar ({WEAKEST_PILLAR}, scored {WEAKEST_SCORE}/3), or removes a named risk from page 3; (b) is completable inside 30 days by the client's own team; (c) requires nothing from Simon. Effort tags: [hours] = one engineer, one sitting · [days] = one engineer, inside a sprint · [sprint] = needs a planned slot. If a move wants a bigger tag than [sprint], it is roadmap material, not a first move — that is audit scope, and it does not belong on this page. -->

These are first moves, not a roadmap. They move **{WEAKEST_PILLAR}** (your weakest pillar at {WEAKEST_SCORE}/3) within 30 days. Sequencing beyond these three — and the interactions between fixes — is what a remediation roadmap is for; a diagnostic does not pretend to have one.

### Move 1 — {MOVE_1_TITLE} `[{MOVE_1_EFFORT: hours|days|sprint}]`
{MOVE_1_BODY: 2–4 sentences. What to build/change, where in their system, and the observable proof it worked — "done" must be checkable, e.g., "done when a run killed at step {N} in staging resumes at step {N}, witnessed once."}

### Move 2 — {MOVE_2_TITLE} `[{MOVE_2_EFFORT}]`
{MOVE_2_BODY}

### Move 3 — {MOVE_3_TITLE} `[{MOVE_3_EFFORT}]`
{MOVE_3_BODY}

**Order matters:** {ORDER_LINE: one sentence on which move goes first and why — usually the one that makes the other two observable.}

---

## PAGE 5 — Scope & Limitations

<!-- This page is honest scope disclosure that happens to be the audit sales page. It works exactly to the degree it stays honest: state what a diagnostic structurally cannot see, list the provisional scores with the precise confirming test, and let the gap sell. One flat sentence about the audit at the end. No adjectives, no urgency, no "we recommend." -->

### What this diagnostic could not see

A {N_DAYS}-day diagnostic scores one workflow from one intake, one confirmation call, and {N_ARTIFACTS} artifacts. Structurally outside its reach:

- **The codebase.** One boundary's validation code was read ({ARTIFACT_REF}); the other {N_BOUNDARIES_UNREAD} enumerated LLM→action boundaries were described, not inspected. Described gates and real gates diverge — that divergence is the most common audit finding.
- **Failure behavior, observed.** The reboot test ran in paper form — nobody killed a live run and watched the restart. Systems that resume on the whiteboard and systems that resume in production are different populations.
- **The second engineer.** One engineer's account, corroborated by artifacts where possible. Whether the workflow survives that engineer's vacation was asked about, not tested.
- **Coverage.** {COVERAGE_LINE: any path explicitly out of view — e.g., "the nightly batch path was described but produced no trace" — or delete.}
- **Other workflows.** {OTHER_WORKFLOWS_LINE: if adjacent LLM workflows were mentioned on the call, name them here as unscored — or delete.}

### Provisional scores, and exactly what confirms each

<!-- One row per provisional score. "What confirms it" is the rubric's own live test at full evidence depth — copy the mechanics, not marketing. If nothing is provisional (rare in a diagnostic), replace the table with the single line: "All five live tests ran and were witnessed — no provisional scores." -->

| Pillar | Scored | Provisional because | What confirms (or corrects) it |
|---|---|---|---|
| {P1_PILLAR} | {P1_SCORE}/3 | {P1_WHY: e.g., "reboot test paper-form only — no run was killed"} | {P1_CONFIRM: e.g., "kill the workflow mid-run in a non-prod environment and watch the restart; divergence between the paper answer and observed behavior re-scores the pillar"} |
| {P2_PILLAR} | {P2_SCORE}/3 | {P2_WHY} | {P2_CONFIRM} |
| {P3_PILLAR} | {P3_SCORE}/3 | {P3_WHY} | {P3_CONFIRM} |

A provisional score can move in either direction under full evidence. Properties that were built to be tested tend to survive testing; properties that have never been tested tend not to.

### Where confirmation happens

The engagement built to close every gap on this page is the **Production AI Audit**: two weeks, codebase and telemetry review, 3–5 engineer interviews, every live test run at full depth, per-pillar scoring across up to three workflows, a 10–20 page findings document, and a 90-day remediation roadmap in place of the three first moves above — it starts from this memo, not from zero.

---

*Guarantee, as sold: if this memo wasn't worth the fee, full refund on request within 14 days of the readout — and everything in it stays yours.*
