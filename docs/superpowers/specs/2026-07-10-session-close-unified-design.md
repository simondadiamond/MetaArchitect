# Unified Session Close — one harvest engine, two entry points

**Date:** 2026-07-10
**Status:** approved design, pending implementation
**Replaces:** `session-close` + `pattern-guardian` skills (merged); reconciler transcript-harvest section (moved)

## Problem

Session close today is split across two skills (`session-close` orchestrates, `pattern-guardian` does a heavyweight 5-phase content ritual) plus an ad-hoc habit (handoff docs) plus a separate brain-only transcript sweep (weekly reconciler, RECONCILER.md §3). Audit findings:

- `pipeline.sessions` is **write-only** — no skill or tool ever reads pattern logs. The only pattern-guardian output with a real consumer is `pipeline.humanity_snippets` (read by the research skill).
- Whole classes of reusable value evaporate at close: one-off scripts, next-session context, friction that didn't break anything, content moments in sessions that fail the viability gate.
- The close only happens if Simon remembers to say `/end`. Sessions that just stop get a brain-only harvest 3+ days later — every other lane is lost.
- Two near-identical transcript-digestion mechanisms were about to exist side by side (reconciler harvest + this design). Simon explicitly wants one.

## Goal

Every session — closed explicitly or abandoned — deposits its reusable value into stores that have named readers. The close is a property of the system, not a habit. One harvest engine, two entry points, one approval surface.

## The 10 harvest lanes (canonical taxonomy)

The taxonomy lives in ONE file — `.claude/skills/session-close/references/harvest-lanes.md` — referenced by both the skill and the sweep SOP. Every lane names its store AND its reader; a lane without a reader does not exist.

