# Findings Document Template — Production AI Audit

> Skeleton for the 10–20 page findings document — the audit's crown deliverable. Fill the {PLACEHOLDERS}; every score traces to `state-scoring-rubric.md` by section, never restated.
> Part of the Production AI Audit kit — prices per `../pricing-pinned.md`.

---

## Template rules (delete this block before delivery)

- One workflow per chapter. Never average across workflows (rubric: "What gets scored").
- Anchor level names (Absent / Ad-hoc / Systematic / Enforced) and band names appear everywhere a number does — the names do the selling.
- Every score cites at least one evidence pointer, mirrored in the Evidence Register (Appendix A). No pointer = no score (rubric rule 3).
- Named risks follow the fixed format below. Risk names are specific and memorable — "The Consumed-Email Dead End", never "reliability gap". If the name could apply to any company, rename it.
- Live tests not run for access reasons: mark the pillar "untested — score provisional" (rubric rule 4) and list in Limitations.
- Length discipline: exec summary 1 page, methodology half a page, each workflow chapter 3–5 pages — single-workflow engagements: 4–6 pages for the one chapter. The By-the-numbers block and the Evidence Register are mandatory, so a single-workflow doc still lands ≥10 pages; the 10–20 pp promise holds either way. Appendices as long as the evidence demands.
- The model-fit verdict in the exec summary is a conclusion, not boilerplate — see the fill rule there. An audit that can never conclude "partly the model" is marketing.

---

# {CLIENT_NAME} — Production AI Audit
## STATE Findings Report

| | |
|---|---|
| Prepared for | {SPONSOR_NAME}, {SPONSOR_TITLE} |
| Prepared by | Simon Paris — The Meta Architect (simonparis.ca) |
| Engagement window | {START_DATE} – {END_DATE} (2 weeks) |
| Workflows in scope (per SOW) | {WORKFLOW_1}; {WORKFLOW_2}; {WORKFLOW_3_OR_DELETE} |
| Evidence base | {N} engineer interviews, {N} live tests executed, codebase review ({REPO_NAMES}), telemetry review ({TOOL_NAMES}, {RETENTION} retention) |
| Readout | {READOUT_DATE}, 90 minutes |
| Confidentiality | Prepared solely for {CLIENT_NAME}. Quotes anonymized by role. |

---

## 1. Executive Summary *(one page — a VP who reads nothing else must be able to act on this)*

{CLIENT_NAME} runs {N} production workflow(s) in which an LLM's output becomes a real-world effect. We scored each against the STATE rubric — five pillars, 0–3 each, evidence-based — using code review, telemetry review, {N} engineer interviews, and live tests executed during the engagement.

| Workflow | S | T | A | Tol | E | Total | Band |
|---|---|---|---|---|---|---|---|
| {WORKFLOW_1} | {n} | {n} | {n or N/A} | {n} | {n} | {n}/15 {or /12} | **{BAND_NAME}** |
| {WORKFLOW_2} | {n} | {n} | {n or N/A} | {n} | {n} | {n}/15 {or /12} | **{BAND_NAME}** |

*Bands per rubric: Critical Risk (0–5), High Risk (6–8), Developing (9–11), Production-Ready (12–14), STATE-Compliant (15).*

**The {2_OR_3} risks that matter:**

**1. {RISK_NAME_1}** — {ONE_SENTENCE_SCENARIO}.
*In CFO terms: {ONE_SENTENCE_A_CFO_UNDERSTANDS — money, regulatory exposure, or customer harm; no engineering vocabulary. e.g. "A software crash at the wrong moment silently discards customer requests, and no report will ever show how many."}*

**2. {RISK_NAME_2}** — {ONE_SENTENCE_SCENARIO}.
*In CFO terms: {ONE_SENTENCE}.*

**3. {RISK_NAME_3_OR_DELETE}** — {ONE_SENTENCE_SCENARIO}.
*In CFO terms: {ONE_SENTENCE}.*

