# AI Readiness Diagnostic — Runbook

> How the Diagnostic gets delivered — 2–3 days of engagement activity, delivered inside one calendar week — start to refund-or-readout, by one person alongside a W-2.
> Part of the AI Readiness Diagnostic kit — prices per `../pricing-pinned.md`.
> Scoring instrument: `../audit/state-scoring-rubric.md` — the SAME rubric as the Production AI Audit, at reduced evidence depth. Never fork it, never invent a "diagnostic scale."

---

## What this engagement is

The Diagnostic scores **one production workflow** against the five STATE pillars and hands the client a 5-page findings memo plus a 1-hour readout. It is the cold-offer entry SKU: fixed scope, fixed price ($2,500 founding / $3,500 full — pinned), 2–3 days of engagement activity delivered inside one calendar week, EN/FR, better-than-risk-free guarantee.

It starts where the discovery call ends: gates passed, invoice cleared, workflow already named on that call. If the workflow wasn't named at discovery, get it named in the booking email — never burn evidence-call minutes choosing one. The booking email also states, in one line: **the engagement window starts at the evidence call, not the invoice** — a reschedule moves the whole clock with it.

**One workflow. Not 1–3.** The audit scores up to three; the Diagnostic scores exactly one. If the client wants a second workflow scored, that is the audit, and saying so out loud is fine: "Second workflow is audit scope — the Diagnostic buys depth on one, not coverage of two."

**Evidence depth is the whole difference.** The rubric's anchors, all-criteria rule, and live tests apply unchanged. What changes: the audit gathers evidence from the codebase, telemetry, and 3–5 interviews over two weeks; the Diagnostic gets one call and whatever artifacts arrive in 48 hours. Consequence: several pillar scores will carry the rubric's rule-4 flag — **"untested — score provisional."** That is not a defect to hide. The memo says it plainly, page 1 and page 5, and converting provisional scores to confirmed ones is an explicit reason the Production AI Audit exists.

## What the Diagnostic does NOT do

Say these at booking so the readout contains zero surprises:

- **No codebase review.** One validation-code snippet may arrive as an artifact; nobody clones a repo.
- **No interviews beyond the evidence call.** One call, two people. No follow-up interview loop.
- **No remediation roadmap.** The memo names **three first moves** — the audit produces the 90-day roadmap.
- **No re-scoring.** Fixes made after evidence collection are noted as remediation-in-progress (rubric calibration note); the score describes evidence-collection time.
- Nothing smaller exists. Price objection → trade scope, not price ($2,000 floor, pinned).

---

## The evidence base

Two inputs. Both are bounded on purpose.

### 1. The evidence call — 60–90 min, day 1

Attendees: the **workflow owner** (the accountable human from discovery gate 4) plus **one engineer who has been paged for this workflow**. Not a delegate, not a manager who "can speak to it." If the engineer can't attend, reschedule the call, not the requirement.

The call runs the rubric's live tests **conversationally** — same tests, screen-share instead of environment access:

