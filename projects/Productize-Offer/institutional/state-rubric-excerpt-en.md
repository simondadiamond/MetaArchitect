# The STATE Scoring Rubric: Field Excerpt

> Institutional artifact #1 for the /audit "What you keep" section. Public excerpt of `../audit/state-scoring-rubric.md`. This version is site-ready: no em dashes (DESIGN.md ban), no internal pricing, no full anchor set. The complete rubric is a paid deliverable.

---

Every Production AI Audit scores your workflows against this instrument. This excerpt is public because a scoring rubric you can't inspect is a vibe with a letterhead. The full version is one of the artifacts you keep after an audit: all five pillars anchored at four levels, the evidence rules, and the reproducibility protocol the rubric is tested under (two scorers, same evidence, independently, must land within one point on every pillar — or the rubric gets fixed, not the score).

## What gets scored

Workflows, not companies. A workflow is one path from trigger to real-world effect that passes through at least one LLM call. Each scored workflow gets five pillar scores, 0 to 3, from evidence: code, traces, schemas, and live tests run with your engineers. Never from a questionnaire.

## The scale

| Level | Name | Meaning |
|---|---|---|
| 0 | Absent | The property does not exist. The failure mode it prevents is active and invisible. |
| 1 | Ad-hoc | Fragments exist, by accident or individual heroics. Fails under stress, turnover, or scale. |
| 2 | Systematic | Exists by design across the workflow. Named, bounded gaps remain. |
| 3 | Enforced | Exists by construction. Verified by test. Cannot silently regress. |

The jump that matters commercially is 1 to 2: that is where a workflow stops depending on the one engineer who carries it in their head. The jump that matters in an incident is 2 to 3: "we thought we had that" lives between them.

## The five live tests

Documentation says what a team intended. Live tests say what is true. One per pillar, run during the audit:

- **Structured**: pick a run that crashed. From persisted state only (no transcript, no log spelunking), can your engineer name the exact step it stopped at?
- **Traceable**: I pick an execution from last week (not you). Complete trace: every LLM call, tool call, input, output, model version. Under ten minutes?
- **Auditable**: the 30-minute drill. One real decision about a person your system made or shaped: what personal data was used, what were the principal factors, what model and prompt version ran? For decisions made exclusively by automated processing, Law 25 assumes you can answer.
- **Tolerant**: the reboot test. Kill the workflow mid-run in a safe environment and watch the restart. Paper form: ask two engineers separately what happens after a crash at step 6 of 10. Divergent answers are a result.
- **Explicit**: the boundary walk. Enumerate every point where model output becomes a write or an action. For each: what is the worst thing the model could emit here, and what stops it? No enumeration is a fail.

A failed live test caps the pillar at 1, no matter what the architecture diagram says.

## Sample anchors: the Tolerant pillar

What the four levels look like in the wild, for one pillar of five:

| Score | In the wild |
|---|---|
| 0 | Any mid-run failure means restarting from the top. Work is lost, or double-applied on retry. "We re-run it and delete the duplicates by hand." |
| 1 | Call-level retries exist, but no workflow-level resume. Stuck runs are a weekly ritual someone un-wedges by hand. |
| 2 | The workflow resumes from the failed step by design. Locks set and cleared. But the reboot test has never actually been run. |
| 3 | The reboot test passes, is repeated on a schedule, and a crash at step 6 demonstrably resumes at step 6. |

## Three of the scoring rules

1. Score what you observed, not what's planned. Roadmap items score as absent.
2. Evidence or it didn't happen. Every score cites a pointer: a file, a trace ID, a query, a corroborated quote. Sincere belief in logging that can't be produced caps a pillar at 1.
3. Between two levels, take the lower. The anchors are written so a genuine borderline is rare.

## The aggregate

Five pillars, 0 to 15 per workflow:

| Total | Band |
|---|---|
| 0 to 5 | Critical Risk |
| 6 to 8 | High Risk |
| 9 to 11 | Developing |
| 12 to 14 | Production-Ready |
| 15 | STATE-Compliant |

The instrument is deliberately hard to max: 15 means every live test passed, witnessed. The band names do the honest work in front of your leadership that "it mostly works" cannot.

Want to see where you'd land before anyone reads your traces? The free self-assessment at simonparis.ca/score runs the short form of this instrument. Expect your self-score to run optimistic: "we have logging" and "we can produce last Tuesday's trace in ten minutes" are different claims, and only one of them survives a live test. The audit measures that delta, and the delta is a finding too.
