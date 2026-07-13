# Handoff — Story-Pipeline Reliability Overhaul

status: done
goal_id: 4af99947-ec57-4bc4-9c50-166c4660bc3f
picked_up_by: overhaul session 2026-07-12 (PRs #58/#80, complete per sibling handoff)
updated: 2026-07-13

> Goal: `4af99947-ec57-4bc4-9c50-166c4660bc3f` (child of Fable 5 Final Week initiative `646c7760`)
> Written: 2026-07-12 by COO session. Intended to be handed to a fresh session verbatim.

## Mission

Fix the three owed root-cause debts in the Command Center story-worker (`~/projects/MetaArchitect/projects/command-center/worker/`). All three are documented failures in `~/projects/MetaArchitect/docs/lessons.md` — read those entries first, they contain the exact failure evidence and the agreed fix direction:

- **2026-07-11 "Story verify stage leaks dev-server process groups"** — orphaned next-servers from deleted story worktrees squatted verify port 4123 for weeks and failed every later story.
- **2026-07-12 "PR went DIRTY after verify passed"** — worker branches from main at story start and never rebases; main moving mid-flight strands the PR silently in `pr_open`.
- **2026-07-11 "Terminal panes shipped completely illegible" + 2026-07-12 "Story verify passed mobile touch-scroll that never worked"** — verify produces false passes: fallback code paths silently exercised, byte-identical before/after screenshots accepted as proof of movement.
- Related: **2026-07-12 "Verify stage timed out at the finish line"** — single global `pipeline_settings.stage_timeout_minutes` is wrong-shaped; verify needs more than build.

## Deliverables (three workstreams)

### 1. Process-lifecycle teardown for verify
- Spawn verify dev-servers detached in their own process group (`detached: true` / setpgid); story teardown kills the **process group** (`kill(-pgid)`), not just the child pid.
- Before starting a verify server, assert the port is free. If a squatter holds it: kill it **only if** its cwd is under `.story-worktrees/`; otherwise fail the stage loudly, naming the pid and its cwd. Never broad `pkill` (standing rule).

### 2. Merge-drift handling after verify
- After verify passes, and before parking on a DIRTY PR: attempt `git merge origin/main` in the story worktree.
  - Clean merge → re-run the story's test gate, push, let auto-merge proceed.
  - Conflict → park as `needs_review` with the conflicting file paths named in the stored error.

### 3. Verify evidence hardening
- Byte-identical before/after screenshots are **rejected** as evidence of change/movement — treated as "nothing happened".
- Verify criteria that depend on a specific code path (e.g. a renderer/addon being active) must assert **which path ran** and fail loudly if a fallback was taken.
- Replace the single global stage timeout with a per-stage timeout column (verify > build); migration to `pipeline_settings` (or successor table) + worker reads it.

## Success criteria (all checkable — the work is not done until every box is verifiable)

- [ ] Unit tests in `worker/__tests__/` covering: pgid teardown invoked on story completion AND on stage failure; port-squatter decision logic (ours → kill, foreign → loud fail); DIRTY-merge both branches (clean → push, conflict → park with filenames); identical-screenshot rejection; per-stage timeout resolution.
- [ ] Live proof, not just tests: run one real story end-to-end through the pipeline; afterwards `ss -tlnp` shows the verify port free and no orphaned next-server whose cwd is a deleted worktree.
- [ ] Live proof of drift handling: stage a story branch behind a main commit touching the same file; observe clean-merge path (or conflict-park path) behave as specified.
- [ ] Migration applied via the worker's own migration path (note lessons.md 2026-07-12: the SQL splitter was just fixed in PR #77 — semicolons in comments are now safe).
- [ ] `story-worker` systemd service restarted on the merged code and processes one real story green.
- [ ] Anti-recurrence loop closed: the three lessons.md entries get a one-line "root cause fixed, PR #N" note; goal `4af99947` flipped done (propose to Simon first if anything shipped differs from this spec).

## Constraints & standing rules (non-negotiable)

- **Pipeline-touching = session work.** Do NOT queue any of this as stories — the pipeline can't safely rebuild itself.
- **Worktree mandatory**: all code changes in a `git worktree`; the primary checkout at `projects/command-center` stays on `main` untouched (the live :3737 service serves it via the `~/command-center` symlink).
- **This is live infrastructure.** The story-worker may be mid-story when you touch the service. Check `stories` for in-flight work before restarting; restart via `systemctl --user`.
- `gh` CLI for all git ops; never `--no-verify`; never force-push; fetch/rebase before pushing (story-worker merges to origin/main from its own worktrees).
- Fresh-session spawn hygiene: any code that spawns `claude` must strip `CLAUDECODE` / `CLAUDE_CODE_*` env vars (lessons.md 2026-07-11) — relevant if you touch spawn code near the worker.
- Full pipeline docs: `projects/command-center/README.md` ("Story worker") and that repo's `docs/superpowers/plans/golden-path.md`.

## Process

Use your process skills as you judge appropriate — expected shape is brainstorm (short; the what is already specified above, so focus on design decisions like where pgid tracking state lives and the per-stage timeout schema) → writing-plans → subagent-driven development with code review before merge. Scope is roughly: `worker/` process spawn/teardown, PR/merge logic, verify evidence rules, one migration, tests. If a genuine design fork appears that this document doesn't settle, ask Simon rather than guessing.
