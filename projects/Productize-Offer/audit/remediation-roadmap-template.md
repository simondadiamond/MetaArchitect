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
- Prices in the closing section come from `../pricing-pinned.md` only. Founding vs. full per current slot status. Never "Fractional AI Reliability Lead" externally — the public name is **Fractional LLMOps Engineer**.

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
| QW-1 | {EV-nn / RISK_NAME} | {e.g. "Add a correlation ID minted at trigger time and threaded through every LLM and tool call — field `run_id`, propagated via {MECHANISM}"} | {T 1→2} | S |
| QW-2 | {…} | {e.g. "Route the {N} unhandled parse-failure paths to the existing dead-letter queue instead of `except: pass` — files listed in EV-{nn}"} | {E 0→1} | S |
| QW-3 | {…} | {…} | {…} | S |

---

## Workflow: {WORKFLOW_1_NAME} — priority table

**Current: {n}/15 ({BAND_NAME}) → projected after 90 days: {n}/15 ({BAND_NAME})** *(projection assumes every item lands; it is a target, not a score — scores only move under re-audit evidence)*

| # | Finding ref | Action (ticket-scopeable) | Move | Effort | Depends on | Owner (role) | Lane |
|---|---|---|---|---|---|---|---|
| W1-01 | {RISK_NAME / EV-nn} | {SPECIFIC ACTION: the mechanism, the table/file/boundary by name, and the acceptance check — e.g. "Create `decision_records` table (personal data used, principal factors, model + prompt version, reviewer); write one record per claim decision at step 6; acceptance: the 30-minute drill passes on a record from the previous day"} | {A 0→1} | {S/M/L} | {— or W1-nn} | {e.g. backend eng, W1 team} | {0–30} |
| W1-02 | {…} | {…} | {Tol 1→2} | M | W1-01 | {…} | {0–30} |
| W1-03 | {…} | {…} | {S 1→2} | M | — | {…} | {31–60} |
| W1-04 | {…} | {…} | {E 2→3} | L | W1-02 | {…} | {61–90} |
| … | | | | | | | |

**Lane summary:** days 0–30: {N} items, ~{N} eng-days | 31–60: {N} items, ~{N} eng-days | 61–90: {N} items, ~{N} eng-days

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

## Executing this roadmap — two paths

**Path 1 — in-house.** Your team owns the lanes; the items above are written to be ticket-scoped directly. Recommended cadence: a quarterly check-in against this document — re-run the live tests, mark moves that held, re-prioritize what's left. The risk to manage is the one the audit itself surfaced{IF_APPLICABLE: " (see {RISK_OR_QUOTE_REF})"}: roadmaps without a named owner and protected capacity become backlog sediment. If reliability work has historically lost every sprint-planning fight to feature work, price that pattern into your choice of path.

**Path 2 — fractional.** I execute the lanes with your team as the **Fractional LLMOps Engineer** — day-blocks, monthly: **1 day/week at $5,500 USD/month or 2 days/week at $9,000 USD/month at the founding rate** ({FULL_RATE_IF_SLOTS_CLOSED: $7,000 / $12,000 USD full}; CAD at invoice for Canadian entities per `../pricing-pinned.md`). The founding rate holds for the full 6-month term — no mid-term step. Day-blocks mean the quick-wins table above is roughly the first two to three blocks: pillar moves start landing in week one, and your engineers absorb the patterns by working next to them rather than reading about them.

Either path works with this document as written. The difference is time-to-level-2 and who carries the pattern knowledge at the end — decide within {N} weeks, while the findings readout is still fresh in the room.

{SIGNOFF_DATE} — Simon Paris, The Meta Architect
