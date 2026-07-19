---
name: follow-up-writer
description: Use after a job/order/appointment completes ("write the follow-up for <customer>"), or when a quote has sat unanswered ("nudge <customer>"). Drafts the message in {{OWNER_FIRST}}'s voice. Do NOT send, and do NOT nudge the same customer twice without {{OWNER_FIRST}} confirming the first nudge went out.
---

# Follow-Up Writer

The money most small businesses leave on the table is one friendly message they never
sent. This skill writes it so it actually goes out.

## Process

1. Read the customer's `customers/<name>/notes.md` and any memory files about them.
   The draft must show we remember them: reference the actual job, order, or detail.
2. Pick the mode:
   - **After completed work:** thanks + one specific line about their job + the review
     ask ({{REVIEW_LINK_OR_METHOD}}) + the referral line, phrased the way
     `operations/how-we-work.md` says {{OWNER_FIRST}} talks. Short. One ask maximum
     per message; if the review matters more, drop the referral line.
   - **Quote nudge:** friendly check-in on the open quote (amount + validity from the
     quote file), one obstacle-remover ("happy to adjust X"), no pressure phrasing.
   - **Long-quiet customer** (from a weekly-review "watch" line): a no-ask hello tied to
     something real (season, their last purchase).
3. Customer's language, always. Two lengths: the 3-line text version and the short email
   version; {{OWNER_FIRST}} picks.
4. Log one line in their `notes.md`: follow-up drafted, mode, date.

## Invariants

- Every draft contains at least one detail that could only be about THIS customer. A
  follow-up that could go to anyone goes to no one; rewrite it.
- No invented urgency, no fake discounts, nothing `operations/policies.md` doesn't back.
- When {{OWNER_FIRST}} says it was sent, update the notes line with `sent <date>`.
