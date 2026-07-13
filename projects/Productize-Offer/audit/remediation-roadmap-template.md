# 90-Day Remediation Roadmap Template — Production AI Audit

> Skeleton for the 90-day remediation roadmap delivered with the findings doc. Every item traces back to a findings reference and a rubric level move.
> Part of the Production AI Audit kit — prices per `../pricing-pinned.md`.

---

## Template rules (delete this block before delivery)

- Every row cites a finding ref (findings doc §/EV number or named risk). No orphan items — if it's not in the findings, it's not on the roadmap.
- Actions are ticket-scopeable: a senior engineer reads the row and writes the ticket without a meeting. "Improve reliability" fails that test; "add a `consumed_at`/`claim_id` pair to `intake_emails` and make step 2 reversible until step 6 commits" passes.
- Level moves use the rubric's anchor jumps ("Tol 1→2"). Never promise a jump of 2 levels in one item — split it; the rubric's all-criteria rule means each level is earned separately.
- Effort tags in engineer-days: **S ≤ 2**, **M ≤ 10**, **L > 10**. If an item feels like L, it's usually two items.
- Lanes are calendar (days 0–30 / 31–60 / 61–90), not sprints — the client maps to their own cadence.
- Every item carries a **disposition**: `fix` / `accept-with-signoff` / `out-of-scope`. Default is fix. `accept-with-signoff` names the accepting role in the Owner column — that's what lets the client's risk register formally accept an item instead of leaving it unlabeled.
- Every lane carries a capacity-assumption line (format below), sourced from the interviews.
- No prices and no pitch anywhere in this document. Execution support gets exactly one factual line in the closing section; the offer conversation lives in `readout-structure.md` and happens at the readout — never in the engineers' document.

---

# {CLIENT_NAME} — 90-Day Remediation Roadmap

**Companion to:** STATE Findings Report, {DATE} | **Workflows:** {WORKFLOW_1}; {WORKFLOW_2_OR_DELETE}
**Prepared by:** Simon Paris — The Meta Architect (simonparis.ca)

## How this roadmap is ordered

This roadmap ships pre-prioritized: **regulatory exposure first, then blast radius, then effort** (cheapest first within a tier). Re-order it against your own constraints — team capacity, release freezes, in-flight work — but it will never be handed to you as an unordered list. An unordered list is a way of making the client do the consultant's job.

Two sequencing rules are already applied:
1. **Dependencies run left to right.** No item lands in a lane before its dependency's lane.
2. **Every 0→1 move outranks a 2→3 polish** at equal exposure — per the rubric, level 0 means the failure mode is active and invisible today.

---

## Quick wins — first two weeks

> Everything below is S-effort (≤2 engineer-days) and moves a pillar 0→1 or 1→2. Ship these first: they are cheap, they are visible, and they prove the roadmap is executable before the bigger items ask for real calendar. {DELETE_IF_EMPTY — but if this section is empty, say so in the readout and explain why: an audit with zero quick wins is rare.}

| # | Finding ref | Action | Move | Effort |
|---|---|---|---|---|
| QW-1 | {EV-nn / RISK_NAME} | {e.g. "Add a correlation ID minted at trigger time and threaded through every LLM and tool call — field `run_id`, propagated via {MECHANISM}"} | {T 1→2 (partial — completes with the model-version + I/O logging item {REF})} | S |
| QW-2 | {…} | {e.g. "Route the {N} unhandled parse-failure paths to the existing dead-letter queue instead of `except: pass` — files listed in EV-{nn}"} | {E 0→1} | S |
| QW-3 | {…} | {…} | {…} | S |

---

## Workflow: {WORKFLOW_1_NAME} — priority table

**Current: {n}/15 ({BAND_NAME}) → projected after 90 days: {n}/15 ({BAND_NAME})** *(projection assumes every item lands; it is a target, not a score — see Re-scoring at the end for how scores actually move)*

| # | Finding ref | Action (ticket-scopeable) | Move | Effort | Depends on | Owner (role) | Disposition | Lane |
|---|---|---|---|---|---|---|---|---|
| W1-01 | {RISK_NAME / EV-nn} | {SPECIFIC ACTION: the mechanism, the table/file/boundary by name, and the acceptance check — e.g. "Create `decision_records` table (personal data used, principal factors, model + prompt version, reviewer); write one record per claim decision at step 6; acceptance: the 30-minute drill passes on a record from the previous day"} | {A 0→1} | {S/M/L} | {— or W1-nn} | {e.g. backend eng, W1 team} | {fix} | {0–30} |
| W1-02 | {…} | {…} | {Tol 1→2} | M | W1-01 | {…} | {fix} | {0–30} |
| W1-03 | {…} | {…} | {S 1→2} | M | — | {…} | {fix / accept-with-signoff ({SIGNING_ROLE}) / out-of-scope} | {31–60} |
| W1-04 | {…} | {…} | {E 2→3} | L | W1-02 | {…} | {fix} | {61–90} |
| … | | | | | | | | |

**Lane summary:** days 0–30: {N} items, ~{N} eng-days | 31–60: {N} items, ~{N} eng-days | 61–90: {N} items, ~{N} eng-days

**Capacity assumptions** *(mandatory, one line per lane — the numbers come from the interviews' roadmap-sizing questions, never from optimism)*:
- Days 0–30: assumes {N} engineers at {X}% allocation — per interview evidence, current available capacity is {Y}; under that constraint, items {LIST or "none"} slip to the next lane.
- Days 31–60: {same format}
- Days 61–90: {same format}

## Workflow: {WORKFLOW_2_NAME} — priority table

*(Same structure. Delete if single-workflow engagement.)*

---

## What "done" means

An item is done when its acceptance check passes — and the acceptance check is the rubric's own instrument wherever one exists:

- Tolerant items close when **the reboot test passes** (kill it mid-run, watch it resume from the failed step), not when the retry code merges.
- Traceable items close when a named execution's **full trace is retrieved in under 10 minutes** by one of your engineers, not by the person who built the tracing.
- Auditable items close when **the 30-minute drill passes** on a real decision.
- Structured items close when the crashed-run question is answered **from persisted state alone**.
- Explicit items close when invalid output demonstrably lands on the error path — **tested, not asserted**.

Level 3 on any pillar additionally requires the property to be regression-proof: a test or alert that fires when it silently degrades. If nothing would notice the regression, the item stopped at level 2 — plan for that honestly rather than claiming Enforced.

---

## Re-scoring

Projected scores in this document are targets, not scores. Scores move one way: re-score against the STATE rubric, which you keep with this report. Numbers you produce yourselves are reported as self-scored; an auditor re-score is available on request.

Execution support for these lanes exists and is discussed at the readout.

{SIGNOFF_DATE} — Simon Paris, The Meta Architect
