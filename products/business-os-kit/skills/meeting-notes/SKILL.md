---
name: meeting-notes
description: Use when {{OWNER_FIRST}} pastes or points at a transcript, voice-memo text, or rough notes from any conversation (customer call, supplier chat, staff talk) and wants them processed. Extracts decisions, actions, and facts, and files everything. Do NOT summarize for its own sake — every output line must be a decision, an action, or a filed fact.
---

# Meeting Notes

Raw conversation in, three usable things out.

## Process

1. Read the input once for who/what/when; note the counterpart (customer, supplier,
   staff) and match them to an existing folder if one exists.
2. Extract exactly three lists:
   - **Decisions made** — with the reason if stated. Ambiguous "maybes" go to the third
     list as open questions, never promoted to decisions.
   - **Actions** — owner-first phrasing ("{{OWNER_FIRST}}: send deposit ask to Marie by
     Fri"), each with a who and, when stated, a when. Actions this workspace can draft
     (a quote, a follow-up) get drafted in the same run with the matching skill.
   - **Facts and open questions** — durable facts saved per `memory/conventions.md`;
     counterpart-specific story appended to their `notes.md`; open questions listed.
3. File the cleaned notes at the right home (`customers/<name>/` or `operations/`), date
   at top; the raw input in `inbox/` is then flagged done.
4. Report the three lists in chat, then where everything was filed.

## Invariants

- Nothing invented: a name, amount, or date not in the input doesn't appear in the output.
- Professional-practice variant: sensitive personal details follow the variant's
  confidentiality rules; extract the operational parts and flag what to clean.
- Zero-decision, zero-action inputs: say so; a filed fact is still a fine outcome.
