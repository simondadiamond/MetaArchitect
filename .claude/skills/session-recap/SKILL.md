---
name: session-recap
description: Use when the Command Center schedule fires '/session-recap' (hourly), or when Simon asks to "draft the recap" for a client call or working session. Finds ONE client_notes row of kind call or session with no recap yet (recapped_at null), drafts a client-facing recap in the client's locale, logs it to their timeline ready to copy-send, stamps recapped_at, and pings Simon. Nothing is ever sent to the client automatically — Simon reviews and sends. Do NOT trigger for note/email/transcript kinds, for re-recapping a stamped note, or for social posts from notes (that's convert-dispatch).
---

# Session Recap — call/session note → ready-to-send client recap, one per fire

**Risk tier: medium (S + T + E)** — reads `public.clients` / `public.client_notes`, writes one `client_notes` row, stamps `recapped_at`. On any failure:

```
❌ session-recap failed at [stage] — [error message] — source note untouched (recapped_at not set), safe to retry
```

## Hard rules

- **One note per fire.** Hourly schedule; the router pattern bounds each run. Never loop to a second note.
- **Never contact the client.** The recap lands on the timeline for Simon to review and send. No email, no DM, no exceptions.
- **No fabrication.** Every line of the recap traces to the source note, the client's timeline, or their memory. Anything uncertain becomes a "to confirm" line, not a claim.

## Protocol

1. **Pick.** Oldest unrecapped call/session note, joined to its client:
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "select n.id as note_id, n.kind, n.title, n.content, n.occurred_at, \
             c.id as client_id, c.name, c.company, c.locale, c.memory, c.status \
      from public.client_notes n join public.clients c on c.id = n.client_id \
      where n.kind in ('call','session') and n.recapped_at is null \
      order by n.occurred_at asc limit 1"
   ```
   Empty → print `session-recap: nothing to recap`, stop.

2. **Context.** Pull the client's recent timeline for continuity (prior sessions, open threads):
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "select kind, title, content, occurred_at from public.client_notes \
      where client_id = '<client_id>' and id <> '<note_id>' \
      order by occurred_at desc limit 8"
   ```

3. **Draft the recap** — client-facing, in the client's `locale`, ready to paste into an email or DM. Shape:
   - **Greeting** — first name, one warm line grounded in the actual conversation (never "excited to share").
   - **What we covered / set up** — 2–4 concrete bullets from the source note. Name the real things (the workflow, the skill, the decision), not categories.
   - **What changed** — the before/after in one or two sentences, only if the note supports it.
   - **Next steps** — theirs and Simon's, each with an owner. Pull open items from the note; anything ambiguous goes under "to confirm".
   - **Sign-off** — plain, first-person Simon.

   Voice: brand rules apply (short sentences, concrete, zero em dashes, no hype vocabulary, no AI-tell shapes). A recap for a prospect's discovery call (status new/conversation/call_booked/proposal) stays lighter — recap + next step, no delivery language.

4. **Log the recap, then stamp.** Insert the recap as a timeline note. `converted_at` is pre-stamped ON PURPOSE: recaps are derivative — they must never sit in the "make posts" queue (the source call/session note is what feeds conversions).
   ```bash
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "insert into public.client_notes (owner_id, client_id, kind, title, content, converted_at) \
      values ('<owner_id>', '<client_id>', 'note', 'Recap — <source title or date>', <escaped recap>, now())"
   python3 ~/projects/MetaArchitect/scripts/supabase-sql.py \
     "update public.client_notes set recapped_at = now() \
      where id = '<note_id>' and recapped_at is null returning id"
   ```
   Empty return from the update → another fire already recapped it; stop without pinging (delete the duplicate recap note if convenient).

5. **Ping.** `Recap ready: <name> — review & send from /clients` to the NTFY_URL from the command-center `.env` (read at point of use). If the client's memory shows no testimonial on record and the engagement is going well, append ` · good moment for the testimonial ask` to the ping — the ask itself is Simon's call, never auto-inserted into client copy. Then stop.

## Test hygiene

Never run against a real client as a test. Fixture client (obviously-fake name) + fixture call note, run once, verify recap note + `recapped_at`, then delete the fixture client row (notes cascade). Skip the ntfy ping in tests.
