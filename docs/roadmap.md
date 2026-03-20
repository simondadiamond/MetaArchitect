# The Meta Architect — Roadmap

> Single source of truth. Updated at end of every session.
> Format: `- [ ]` not done | `- [x] ~~Item~~ ✓ YYYY-MM-DD` done

---

## CURRENT FOCUS
**Phase 2: Content Production** — Get the pipeline flowing end-to-end to first published posts.

---

## Phase 1: Content Engine — ✅ DONE

- [x] ~~Brand guidelines, ICP, STATE framework documented~~ ✓ 2026-02
- [x] ~~Airtable schema (ideas, posts, hooks, logs, brand, humanity_snippets)~~ ✓ 2026-02
- [x] ~~Content pipeline commands: /capture, /research, /draft, /review, /publish, /score~~ ✓ 2026-03
- [x] ~~/harvest command — autonomous idea generation (STATE-compliant, session integrity gate, specificity requirement)~~ ✓ 2026-03-18
- [x] ~~Pattern Guardian skill + Airtable push script~~ ✓ 2026-03-19
- [x] ~~Harvest-memory.json — cold start done (run #1 on 2026-03-17)~~ ✓

---

## Phase 2: Content Production — 🔄 IN PROGRESS

### 2a. Harvest → Backlog
- [x] ~~Run /harvest to build idea backlog (target: 10+ ideas at Status=New)~~ ✓ 2026-03-19
  - Run #1 (2026-03-17): 5 ideas, generic queries (pre-specificity gate) — archived as CORRUPTED
  - Run #2 (2026-03-19): 5 ideas, named-entity queries — 10 total quality ideas in backlog
- [ ] Review backlog, select 2–3 ideas for first week

### 2b. Pipeline: first 3 posts through to Published
- [ ] Run /editorial-planner on selected ideas
- [ ] Run /research on each selected post stub
- [ ] Run /draft on each research-ready post stub
- [ ] Run /review on each draft
- [ ] Publish first post to LinkedIn
- [ ] Run /score after 7 days

### 2c. Origin Story Post (manual — write first, pin it)
- [ ] Write the origin story post: "I didn't know what I wanted to build. So I asked an AI what question I should be asking."
  - Format: mini case study, personal voice, minimal AI assistance
  - This is the one post that must be written mostly by hand

---

## Phase 3: Audience Building — ⏳ UPCOMING

- [ ] LinkedIn profile updated to match brand positioning
- [ ] Posting cadence established (3x/week minimum to build signal)
- [ ] First workshop delivered (workshop outline exists at `projects/cohort-beta/workshop-outline.md`)
- [ ] Workshop lead magnet created (funnel/lead-magnets/)
- [ ] Landing page live (funnel/landing-page/)

---

## Phase 4: Revenue — ⏳ UPCOMING

- [ ] Cohort Beta — define offer, price, intake process
- [ ] First cohort waitlist open
- [ ] First consulting engagement via LinkedIn DM or inbound

---

## PARKING LOT

| Item | Reason parked |
|------|--------------|
| `score_audience_relevance` field decision (write or remove from scorer) | Low priority — not blocking anything |
| Workshop slide deck visual design | Need 3+ posts published first to validate positioning |
| YouTube channel | Post-cohort |

---

## LESSONS LOG (anti-recurrence)

> See `docs/lessons.md` for the full log. Add a one-liner here when something breaks.

| Date | What broke | Prevention |
|------|-----------|-----------|
| 2026-03-17 | Fabricated Airtable writes on context resumption | Session integrity gate (`session_verified` flag) in /harvest |
| 2026-03-17 | Generic harvest queries (no named entities) | Named entity requirement + self-check added to harvest.md |
| 2026-03-19 | Airtable `typecast` in query param silently ignored | Must be in JSON body — documented in lessons.md |
| 2026-03-19 | PAT "all permissions" ≠ having `schema.bases:write` scope | Scopes and access are separate axes — documented in lessons.md |
