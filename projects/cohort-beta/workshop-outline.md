# Workshop Outline — No Stack Trace: How to Make Agent Failures Reproducible

> **Target Audience**: LLM Platform Leads, Senior Architects, and Tech Leads whose pilot is a clever demo duct-taped into production.
> **Duration**: 90 Minutes
> **Format**: 9 Slides + Live Teardown
> **Delivery**: Remote. Screen share + digital whiteboard (Excalidraw or FigJam). No slide deck animations — stark, static, fast.

---

## Slide 1 — The Contract (3 mins)

**Visual**: Black background. Two lines of text.
```
Simon Paris | The Meta Architect
No Stack Trace: How to Make Agent Failures Reproducible
```

**Talk Track**:
"Let me tell you what this is and what it isn't.

This isn't a prompt engineering webinar. This isn't 'how to build your first AI agent.' If that's what you came for, the exit is behind you and I genuinely wish you well.

This is for people whose AI pilot is a clever demo duct-taped into production. People who've been asked to make it reliable and have no idea where to start — because nobody's written the manual yet.

We're doing a teardown today. A real one. You're going to leave with a blueprint, a scoring rubric, and a list of questions to ask your system on Monday morning.

One ground rule: if something resonates, say it in chat. If something's wrong, say that too. This works better as a conversation."

---

## Slide 2 — The Perfect Engine & The Missing Road (7 mins)

**Visual**: Blurred screenshot of a complex n8n workflow. Deliberately illegible — you can see the structure but not the labels.

**Talk Track**:
"I want to tell you about the best AI system I've ever built.

Five workflows in n8n. A dynamic taxonomy engine that could categorize emails from a cold start — no pre-training, no hardcoded categories. It passed state perfectly from one node to the next. Every failure mode handled. Checkpoints at every stage. I was genuinely proud of it.

It cost me the gig.

The client closed the role two weeks after I shipped it. Not because the system didn't work — it worked perfectly. It worked so well that it exposed something nobody wanted to look at: the business had zero SOPs. I'd built a Formula 1 car for a client who didn't have a road yet. The state the system was supposed to manage? Garbage in, garbage out, at scale, automatically.

Here's the lesson I took from that: the model wasn't the problem. My code wasn't the problem. The *architecture of the business process* was the problem — and my system made it impossible to ignore.

When things fail in AI, our first instinct is to blame the model. It's almost never the model. The model is doing exactly what we told it to do. The problem is what we told it to manage."

**Speaker Note**: Pause after "it cost me the gig." Let that land. Don't rush to explain.

---

## Slide 3 — The False Diagnosis (5 mins)

**Visual**: Two lines, centered, large.
```
Intelligence is a commodity.
Control is scarce.
```

**Talk Track**:
"We keep trying to fix architecture problems with prompting.

Something breaks — we rewrite the prompt. It breaks differently — we rewrite it again. This is prompt whack-a-mole and most teams are playing it right now.

Here's the reframe: non-determinism isn't a bug. It's the medium. You chose a stochastic tool. Complaining that the LLM doesn't always give the same answer is like complaining that a river doesn't always flow the same way. You need levees, not a better river.

The question has never been 'can the model do X?' Every frontier model can do X, approximately, most of the time. The question is: 'will it do X repeatedly, and can I prove *why* it did it?' Those are engineering questions. Not model questions.

That shift — from capability to control — is the whole game."

---

## Slide 4 — Autopsy: The 2 Silent Killers (15 mins)

**Visual**: Two panels. Left: a broken seam. Right: a landmine. Minimal, icon-level.

**Talk Track**:
"I'm going to walk you through two failures from my own production work. Not hypotheticals. Real systems, real consequences.

**Failure 1: The Seam Failure**

I built a blog workflow. Every node had passing tests. I'd pinned data at the first AI node, so every downstream node ran against known-good JSON. Clean. Green. Confident.

The workflow had never run end to end. Not once.

When it did, the LLM wrapped its JSON output in markdown code blocks. Triple backticks. The parser expected raw JSON. It choked. Silently. The workflow just... stopped. No error. No alert. Nothing downstream fired.

What was missing? A deterministic gate between stochastic output and code. One validation node, strip the backticks, check the schema, reject invalid output explicitly. That's it. The components were fine. The seam was broken.

*[Speaker note: This is the 'Seams vs. Components' principle — name it here if the audience seems ready for it.]*

**Failure 2: The Deferred Death**

Different project. Infrastructure setup. WireGuard, Caddy, systemd, port forwarding — all configured. Every command returned to the prompt. No red errors. Cognitively, it felt like progress.

I rebooted.

SSH didn't connect. 'Waiting for console.' The machine had regressed to an earlier boot state. A service file was malformed. A symlink existed but hadn't activated. None of it surfaced as an error — it deferred. The system only worked in forward motion.

