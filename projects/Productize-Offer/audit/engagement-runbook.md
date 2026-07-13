# Production AI Audit — Engagement Runbook

> The day-by-day execution plan for the 2-week Production AI Audit, built for a solo operator delivering evenings and blocked days alongside a full-time job.
> Part of the Production AI Audit kit — prices per `../pricing-pinned.md`.
> Scoring instrument: `state-scoring-rubric.md`. Readout: `readout-structure.md`. Client-facing evidence ask: `evidence-request-checklist.md`.

---

## Operating constraints (read once, believe them)

- **Total delivery budget: ~35–40 hours across 14 calendar days.** Weekday evenings run 2–3 hours. One Saturday block per week runs 4–5 hours. Anything the plan below can't fit in those windows doesn't happen — cut scope at the SOW, not quality mid-engagement.
- **Client engineers are only available in their business hours.** Interviews and live tests book into lunch slots (12:00–13:00) or late-afternoon slots (16:00–17:00). These are the scarce resource of the whole engagement — they get booked before Day 1, all of them.
- **Every live test from the rubric runs inside an interview or a scheduled screen-share.** There is no separate "testing week." A pillar whose live test never ran is reported "untested — score provisional" (rubric rule 4). That's a worse deliverable. Protect the test slots.
- **The second Sunday does not exist.** Day 7 is the only slack in the plan. When a day is lost — and one will be — the triage table at the bottom decides what absorbs it. Not adrenaline at 1am.

---

## Phase 0 — Pre-engagement (SOW signature → Day 1)

Nothing below starts until the SOW is signed. Everything below finishes before Day 1 or Day 1 moves. A slipped start costs one week of calendar, not one day — interview slots don't reschedule fast.

