# STATE Scoring Rubric — Production AI Audit

> The scoring instrument for the Production AI Audit ($6,500 founding / $9,500 full — `../pricing-pinned.md`).
> Operationalizes `brand/state-framework.md`. This is the defensible core of the engagement:
> two auditors given the same evidence must land within ±1 on every pillar, or the rubric has failed.
> Also used, at reduced evidence depth, by the AI Readiness Diagnostic (`../diagnostic/diagnostic-runbook.md`).

---

## What gets scored

**Score workflows, not companies.** An org doesn't have a STATE score — a workflow does. The audit scores 1–3 named production workflows (chosen at scoping, locked in the SOW). Each workflow gets five pillar scores, 0–3, from evidence gathered during the engagement. The findings doc reports each workflow separately; never average across workflows.

A **workflow** = one path from trigger to real-world effect that passes through at least one LLM call. "The claims-triage summarizer" is a workflow. "Our AI platform" is not.

## Relationship to the public /score quiz

The quiz at simonparis.ca/score is self-assessed, two yes/no questions per pillar, 0–2 each. This rubric is evidence-based, 0–3 per pillar, scored by an auditor who has seen the code, the traces, and the engineers. They will not agree — self-assessed scores typically run optimistic, because "we have logging" and "we can reconstruct last Tuesday's execution" are different claims. The delta between quiz and audit score is itself a finding.

---

## The scale

The four levels mean the same thing on every pillar. Anchor names are part of the instrument — use them in the findings doc.

| Level | Name | Meaning |
|---|---|---|
| **0** | **Absent** | The property does not exist. The failure mode it prevents is active and invisible. |
| **1** | **Ad-hoc** | Fragments exist — by accident or individual initiative, not by design. Fails under stress, staff turnover, or scale. |
| **2** | **Systematic** | Exists by design across the workflow. Named, bounded gaps remain. |
| **3** | **Enforced** | Exists by construction. Verified by test, and cannot silently regress. |

The jump that matters commercially is 1→2 (ad-hoc→systematic): that's where a workflow stops depending on the one engineer who built it. The jump that matters in an incident is 2→3: systematic-but-unverified is where "we thought we had that" lives.

---

## Scoring rules (read before scoring anything)

1. **Score what you observed, not what's planned.** Roadmap items, in-flight PRs, and "we're adding that this quarter" score as if absent. The score describes today.
2. **All-criteria rule.** Award a level only when every criterion of that level holds. Anything less scores the level below. When torn between two levels, take the lower — the anchors are written so that a genuine borderline is rare.
3. **Evidence or it didn't happen.** Every pillar score cites at least one evidence pointer in the findings doc: a file path, a trace ID, a log query, a schema, or an interview quote **plus** the artifact that corroborates it. An uncorroborated interview claim caps the pillar at 1 — engineers sincerely believe in logging they cannot produce.
4. **Live tests trump documents.** Each pillar has a live test (below). Run it during the audit wherever access allows. A failed live test caps the pillar at 1 no matter what the architecture diagram says. A live test that cannot be run for access reasons is noted in the findings doc as "untested — score provisional."
5. **N/A is allowed exactly once.** Pillar A is N/A when the workflow makes no decision affecting an individual and touches no personal data (state-framework.md risk tiers: below High). Nothing else is ever N/A. When A is N/A, report the aggregate as x/12 with a one-line reason — never silently rescale to /15.
6. **Independence.** Score each pillar on its own evidence. A workflow can be 3 on Traceable and 0 on Tolerant — that combination is common (observability products sell better than resume logic).

---

## S — Structured

*Explicit state schemas, not implicit context.* Failure mode prevented: context rot — the agent loses track of where it is, older state silently drops, behavior degrades with no error signal.

**Live test:** have them show you the runs table and pick the run yourself — mid-flight or recently crashed, never their golden-path pick. Ask the engineer to tell you, from persisted state only — no transcript, no chat history, no log spelunking — exactly which step it stopped at and what it had produced so far. Time them.

**Evidence sources:** state schema definitions (types, migrations, table DDL), a sampled state row vs. the actual execution position, how each step reads/writes state, what happens to state on deploy/restart.