The configuration *looked* correct. The conversation *looked* correct. The state was wrong.

Both of these failures have the same root cause: I didn't test the state transition. I tested the happy path. Production isn't the happy path."

**Speaker Note**: Take questions here if they're coming in chat. This is the most relatable section for most attendees.

---

## Slide 5 — The Compliance Question (10 mins)

**Visual**: One question, verbatim, in mono font.
```
"Can we log why the agent did this?"
```

**Talk Track**:
"I want to talk about regulated environments for a few minutes — but I'm not going to give you a legal lecture. I'm going to give you an architecture requirement.

Quebec's Law 25 — and analogues like OSFI's B-13 guideline for financial institutions — require that if your system makes a decision that affects an individual through automated processing, you need to be able to answer three questions on demand:

What personal data did the system use? What were the principal factors that led to the decision? And who can a human contact to contest it?

'The model hallucinated' is not a legal answer to any of these questions.

Here's the thing: if you're in finserv, insurance, healthcare, or any regulated sector, your legal team is going to ask you these questions eventually. Either you've designed your system to answer them, or you haven't. There's no middle ground.

The good news — and this is the part most people miss — is that a properly stateful, observable agent system answers all three questions as a side effect. You don't add compliance on top. You design for state and traceability, and compliance comes for free.

This isn't a checkbox. It's an architecture constraint that makes your system better regardless of the regulatory environment."

**Speaker Note**: If you have anyone from finserv or insurance in the room, call it out — "if you're at a bank or insurer, this slide is about your next audit." It lands harder as direct address.

---

## Slide 6 — The Reboot Test (5 mins)

**Visual**: The test as a checklist. Stark. Mono font.

```
THE REBOOT TEST

Before you call it production-ready:

[ ] Kill the workflow at step 6. Does it resume or restart?
[ ] Reboot the container. Does SSH connect?
[ ] Take the external API offline for 2 minutes. What happens?
[ ] Rotate credentials mid-run. Does it recover?
[ ] Inject a bad LLM output. Does it fail explicitly or silently?

If it only works moving forward — it's a demo.
```

**Talk Track**:
"This is the test I run before I call anything production-ready. Not 'does it work?' — everything works in testing. The question is: does it survive state transitions?

Kill it at step 6. Reboot it. Take a dependency offline. Rotate credentials. Inject a malformed LLM output.

If your system only works when everything goes right, in the right order, from the beginning — that's a demo. A well-dressed demo, maybe. But a demo.

Production systems don't get to assume forward motion. They get crashes, network blips, model outages, and edge cases you didn't anticipate. Design for that, and everything else gets easier."

---

## Slide 7 — Live Teardown: The "Standard" Architecture (20 mins)

**Visual**: A widely-shared, highly-upvoted RAG agent diagram from a popular tutorial. Generic enough to be recognizable. Keep the source anonymous.

**Talk Track**:
"This is the main event.

I've got a diagram here that's been shared thousands of times. Highly rated. Lots of GitHub stars. This is what 'best practice' looks like according to the internet right now.

I'm not going to click to the next slide. I'm going to pick up a pen and we're going to score this thing together.

*[Switch to Excalidraw/FigJam overlay on the diagram]*

I'm going to ask five questions — one per STATE pillar. For each one, I'm scoring 0, 1, or 2. We're building a STATE score live.

**S — Structured**: Where is the state object in this diagram? What does the agent know about where it is in the workflow if it crashes at step 4?

*[Annotate the gaps — typically: no explicit state schema, context held in memory only]*

**T — Traceable**: Where does the logging happen? Can I pull up a full trace of a specific user session from last Tuesday?

*[Annotate: typically logs are afterthoughts, not first-class citizens]*

**A — Auditable**: If this system makes a decision that affects a customer — can I answer what data was used and why? In under 30 minutes?

*[This is usually a hard zero. Mark it.]*

**T — Tolerant**: If this workflow fails at step 6 of 10 — does it resume from step 6, or restart from step 1? Where are the checkpoints?

*[Annotate: usually no checkpoints, full restart on failure]*

**E — Explicit**: Where are the validation gates? What happens when the LLM wraps its output in backticks? What stops a hallucinated value from triggering a real-world action?

*[Annotate: typically the LLM output flows directly into action with no contract check]*

Score total: typically 2–4 out of 10. That's not an insult to whoever built this — it's the state of the art. This is what everyone is shipping right now."

**Speaker Note**: Keep the energy diagnostic, not superior. "This is what I was building too, before I had a framework for what was missing." The goal is recognition, not shame.

---

## Slide 8 — Live Redesign: The STATE Overlay (15 mins)

