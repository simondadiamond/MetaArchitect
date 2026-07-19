---
name: call-prep
description: Use when the Command Center schedule fires '/call-prep' (hourly), or when Simon asks to "prep the next call". Finds ONE lead with status call_booked and no prep brief yet, researches the person/business best-effort, appends a one-page brief to the lead's notes, stamps prep_at, and pings Simon. Do NOT trigger for leads without a booked call, for re-running prep on an already-prepped lead (prep_at set), or for drafting outreach copy (that's the /outreach board).
---

# Call Prep — discovery-call brief, one lead per fire

**Risk tier: medium (S + T + E)** — reads and writes `public.leads`, may call web search. On any failure:

```
❌ call-prep failed at [stage] — [error message] — lead untouched (prep_at not set), safe to retry
```

## Hard rule

**One lead per fire.** Hourly schedule; the router pattern bounds each run. Never loop to a second lead.

## Protocol

1. **Pick.** Oldest booked lead without a brief:
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "select id, name, company, notes, locale, source_ref from public.leads \
      where status='call_booked' and prep_at is null order by created_at asc limit 1"
   ```
   Empty → print `call-prep: nothing to prep`, stop.

2. **Research, best-effort.** Web-search the name + company + anything in `notes` (their business, public presence). No results is fine — the brief then leans on what the notes already say. Never fabricate: anything you can't source goes in as an open question, not a guess.

3. **Write the brief** — one page, four sections, in the lead's `locale`:
   - **Business model** — what they sell, to whom, best guess at team size/tools.
   - **Likely automatable workflows** — 3–5 concrete candidates for a Claude Code workspace, ranked.
   - **Suggested first skill** — the single workspace skill to build in session one, and why.
   - **Questions to ask** — 4–6 discovery questions only they can answer.

4. **Append, never overwrite.** New notes = existing notes + `\n\n--- PREP ---\n` + brief. Update via SQL (the `/api/leads` PATCH has no `prep_at` field):
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "update public.leads set notes = <escaped full new notes>, prep_at = now() \
      where id = '<id>' and prep_at is null returning id"
   ```
   The `prep_at is null` guard makes overlapping fires safe. Empty return → another fire already prepped it; stop without pinging.

5. **Ping.** `Prep ready: <name>` to the NTFY_URL from the command-center `.env` (read at point of use). Then stop.

## Test hygiene

Never run against a real lead as a test. Create a disposable fixture lead (`status='call_booked'`, obviously-fake name), run once, verify notes + `prep_at`, then delete the fixture row.
