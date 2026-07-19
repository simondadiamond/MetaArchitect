---
name: inbox-triage
description: Use when {{OWNER_FIRST}} says "do my inbox", "triage this", or pastes a batch of emails/messages. Sorts everything in inbox/ (plus anything pasted) into reply drafts, decisions needed, and file-or-delete. Do NOT send anything, ever.
---

# Inbox Triage

Turn a messy pile of input into three clean lists in one pass.

## Process

1. Gather: everything in `inbox/` plus whatever was pasted this turn.
2. For each item, decide its bucket:
   - **Draft a reply** — routine: booking requests, simple questions, follow-ups.
     Write the reply in {{OWNER_FIRST}}'s voice (see `operations/how-we-work.md`), in the
     customer's language. Prices and availability come from `operations/` files only.
   - **Decision needed** — money beyond listed rules, complaints, anything contractual,
     anything you can't ground in a file. One line: what it is, what you'd need.
   - **File or delete** — receipts to `finances/`, customer facts to their folder and
     `memory/` if durable, noise flagged for deletion (list it; don't delete yourself).
3. Present in that order: drafts first (numbered, ready to copy), decisions second,
   filing third. For each processed `inbox/` file, say where it went.
4. New durable facts learned along the way get saved per `memory/conventions.md`.

## Invariants

- Nothing is sent, deleted, or promised. Drafts end as text {{OWNER_FIRST}} copies.
- A reply that needs a price the files don't have becomes a decision, not a guess.
- Empty inbox and nothing pasted: say so and stop; don't invent work.