| # | Lane | Store | Reader | Notes |
|---|------|-------|--------|-------|
| 1 | Goals | Supabase `goals` | roadmap / COO sessions | propose check-offs, description appends, new rows |
| 2 | Lessons (broke) | `docs/lessons.md` + root-cause fix in the SOP/skill | future agents | anti-recurrence loop unchanged: entry + fix + goal one-liner, all three |
| 3 | Friction (slow, didn't break) | skill/SOP edit now, or queued CC story | future agents | NEW — repeated manual steps, missing permissions, skill gaps |
| 4 | Scripts | promote `.tmp`/scratch scripts → `scripts/` + one line in `scripts/INDEX.md` | any future session (rule: grep INDEX.md before writing a new tool) | NEW |
| 5 | Handoff | `docs/handoffs/YYYY-MM-DD-<topic>.md` | the next session on that work | NEW as a ritual step (already done ad-hoc) |
| 6 | Brain facts | `~/projects/brain` via `brain save` / note edit | `brain find` | human-gated; mandatory `brain find` contradiction pre-check per candidate (same/updated/contradicts logic survives verbatim from current skill) |
| 7 | Auto-memory | Claude memory dir | future Claude sessions | boundary: how-Claude-should-operate facts only |
| 8 | Humanity snippets | `pipeline.humanity_snippets` | research skill (ranks by topic overlap) | quality bar survives verbatim: never fabricate, craft-don't-transcribe, first person, publishable as-is |
| 9 | Content seeds | `pipeline.sessions` (slimmed row) | **weekly-review** (new reader — see Collateral) | fields: `core_insight`, `icp_pain`, `one_line_lesson`, `tags`, `pattern_confidence`, `status`, `full_log` (short); the 6-section artifact, time-wasted metric, and STATE-mapping ceremony are dropped |
| 10 | Hygiene | — (actions, not artifacts) | — | test rows rejected/deleted, scratch litter, orphan processes by port-pid; unchanged |

Content seed viability: pattern-guardian's three tests (2am engineer / authority / generalizability) collapse into the proposal bar — a seed that fails them isn't proposed; a session with no seed writes a one-line `status: skipped` row (cheap, gives weekly-review the denominator).

## Architecture: one engine, two entry points

```
                    ┌──────────────────────────────┐
 interactive /end ──► session-close skill           │
                    │  UUID→transcript→digest       │──► in-chat approval board ──► execute now
                    │  harvest subagent (10 lanes)  │        │ deferred items
                    │  deterministic pre-checks     │        ▼
                    └──────────────┬───────────────┘   proposals.json ◄── CC /brain Approvals tab
                                   │ marks processed.json          ▲            (phone approve)
                    ┌──────────────┴───────────────┐               │
 daily sweep ───────► same digest + same lanes      │──► proposals.json (lane-typed)
 (24h grace)        │  over unprocessed transcripts │
                    └──────────────────────────────┘
```

### Entry point 1 — interactive close (`/end`, "wrap up")

One skill: `session-close`. `pattern-guardian` is **deleted**; `/pattern` and `/log` become a mode of session-close that runs only lanes 8–9.

Flow:
1. **Locate transcript** — echo a random UUID in chat, then grep `~/.claude/projects/<project-dir>/*.jsonl` for it (newest match wins). Deterministic even after compaction.
2. **Digest** — `node scripts/session-digest.mjs <transcript>` → user messages, assistant text, every Bash command, every file written/edited; tool results stripped; size-capped. Output to the session scratchpad.
3. **Harvest subagent** — one subagent gets digest + `harvest-lanes.md`, returns structured candidates per lane (JSON). The main agent merges with live context (things it knows that the transcript shows poorly) — the transcript sees what compaction forgot; the main agent sees current state.
4. **Deterministic pre-checks (main agent)** — `brain find` per brain candidate; goals query; `git status --short`; orphan-process check.
5. **One approval board** — a single message: lanes as sections, items numbered, each showing the exact action (`brain save "..."`, `git mv .tmp/x.mjs scripts/`, goal check-off, story POST body). Empty lanes say "nothing" explicitly. Simon replies once ("all", "all except 4", edits).
6. **Execute** — confirmed items run; a lane failure never aborts the rest. Content lane pushes via the slimmed push script (validation gate stays — STATE E). Items Simon defers ("later") are appended to `proposals.json` for phone approval instead of being dropped.
7. **Mark closed** — append this transcript's path + last-line timestamp to `~/projects/brain/.reconciler/processed.json` so the sweep never double-harvests it.
8. **Receipt** — close-out block (Done / per-lane one-liners / Next Action). Same rules as today: never does new project work; failure in one step noted, ritual continues.

Fallback: transcript not found or digest fails → harvest from in-context memory alone, flag it on the board, still mark nothing in processed.json (the sweep gets a second try).

### Entry point 2 — daily sweep (the deterministic close)

- New schedule via CC: **"Session sweep (daily)"**, `kind: prompt`, working dir MetaArchitect. Grace period **24h** (a transcript whose last-line timestamp is older than 24h and absent from `processed.json` is an abandoned session).
- RECONCILER.md **§3 (transcript harvest) moves here** — the weekly reconciler keeps only structural health (`brain doctor`) and note-vs-note reconciliation. One transcript mechanism total; brain becomes lane 6 of the sweep rather than its own harvester.
- The sweep uses the SAME `session-digest.mjs` (replacing the inline jq recipe) and the SAME `harvest-lanes.md`. Token budget rules carry over: text turns only, hard per-transcript cap, oldest-10-first when backlogged.
- Sweep output is never auto-executed: every candidate becomes a lane-typed proposal in `proposals.json`. ntfy ping when proposals were added (same rule as reconciler §4: no ping on empty runs).
- Processed marking unchanged: path + last-line timestamp, even when a transcript yields nothing.

### The approval surface (generalizes, does not get replaced)

The Brain Approvals tab (handoff `docs/handoffs/2026-07-10-brain-approvals-ui.md`) is built **as specced, unchanged** — it becomes the foundation.

`proposals.json` schema extension (backward compatible):
- Every proposal gains an optional `lane` field (`brain | goal | lesson | script | friction | handoff | memory | snippet | content`). Absent lane = `brain` (legacy). Hygiene (lane 10) never emits proposals — it is actions, not artifacts; a friction proposal may carry a ready-to-POST story body in `detail`.
- **Security boundary unchanged:** only `kind: "save"` (brain argv, allowlist-validated) auto-executes from the phone. All non-brain lanes use the existing `kind: "edit"` semantics — approving marks `approved_pending_apply: true`; the next interactive session (or a scheduled "apply proposals" prompt) executes them with judgment. No new argv execution paths from the UI in v1.
- "apply brain proposals" flow (RECONCILER.md §Applying) is renamed **"apply proposals"** and handles all lanes: approved-pending items first, then walk remaining pending ones.
- Later (only if lane volume justifies it): CC tab renders a lane badge per card — a small story; v1 renders unknown lanes as generic cards, which works because cards only need `summary`/`detail`/`kind`.

## New/changed files

| File | Change |
|---|---|
| `.claude/skills/session-close/SKILL.md` | rewritten: the flow above, high-level process + ruthless invariants |
| `.claude/skills/session-close/references/harvest-lanes.md` | NEW — canonical taxonomy (the table above, with per-lane quality bars) |
| `.claude/skills/session-close/scripts/push_pattern_to_supabase.mjs` | moved from pattern-guardian, slimmed to lane-9 fields; validation gate + tolerant insert order + logs entry kept |
| `.claude/skills/pattern-guardian/` | DELETED (description triggers folded into session-close frontmatter) |
| `scripts/session-digest.mjs` | NEW — transcript → digest; shared by skill and sweep |
| `scripts/INDEX.md` | NEW — toolbox index; seeded with existing `scripts/*` entries |
| `.claude/skills/weekly-review/SKILL.md` | NEW step: pull the week's `pipeline.sessions` rows (raw + skipped), propose seeds → posts, flip `status` to used/dropped |
| `~/projects/brain/RECONCILER.md` | §3 replaced with a pointer to the sweep; §Applying renamed/generalized |
| root `CLAUDE.md` (COO section) | session-close description updated; add the "grep scripts/INDEX.md before writing a new tool" rule |
| CC schedule | NEW "Session sweep (daily)" prompt schedule (created via `/api/schedules` when sub-project 3 lands) |

## Sequencing (three sub-projects, in order)

1. **Brain Approvals tab** — already specced and queued (handoff doc). Build unchanged. *(CC story / inline worktree build per the handoff.)*
2. **Unified session-close skill** — skill rewrite + `harvest-lanes.md` + `session-digest.mjs` + `scripts/INDEX.md` + pattern-guardian deletion + weekly-review reader + CLAUDE.md touch-ups + processed.json marking. *(MetaArchitect session work — skills are never stories.)* Run `scripts/skill-lint.sh` after.
3. **Sweep generalization** — RECONCILER.md changes (brain repo), daily schedule creation, proposals.json lane field; optional CC lane-badge story later.

Each sub-project is independently shippable; the skill works without the sweep (interactive path + deferred-items-to-proposals), and the sweep without the tab (proposals apply in-session).

## Invariants (the ruthless list)

- Every lane names a reader; anything harvested must land where its reader looks.
- Nothing writes to brain/goals/content stores without Simon's approval (board reply or Approvals tab tap). Approving IS the confirm.
- One transcript-digestion mechanism (`session-digest.mjs`), one processed ledger (`processed.json`), one proposal queue (`proposals.json`), one approval surface (CC /brain Approvals).
- The interactive board is one message, one reply. No mid-ritual interrogation (pattern-guardian's Phase-1 question is gone; missing context fields are simply `[N/A]`).
- Humanity snippets: never fabricated, craft-don't-transcribe. Content claims inherit the claim-provenance rules from lessons.md 2026-07-07.
- Lane failure never aborts the ritual; imperfect completion beats no completion.
- Skill edits stay session work; CC code changes route as stories (root CLAUDE.md routing rules).