**Visual**: The same diagram. Now annotated and partially redrawn.

**Talk Track**:
"Now we fix it. Same diagram. Different design decisions.

*[Draw the state object schema at the entry point]*

First thing: explicit state. Before any LLM call, before any tool call — we initialize a typed state object. WorkflowId. Stage. EntityId. Timestamps. The agent always knows where it is. If it crashes, the last saved state tells you exactly where it got to.

*[Draw the trace log connecting each step]*

Second: tracing. Every LLM call gets logged. Inputs, outputs, model version, latency, cost. Every tool call gets logged. Not as an afterthought — as a first-class design decision. You're building an audit trail as a side effect of running the workflow.

*[Draw the validation gate between LLM output and the next action]*

Third: explicit boundaries. Between every LLM output and every downstream action, there's a gate. Schema check. Strip markdown. Validate required fields. If it fails validation, it routes to error — it never silently continues.

*[Draw checkpoint markers at expensive operations]*

Fourth: checkpoints. Before any expensive or irreversible operation, we write state to persistent storage. Before the LLM call. Before the API write. If anything crashes, we resume from the last checkpoint — not from the beginning.

*[Add the decision log for the compliance case]*

Fifth: auditability. For any decision touching personal data, we write a decision record. Separate table. What data was used. What the model decided. What version. Who can review it.

This is STATE: Structured, Traceable, Auditable, Tolerant, Explicit.

Same architecture. Completely different operational reality."

**Speaker Note**: Slow down on the visual annotation. The audience needs to see the diagram change in real time — that's the whole point of the live format. Don't rush to the next verbal point while the annotation is still landing.

---

## Slide 9 — The Offer & The Escape Hatch (10 mins)

**Visual**: Clean. Minimal. The cohort details as a structured card.

```
AI Reliability Engineering: State Beats Intelligence
4-Week Beta Cohort — May 2026

Week 1: Failure Diagnosis — map your broken pilot
Week 2: State Modelling — design explicit schemas and checkpoints
Week 3: Observability — instrument your system with real traces
Week 4: Governance — Law 25 compliance as architecture

~3 hours/week. Small group. Practitioner-only.
$700–900 CAD. Fits inside standard L&D budgets.
```

**Talk Track**:
"Here's what I want to leave you with.

The teams getting this right aren't smarter than you. They're not using better models. They have an operating model. A framework for thinking about state, traceability, and failure — and they apply it before things break, not after.

That's what this cohort is. Four weeks. Small group. We take one system you're actually running and walk it through the STATE framework together. You leave with a reliability and governance readiness plan you can take to your CTO, your risk team, or your next architecture review.

Price is $700–900 CAD. That's inside most team training budgets — no executive sign-off required.

If that's interesting, the link in chat takes you to the waitlist. Everyone who signs up tonight gets the STATE Readiness Checklist PDF immediately — the same scoring rubric we just ran through, formatted for your own system audit.

And if the cohort isn't the right fit — that checklist is yours regardless. Five questions. Run them against your own system this week. See what score you get.

That's the offer. No pressure. If you built something in this session, that's enough for today."

**Speaker Note**: Don't close with urgency tactics. The ICP reads them immediately and it kills credibility. The escape hatch — "if the cohort isn't right, here's the checklist anyway" — is load-bearing. It makes the offer feel like it's coming from a practitioner, not a marketer.

---

## Timing Summary

| Slide | Content | Time |
|-------|---------|------|
| 1 | The Contract | 3 min |
| 2 | The Perfect Engine | 7 min |
| 3 | The False Diagnosis | 5 min |
| 4 | The 2 Silent Killers | 15 min |
| 5 | The Compliance Question | 10 min |
| 6 | The Reboot Test | 5 min |
| 7 | Live Teardown | 20 min |
| 8 | Live Redesign | 15 min |
| 9 | The Offer | 10 min |
| **Total** | | **90 min** |

---

## Pre-Workshop Checklist

- [ ] Excalidraw or FigJam open and loaded with the teardown diagram — tested, not first-run
- [ ] Digital pen configured and working
- [ ] STATE Readiness Checklist PDF ready to drop in chat
- [ ] Waitlist link ready to drop in chat
- [ ] Recording enabled (repurpose for content)
- [ ] Chat moderation: read chat at Slides 4 and 7 — those are the two natural pause points
- [ ] Backup plan if live teardown runs long: cut 2 mins from Slide 5, compress Slide 6 to 3 mins

## Post-Workshop Immediate Actions

- [ ] Send recording to all registrants within 24 hours
- [ ] DM everyone who dropped a comment in chat — they're your warmest leads
- [ ] Post one clip from the live teardown section (best 60–90 seconds) to LinkedIn next day
- [ ] Update cohort waitlist with any new sign-ups before end of day
