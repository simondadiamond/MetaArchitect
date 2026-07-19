---
name: case-study-capture
description: Use when the Command Center schedule fires '/case-study-capture' (weekly, Monday morning), or when Simon asks to "draft the case study" for a won client. Finds ONE lead with status won and no case study yet, gathers that client's conversions/session notes, drafts an anonymized case study to funnel/setup-offer/case-studies/, stamps case_study_at, and pings Simon. Do NOT trigger for leads that aren't won, for re-drafting an existing case study (case_study_at set), or for LinkedIn posts about the work (that's build-story/convert-dispatch).
---

# Case Study Capture — won client → case study draft, one per fire

**Risk tier: medium (S + T + E)** — reads `public.leads` and `public.conversions`, writes a repo file, stamps `case_study_at`. On any failure:

```
❌ case-study-capture failed at [stage] — [error message] — lead untouched (case_study_at not set), safe to retry
```

## Hard rule

**One lead per fire.** Weekly schedule, router pattern. Never loop to a second lead.

## Protocol

1. **Pick.** Oldest won lead without a case study:
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "select id, name, company, notes, locale from public.leads \
      where status='won' and case_study_at is null order by created_at asc limit 1"
   ```
   Empty → print `case-study-capture: nothing to capture`, stop.

2. **Gather material.** This client's trail: `public.conversions` rows whose title or raw_content mention the name/company, the lead's own `notes` (including any `--- PREP ---` brief), and anything the current repo/session logs verifiably record about the engagement. **Every claim in the draft must trace to this material** — no invented outcomes, no composite details, no fabricated quotes. Too thin to support a case study (< 3 concrete, sourced events/outcomes)? Say so, stamp nothing, stop — it stays in the queue for a later week.

3. **Anonymize by default.** "A [industry] owner in [region]" framing. The client is named ONLY if the lead's notes contain their explicit permission on record; absent that, strip every identifying detail (name, company, product names, distinctive numbers).

4. **Draft** to `funnel/setup-offer/case-studies/<slug>.md` (slug from the anonymized descriptor, e.g. `art-therapy-launch.md`). Structure: situation → what we set up (sessions, skills built, workspace shape) → what changed (only sourced outcomes; hours, cadence, owner quotes if permitted) → offer-fit note (which rung of the /setup ladder this maps to). Brand voice, zero em dashes, no hype vocabulary.

5. **Commit** the file on `main` (docs-only change; gh-backed push per repo convention).

6. **Stamp + ping.**
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "update public.leads set case_study_at = now() \
      where id = '<id>' and case_study_at is null returning id"
   ```
   Empty return → another fire got it; delete nothing, stop. Otherwise ntfy `Case study drafted: <slug> (review before any public use)` via NTFY_URL from the command-center `.env`. The draft is internal until Simon reviews it — nothing here publishes.

## Test hygiene

Never run against a real lead as a test. Fixture lead (`status='won'`, fake name, fake-but-marked notes), run once, verify file + `case_study_at`, then delete the fixture row AND the generated test file (don't commit it).
