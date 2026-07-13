# Handoff — [one-line mission]

status: queued
goal_id: [uuid of the Supabase goals row, or "none"]
picked_up_by: [session/agent + date once someone starts, else "nobody yet"]
updated: [YYYY-MM-DD — bump whenever status changes]

> The four lines above are the REQUIRED header block — `scripts/handoff-lint.sh` fails any
> handoff without a valid `status:` line (queued | in_progress | done | blocked | abandoned —
> the same vocabulary as the goals table; a trailing note like "done (superseded)" is fine).
> Update `status` + `updated` at pickup and at completion; a stale `queued` on finished work
> sends the next session off to redo it.

## Mission

[What must be true when this handoff is done. Written so a fresh session with zero context
can execute it verbatim. Name the goal, the repos, and the definition of done.]

## Context you need

[Verified facts, file paths, prior art, gotchas. Link lessons.md entries by date. State what
is already decided — a handoff is not an invitation to re-litigate.]

## Deliverables

[Numbered, checkable. Each one says where the output lands and how to verify it.]

## Constraints

[Worktree rules, what NOT to touch, token/RAM budgets, deadlines.]
