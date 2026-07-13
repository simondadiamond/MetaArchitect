# Production AI Audit — 90-Minute Readout Structure

> The minute-by-minute structure for the audit readout call, including the retainer/training close and what ships after.
> Part of the Production AI Audit kit — prices per `../pricing-pinned.md`.
> Fed by: `state-scoring-rubric.md` (scores, bands, live tests) and `engagement-runbook.md` (Day 12). Sales motion per `../offer-ladder.md` §2 notes and goal `46d6fc61`: retainer and Team Training are pitched here — at a delivered audit — never cold.

---

## Before the call

- [ ] Scores frozen since Day 9. You are presenting, not still auditing
- [ ] Findings doc draft-complete; final version ships within 2 business days after this call
- [ ] One-page scorecard ready to screen-share. No slide deck — present from the scorecard and the doc. A deck says agency; a findings doc says engineer
- [ ] Room check with the buyer beforehand: buyer + at least one scored-workflow owner. If risk/compliance wants in, good — the A-pillar section is written for them
- [ ] Know your close before you dial in: which risk is the retainer's month-one anchor, and whether this org smelled like monthly-budget or training-budget during the interviews
- [ ] If they took the simonparis.ca/score quiz pre-engagement, have both numbers side by side — the delta is a finding (rubric: self-assessed runs optimistic)

---

## The 90 minutes

| Block | Time | What happens |
|---|---|---|
| 1. Opening frame | 0:00–0:05 | Set the rules of the scores before anyone sees a number |
| 2. How the scoring worked | 0:05–0:15 | Rubric, live tests, evidence rule — brief, then move |
| 3. Scorecard walkthrough | 0:15–0:45 | Per workflow, pillar by pillar, evidence on screen |
| 4. The risks that matter | 0:45–1:00 | The 2–3 named risks. Not a laundry list |
| 5. 90-day roadmap | 1:00–1:15 | Sequenced remediation, each item tied to a score |
| 6. The close | 1:15–1:25 | Who executes the roadmap — retainer, training, or your team |
| 7. Logistics | 1:25–1:30 | What ships when, debrief scheduling, first quarterly review |

Timing discipline: if block 3 runs long, compress block 2 retroactively — never block 4 or 6. The last 15 minutes are why the readout exists.

### Block 1 — Opening frame (0:00–0:05)

Three rules, stated before any number appears:

Verbatim: **"Three things before you see a number. First — scores are per workflow, not per company. You don't have a STATE score; the claims summarizer has one. Second — the band names matter more than the digits, and I'll use them all the way through. Third — every score you'll see is backed by something I can show you: a file, a trace, a test we ran together. If you disagree with a score, we argue about the evidence, not the number."**

Then one sentence on what was scored: the named workflows, the interview count, which live tests ran.

### Block 2 — How the scoring worked (0:05–0:15)

- Five pillars, 0–3 each, anchors per the rubric — don't recite the rubric, show the one-page scale
- The rules that make it defensible, said out loud: scored what was observed, not what's planned; all-criteria or the level below; live tests trump documents
- Name the live tests their team took and who took them — "your engineer pulled that trace in six minutes" lands harder than any framework slide
- If a pillar is "untested — score provisional," say why here, once, and move on
- Quiz delta, if applicable: one sentence, no gloating

### Block 3 — Scorecard walkthrough (0:15–0:45)

Per workflow: total, band name, then the five pillars. For each pillar: the score, the one-line reason, the evidence pointer on screen. Live-test results get told as stories — they were in the room for them.

Rules:

- Say the band name every time the total appears. "7 out of 15 — High Risk: held together by individuals, not systems."
- Never average across workflows. If workflow A is Developing and workflow B is Critical Risk, that contrast IS the walkthrough.
- A scored N/A → "x out of 12" with the one-line reason. Never rescale.
- Credit what's real. A 2 on Traceable is genuinely systematic — say so. An audit that finds nothing good reads as a sales document.
- Fixes made mid-audit: name them as remediation-in-progress, score unchanged. "You fixed it during the audit" is a compliment and a data point.
- Disputes: go to the evidence pointer, re-read the anchor, hold the line. If genuinely new evidence surfaces, it goes in the final doc as a note — the score does not move on this call.

### Block 4 — The 2–3 risks that matter (0:45–1:00)

Not a walkthrough of every gap — the doc has those. These are the 2–3 findings that justify the engagement, each delivered as: **the finding → the incident it produces → what it costs when it fires.**

