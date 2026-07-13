# Handoff — Post-Fable Operating System: Mechanize the Lessons into Gates

status: in-progress
goal_id: 3df3143e-95b9-4000-81dd-89c18cb827e5
picked_up_by: coo session 2026-07-12
updated: 2026-07-13

> Goal: `3df3143e-95b9-4000-81dd-89c18cb827e5` (child of Fable 5 Final Week initiative `646c7760`)
> Written: 2026-07-12 by COO session. Intended to be handed to a fresh Fable 5 session verbatim.
> Sibling handoff: `2026-07-12-story-pipeline-overhaul.md` (goal `4af99947`) — COMPLETE as of 2026-07-12 (PRs #58/#80). Its worker-internal gates are prior art to verify, not work to redo — see Constraints.

## Mission

Simon loses Claude Fable 5 access around 2026-07-19. After that, this estate runs on mid-tier models. The brand thesis applied to our own stack: **State Beats Intelligence** — a mid-tier model with proper state and gates beats a frontier model running on vibes. Your job is to build that state now, while the frontier model is still here to do it.

Concretely: the estate's accumulated operating knowledge lives mostly as **prose rules** — lessons.md entries, CLAUDE.md paragraphs, memory bullets, skill instructions. Prose rules depend on a model reading, recalling, and choosing to obey them. They also decay: files get edited, rules get softened or reverted, skills go untriggered. A mechanical gate — a hook that blocks the call, an API that rejects the request, a lint that fails the commit, a test that goes red — cannot be forgotten by a weaker model. Convert everything convertible.

This is half specification, half expedition. The seed list below is what the COO session already sees. **You are expected to find upgrades that are not on this list** — that's why this task gets Fable 5.

## Phase 1 — Discovery sweep (do this before building anything)

Inventory every judgment-dependent rule in the estate and classify it:

- **(a) Already mechanized** — a gate exists; verify it actually fires.
- **(b) Mechanizable** — could be a hook, server-side validation, lint, test, template, or schema constraint. These are your build list.
- **(c) Inherently judgment** — can't be a gate; make sure it lives on an always-loaded surface (CLAUDE.md, agent profile frontmatter) rather than an opt-in skill, and consider whether a checklist or template narrows the judgment.

Sources to sweep (at minimum — follow your nose):

- `docs/lessons.md` — every entry, oldest to newest. Each one is a failure that already happened once.
- `~/.claude/projects/-home-diamond-projects-MetaArchitect/memory/` — the feedback_* files are corrections Simon had to make in person; each is a candidate gate.
- `.claude/skills/` + `docs/skill-audit-2026-07-07.md` — trigger reliability, invariants that are stated but not linted (`scripts/skill-lint.sh` is the existing enforcement pattern to extend).
- `scripts/INDEX.md` and `scripts/session-grep.mjs` — there's transcript-mining tooling forming; use it (or extend it) to find **repeated corrections in session history that never made it into lessons.md**. Failure classes nobody wrote down are the highest-value finds.
- Git history of CLAUDE.md and the agent profiles — rules that were added and later drifted or disappeared are direct evidence that prose is a lossy medium; anything that regressed once belongs in a gate, not a paragraph.
- `.claude/settings.json` hooks — what enforcement already exists, what's missing.

Output of Phase 1: a written inventory (commit it under `docs/`) mapping every rule → class (a/b/c) → proposed gate → estimated recurrence risk. Rank the build list by (likelihood a mid-tier model violates it) × (blast radius when it does).

## Phase 2 — Gate check with Simon

Present the ranked build list to Simon for a quick pass before mass-building. He approves tranches, not individual lines. Anything invasive (new permission prompts, API behavior changes, anything that could nag or block legitimate work) gets flagged explicitly — a gate with a high false-positive rate will get disabled, which is worse than no gate.

## Phase 3 — Build, with live proof per gate

Every gate ships red-green: demonstrate it **firing on the exact bad input it guards against**, then demonstrate the happy path still works. A gate that has never been seen to block anything is a prose rule with extra steps.

## Seed ideas (build on these; don't stop at them)

1. **Server-side validation beats prompt rules.** The stories API is the strongest gate surface in the estate — a rule enforced there cannot be skipped by a forgetful model or a reverted doc. Candidates: require/default `agent_target` (UI-shaped stories → `sitemaster` with brand criteria present in the description); reject stories whose description lacks checkable success criteria; reject stories targeting pipeline-internal paths (`worker/`, migrations) which are session-work-only by standing rule. (API changes are command-center code — see Constraints for how this interacts with handoff #1.)
2. **PreToolUse hooks for known-bad Bash patterns**: broad `pkill -f` (memory: killed live command-center once), `git checkout`/`git push` in the primary command-center checkout (worktree rule), `--no-verify`, force-push, writing test artifacts into a watched Next.js tree during verification (lessons.md 2026-07-11). Use the `update-config` skill for hook wiring.
3. **Verify-criteria templates per story type**: touch/gesture stories must include "page must not pan" + "byte-identical screenshots = fail"; renderer-affecting stories must include "assert which path ran". Handoff #1 hardens the worker's evidence rules; this item makes the *templates* that story-queuers copy from, so the criteria are right at authoring time.
4. **Security-posture note template** (lessons.md 2026-07-07): any brain note or doc claiming a security posture must cite the verifying command + date; a lint or save-path template can enforce the shape.
5. **The downgrade red-team.** The most Fable-shaped idea here: take ~5 representative estate tasks (queue a story, run a skill end-to-end, do a session-close, make a roadmap edit), run them with a mid-tier model (Agent tool `model: "haiku"`/`"sonnet"`), and watch where they actually fail. Build gates for the observed failures, not just the predicted ones. Then re-run to show the gates catch them. This doubles as the before/after evidence for the whole project.
6. **Content byproduct**: log what you find and build — the inventory, the funniest failures, the before/after — as raw material for a flagship post ("I spent the frontier model's last week making sure I never need it"). Drop notes in a scratch file; don't write the post (that's the write-post skill's job later).

## Success criteria

- [ ] Phase 1 inventory committed: every lessons.md entry + feedback memory mapped to (a)/(b)/(c) with proposed gate and rank. No entry skipped.
- [ ] At least the top tranche of gates built, each with recorded red-green proof (gate fires on bad input; happy path unaffected).
- [ ] Downgrade red-team run: mid-tier model on representative tasks, failures documented, gates built for observed failure classes, re-run showing improvement.
- [ ] No new gate nags: Simon hasn't had to approve/dismiss a false positive during the live verification of normal flows.
- [ ] `scripts/skill-lint.sh` (or successors) extended where skills carry the invariants; lint passes on the whole skills directory.
- [ ] Anti-recurrence loop closed: gates cross-referenced from their lessons.md entries; goal `3df3143e` proposed for done.
- [ ] Content-seed notes file exists with the material from seed idea 6.

## Constraints & standing rules

- **Turf boundary with handoff #1 — RESOLVED 2026-07-12**: goal `4af99947` is DONE (command-center PR #80: merge-drift handling, verify evidence hardening, per-stage timeouts via migration 0016; pgid teardown + port guard landed earlier as PR #58; worker restarted on the new code). Mark those worker-internal items "already mechanized — verify the gate fires" in your inventory rather than rebuilding them. API-surface validation (seed idea 1) is now unblocked — normal command-center rules apply (worktree, gh CLI, rebase before push).
- MetaArchitect edits (skills, agent profiles, CLAUDE.md, hooks, scripts) are **session work, never stories**. Agent profile changes are **propose-only** — show Simon the diff.
- Command-center code changes: worktree mandatory, primary checkout stays on `main`, `gh` CLI, fetch/rebase before push.
- Don't create schedules on your own initiative; propose them.
- Hooks/settings changes go through the `update-config` skill, and keep Simon's permission-prompt budget in mind — prefer gates that block clearly-bad calls over gates that ask questions.
- Secrets from local `.env` at point-of-use, never committed, never echoed.

## Process

Phase 1 is read-heavy and parallelizable — subagents sweeping different sources concurrently is the obvious shape; use your process skills as you judge appropriate. Phase 3 is many small independent gates — good subagent-per-gate territory with red-green verification each. The one hard rule: **Phase 2 (Simon's tranche approval) sits between discovery and mass-building.** Building the top one or two obviously-safe gates early as proof-of-shape is fine; wiring twenty hooks before he's seen the list is not. If a genuine design fork appears that this document doesn't settle, ask Simon rather than guessing.