| Block | Min | What runs |
|---|---|---|
| Frame | 5 | Confirm the workflow: trigger → LLM call(s) → real-world effect. Confirm who's downstream when it's wrong. |
| **S — the state ask** | 10 | "Pull up a run that's mid-flight or died recently. From persisted state only — no transcript scrolling — which step is it at, what has it produced?" Watch the screen, time it. |
| **T — the trace pull, live** | 15 | Pick an execution from last week yourself (don't let them pick). "Show me the complete trace: every LLM call, tool call, inputs, outputs, model version." Screen-share, clock running. Under 10 minutes = pass; an afternoon of grep = the rubric's level-1 anchor, observed live. |
| **Tol — the paper-form reboot test** | 15 | Walk the engineer through "it crashed at step 6 of 10 — what exactly happens next?" Step by step, no hand-waving past the lock. Then ask the owner the same question cold. Divergent answers on the same call = fail, witnessed by both. |
| **E — the boundary walk** | 15 | "Enumerate every point where LLM output becomes a write or an action." For each: "worst thing the model could emit here, and what stops it?" No enumeration = the finding. |
| **A — the inventory question** | 10 | If personal data is in scope: "Which of this workflow's outputs are automated decisions in the Law 25 sense? Show me one decision record." (The 30-minute drill does NOT run — no time. A is provisional at best 1–2 unless a record appears on screen.) |
| Close | 5 | Confirm the 48h artifact list (below), confirm readout slot, name what happens next. |

Record the call (consent first). The recording is the evidence corroboration for every quote used in the memo — the rubric's rule 3 (uncorroborated interview claim caps at 1) applies here with full force, because interview claims are most of what a diagnostic has.

### 2. The 48-hour artifact list — 6 items max, nothing blocking

Send at booking, restate at the end of the call. The artifact window **opens at booking** and **closes 48h after the evidence call**. **Whatever hasn't arrived by then, the memo ships without it** — a missing artifact becomes a provisional flag or a lower score under rule 3, and the memo says which.

1. **One complete trace** of a single execution, any export format — LLM calls, tool calls, model versions.
2. **The state schema** — table DDL, type definition, or migration — plus one real sampled row.
3. **One post-mortem or incident writeup** involving this workflow. Redacted is fine.
4. **The validation code at one LLM→action boundary** — the one they named as strongest on the call.
5. **The retry/lock/un-sticking runbook page** — or the Slack thread that serves as one (its form is itself evidence).
6. **One decision record** (or the automated-decision inventory), only if personal data is in scope.

Never add a seventh item, never chase past 48h. Chasing converts a fixed-scope product into a project.

---

## Day-by-day

Built for evenings-and-a-weekend delivery next to a W-2. Total hands-on: ~10–14 hours — **2–3 days of engagement activity, delivered inside one calendar week.** The arithmetic that makes it honest: the call is day 1, the artifact window closes 48h later (day 3), scoring happens only after that close, and the readout lands within 2 business days of memo delivery.

### Day 1 — Evidence call + first artifact pass (~4–5 h)
- [ ] Run the evidence call (60–90 min). Live tests per the block table above; timestamps noted in call notes.
- [ ] Same evening: first pass over artifacts already in hand. For each, note which pillar and which anchor line it speaks to.
- [ ] Write the **provisional map**: for each pillar — live test ran / partially ran / could not run. This map is drafted on day 1, not discovered during scoring.
- [ ] Log per STATE (see engagement hygiene below).

### Day 2 — Artifact intake, window still open (~0–1 h)
- [ ] File artifacts as they arrive against pillar and anchor line; update the provisional map.
- [ ] **No scoring yet.** The scoring freeze happens AFTER the artifact window closes, never before — a score set while artifacts can still arrive is a score set on partial evidence by choice.

### Day 3 — Window closes → scoring + memo writing (~4–6 h)
- [ ] 48h artifact window closes (48h after the evidence call). Final evidence inventory frozen — only now.
- [ ] Score all five pillars against the rubric. All-criteria rule; torn between levels → take the lower; every score gets one evidence pointer (artifact, call timestamp, or on-screen observation). No pointer, no score above 1.
- [ ] Apply provisional flags per rubric rule 4. Typical diagnostic pattern: **T and S confirmable** (their live tests ran on screen-share), **Tol provisional** (paper form only — nothing was actually killed), **A provisional or N/A** (30-min drill never ran), **E provisional above 1** (one boundary's code seen, not every gate read).
- [ ] Write the memo into `findings-memo-template.md`. Pages 1–4 complete tonight; page 5's confirmation table comes straight from the provisional map.
- [ ] Pick the 2–3 named risks and the three first moves. Each first move targets the **weakest pillar, or removes a named risk**; all land inside 30 days, and none of them require Simon.

### Memo delivery + readout — readout within 2 business days of memo delivery (~2–3 h)
- [ ] Cold re-read of the memo. Burned-practitioner test on every line; cut anything the owner couldn't act on.
- [ ] Verify: every number traces to the memo, every score to a pointer, every provisional flag to page 5.
- [ ] Deliver the memo **before** the readout (same morning is fine) — the readout discusses a document they've held, it doesn't unveil one.
- [ ] Target the readout within **2 business days of memo delivery** — book the slot at the evidence call so this is a calendar fact, not a negotiation.
- [ ] Run the 1-hour readout: 10 min verdict + band, 20 min the named risks, 15 min first moves, 15 min scope/limitations + close (below).
- [ ] Never let the Diagnostic breathe past one calendar week — a one-week product that takes three is a different (unpriced) product.

### Engagement hygiene (STATE applies to revenue)
- [ ] `founding_clients` row transitions: `signed` → `active` at kickoff → `delivered` when the memo is accepted (or the notes doc until the table exists).
- [ ] Evidence inventory, call recording link, and the provisional map filed with the engagement notes — they are the audit's day-zero inputs if the client converts.

---

## The readout close

Last 15 minutes, in this order. Memo first, exchange second, audit last — the pitch never precedes the value.

### 1. The founding exchange (founding clients only, and only when it went well)

If the readout landed — they were nodding at the named risks, not disputing the scores — run the checklist. If it landed badly, skip all three and handle the room; a forced ask converts a wobbly readout into a refund.

- [ ] **Testimonial** — verbatim: *"If this was worth the fee, I'd like two or three sentences from you saying so — you approve the final wording before it appears anywhere."*
- [ ] **Debrief** — verbatim, calendar open: *"Part of the founding rate is a 30-minute recorded debrief — what worked, what didn't, what was missing. Can we put it in the calendar now, sometime in the next three weeks?"* Book it on the call; a debrief left to email is a debrief not received, and slot exhaustion counts delivered **and debriefed**.
- [ ] **Warm intros** — verbatim: *"And if you know someone sitting on the same kind of workflow — two intros, in your words, whenever it's natural. I don't contact anyone until they've replied to you."*

All three are the pinned Amendment-3 exchange. Do not import the audit-tier terms (case-study rights, logo, reference calls) — those belong to the audit/retainer SOW, not here.

### 2. The audit pitch

The transition sentence, verbatim — deliver it flat, off the back of page 5, and stop talking:

> **"If you want the provisional scores confirmed and a 90-day roadmap instead of three first moves, that's the Production AI Audit — two weeks, $6,500 at the founding rate, and it starts from this memo, not from zero."**

Supporting facts if they ask (all pinned): full audit = codebase + telemetry review, 3–5 engineer interviews, per-pillar scoring across up to 3 workflows, 10–20 pp findings doc, 90-day remediation roadmap, 90-min readout. Founding $6,500 / full $9,500 (CAD $9,000 / $13,000). Audit founding carries the full exchange (case-study rights, logo) — name that before quoting founding, same rule as discovery. [If client legal refuses logo/named case study: pause — a regulated-entity exchange variant is a Simon decision, not an on-call improvisation. Full rate remains available without strings.]

Never pitch the audit anywhere but here (ladder §2: audit is pitched at the diagnostic readout, never cold). Never pitch it to a client who has requested a refund. If they say "not now," the +90-day calendar note from the discovery SOP applies — no drip.

---

## Guarantee mechanics — how a refund actually runs

Pinned terms: if the findings memo isn't worth the fee, **full refund on request within 14 days of the readout — client keeps every deliverable.** Diagnostic only.

Client-visible version: `guarantee-terms.md` ships attached to the booking invoice.

The operational half nobody writes down:

1. **Any request counts.** An email saying "this wasn't worth it" is a valid claim. No form, no justification required, no proof-of-dissatisfaction.
2. **No argument.** Zero rebuttal, zero "can we hop on a call about it," zero renegotiation. One reply, same day: *"Done — refund is on its way, you'll see it within five business days. The memo and everything else is yours to keep. Thanks for the straight answer."*
3. **Refund lands within 5 business days**, original payment rail, full amount.
4. **Deliverables stay.** Memo, scores, first moves — theirs. Never claw back, never watermark, never send a "revised" copy.
5. **Exchange obligations dissolve.** No testimonial, no debrief, no intros are owed on a refunded engagement — and none are asked for.
6. **No audit pitch.** A refunded client hears nothing further unless they reach out.
7. **Log it.** `founding_clients` row → `voided`; the slot reopens (it was never delivered-and-debriefed). Write one honest paragraph in the engagement notes: which page failed to be worth $2,500. A refund is the cheapest product review this business will ever buy — the anti-recurrence loop applies to offers, not just code.

The guarantee is affordable because the exposure is a handful of evenings of work against a $6,500 audit pipeline (ladder §1b.3). Honoring it fast and silently is the mechanism that makes it true rather than decorative.

---

## Failure modes for the operator

- **Scope creep via helpfulness.** "Can you also look at our other workflow / our prompt library / this one weird trace?" → "That's audit scope." Every time.
- **Softening a score at the readout.** The score was frozen on day 3, after the artifact window closed, from evidence. Discussion can change the *memo's wording*, never the number.
- **Confirming what wasn't tested.** A pillar whose live test didn't run is provisional even when the story was convincing — engineers sincerely believe in logging they cannot produce (rubric rule 3). The Diagnostic's credibility, and the audit's reason to exist, both live on this line.
- **Letting the 48h window slide.** Ship on time with gaps flagged, always, over shipping late and complete.
