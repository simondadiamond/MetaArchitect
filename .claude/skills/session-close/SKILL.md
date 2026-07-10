---
name: session-close
description: Use when Simon says "end session", "wrap up", "/end", "we're done", or equivalent — the session-close ritual. Also use at the natural end of any session that produced real output, even unprompted (propose it). Do NOT trigger mid-session for a single task completing.
---

# /session-close — the close-out ritual

## Purpose

CLAUDE.md mandates a 3-part session close (goals update, `/pattern`, done/next confirmation) — but the `/end` trigger used to route to pattern-guardian alone, which is one-third of the contract. This skill IS the contract. It orchestrates; it does minimal work itself.

## The ritual, in order

### 1. Goals reconciliation

Query the Supabase `goals` table for rows touched by this session's work (command-center project; REST via `projects/command-center/.env` service key — access patterns and schema gotchas in memory `goals-table-access` / root CLAUDE.md).

- Work finished this session that maps to a goal → **propose** checking it off. Status changes Simon didn't explicitly ask for are permission-blocked by design — present them as a list ("mark X done? started Y?") and apply only what he confirms.
- No `notes` column exists — session one-liners get **appended to `description`**.
- New scope that surfaced mid-session and wasn't captured → propose a new goal row (or a story, per root CLAUDE.md routing rules).

### 2. Anti-recurrence check

If anything broke or a mistake happened this session, verify ALL THREE steps landed (this is the loop that makes the system smarter — never skip, never do just one):

1. `docs/lessons.md` entry exists (one per failure class)
2. The root cause is fixed in the relevant SOP/skill/tool file — not just noted
3. The one-liner is appended to the corresponding goals row (step 1 above)

Nothing broke → say so explicitly ("no lessons this session") rather than silently skipping.

### 3. Pattern log

Invoke the `pattern-guardian` skill (its full gate applies — a session with no generalizable pattern writes a skipped record, which is a valid outcome, not a failure).

### 4. Brain promotion (human-gated)

Scan the session for durable facts that belong in the second brain (`~/projects/brain` — see memory `project-second-brain`): decisions made, numbers/dates/paths established, client/people facts, infra changes. **No fixed cap — the quality bar is the gate** (one fact each, concrete, would someone ask for this directly?). Most sessions yield 0-3; a dense session may legitimately yield more. Propose them as ready-to-run `brain save "<fact>" --domain <d> --tags <t>` lines and apply only what Simon confirms — never auto-save. Skip-worthy sessions say "nothing brain-worthy" explicitly. (Boundary: how-Claude-works facts → auto-memory; things the repo/git already records don't qualify.)

**Contradiction pre-check (mandatory, deterministic, free):** before proposing each candidate, run `brain find "<candidate's key terms>"`. Confident hit on an existing note →
- same fact → drop the candidate (already known);
- newer/changed fact → propose an **update to that note** (edit + `brain doctor --fix` + commit), not a duplicate;
- session did something that **contradicts** an existing note (config changed, decision reversed, number moved) → propose the correction even if nobody asked — a confidently wrong note is worse than a missing one (n8n lesson, 2026-07-10). Corrections to security/posture notes must cite the verifying command + date.

### 5. Hygiene sweep (30 seconds, mechanical)

- Test rows: did this session write any pipeline rows as tests/smoke checks? They must be `rejected`/deleted now (Data Rule 6, lessons 2026-07-06).
- Scratch litter: anything this session left in the repo working tree that shouldn't be committed (`git status --short` — untracked files in the primary checkout bite later, lesson 2026-07-06).
- Orphan processes: if the session started servers/watchers, kill them **by port-owner pid, never broad `pkill -f`**, then `systemctl --user is-active command-center story-worker`.

### 6. Confirm out

Close with exactly this shape:

```
✅ Session closed
Done: <what shipped this session, one line each>
Goals: <what was checked off / proposed / appended>
Lessons: <entry title(s), or "none">
Pattern: <logged: <title> | skipped: <reason>>
Brain: <n note(s) saved | nothing brain-worthy>
**Next Action → [the single next task]** — [command/step, ~time]
```

## Rules

- Steps 1–5 run in order but a failure in one never aborts the rest — note it in the close-out and keep going. The ritual completing imperfectly beats the ritual not completing.
- This skill never does new project work. If Simon's "wrap up" message also contains a task, do the task first, then run this.
