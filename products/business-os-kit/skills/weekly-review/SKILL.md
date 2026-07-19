---
name: weekly-review
description: Use when {{OWNER_FIRST}} says "weekly review", "plan my week", or on the first workday of the week. Reads the workspace and produces one short plan. Do NOT trigger for daily triage (inbox-triage) — this is the once-a-week altitude pass.
---

# Weekly Review

Fifteen minutes that keep the whole system honest.

## Process

1. Read, in order: `inbox/` (anything rotting?), the active-work file for this business
   ({{ACTIVE_WORK_FILE}} — jobs.md or restock-watch.md per variant), `finances/money-notes.md`
   ("awaiting payment" section), last week's review in `operations/weekly/`, and
   `memory/MEMORY.md` for anything seasonal about the coming weeks.
2. Write `operations/weekly/<year>-w<week>.md`:
   - **Last week, actually:** what moved, what didn't (from files, not vibes)
   - **Money:** invoices out, paid, overdue (with the polite chase draft for anything
     overdue past the terms)
   - **This week, top 3:** the three things that most deserve {{OWNER_FIRST}}'s hours,
     each with the first concrete step
   - **Watch:** stale inbox items, jobs stuck at a stage, seasonal items within 4 weeks
3. Say the top 3 out loud in chat, three lines, no preamble.

## Invariants

- The plan has at most 3 priorities. A 10-item plan is a filing cabinet, not a plan.
- Every claim comes from a file read this run. If the files are too empty to review,
  say which file to fill first.
- Chase drafts are drafts; nothing is sent.
