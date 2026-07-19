---
name: call-prep
description: Use when the Command Center schedule fires '/call-prep' (hourly), or when Simon asks to "prep the next call". Finds ONE CRM person with status call_booked and no prep brief yet, researches the person/business best-effort, logs a one-page brief to their client_notes timeline, stamps prep_at, and pings Simon. Do NOT trigger for people without a booked call, for re-running prep on an already-prepped person (prep_at set), or for drafting outreach copy (that's the /clients page).
---

# Call Prep — discovery-call brief, one person per fire

**Risk tier: medium (S + T + E)** — reads and writes `public.clients` / `public.client_notes`, may call web search. On any failure:

```
❌ call-prep failed at [stage] — [error message] — client untouched (prep_at not set), safe to retry
```

## Hard rule

**One person per fire.** Hourly schedule; the router pattern bounds each run. Never loop to a second person.

## Protocol

1. **Pick.** Oldest booked person without a brief (unified CRM, migration 0023 — `public.leads` is frozen, never read it):
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "select id, name, company, memory, locale, source_ref from public.clients \
      where status='call_booked' and prep_at is null order by created_at asc limit 1"
   ```
   Also pull their timeline for context:
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "select kind, title, content from public.client_notes \
      where client_id = '<id>' order by occurred_at desc limit 10"
   ```
   Empty pick → print `call-prep: nothing to prep`, stop.

2. **Research, best-effort.** Web-search the name + company + anything in `memory`/notes (their business, public presence). No results is fine — the brief then leans on what the notes already say. Never fabricate: anything you can't source goes in as an open question, not a guess.

3. **Write the brief** — one page, four sections, in the person's `locale`:
   - **Business model** — what they sell, to whom, best guess at team size/tools.
   - **Likely automatable workflows** — 3–5 concrete candidates for a Claude Code workspace, ranked.
   - **Suggested first skill** — the single workspace skill to build in session one, and why.
   - **Questions to ask** — 4–6 discovery questions only they can answer.

4. **Log the brief as a timeline note, then stamp.** Insert a `client_notes` row (kind `note`, title `Call prep brief`), then stamp `prep_at` with an overlap guard:
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "insert into public.client_notes (owner_id, client_id, kind, title, content) \
      values ('<owner_id>', '<id>', 'note', 'Call prep brief', <escaped brief>)"
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "update public.clients set prep_at = now() \
      where id = '<id>' and prep_at is null returning id"
   ```
   Empty return from the update → another fire already prepped it; stop without pinging (the duplicate note is harmless; delete it if convenient).

5. **Ping.** `Prep ready: <name>` to the NTFY_URL from the command-center `.env` (read at point of use). Then stop.

## Test hygiene

Never run against a real client as a test. Create a disposable fixture row (`status='call_booked'`, obviously-fake name), run once, verify the note + `prep_at`, then delete the fixture client row (its notes cascade).