Shape: "Risk one. Crash mid-run leaves the email consumed and no claim created — your on-call re-injects by hand every week. Today that's an annoyance. At 3x volume it's a missed-claim backlog with a customer's name on every row."

Tie at least one risk to the compliance clock where honest (Law 25 today, OSFI E-23 in force 2027). Never inflate — the burned practitioner in the room can smell it.

### Block 5 — 90-day remediation roadmap (1:00–1:15)

- Sequenced by risk-per-effort, month by month, each item tied to the pillar score it moves ("this takes Tolerant from 1 to 2")
- Name the 1→2 jumps first — ad-hoc to systematic is where the workflow stops depending on one engineer, and it's the cheapest risk reduction on the page
- Be concrete about effort: "roughly a week of one senior engineer," not "medium effort"
- Land this sentence before the close, verbatim: **"Everything on this roadmap is executable by your team. Nothing here requires me."** It's true, and it's what makes the next block a conversation instead of a pitch.

### Block 6 — The close (1:15–1:25)

Only pitch at a readout that landed — scores accepted, risks acknowledged. If the room fought the scores for an hour, skip to Block 7 and handle the relationship first; a follow-up call is cheaper than a pitch into a headwind.

**The transition — verbatim:**

> "The roadmap is yours either way — that's what you paid for. The one open question is who executes it. There are three honest answers: your team does it alone, your team does it with me on the inside, or we compress the skills transfer into a day. Want the sixty-second version of the last two?"

Wait for the yes. Then:

**The retainer — verbatim:**

> "The way I work is day-blocks. One day a week, I'm your fractional LLMOps engineer — I take the top of this roadmap and build it down with your team, starting with [risk #1]. At the founding rate that's $5,500 a month, and the founding terms hold for the six-month term. If it's working and you want to go faster, two days a week is $9,000 — the per-day math gets better, deliberately."

(Canadian entity: quote it, then add "invoiced in CAD — $7,500 a month" per pricing-pinned CAD terms.)

**The Team Training downsell — when monthly budget isn't there, verbatim:**

> "If a monthly line item doesn't fit this year's budget, there's a one-day version: Agentic Development for Teams. I spend a full day hands-on with your engineers, in this codebase, working the top items on this roadmap together. That's $4,500 at the founding rate — for a team of fifteen that's $300 a head, which is less than most conference tickets. Half-day version exists at $3,000 if the scope is one workflow."

Training usually clears on an L&D budget without the committee — say so if procurement pain came up during the audit.

**Handling "we'll fix it ourselves" — verbatim:**

> "That's a fine outcome — the roadmap was built for exactly that. Two things stay open. As a founding client you've got a quarterly architecture review with me for the next twelve months — let's put the first one on the calendar now, about ninety days out, right when the month-three items should be done. And when you've closed the top three items, re-run the live tests from the findings doc with your own team. If the scores move, you'll know the fixes are real. If they don't, you know where I am."

Book that quarterly review before the call ends. It's the door that stays open, and it costs nothing to hold.

**Rules for the whole block:**
- Never discount. Price objection → trade scope, not price (a half-day instead of a full day; one day a week, not two). Floor per `../pricing-pinned.md`.
- Never pitch both retainer and training as equals — retainer first, training as the honest answer to a budget signal.
- No urgency theater. Founding slots are real and database-counted; state the fact once if asked, never as pressure.
- Silence after a price is not an objection. Let it sit.

### Block 7 — Logistics (1:25–1:30)

Say exactly what ships and when (table below), confirm the debrief window, book the first quarterly review if Block 6 didn't, thank the engineers by name — they took the tests.

---

## After the call

| What | When | Notes |
|---|---|---|
| Final findings doc + 90-day roadmap | Within 2 business days | Factual corrections from the readout incorporated; framing unchanged |
| Invoice, remaining balance | With the final doc | Per SOW payment terms; CAD for Canadian entities per `../pricing-pinned.md` |
| Founding debrief scheduling | Same email | Recorded 45-min call within 21 days of final deliverable acceptance (founding terms, `../founding-client-program.md` §5) |
| Quarterly architecture review #1 | Booked on this call | ~90 days out; the founding perk that keeps the door open |
| Case-study process note | Same email | Written commentary window: 5 business days, factual corrections only |
| Retainer/training follow-up, if interest was live | 2 business days later | One email, one option, one start date. Not a sequence |
| Access revocation + data destruction confirmation | Within 7 days of acceptance | Per the security posture in `evidence-request-checklist.md` — confirm it in writing; it's a trust artifact |
