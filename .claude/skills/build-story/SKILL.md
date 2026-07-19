---
name: build-story
description: Use when Simon says "/build-story", "turn these notes into posts", "post about what I built", or right after a client session, the sister setup, or an infra build produces raw material — converts true build/session notes into 1–3 LinkedIn build-story drafts (Meta Layer pillar) with routed CTAs, saved to pipeline.posts. Do NOT trigger for deriving posts from existing long-form content (repurpose), writing blog posts (write-post), or teardowns (teardown-generate).
---

# Build Story — session notes → build-in-public posts

Turn raw notes from real work (a client working session, the sister setup, a pipeline build, a workflow that broke and got fixed) into 1–3 LinkedIn-ready **build-story** drafts. This is the content flywheel for the setup venture: work produces notes, notes produce stories, stories route owners to `/setup`, sessions produce more notes.

**This skill writes stories, never tutorials.** A story narrates what happened and what it changed ("I put my sister's card-deck business on Claude Code in a weekend; here's what broke first"). A tutorial explains steps ("how to install Claude Code") and is off-brand — refuse the angle, keep the story.

## Inputs

One of: pasted notes, a file path, or "mine this session" (harvest buildable moments from the current conversation). If the material is thin (< 3 concrete events/details), say so and ask for more rather than padding with generalities.

## Process

1. **Verify before writing.** Every event, number, and quote in a candidate must trace to the notes, the repo, or logs. No fabricated anecdotes, no composite clients, no invented dialogue (brand prohibition). A client may only be named or identifiable with Simon's explicit say-so in this run; default is anonymized ("a service business owner", "my sister's art-therapy launch" is pre-approved).
2. **Pick the audience per candidate, then route the CTA:**
   - **Owner-facing** (buyer of the setup offer): outcome-first framing — clarity, hours saved, "the workspace remembers." Soft CTA to `simonparis.ca/setup`.
   - **Practitioner-facing** (Meta Architect audience): mechanism-first framing — what broke, why, the state lesson. CTA per the `/score` cadence rules.
   - Never both CTAs in one post. CTA cadence for `/setup` mirrors the `/score` rule: only if neither of the last 2 LinkedIn rows in `pipeline.posts` carries a `/setup` mention, and phrased as a practitioner sharing ("this is the setup I sell now — the page explains it"), never as a promo.
3. **Draft 1–3 candidates, different angles, different hook patterns.** All gates from `.claude/skills/repurpose/references/linkedin-playbook.md` apply (post anatomy, hook rules, no engagement bait, save-worthy element, AI-tell shapes). Zero em dashes in post copy.
4. **Present candidates and STOP.** Nothing is written before Simon picks (same contract as repurpose). Include, per candidate: audience, CTA (or none), and the source line each key claim traces to.
5. **Save approved candidates** using the repurpose Save mechanics verbatim (`.claude/skills/repurpose/SKILL.md` — pipeline.posts row shape, one-row-at-a-time with captured ids, STATE logging to `pipeline.logs`, non-atomic loop recovery, test-run hygiene). Report ids.
6. **X variant (manual for now):** for each saved post, also output a cross-post variant (≤ 280 chars, or a 2–4 tweet thread for bigger stories) in the final message, labeled "X — manual cross-post". Do not schedule it anywhere; Postiz handles LinkedIn only until an X channel exists.

## Invariants (non-negotiable)

- [ ] True events only; every claim traces to notes/repo/logs — this skill inherits the claim-provenance gate.
- [ ] Stories, never tutorials.
- [ ] Client anonymity by default.
- [ ] Approval before any `pipeline.posts` write; test rows end `rejected`.
- [ ] CTA routing + cadence rules above; one CTA max per post.
- [ ] Voice gates: linkedin-playbook + brand-summary Write-This/Not-This; zero em dashes.

## Close

```
✅ /build-story — <n> draft(s) saved to pipeline.posts (ids: …), <n> X variants emitted (manual)
```
Then remind: schedule via `/linkedin-publish` (postiz.mjs is the only path).
