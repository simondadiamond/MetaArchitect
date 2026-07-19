---
name: quote-builder
description: Use when {{OWNER_FIRST}} describes a job/order and wants a quote, or a customer message in triage asks for pricing. Builds a written quote from operations/pricing.md. Do NOT use for invoicing completed work (invoice-draft) or when pricing.md can't price it (flag instead).
---

# Quote Builder

A quote in two minutes, priced from the file, never from memory.

## Process

1. Read `operations/pricing.md` fresh. Every number in the quote traces to a line there
   (or to explicit arithmetic on those lines — show it).
2. Missing details that change the price (size, distance, quantity, deadline): ask the
   2–3 questions in one message, or draft two versions ("if X … / if Y …") when asking
   would slow a hot lead.
3. Build the quote into `finances/quotes/<date>-<customer>.md`:
   - what's included, line by line, with prices
   - what's not included (the line that prevents the argument later)
   - total, deposit if `operations/policies.md` requires one, validity window
   - {{OWNER_FIRST}}'s standard sign-off
4. Also produce the short version: the 3–5 line message that delivers the quote, in the
   customer's language.
5. Log one line in the customer's `notes.md`: date, what was quoted, amount.

## Invariants

- pricing.md can't price it → say exactly what's missing, cite the closest comparable
  line, and stop. A flagged gap is a pricing.md improvement, not a guess.
- Discounts only per the written discount rule; anything beyond is a decision for
  {{OWNER_FIRST}}, presented with the number it would cost.
- The quote file is a draft until {{OWNER_FIRST}} says it was sent; then add `sent <date>`
  at the top.