{MODEL_FIT_VERDICT — conditional, not boilerplate. Include the following ONLY if the evidence supports it: "**What this is not:** none of these are model problems. {MODEL_NAME} is performing within normal bounds. The findings are architecture: state, traces, recovery, and boundaries — all fixable with ordinary engineering, sequenced in the accompanying 90-day remediation roadmap." If the evidence shows a model-fit problem — capability ceiling, wrong model class for the task, systematic accuracy failures on in-scope inputs — write that finding here instead, even though it's off-thesis. An audit that can never conclude "partly the model" is marketing.}

**Bottom line:** {ONE_SENTENCE_VERDICT — the single line the sponsor will repeat internally, e.g. "The system works because two engineers keep it working; the roadmap's first 30 days convert that from a staffing fact into an architecture fact."}

---

## 2. Methodology *(half a page)*

Scores come from the STATE Scoring Rubric (provided as a standalone document with this report), which operationalizes the STATE framework into four anchor levels per pillar — **0 Absent, 1 Ad-hoc, 2 Systematic, 3 Enforced** — with an all-criteria rule: a level is awarded only when every criterion holds, otherwise the level below.

Three properties make the scores defensible rather than impressionistic:

- **Evidence-based.** Every score cites at least one pointer — a file path, trace ID, log query, schema, or corroborated interview quote — all listed in Appendix A. Claims we could not corroborate in code or telemetry cap the pillar at Ad-hoc, per rubric rule 3.
- **Live tests.** Each pillar has a live test (state reconstruction, trace retrieval under the clock, the 30-minute decision drill, the crash walk, the boundary walk). A failed live test caps the pillar at Ad-hoc regardless of documentation. Tests we could not run are marked "untested — score provisional" and listed in Appendix C.
- **Today, not the roadmap.** In-flight PRs and planned work score as absent (rubric rule 1). Fixes made during the engagement are recorded as remediation-in-progress but do not move the score.

We score workflows, not the company. An organization does not have a STATE score; a path from trigger to real-world effect does.

---

## 3. Workflow: {WORKFLOW_1_NAME}

**Trigger → effect:** {ONE_LINE, e.g. "inbound email → LLM extraction → claim record created in {CORE_SYSTEM}; human adjuster downstream"}
**Volume:** {N/day or N/month} | **Personal data in path:** {YES/NO} | **Risk tier (state-framework.md):** {Medium/High}
**Score: {n}/15 {or /12, with one-line reason A is N/A} — {BAND_NAME}**

**By the numbers** *(mandatory in every workflow chapter — these come from the telemetry review)*

| | |
|---|---|
| Executions sampled | {N} over {DATE_RANGE} |
| Stuck runs found | {N} (row IDs redacted here; retained in working notes) |
| Executions with a complete trace | {N}% |
| Dark-path volume | {N}/{PERIOD} through untraced paths ({PATH_NAMES or "none found"}) |
| Retry volume | {N}/{PERIOD}; {N} exhausted to dead-letter or manual handling |

{Fill rule: if these numbers cannot be produced, the "telemetry review" line comes out of the evidence-base table on the cover page. No numbers, no claim.}

### 3.1 S — Structured: {n} ({ANCHOR_NAME})

**Observed:** {2–4 SENTENCES: where workflow position actually lives, what the schema is or isn't, whether persisted position matches execution reality. Concrete nouns — table names, column names, code paths.}

**Evidence:** {POINTER_1, e.g. "`db/schema/{table}.sql`; sampled row {ID} vs. actual execution position on {DATE}"}; {POINTER_2}; live test: {PASSED in {N} min / FAILED — {what happened} / untested — score provisional}.

**What Systematic (level 2) looks like here:** {2–3 SENTENCES translating the rubric §S level-2 anchors into this workflow's nouns — the gap between observed and this is the remediation item.}

**Named risk:** {RISK_NAME or "none at this pillar — see §3.6"}

### 3.2 T — Traceable: {n} ({ANCHOR_NAME})

**Observed:** {…}

**Evidence:** {…}; live test: {trace of execution {TRACE_ID} retrieved in {N} min — pass is <10}.

**What Systematic looks like here:** {…}

**Named risk:** {…}

### 3.3 A — Auditable: {n} ({ANCHOR_NAME}) — *or: N/A per rubric rule 5 — {ONE_LINE_REASON}; total reported /12*

**Observed:** {… include: decision inventory exists?, decision records?, model+prompt version pinned per decision?, named owner for Law 25 / OSFI E-23 requests?}

**Evidence:** {…}; live test (30-minute drill): {PASSED in {N} min / FAILED at {which question} / untested — score provisional}.

**What Systematic looks like here:** {…}

**Named risk:** {…}

### 3.4 Tol — Tolerant: {n} ({ANCHOR_NAME})

**Observed:** {… include: what a mid-run crash leaves behind, who un-sticks it and how often, whether the reboot test has ever been executed.}

**Evidence:** {…}; live test: {reboot test executed in {ENV} — result / paper form: builder and on-call answers {CONVERGED/DIVERGED — divergence detail}}.

**What Systematic looks like here:** {…}

**Named risk:** {…}

### 3.5 E — Explicit: {n} ({ANCHOR_NAME})

**Observed:** {… include: boundary count ({N} LLM→action boundaries found, {N} gated), what invalid output does today, whether gates check content or only shape.}

**Evidence:** {…}; live test (boundary walk): {enumeration produced {N} boundaries in interview vs. {N} found in code / FAILED — no enumeration possible}.

**What Systematic looks like here:** {…}

**Named risk:** {…}

### 3.6 Named risks — {WORKFLOW_1_NAME}

> Fixed format. Every named risk in this report uses exactly these five fields.

#### {RISK_NAME — specific and memorable; a mechanism, not a category. Test: would this name mean nothing at another company? Good. e.g. "The Consumed-Email Dead End"}

- **Scenario:** {CONCRETE INPUTS → WRONG OUTCOME, 2–4 sentences, present tense, named steps. e.g. "The workflow marks the inbound email consumed at step 2 and creates the claim at step 6. A crash anywhere between leaves the email consumed with no claim created — the request has ceased to exist in every system that could notice it."}
- **Blast radius:** {WHO/WHAT IS AFFECTED, at what volume; regulatory exposure if any, cited — e.g. "Law 25 §12.1: an automated decision the org cannot reconstruct" / "none — internal workflow"}
- **Current mitigations:** {WHAT EXISTS TODAY, honestly — "on-call re-injects by hand when a customer follows up (~{N}/week, per interview [role])" — or "none observed."}
- **Remediation:** roadmap item {ROADMAP_REF, e.g. "W1-03 (days 0–30)"} — {ONE_LINE_ACTION}; moves {PILLAR} {n}→{n}.

#### {RISK_NAME_2}
- **Scenario:** {…}
- **Blast radius:** {…}
- **Current mitigations:** {…}
- **Remediation:** {…}

---

## 4. Workflow: {WORKFLOW_2_NAME}

*(Repeat §3 structure. Delete if single-workflow engagement; add §5 for a third.)*

---

## {N}. Scoring Summary

| Workflow | S | T | A | Tol | E | Total | Band | Provisional pillars |
|---|---|---|---|---|---|---|---|---|
| {WORKFLOW_1} | {n} | {n} | {n/N/A} | {n} | {n} | {n}/{15 or 12} | {BAND} | {LIST or "none"} |
| {WORKFLOW_2} | {n} | {n} | {n/N/A} | {n} | {n} | {n}/{15 or 12} | {BAND} | {LIST or "none"} |

**Orientation — named public failures:** {MAP 2–3 OF THE CLIENT'S KEY GAPS TO NAMED PUBLIC INCIDENTS OR POST-MORTEMS, one line each — e.g. "the failure mode in {PUBLIC_INCIDENT}'s published post-mortem is your Tol=1: a mid-run crash that silently loses work." Fill rule: real, verifiable public sources only — a published post-mortem, incident write-up, or regulator finding, named and citable. Never a composite, never "companies we've seen."} *(A statistical benchmark line returns to this section only once the audit base reaches n≥10 audited workflows.)*

{IF_QUIZ_TAKEN: **Self-assessment delta:** {CLIENT_NAME}'s simonparis.ca/score self-assessment scored {n}/10 ({QUIZ_BAND}); the evidence-based audit lands at {n}/15 ({BAND}). The delta is itself a finding. Fill rule: paraphrase the logging-vs-reconstruction gap in the client's own nouns — their tool, their table, their incident. Never reuse the rubric's canned phrasing verbatim; the rubric owns that sentence.}

The two jumps that matter (per rubric): **Ad-hoc→Systematic** is where a workflow stops depending on the specific engineers who built it; **Systematic→Enforced** is where "we thought we had that" stops appearing in post-mortems. The remediation roadmap sequences both.

---

## Appendix A — Evidence Register

> Every score in this report, with its pointers. This is what makes the scores auditable rather than opinions.

| Ref | Workflow | Pillar | Score | Evidence pointers | Live test |
|---|---|---|---|---|---|
| EV-01 | {W1} | S | {n} | {file path; sampled row/trace ID; interview [role] + corroborating artifact} | {result + time} |
| EV-02 | {W1} | T | {n} | {…} | {…} |
| EV-03 | {W1} | A | {n} | {…} | {…} |
| EV-04 | {W1} | Tol | {n} | {…} | {…} |
| EV-05 | {W1} | E | {n} | {…} | {…} |
| … | | | | | |

## Appendix B — Interview Roster

> Roles only. Quotes in this report are anonymized by default; verbatim quotes appear only with the speaker's recorded permission.

| # | Role | Relationship to workflow(s) | Date | Duration |
|---|---|---|---|---|
| 1 | {e.g. Senior engineer — original author, W1} | builder | {DATE} | {60 min} |
| 2 | {e.g. Platform engineer — on-call rotation} | operations | {DATE} | {60 min} |
| 3 | {e.g. Engineering manager — compliance liaison} | platform/compliance | {DATE} | {60 min} |

## Appendix C — Limitations

- **Out of scope (per SOW):** {LIST — workflows, environments, or systems not examined}.
- **Live tests not executed:** {LIST, each with reason — e.g. "Tol reboot test: no non-prod environment with representative data; scored on paper form — score provisional per rubric rule 4"} {or "All live tests executed."}
- **Access constraints:** {e.g. "production telemetry read-only from {DATE}; retention limited history to {N} days"}.
- **Point-in-time:** scores describe the system as evidenced between {START_DATE} and {END_DATE}. Changes shipped after evidence collection — including fixes prompted by the audit itself, listed here as remediation-in-progress: {LIST or "none"} — are not reflected in the scores.
- **Not covered by design:** model quality/capability evaluation, training pipelines, security threat modeling. STATE is deliberately scoped to the five properties most commonly missing in production LLM systems.
