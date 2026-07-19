---
name: invoice-draft
description: Use when work is done and {{OWNER_FIRST}} says "invoice <customer>" or equivalent. Drafts the invoice from the accepted quote or pricing.md. Do NOT use for quoting future work (quote-builder), and never mark anything as paid on your own.
---

# Invoice Draft

## Process

1. Find the ground truth: the accepted quote in `finances/quotes/` for this job, or, for
   quote-less work, `operations/pricing.md` plus what {{OWNER_FIRST}} just said was done.
2. Draft to `finances/invoices/<date>-<customer>.md`:
   - invoice number ({{INVOICE_NUMBER_SCHEME}} — read the last one and increment)
   - line items matching the quote; any difference from the quote gets its own visible
     line ("added: …"), never silently absorbed
   - taxes per `operations/policies.md` ({{TAX_RULES}}); payment terms and methods from
     the same file
3. Produce the delivery message (short, friendly, customer's language) with the total
   and how to pay.
4. Log in the customer's `notes.md`: invoiced, amount, date. Add a line to
   `finances/money-notes.md` under "awaiting payment".

## Invariants

- Never invent an amount, a tax treatment, or a payment term; every one traces to a file.
- Quote vs invoice mismatch is stated in the summary, not hidden.
- "Paid" is recorded only when {{OWNER_FIRST}} says so; then move the money-notes line to
  "paid" with the date.