| Score | Anchors — award only if ALL hold |
|---|---|
| **0 — Absent** | Workflow position lives only in the prompt/context window or framework-internal memory. Business entities travel as free text or untyped blobs. Restart means start over. In the wild: "where is it in the process?" is answered by scrolling a conversation transcript. |
| **1 — Ad-hoc** | Some state is persisted (a status column, a JSON blob) but there is no schema the code enforces, or the persisted position lies: a `stage`/`status` field exists but doesn't reliably match actual execution position. In the wild: rows stuck on "processing" for runs that died last week; two code paths writing different shapes to the same column. |
| **2 — Systematic** | A typed state object with a defined schema is initialized before work starts; `stage` is updated at every transition and matches reality; business entities are first-class records with IDs. Remaining gaps are named: e.g., one sub-flow still context-only, or ad-hoc fields creep in without schema review. Live test passes, but slowly or with one wrong guess. |
| **3 — Enforced** | Everything in 2, plus: state writes are schema-validated (bad shape cannot be persisted), schema changes are versioned/migrated, and the live test passes immediately — the last saved state names the exact step and its outputs, demonstrated during the audit. |

## T — Traceable

*Every step observable, every decision logged.* Failure mode prevented: blind debugging — "the model did something weird" as a post-mortem conclusion.

