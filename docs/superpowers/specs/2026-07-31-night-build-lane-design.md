# Night-Build Lane — Design

Date: 2026-07-31 · Approved by Simon in-session (amendments applied: no hard question cap, 1:00am run time, degrees-of-freedom wording researched)

## Outcome sentence

Scoped, agent-buildable goals get built overnight without costing Simon anything but a short scoping chat.

## Problem

The backlog holds many artifacts Claude can build solo (documents, lead magnets, small systems), but nothing pulls one off the shelf and ships it without a full session of Simon's attention. Value ranking also under-weights Simon's time: a medium-impact artifact at zero Simon-minutes can beat a bigger task that eats his afternoon.

## Design

### 1. Value principle (CLAUDE.md, COO behavior #9)

Effort is scored in **Simon-minutes**, not total minutes — agent-hours are ~free. The COO proactively flags agent-buildable goals and ideas (`agent_eligible=true` on the goals row).

### 2. Data model — existing columns only

A goal is **night-ready** when:
- `agent_eligible = true`
- `acceptance_criteria` is filled; its **first line is the outcome sentence** (gate from behavior #8)
- `status = pending`

No migration. `rice_score` orders the queue.

### 3. Scoping ritual (live chat, ~5 min)

Simon says "scope a build" (or the COO proposes one). COO surfaces top agent-buildable candidates by RICE; Simon picks; COO asks as many questions as the task legitimately needs — usually 2–3, outcome sentence always first — then writes `acceptance_criteria`, `agent_eligible`, and RICE (effort = Simon-minutes) to the goal row.

### 4. Night-build heartbeat

Command Center schedule fires `/night-build` daily at **1:00am** (5-hour quota window closes 6:00am, clear of Simon's morning). The run:
- Picks **ONE** night-ready goal, highest `rice_score`.
- Code in command-center / simonparis-website → queue as a story (existing unattended pipeline). Everything else → build directly in the overnight session (worktree rules apply).
- Nothing night-ready → exit silently.

### 5. Control guarantees (ruthless invariants)

- One goal per night.
- Nothing customer-facing ships overnight: PRs stay open, posts land as `pipeline.posts` drafts, documents land as files. Morning is review, not damage control.
- Goal status is never flipped by the night run — a result line is appended to `description`, ntfy tells Simon what to review, Simon flips status.
- A goal without a filled outcome sentence is skipped, never interpreted.
- Failures: append failure line to the goal, ntfy, stop. No retries into the night.
- Kill switch: unflag `agent_eligible` and the goal never runs.

### 6. Degrees-of-freedom principle (CLAUDE.md behavior #10)

Skills, goal scopes, and agent instructions state desired outcomes, acceptance criteria, and the why behind constraints by default; prescriptive step-by-step only where the operation is fragile, order-dependent, destructive, or must be exact (API payloads, migrations, publish flows). Source: Anthropic skill-authoring guidance ("set appropriate degrees of freedom" — match specificity to fragility) + Claude 4.x prompting guidance (explicit about outcomes ≠ procedural).

## Components

- `CLAUDE.md` — behaviors #9 and #10 (this repo).
- `.claude/skills/night-build/SKILL.md` — the heartbeat skill (selection, routing, invariants).
- Command Center schedule row — `/night-build`, daily 1:00am (queue-story skill payload rules).

## Testing

First runs are supervised-by-morning-review by design: every output lands gated and ntfy-announced. A dry week with 1–2 scoped goals validates selection, routing, and the no-ship rule before the queue is loaded up.
