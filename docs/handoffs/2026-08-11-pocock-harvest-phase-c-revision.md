# Handoff: harvest Pocock skills, revise Phase C, emit the Phase C dispatch

Date: 2026-08-11. From: sitemaster session (context-full). For: a fresh agent
working in MetaArchitect (skills) + a command-center worktree (phase doc).

## Context — what this is all part of

Command Center has a new **Agents section** (`/agents`, live on
http://100.105.85.5:3737): autonomous domain masters (CMO live, CRO in Phase
C) that run a daily ops loop and a Sunday review in **advisor mode** — full
authority over research/drafts/journaling, but every side-effect (content,
outreach, stories, tools, goals, playbook edits) is a typed proposal Simon
approves in a queue. KPIs are script-fed (never self-reported), memory is a
journal + output ledger in Supabase `agent_*` tables, morning cards derive
from logs. Design authority (read in this order):

1. `projects/command-center/docs/agents-prd-draft.md` (PRD v0.6 — locked)
2. `projects/command-center/docs/phases/README.md` (phase map + standing rules)
3. Brain: `brain find "agent-org"` (hub note + design decisions)

State today: Phases A+B are DEPLOYED. The CMO ran its first real ops run
(honest zeros, $0.17), its first goal is seeded ("Build the subscriber
acquisition system for the ICP", goals row `e0e0aa11`, judge Aug 25), and
`cmo-ops` fires daily 07:00. Phase C is gated on 7 consecutive clean runs.
Simon may later make `/agents` the app's home page — noted, NOT part of this
handoff.

## Why this handoff exists

Simon wants goals decomposed properly: **goal → spec → typed pieces**, where
each piece is a puzzle-bit of the week's goal and mornings advance a
frontier. Research (2026-08-11, session notes) evaluated
`github.com/mattpocock/skills` (MIT, active) and verdict was **adapt, don't
install**: harvest two skills, heavily modified, and skip the plugin (it
brings its own tracker/process and auto-updating opinions; the repo renamed
its core skills twice in six months).

## Task 1 — vendor + modify `to-tickets` and `grilling`

Clone `https://github.com/mattpocock/skills` (shallow), copy ONLY
`to-tickets` and `grilling` into `~/projects/MetaArchitect/.claude/skills/`,
following the vendoring pattern in
`projects/command-center/.claude/worktrees/*/CLAUDE.md` → "Sources /
reinstall" (record source repo + commit sha in each SKILL.md header).
Then MODIFY them — understand each change, they are the point:

1. **Acceptance criteria override (both skills).** Upstream never requires
   machine-verifiable criteria and `to-spec` forbids file paths. Our verify
   stage and brand rules REQUIRE literal discriminators — routes, hex values
   (`#E04500` actions, `#C97A1A` links), selectors, states ("nav links
   render #C97A1A on /blog"). Rewrite the ticket template: every acceptance
   checkbox must be checkable by driving the running app or reading test
   output; file paths and literal values are encouraged, not banned.
2. **Publish step → Command Center, no second tracker.** Delete the
   `.scratch/` files / GitHub / Linear publishing modes and the
   `setup-matt-pocock-skills` dependency. Publishing means: spec body lands
   on a feature-kind `goals` row (POST /api/goals; outcome sentence is line
   one of acceptance_criteria); slices become task-kind child goals
   (`parent_id`, `agent_target`); code-shaped slices additionally queue as
   stories via the `queue-story` skill's payloads with `goal_id` set. One
   source of truth: the goals table.
3. **Typed routing step (new, after slice drafting).** Every slice gets a
   type: `story` (code in a registered repo — command-center or
   simonparis-website — with checkable criteria; deterministic agent_target
   per queue-story rules), `work` (research/content/drafts — the owning
   master executes it in its own runs), or `simon` (a decision only Simon
   can make — becomes a typed proposal). Upstream assumes every ticket is
   code; our goals mostly aren't.
4. **Linear chains only (for now).** Upstream's blocking-edge frontier has
   no executor here: the story worker is strict FIFO per repo with no edge
   awareness, so a failed blocker's dependents would still get built. Rule:
   order slices as a linear chain and queue a dependent only after its
   blocker merges. Note in the skill that this relaxes when `stories` gains
   `blocked_by` (a worker change = in-session work, not now).
5. **`grilling`: outcome-sentence gate is question one.** Keep the frontier
   interview mechanic and recommended-answers style; hard-code that the
   first question of any goal/spec grilling is Simon's gate #8: "In one
   sentence with no technology in it, what should happen without you?" —
   refuse to proceed to solutioning without it.
6. Each SKILL.md gets a short "Modified from upstream" section listing these
   deltas + why, so future sessions don't "fix" them back.

Commit to MetaArchitect main and push (gh helper; fetch+rebase first).
Skills are session-editable files — no PR needed — but agent profiles
(`.claude/agents/*.md`) remain propose-only; don't touch them.

## Task 2 — revise Phase C (command-center repo, worktree + PR)

Work in a NEW worktree of command-center (never the primary checkout). Edit
`docs/phases/phase-c.md`:

- **Generalize C2**: the play-authoring interview becomes the
  **goal-briefing flow** powered by the harvested skills — "+ New play" AND
  a new "Brief a goal" action both open a grilling chat; a goal briefing
  ends in a spec on the goal row + typed slices (task children / stories /
  proposals) per the modified to-tickets. Shadow-run rule for new plays
  stays. Simon runs goal briefings; masters may only *propose* re-slicing at
  weekly review.
- **Close the composer gap**: add to C's scope that the run-harness context
  composer must load task-kind child goals for the agent (today only
  non-task goals are loaded; the workaround is step-lists in goal
  descriptions — remove the workaround note from the seeded goal when done).
- Keep unchanged: stability gate (7 clean CMO runs, check `agent_run_log`),
  C1 chat threads, C3 brief absorption, C4 CRO, C5 cross-master, C6
  propose-goals-now, PR groupings, standing rules reference.
- Sanity-check any file/line references against current main (several PRs
  landed today: #176–#182).

Open a PR titled clearly; do NOT merge — Simon merges phase-doc changes.

## Task 3 — emit the Phase C dispatch for Simon

End your session by giving Simon a copy-paste handoff message for the Phase
C executor (Codex), updated to match your revised phase-c.md — modeled on
the one at the bottom of the current phase-c.md (gate check first, PR
groupings, acceptance demonstrated in PR bodies). Remind him it fires only
after the 7-run gate.

## Standing rules (non-negotiable, from CLAUDE.md + phases/README.md)

gh CLI for all git; worktrees for command-center code; never restart the
live :3737 service; brand tokens only; secrets from env at point of use,
never in chat/commands; agent profiles propose-only; commit completed work
proactively; STATE rules for anything calling APIs; if a hook blocks you,
surface it — never work around it.