**Live test:** name a specific execution from last week (pick it yourself from their volume, don't let them pick). Ask for the complete trace: every LLM call, every tool call, inputs, outputs, model version. Clock it. Under 10 minutes = pass.

**Evidence sources:** tracing/logging infrastructure (Langfuse, LangSmith, OTel, homegrown), one full sampled trace, correlation-ID scheme, retention policy, who actually queries traces and how often.

| Score | Anchors — award only if ALL hold |
|---|---|
| **0 — Absent** | No per-execution record of LLM calls beyond the provider's billing dashboard. Reconstruction of any past execution is impossible. Debugging = re-run and hope. |
| **1 — Ad-hoc** | Prompts or outputs land somewhere (stdout, app logs, a table someone added) but the record is incomplete — missing model version, parameters, or tool calls — or uncorrelated: no ID links the calls of one execution together. In the wild: the trace exists in principle and the live test takes an afternoon of grep. |
| **2 — Systematic** | Every LLM call, external API call, and stage transition is logged with a correlation ID, inputs/outputs, and the model version that actually ran. Traces are queryable and the live test passes. Named gaps remain: retries/fallbacks untraced, a batch path dark, retention shorter than the incident cycle, or nobody is alerted on failure signatures — traces are written but not watched. |
| **3 — Enforced** | Everything in 2, plus: trace completeness is itself monitored (a dark path is an alert, not a surprise), traces are actively used — dashboards or alerts keyed on failure signatures — and retention matches the org's incident and compliance window. The live test passes in minutes, performed by the client's own engineer. |

## A — Auditable

*Governance-ready: explainable under Law 25 / OSFI E-23 / EU AI Act.* Failure mode prevented: regulatory exposure — the unanswerable question about why an automated decision was made.

**Live test:** the 30-minute drill. Pick one real automated decision that affected an individual (a triaged claim, a flagged transaction, a generated recommendation). Ask: what personal data was used, what were the principal factors, what model and prompt version ran, who reviews it on request. 30-minute limit, audit-observed.

**Evidence sources:** the org's own inventory of automated decisions (its absence is a finding), decision-record schema and sampled records, model/prompt version pinning, the Law 25 / E-23 response procedure and its named owner, retention policy.

| Score | Anchors — award only if ALL hold |
|---|---|
| **0 — Absent** | Nobody can enumerate which of the workflow's outputs are automated decisions in the legal sense, and no decision records exist. A Law 25 access request or an E-23 model-inventory request would be answered from memory, or not at all. |
| **1 — Ad-hoc** | An inventory of automated decisions exists, or the traces could theoretically reconstruct one — but reconstruction is an engineering project, not a procedure: no decision records as first-class artifacts, no model/prompt version pinned to individual decisions, no named owner for regulator/individual requests. In the wild: "legal asked us that once and it took two weeks." |
| **2 — Systematic** | Decisions affecting individuals produce decision records by design: personal data used, principal factors, model + prompt version, reviewable by a named human. Records are retrievable. Named gaps remain: a decision path not yet covered, retention undocumented, or the human-review route (Law 25's right to submit observations) designed but not wired. |
| **3 — Enforced** | Everything in 2, plus: a decision cannot ship without its record (enforced in code, not convention), a written response runbook with a named owner exists for regulator/individual requests, and the 30-minute drill passes live. |

*N/A per scoring rule 5 when the workflow touches no personal data and affects no individual — the only pillar that can be.*

## T — Tolerant

*Fault-tolerant and resumable after failure.* Failure mode prevented: full restarts after partial failures; work lost or double-applied; systems that only work moving forward.

**Live test:** the Reboot Test, or its paper form. Preferred: in a non-prod environment, kill the workflow mid-run and watch what happens on restart. Fallback (no environment access): walk one engineer step-by-step through "it crashed at step 6 of 10 — what exactly happens next?", and separately ask a second engineer. Divergent answers = fail.

**Evidence sources:** lock/idempotency implementation, retry policy and bounds, what a stuck run looks like in the data and who unsticks it, the last three incidents' timelines (how much was re-done by hand), dead-letter/error queues.

| Score | Anchors — award only if ALL hold |
|---|---|
| **0 — Absent** | Any mid-run failure means restarting the workflow from the top. Partial work is lost, or worse, double-applied on retry (no idempotency, no locks). In the wild: "we re-run it and delete the duplicates by hand." |
| **1 — Ad-hoc** | Retries exist at the call level (429 backoff on the LLM client) but not at the workflow level: no resume from the failed step, locks missing or never cleared on failure (a human resets stuck rows), idempotency present only where a developer happened to add it. In the wild: a weekly ritual of un-wedging stuck runs. |
| **2 — Systematic** | The workflow resumes from the failed step by design: locks set before expensive operations and cleared on failure, retries bounded with backoff, failed runs leave no permanently broken state. Named gaps remain: the reboot test has never actually been executed, a known dependency outage still wedges it, or resume is verified in dev only. |
| **3 — Enforced** | Everything in 2, plus: the reboot test has been run and passes — restart the service, kill it at an intermediate step, take a dependency offline — and failure injection is repeated (in CI or on a schedule), not a one-time stunt. Crash at step 6 demonstrably resumes at step 6. |

## E — Explicit

*Deterministic boundaries, no magic.* Failure mode prevented: hallucination cascades — "confident but wrong" output triggering downstream action without a contract check.

**Live test:** the boundary walk. Have an engineer enumerate every point where LLM output becomes a write or an action. For each: "what is the worst thing the model could emit here, and what stops it?" No enumeration = fail. Then pick one boundary and read the actual validation code.

**Evidence sources:** boundary inventory (or build it during the walk — its absence is the finding), validation code at each gate, error-path handling (what happens to invalid output), test suite: pinned-output component tests vs. live end-to-end runs.

| Score | Anchors — award only if ALL hold |
|---|---|
| **0 — Absent** | LLM output flows directly into writes or actions. Parse failures crash or are silently swallowed (`except: pass` and its relatives). In the wild: the model wrapped JSON in a markdown fence, the parser died, and the pipeline reported success. |
| **1 — Ad-hoc** | Some outputs are validated (a JSON schema check on one call) but boundaries are not enumerated, and invalid output is handled inconsistently — sometimes retried, sometimes silently defaulted, sometimes logged and continued. Testing is pinned-output component tests only; live output has never flowed through every seam in a test. |
| **2 — Systematic** | Every LLM→action boundary is named and gated; invalid output routes to an error path, never a silent continue. Named gaps remain: gates check structure but not content (schema-valid nonsense passes — no range checks, no allowlists), or full end-to-end runs with live output happen rarely rather than per release. |
| **3 — Enforced** | Everything in 2, plus: gates validate content as well as shape (bounds, allowlists, referential checks against known-good data), error paths are themselves tested, and at least one full end-to-end execution with live LLM output is part of every ship (seams, not just components). The worst-case output of every call is documented next to the thing that stops it. |

---

## Aggregate score and bands

Sum of five pillars, 0–15 per workflow. Bands (report the band name with the number — the names do the selling):

| Total | Band |
|---|---|
| 0–5 | **Critical Risk** — failure modes active and invisible; incidents are being absorbed, not detected |
| 6–8 | **High Risk** — held together by individuals, not systems; fails under turnover or scale |
| 9–11 | **Developing** — systematic in places; the named gaps are now an engineering backlog, not a mystery |
| 12–14 | **Production-Ready** — properties exist by design; remaining distance is enforcement, not architecture |
| 15 | **STATE-Compliant** — rare by construction; say so only when every live test passed, witnessed |

With A scored N/A, report x/12 and state why in one line. Do not rescale, do not project what A "would have been."

## Calibration notes — where two auditors diverge, and the tie-break

- **"They have Langfuse" is not a T score.** Tooling installed ≠ property held. Score the live test, not the vendor logo. Traces nobody can query in 10 minutes = 1.
- **Confusing pillars S and T.** A perfect trace of a workflow with no persisted state is T=2–3, S=0–1. The transcript tells you what happened; state tells you where it is. Don't let strong logging bleed into the S score.
- **The heroic engineer.** If the live test passes only because one specific person carries the system in their head, the property is ad-hoc, not systematic: cap at 1. Test: would it pass with that person on vacation?
- **Partial coverage vs. named gaps.** Level 2 requires the property to hold across the scored workflow's **primary path** end-to-end. A named, bounded gap on an auxiliary path (a batch re-processor, a retry path, a rarely-hit fallback) is exactly the kind of "named gap" the level-2 anchors permit. A hole on the primary path is not a named gap — it's a coverage failure: one beautifully-gated LLM call among four unguarded ones on the main path is E=1, not "E=2 on that call." When you can't decide whether a path is primary or auxiliary, ask what fraction of production executions traverse it: ≥daily-use = primary.
- **Intentions under audit pressure.** Clients fix things mid-audit (good — that's value). Score the state at evidence-collection time and record the fix in the findings doc as remediation-in-progress. The score does not move mid-engagement.
- **The 0-vs-1 line** is "does any deliberate fragment exist": one real retry policy, one real schema check, one real decision record. Accidental properties (idempotent because the DB upserts) count for 0, not 1 — they weren't chosen and can vanish in a refactor.
- **The 2-vs-3 line** is verification: has the property been *tested to hold*, and can it *regress silently*? If nobody would be alerted when it regresses, it's a 2.

## Calibration record

This rubric is reproducibility-tested before use. Protocol: two scorers, independently, no communication, given only this rubric and the same evidence pack; pass = every pillar within ±1.

| Date | Case | Scorer 1 | Scorer 2 | Max divergence | Result |
|---|---|---|---|---|---|
| 2026-07-13 | Synthetic: "Advisor Notes" wealth-mgmt copilot | S1 T2 A1 Tol1 E1 = 6/15 | S1 T2 A1 Tol1 E1 = 6/15 | 0 on all pillars | **Pass.** Both scorers independently flagged the same tension (level-2 "named gaps" vs. the partial-coverage note); resolved by defining primary-path vs. auxiliary-path coverage above. |

Re-run this protocol after any anchor edit. An untested rubric edit is a regression waiting for a client.

## Worked example (calibration, not template)

Synthetic: an insurance intake summarizer — email → LLM extraction → claim record created in the core system, human adjuster downstream. Postgres `intake_runs` table with a typed status enum updated per step, but a second "quick fix" path writes free-form JSON (S: schema exists, position reliable on main path only — all-criteria fails at 2 → **S=1**). Langfuse traces on every call with correlation IDs and model versions, 90-day retention, but the nightly batch re-processor is untraced (named gap, live test passed in 6 minutes → **T=2**). Claim creation affects an individual; personal data flows in; no decision records, though traces could reconstruct one in a day or two of work (**A=1**). Crash mid-run leaves the email marked consumed with no claim created; on-call re-injects by hand weekly (call-level retries only → **Tol=1**). Extraction output passes a Zod schema before the write, invalid → dead-letter queue with alert; but schema-valid nonsense (policy number that doesn't exist) passes through; no live E2E in CI (**E=2**). **Total 7/15 — High Risk.** The sentence that sells the remediation: the system is one refactor away from losing the only pillar it holds well.
