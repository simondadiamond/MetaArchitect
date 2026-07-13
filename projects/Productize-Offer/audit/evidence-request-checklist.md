# Production AI Audit — Evidence Request Checklist

> What to have ready before Day 1 of the audit. Sent to the buyer at SOW signature; written to be forwarded to the engineering team as-is.
> Part of the Production AI Audit kit — prices per `../pricing-pinned.md`.
> Internal companions: `engagement-runbook.md` (Phase 0 gates), `state-scoring-rubric.md` (what the evidence feeds).

---

The audit scores what runs, not what's documented. Every item below feeds a specific test I will run during the two weeks. Items marked **BLOCKING** must be in place before Day 1 or Day 1 moves — the schedule has no slack for waiting on access. Items marked **by Day 3** or **by Day 8** can trail the kickoff.

If you can't provide an item, that's fine — every item has a fallback, and in two cases the absence of the item is itself a result the audit will report. Nothing here is a test of your team. It's the raw material.

---

## 1. Repo access — read-only, scoped · **BLOCKING**

**Provide:** read-only access to the repositories behind the workflows being scored. Scoped to those repos — I don't need the monorepo. Guest account in your tenant preferred over a code export.

**Why:** two of the five pillars — state schemas and validation gates — are scored from the code that actually runs, not from diagrams; I read the gate, not the slide about the gate.

**Fallback:** if repo access is impossible under your policy, we run screen-share sessions where your engineer drives and I direct. Budget two extra hour-long sessions, and the findings doc will note where access limited depth.

## 2. Trace / log access, or exports · **BLOCKING**

**Provide:** read access to your tracing/logging stack (Langfuse, LangSmith, OTel backend, homegrown table — whatever you have), or an export covering the last 2–4 weeks of executions for the scored workflows.

**Why:** the Traceable live test is me picking a real execution from last week and clocking how long it takes to produce its complete trace — every LLM call, tool call, and model version.

**Fallback:** your engineer runs the trace pull on a screen-share while I watch and time it. That's actually the stronger form of the test.

## 3. The 1–3 workflows to be scored, with named owners · **BLOCKING**

**Provide:** for each workflow: what triggers it, what it does in the world, and the one engineer who owns it. Locked into the SOW before Day 1.

**Why:** workflows get scored, not companies — "the claims-triage summarizer" is scorable, "our AI platform" is not, and an unnamed owner usually means an unowned failure mode.

**Fallback:** none. This one we settle at the scoping call or the engagement doesn't start.

## 4. Interview scheduling — 3 to 5 engineers · **BLOCKING**

**Provide:** 3–5 booked one-hour slots (lunch or late-afternoon works) before Day 1, with these roles covered:

- [ ] The workflow owner (per workflow)
- [ ] Whoever was on call for the last incident involving the AI feature
- [ ] Whoever wrote the validation / retry / resume code
- [ ] Optional: platform/SRE lead, and whoever fields legal's questions about the system

Engineers, not managers. Managers are welcome to sit in; they can't take the tests.

**Why:** the live tests run inside these interviews — trace pulls, the crash-at-step-6 walkthrough, the boundary walk — and an unbooked interview in week 1 is a pillar scored provisional in the final doc.

**Fallback:** floor is 3 engineers. Below 3, corroboration thins and the findings doc says so.

## 5. Incident history · by Day 3

**Provide:** post-mortems, support tickets, and Slack threads about the AI feature misbehaving — the last three incidents minimum, however informal the record.

**Why:** your incidents tell me which failure modes are already active — fault-tolerance is scored partly from what the last three incidents cost you and who cleaned them up by hand.

**Fallback:** we reconstruct the last three incidents verbally in interviews (adds ~30 minutes). Note: having no written incident record for a production AI system is itself a finding, and it will be reported as one.

## 6. Prompt + model version inventory · by Day 3

**Provide:** whatever list exists of prompts in production and which model + version runs each — a spreadsheet is fine.

**Why:** if nobody can say which prompt version produced a given execution, that's a traceability gap the audit will surface anyway — telling me on Day 1 costs nothing and saves discovery time.

**Fallback:** "no such inventory exists" is a complete and useful answer. It gets recorded as a finding, and we build a partial inventory during the audit — which your team keeps.

## 7. Architecture diagrams · nice-to-have

**Provide:** whatever exists — even the whiteboard photo from eight months ago.

**Why:** diagrams don't get scored — code does — but a current diagram cuts a day off orientation, and the gap between the diagram and the code is often the most useful thing in the room.

**Fallback:** 30 minutes of whiteboarding at the kickoff call. Genuinely fine.

## 8. Compliance context · by Day 8 (required if the workflow touches personal data)

**Provide:** your Law 25 / OSFI / PIPEDA posture for the scored workflows: any inventory of automated decisions, any past regulator or legal asks about the AI system and how long they took to answer, and who owns the response when one arrives.

**Why:** if a regulator asked today what data drove one specific automated decision last month, the audit tests whether you could answer inside 30 minutes — that drill is run live, with your team.

**Fallback:** an interview slot with whoever fields legal's questions. If no inventory of automated decisions exists, that absence is a finding — a common one, and fixable.

---

## Security posture — what happens to your code and data

- **Read-only, always.** I never hold write access to anything of yours. Access is scoped to the named repos and the tracing stack, ideally as a guest identity in your tenant that you can watch and revoke.
- **Where access is impossible, you drive.** Every live test has a screen-share form where your engineer's hands are on the keyboard. Slower, equally valid, sometimes stronger.
- **During the engagement** all client material stays on one encrypted machine. Nothing is pasted into third-party tools; no client code or data is used to train anything.
- **After final acceptance, within 7 days:** local clones, trace exports, and any credentials are destroyed or revoked — you should also revoke from your side; I'll remind you.
- **What I retain:** the findings doc, the scorecards, interview notes, and redacted evidence pointers — the material the founding case-study process draws on, which you review before anything is published (per the SOW's founding terms: factual corrections incorporated, 5 business days).

---

## The short version

| # | Item | Deadline |
|---|---|---|
| 1 | Read-only repo access, scoped | **Before Day 1** |
| 2 | Trace/log access or exports | **Before Day 1** |
| 3 | 1–3 named workflows + owners, in the SOW | **Before Day 1** |
| 4 | 3–5 engineer interviews booked, roles above | **Before Day 1** |
| 5 | Incident history (or verbal reconstruction) | Day 3 |
| 6 | Prompt + model inventory (or "none exists") | Day 3 |
| 7 | Architecture diagrams | Whenever |
| 8 | Compliance context | Day 8 |

Items 1–4 gate the start date. Everything else has a fallback. Questions go to Simon directly — there's no intake team, which is rather the point.