**Same day the SOW is signed:**
- [ ] Send `evidence-request-checklist.md` to the buyer (it's written to be forwarded to their team — send it whole)
- [ ] Confirm the 1–3 scored workflows and named owners are in the SOW verbatim (rubric: workflows get scored, not companies)
- [ ] Book the Day 1 scoping call (60 min)
- [ ] Book the Day 12 readout (90 min) — yes, now; the buyer's calendar two weeks out is emptier than it will ever be
- [ ] Ask for all 3–5 interview slots to be booked before Day 1, roles per the evidence checklist

**No later than 2 business days before Day 1:**
- [ ] Verify repo access works — actually clone/browse, don't trust the invite email
- [ ] Verify trace/log access works — actually run one query
- [ ] Confirm the week-1 founding feedback call is on the calendar for Day 5 (30 min — contractual, founding-client-program.md §5)

**Gate:** any BLOCKING item on the evidence checklist still open 2 business days out → call the buyer and move Day 1. Starting blind burns the only slack the plan has.

---

## Week 1 — Evidence

### Day 1 (Mon) — Scoping call · ~1.5 h

| | |
|---|---|
| **Objective** | Lock scope, confirm access, name the day-to-day contact |
| **Inputs** | Signed SOW, evidence checklist status, working access |
| **Outputs** | Locked workflow list, confirmed interview + readout calendar, open-items list with owners and dates |

- [ ] 60-min scoping call: walk each scored workflow trigger→effect on a whiteboard with the owner
- [ ] Read back the scope sentence: "We are scoring these workflows and only these"
- [ ] Confirm every interview slot and the readout date out loud
- [ ] Evening: smoke-test all access again from your own machine

**You are behind if:** any blocking evidence item is still missing at end of day, or the readout isn't on a calendar.

### Day 2 (Tue) — Codebase orientation · 2.5 h evening

| | |
|---|---|
| **Objective** | Trace each scored workflow end-to-end in code |
| **Inputs** | Repo access, architecture diagram if provided |
| **Outputs** | Per-workflow code map; boundary inventory skeleton (every LLM→action point); state-persistence notes |

- [ ] For each workflow: entry point → every LLM call → every write/action, as file paths
- [ ] Start the boundary inventory (feeds the E boundary walk on Day 5)
- [ ] Note where state persists, what schema governs it, what happens on restart (S evidence)

**You are behind if:** you cannot draw trigger→effect for every scored workflow by end of evening.

### Day 3 (Wed) — Interviews 1–2 · lunch/late-afternoon slots + 1 h evening

| | |
|---|---|
| **Objective** | First two interviews, first two live tests |
| **Inputs** | Code map, interview slots (workflow owner; on-call engineer) |
| **Outputs** | Two interview write-ups with evidence pointers, two live-test results, timed |

- [ ] Interview 1 (workflow owner): run the **T live test** — you pick an execution from last week, they produce the complete trace, you clock it
- [ ] Interview 2 (on-call engineer): run the **S live test** — from persisted state only, where did the mid-flight/crashed run stop; and ask the **Tolerant question** ("crashed at step 6 — what happens next?") — you'll ask a second engineer the same thing Day 5
- [ ] Evening: write evidence pointers the same day. An interview not written up within 24 h is a memory, not evidence (rubric rule 3)

**You are behind if:** fewer than 2 interviews done, or no live test attempted yet.

### Day 4 (Thu) — Telemetry review · 2.5 h evening

| | |
|---|---|
| **Objective** | Score-grade evidence for T and S |
| **Inputs** | Trace/log access, one full sampled trace from Day 3 |
| **Outputs** | Trace coverage notes (correlation IDs, model versions, dark paths, retention); provisional S and T scores with pointers |

- [ ] Sample traces yourself — don't rely on the curated one from the interview
- [ ] Check the unglamorous paths: retries, fallbacks, batch jobs (that's where T=2 gaps live)
- [ ] Compare a sampled state row against actual execution position (S)

**You are behind if:** you don't hold one complete trace of one real execution, or telemetry access still doesn't work (escalate to the buyer tonight — this is now a finding forming).

### Day 5 (Fri) — Interview 3, boundary walk, founding feedback call · lunch + late slot + 1 h evening

| | |
|---|---|
| **Objective** | E live test; second Tolerant answer; contractual week-1 call |
| **Inputs** | Boundary inventory skeleton, interview slot (engineer who wrote validation/retry code) |
| **Outputs** | Boundary walk results; divergence check on the Tolerant answers; feedback-call notes; provisional scores for all five pillars, workflow 1 |

- [ ] Interview 3: the **boundary walk** — enumerate every LLM→action point, "worst thing the model could emit here, and what stops it," then read one gate's actual validation code together
- [ ] Ask this engineer the crash-at-step-6 question. Compare with Day 3's answer. Divergence = fail (rubric)
- [ ] **Founding week-1 feedback call, 30 min, fixed agenda:** what's working, what isn't, what's missing from the framework. Contractual. Does not slip
- [ ] Evening: provisional five-pillar scores for workflow 1, each with at least one evidence pointer

**You are behind if:** the feedback call didn't happen, or fewer than 3 interviews are complete.

### Day 6 (Sat) — Deep review block · 4–5 h

| | |
|---|---|
| **Objective** | First full scoring pass, all workflows |
| **Inputs** | Everything above + incident history + prompt/model inventory (or their documented absence) |
| **Outputs** | Draft scorecard per workflow; evidence-gap list for Week 2; A-pillar prep if in scope |

- [ ] Read validation code at every boundary, lock/idempotency code, retry bounds
- [ ] Read the incident history: what did the last three incidents cost, who un-wedged what by hand (Tolerant evidence)
- [ ] Apply the all-criteria rule cold. When torn between two levels, take the lower
- [ ] Write the evidence-gap list: every score resting on an uncorroborated interview claim (those cap at 1 until corroborated)
- [ ] If A is in scope: prep the **30-minute drill** — pick the real decision yourself

**You are behind if:** any pillar on any workflow has no score and no named plan to get its evidence in Week 2.

### Day 7 (Sun) — OFF

This is the buffer. If the week went clean, rest. If a day was lost, this is where it lands — per the triage table, nowhere else.

---

## Week 2 — Scoring and synthesis

### Day 8 (Mon) — Interviews 4–5, remaining live tests · lunch/late slots + 1 h evening

| | |
|---|---|
| **Objective** | Close every evidence gap; run outstanding live tests |
| **Inputs** | Evidence-gap list from Day 6 |
| **Outputs** | Corroborated pointers for every score; A drill result if in scope; reboot test result if environment access allows |

- [ ] Interviews 4–5 (default on; 3 is the contractual floor — cut only per triage)
- [ ] Run the **30-minute drill** (A) if in scope — audit-observed, clocked
- [ ] If a non-prod environment exists: run the **reboot test** live. Otherwise the two-engineer paper form from Days 3/5 stands
- [ ] Chase every remaining uncorroborated claim; what stays uncorroborated caps at 1 and says so in the doc

**You are behind if:** any pillar score still rests on an interview claim with no artifact behind it.

### Day 9 (Tue) — Scoring lockdown · 2.5 h evening

| | |
|---|---|
| **Objective** | Freeze the scores |
| **Inputs** | All evidence, rubric open at the calibration notes |
| **Outputs** | Final per-workflow scorecards: five pillars, band name, evidence pointer per score |

- [ ] Full pass against the rubric's calibration notes (heroic engineer? tooling ≠ property? partial coverage?)
- [ ] Anything fixed mid-audit: score at evidence-collection time, log the fix as remediation-in-progress
- [ ] A scored N/A? Report x/12 with the one-line reason — never rescale
- [ ] **Scores are frozen tonight.** The findings doc gets written against frozen numbers, not the other way around

**You are behind if:** any score is still "it depends." The rubric's tie-break is take-the-lower. Use it and move.

### Day 10 (Wed) — Findings doc: scorecards · 3 h evening

| | |
|---|---|
| **Objective** | Write the evidence half of the findings doc (10–20 pp total, per SOW) |
| **Inputs** | Frozen scorecards |
| **Outputs** | Per-workflow findings sections: score, band name, evidence pointer, live-test result per pillar |

- [ ] Band names in headlines, not buried — the names do the selling
- [ ] Every score cites its pointer: file path, trace ID, log query, or quote-plus-artifact
- [ ] Untested pillars flagged "score provisional" with the access reason

**You are behind if:** the scorecard sections aren't draft-complete by end of evening.

### Day 11 (Thu) — Findings doc: risks + roadmap · 3 h evening

| | |
|---|---|
| **Objective** | The 2–3 named risks and the 90-day remediation roadmap |
| **Inputs** | Frozen scorecards, incident history |
| **Outputs** | Draft-complete findings doc; one-page scorecard for the readout |

- [ ] Pick the 2–3 risks that matter — each named, each tied to a score and a plausible incident. More than 3 is a laundry list; cut
- [ ] 90-day roadmap sequenced by risk-per-effort, each item tied to the pillar score it moves
- [ ] One-page scorecard = the readout visual. No slide deck — present from the doc (see `readout-structure.md`)

**You are behind if:** you have more than 3 "top risks" (that's not done, that's unsorted), or the roadmap items don't map to scores.

### Day 12 (Fri) — READOUT · 90 min + 1 h prep (block a half-day if needed)

Run it exactly per `readout-structure.md` — including the close, where the retainer and Team Training get pitched. Not before, not cold.

**You are behind if:** you're editing scores the morning of the readout. Scores froze Day 9. If new evidence surfaced, it goes in the doc as a note, not a score change.

### Days 13–14 — Delivery close-out · ~3 h across the weekend / Monday

- [ ] Incorporate factual corrections from the readout (factual only — framing is yours)
- [ ] Send final findings doc + roadmap **within 2 business days of the readout**
- [ ] Invoice remaining balance per SOW terms, if the SOW split payment
- [ ] Schedule the recorded 45-min founding debrief — within 21 days of final deliverable acceptance (founding-client-program.md §5)
- [ ] Book quarterly architecture review #1 (founding perk — put a real date on it)
- [ ] Revoke your own access; delete per the retention terms in `evidence-request-checklist.md`

---

## Triage — what can slip and what cannot

You will lose a day. Decide now what absorbs it.

| Cannot slip | Why |
|---|---|
| Week-1 founding feedback call (Day 5) | Contractual (§5). It's also the cheapest churn insurance you own |
| Readout date | Max 1 business-day slip, once, buyer-agreed. A moving readout reads as a consultant who's drowning |
| Live tests | A provisional score is a visibly weaker deliverable at full price. Test slots outrank everything else in their calendar week |
| Scoring lockdown before doc writing | Writing prose against moving scores doubles the writing time and corrupts the scores |
| Evidence pointer per score | It's the rubric's rule 3 and the audit's entire defensibility |

| Can slip (in this order) | Cost |
|---|---|
| Day 7 (the buffer) | None — that's what it's for |
| Interviews 4–5 → floor of 3 | Slightly thinner corroboration; say so in the doc |
| Incident-history deep read → verbal reconstruction in interviews | 30 extra interview minutes; absence of written post-mortems becomes a finding |
| Findings-doc polish | The 2-business-day post-readout window exists precisely for this. Draft-complete beats beautiful on Day 12 |
| Third workflow depth | Only if the SOW allowed it — better: don't SOW three workflows unless the client's evidence posture is strong at scoping |

**Recovery rule:** lost a weekday evening → take Day 7. Lost Day 6 (the Saturday) → drop interviews to 3, take Day 7, and move the deep review there. Lost two days → call the buyer, move the readout by one business day, and say why in one sentence. Never compress scoring lockdown — that's where audits become opinions.
