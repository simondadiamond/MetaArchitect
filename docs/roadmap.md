# The Meta Architect — Roadmap

> Single source of truth. Updated at end of every session.
> Format: `- [ ]` not done | `- [x] ~~Item~~ ✓ YYYY-MM-DD` done

---

## CURRENT FOCUS
**Phase 3.5: Lead Capture Infrastructure** — Posting cadence running (2x/week). LinkedIn profile needs optimization. Build the STATE Readiness Checklist and email funnel now.

---

## Phase 1: Content Engine — ✅ DONE

- [x] ~~Brand guidelines, ICP, STATE framework documented~~ ✓ 2026-02
- [x] ~~Airtable schema (ideas, posts, hooks, logs, brand, humanity_snippets)~~ ✓ 2026-02
- [x] ~~Content pipeline commands: /capture, /research, /draft, /review, /publish, /score~~ ✓ 2026-03
- [x] ~~/harvest command — autonomous idea generation (STATE-compliant, session integrity gate, specificity requirement)~~ ✓ 2026-03-18
- [x] ~~Pattern Guardian skill + Airtable push script~~ ✓ 2026-03-19
- [x] ~~Harvest-memory.json — cold start done (run #1 on 2026-03-17)~~ ✓
- [x] ~~Build idea backlog (target: 10+ ideas at Status=New)~~ ✓ 2026-03-19
  - Run #1 (2026-03-17): archived as CORRUPTED (pre-specificity gate)
  - Run #2 (2026-03-19): 10 quality ideas with named-entity queries

---

## Phase 2: Content Production — ✅ DONE

**Goal was: 3 posts published + origin story live. Pipeline validated end-to-end.**
**Status: pipeline is running. 2x/week cadence established. Origin story published and pinned.**

- [x] ~~Origin story: "I didn't know what I wanted to build. So I asked an AI what question I should be asking."~~ ✓ 2026-03-20
- [x] ~~Publish + pin to LinkedIn profile~~ ✓ 2026-03-20
- [x] ~~/editorial-planner command — built and optimized~~ ✓ 2026-03-20
- [x] ~~Humanity snippet bank — seeded~~ ✓ 2026-03-20
- [x] ~~First posts through pipeline — cadence running~~ ✓ 2026-03

### Ongoing (not a phase gate — run continuously)
- Run `/score` on every published post after 7 days
- Run `/harvest` when backlog drops below 5 ideas at Status=New

---

## Phase 3: LinkedIn Presence — 🔄 IN PROGRESS

**Goal: profile is a credibility asset, not a resume.**
**Status: cadence is running. Profile optimization is the remaining one-time setup.**

### 3a. Profile Optimization — DO THIS WEEK
- [ ] Headline: "AI Reliability Engineer | State Beats Intelligence | simonparis.ca"
- [ ] About section: lead with burned practitioner problem, name STATE and Law 25, link to simonparis.ca
- [ ] Featured section: origin story post pinned
- [ ] Experience: add "The Meta Architect" as current role — practitioner + teacher framing
- [ ] Banner: brand-compliant visual (#0F0F0F background, orange accent, Merriweather wordmark)

### 3b. Posting Cadence — RUNNING
- 2x/week cadence is established and working — maintain it
- Target 3x/week only when you have a full week of drafted posts queued ahead
- Weekly flow: `/harvest` (as needed) → `/editorial-planner` → pipeline → publish

### 3c. Audience Signals (milestone reviews — not tasks)
- At 10 posts: which pillars drive the most engagement?
- At 25 posts: review intent ratio; adjust editorial mix if needed
- Ongoing: engage 5–10 ICP accounts per week — comment on MLOps / production AI failure posts

---

## Phase 3.5: Lead Capture Infrastructure — 🔄 START NOW

**Goal: turn post readers into an email list. Every post needs somewhere to go.**
**No gate — build this in parallel with posting. Don't wait for 10 posts.**

### 3.5a. Email Provider Setup — DO THIS FIRST (30 min, unblocks everything)
- [x] ~~Pick email provider: MailerLite~~ ✓ 2026-03-21
- [x] ~~Create subscriber group: "State Readiness Checklist"~~ ✓ 2026-03-21
- [x] ~~Authenticate sender domain (simonparis.ca) — add SPF/DKIM DNS records in MailerLite dashboard → Domains~~ ✓ 2026-03-22

### 3.5b. STATE Readiness Checklist PDF (the asset)
- [x] ~~1 page. 5 pillar questions. 0–2 scoring per pillar. Total score interpretation table.~~ ✓ 2026-03-22
- [x] ~~Save to `funnel/lead-magnets/state-readiness-checklist.pdf`~~ ✓ 2026-03-22
  - Hosted: https://storage.googleapis.com/mailerlite-uploads-prod/2210707/jn1JSNybbE4IAkMwVRTOQqP7TOIeGKZ34fftV0op.pdf

### 3.5c. Opt-In Page
- [ ] Headline: "Is your GenAI pilot production-ready? Score it in 5 minutes."
- [ ] Form: name + email only — no more fields
- [ ] On submit: delivers PDF immediately + triggers welcome sequence
- [ ] Host at `/checklist` route on simonparis.ca or as standalone funnel page

### 3.5d. Homepage Tweak (simonparis.ca — scope: 3 changes, not a redesign)
- [ ] Above the fold: own the category — "I design AI systems that don't break. The STATE framework is how."
- [ ] Add 5-pillar section — one line per pillar, no prose
- [ ] Add CTA block → opt-in page ("Score your system in 5 minutes")
- Note: full site redesign stays in the Parking Lot. This is 3 targeted edits.

### 3.5e. Welcome Sequence (2 emails)
- [x] ~~Automation built: "State Readiness Checklist — Welcome Sequence" (ID: 182570353596302575)~~ ✓ 2026-03-21
  - Email 1 (immediate): "Your STATE Readiness Checklist" — PDF delivery
  - 3-day delay
  - Email 2: "What happens after you score your system" — workshop intro
- [ ] Paste PDF download URL into Email 1 (after PDF is created + uploaded)
- [ ] Add workshop registration URL into Email 2 (Phase 4)
- [ ] Activate automation in MailerLite dashboard (after domain auth)

### 3.5f. Wire into existing channels
- [ ] LinkedIn profile: add opt-in link to About section or Featured section
- [ ] Every 3rd post: soft CTA — "Link in comments if you want the scoring rubric"

---

## Phase 4: Workshop — ⏳ UPCOMING

**Goal: first free workshop as lead gen for cohort.**
**Target: April 2026. Unblock with: lead capture live + ~4 weeks of posting.**

### 4a. Pre-Workshop Assets (build before promoting)
- [ ] **Announce a specific date** — before the registration page is done. Commitment precedes polish.
- [ ] Registration page (funnel/workshop/)
  - Headline: "No Stack Trace: How to Make Agent Failures Reproducible"
  - 90-min, date/time, what they'll leave with
  - Form: name, email, company, role
- [ ] Wire registration form to email list (same provider as Phase 3.5)
- [ ] Short URL ready to drop in chat/posts

### 4b. Workshop Promotion (3–4 weeks before date)
- [ ] 2–3 posts promoting the workshop
  - Hook: "I'm running a free teardown — we'll score a popular RAG agent architecture live"
  - Angle: STATE scoring exercise, not the cohort pitch
- [ ] Add workshop as secondary CTA on opt-in page: "Checklist is step 1. Workshop is step 2."
- [ ] DM 10–15 warm ICP accounts with personal invite
  - Target: 25–50 registrations. Minimum viable: 15 live attendees.

### 4c. Workshop Delivery
- [ ] Pre-workshop: Excalidraw teardown loaded + tested, PDF ready, waitlist link ready, recording enabled
- [ ] Deliver: "No Stack Trace" — 90 min, 9 slides, live teardown
- [ ] Within 24 hrs: send recording to all registrants
- [ ] DM everyone who commented in chat (warmest leads)
- [ ] Post 60–90 second teardown clip to LinkedIn next day
- [ ] Update cohort waitlist with sign-ups

---

## Phase 4.5: Cohort Readiness — ⏳ UPCOMING

**Goal: be actually ready to deliver before charging anyone.**
**Unblock with: workshop delivered. Non-negotiable: confidence is preparation, not a feeling.**

### 4.5a. Written Curriculum (Week 1–4 in deliverable detail)
- [ ] Week 1 — Failure Diagnosis
  - Exercise: score their own system using the STATE Readiness Checklist
  - Out: completed STATE score + top 2–3 gaps identified
- [ ] Week 2 — State Modelling
  - Exercise: design a state object schema for their current pipeline
  - Out: state schema + checkpoint map
- [ ] Week 3 — Observability
  - Exercise: add logging to one workflow (every LLM call + stage transitions)
  - Out: instrumented pipeline with log entry schema
- [ ] Week 4 — Governance (Law 25 as architecture)
  - Exercise: identify which decisions require audit trails
  - Out: governance gap list + 30-day remediation plan

### 4.5b. Case Studies (production scars — real, not hypothetical)
- [ ] 3–5 failure mode examples across the 4 weeks
  - Case study 1: backtick/JSON seam failure — document fully
  - Case study 2: WireGuard deferred death — document fully
  - Need 1–3 more from your own history or public post-mortems (cite source)

### 4.5c. Dry Run (non-negotiable)
- [ ] Full run-through of Week 1 alone — talk out loud, time it, find gaps
- [ ] One run-through with a trusted peer or test participant
- [ ] Revise Week 1 before delivering to paying cohort

### 4.5d. Participant Contract
- [ ] What they bring: a real GenAI system in production or near-production + ability to make changes
- [ ] What they get per week: confirmed and written (see 4.5a deliverables)

---

## Phase 5: Cohort Beta — ⏳ UPCOMING

**Goal: first paying cohort. Revenue milestone.**
**Target: May 2026. Unblock with: Phase 4.5 complete + waitlist ≥10 people.**

### 5a. Offer Definition
- [ ] Price: $700–900 CAD (confirm — $800 is the midpoint)
- [ ] Format: 4 weeks, ~3 hrs/week, cap at 10–12
- [ ] Intake: short application form (role, current system, what they want fixed) or DM-to-call

### 5b. Sales Infrastructure
- [ ] Cohort landing page (funnel/landing-page/)
  - **Unblock: Phase 4.5 complete** — don't build this before the curriculum exists
  - Problem framing → STATE → curriculum → price → apply CTA
  - "This is not a beginner AI course" — front-load the qualification
  - L&D justification copy: write the 3-line email they send to their manager
- [ ] Payment mechanism: Stripe, simple, no recurring billing needed for beta
- [ ] Application form live and tested

### 5c. Cohort Delivery
- [ ] Confirm dates with registrants
- [ ] Pre-cohort: send STATE Readiness Checklist as Week 0 homework
- [ ] Deliver 4 weekly sessions — record all
- [ ] Post-cohort: collect testimonials + document case studies (with permission)

---

## Phase 6: Consulting — ⏳ UPCOMING (parallel with cohort)

**Goal: first consulting engagement from inbound or warm outreach.**
**Unblock with: 30+ posts published + workshop clip circulating.**

- [ ] LinkedIn DM framework: ICP accounts engaging with posts → personal DM (not a pitch)
- [ ] Discovery call structure: 30 min → identify STATE score → identify highest-risk gaps
- [ ] Consulting offer: STATE Readiness Assessment — score + gap analysis + 90-day roadmap
  - Target price: $3,000–5,000 CAD for initial engagement
- [ ] First consulting engagement closed

---

## PARKING LOT

| Item | Reason parked |
|------|--------------|
| LinkedIn image pipeline | Images are broken — low priority vs. lead capture. Revisit after email list is live. |
| `score_audience_relevance` field | Not blocking anything |
| Workshop slide deck visual design (full branded slides) | Use Excalidraw for beta; full design post-cohort |
| YouTube channel | Post-cohort |
| Draft fact citation gate (BACKLOG GAP-2 in draft.md) | Low volume — revisit at high post count |
| simonparis.ca full site build | Homepage tweak is in Phase 3.5. Full site (blog, resources, etc.) post-cohort. |

---

## LESSONS LOG (anti-recurrence)

> See `docs/lessons.md` for the full log. Add a one-liner here when something breaks.

| Date | What broke | Prevention |
|------|-----------|-----------|
| 2026-03-17 | Fabricated Airtable writes on context resumption | Session integrity gate (`session_verified` flag) in /harvest |
| 2026-03-17 | Generic harvest queries (no named entities) | Named entity requirement + self-check added to harvest.md |
| 2026-03-19 | Airtable `typecast` in query param silently ignored | Must be in JSON body — documented in lessons.md |
| 2026-03-19 | PAT "all permissions" ≠ having `schema.bases:write` scope | Scopes and access are separate axes — documented in lessons.md |
| 2026-03-20 | Cohort confidence is not a feeling problem | It's a preparation problem — fix is written curriculum + dry run, not more thinking |
