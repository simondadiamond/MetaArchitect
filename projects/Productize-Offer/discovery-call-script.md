# Discovery Call Script — 15 Minutes, Fit Check Not Pitch

> Owner: Simon Paris · v1 2026-07-03 (COO, Story: prospect map)
> Implements founding-client-program.md §8 gates as a natural conversation. EN here; deliver in FR when the buyer opens in French — same structure.
> Rule: this call sells nothing. It qualifies. The Diagnostic sells itself at the end if the gates pass.

---

## Frame (say in the first 30 seconds)

> "Fifteen minutes, two outcomes. Either your setup is a fit for a short diagnostic and I'll tell you exactly what that looks like, or it isn't and I'll tell you that too — and where I'd look instead. Fair?"

Sets: time-boxed, mutual qualification, no pitch pressure. Practitioner-to-practitioner.

## Minutes 1–3 — The workflow (Gate 1: production, not prototype)

> "Tell me about the GenAI workflow that's actually running today — not the roadmap. Who uses it, and what happens when it's wrong?"

Listen for: named workflow, real users or internal stakeholders, a failure they've already eaten.
- ✅ "Our claims-triage summarizer misfiled a batch in March" → production. Continue.
- ❌ "We're planning a pilot in Q4" → **not-now path** (min 13). Don't stretch the call.

Follow-up if vague: "When it broke last time — who noticed first, you or the users?" (No answer = no production traffic.)

## Minutes 3–5 — The data (Gate 2: regulated/sensitive scope)

> "What's the most sensitive thing that flows through it — client PII, financial records, health data? Anything Law 25 or OSFI would care about?"

- ✅ Any of: PII, financial, PHI, Law 25-covered PI, OSFI-supervised process, Restricted-classified internal data.
- ❌ "We might add PII later" → not-now. Say why: "The work I do earns its fee where the data is regulated. Come back when it touches real PI."

Quebec flag: if Law 25 in scope, note it — founding audit slots reserve 2 for Law 25 exposure, and deliverables can ship in French.

## Minutes 5–7 — The owner (Gate 4: named accountable human)

> "If this system has a bad month, whose performance review does that show up on?"

- ✅ The buyer, or someone reporting to them, owns reliability/LLMOps/AI platform stability by name.
- ❌ "It's kind of shared across teams" → weak leverage. One soft probe: "Who gets paged?" If still nobody — not-now.

## Minutes 7–9 — The signature (Gate 3: budget without committee)

> "Practical question — if this were a fifteen-thousand-dollar SOW, is that your signature, or does it go to a committee?"

Ask it flat. This question filters more honestly than any pricing page.
- ✅ Own signature, or documented fast-track ≤$25k → continue.
- ❌ Steering committee → full-rate-later path: "Then the founding rate isn't for you — committees outlast founding windows. Full-rate work is still on the table when you've got sign-off."

## Minutes 9–12 — The exchange (Gate 5: verbal agreement BEFORE quoting)

> "Here's how the founding rate works — it's an exchange, not a discount. You get the diagnostic at $2,500 instead of $3,500 [CAD: $3,500 / $4,800], delivered by me personally, with a guarantee: if the findings memo isn't worth it, refund on request and you keep everything. I get three things: a short recorded debrief after delivery, a testimonial if you're satisfied, and two warm intros if you think someone else needs this. If any of that doesn't sit right, the full rate has no strings."

Wait for a verbal yes/no on the exchange. Do not quote founding pricing before this paragraph.
(Audit/retainer tiers carry the fuller exchange — case-study rights, logo, reference calls — but that conversation happens at the diagnostic readout, never cold.)

## Minutes 12–15 — Close (one of three exits)

**PASS (all gates):**
> "You're a fit. Next step is the diagnostic — two to three days, five-page findings memo, one-hour readout, English or French. I'll send the one-pager and an invoice today; we book the kickoff once it clears. Anything blocking a yes this week?"

**FULL-RATE / LATER (failed gate 3 or 5):**
> "Not a founding fit, and I'd rather tell you that than fudge it. When [signature authority / the exchange] works for you, the full rate is $3,500 and the door's open."

**NOT-NOW (failed gate 1 or 2):**
> "Honest answer: a diagnostic today would tell you things you can't act on yet. Ship the workflow to real users first / get the regulated data in scope — then this conversation is worth your money. Meanwhile, the STATE quiz at simonparis.ca/score will show you what I'd be looking at."

## After every call (STATE applies to revenue)

- Log the call: prospect, gates passed/failed, exit taken → `founding_clients` (status `prospect`/`quoted`) or notes doc until the table exists.
- Borderline offered anyway → a `founding_decisions` row with reasoning BEFORE the quote goes out (founding doc §6).
- No follow-up drift: PASS gets the one-pager same day; LATER gets a calendar note at +90 days; NOT-NOW gets the /score link and nothing else.

## Anti-patterns (do not)

- Do not pitch the audit or retainer cold — the ladder climbs at the readout, never on this call.
- Do not discount past the founding rate. Price objection → trade scope, not price (offer nothing smaller; the Diagnostic IS the smallest unit).
- Do not let the call run past 20 minutes. Overrunning signals the time is worthless.
- Do not skip the exchange paragraph to "keep it friendly" — an unnamed exchange becomes a discount in the buyer's memory.
