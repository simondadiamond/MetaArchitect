# Harvest lanes — canonical taxonomy

The ONE definition of what a session harvest extracts. Both consumers read this file:
the `session-close` skill (interactive `/end`) and the daily session sweep
(`~/projects/brain/RECONCILER.md` points here). A lane without a reader does not exist —
never invent an eleventh lane without naming who reads it.

Per lane: what qualifies, where it lands, who reads it. The harvester proposes; nothing
below auto-executes without Simon's approval (board reply or CC Approvals tab).

## 1. Goals — Supabase `goals` → read by roadmap/COO sessions
Work that maps to a goal row: propose check-off, `in_progress` flip, or one-liner append
(no `notes` column — append to `description`). New scope that surfaced mid-session →
propose a new goal row or a story (root CLAUDE.md routing). Access: memory `goals-table-access`.
**Traceability gate** (2026-07-13, from "what are those mailerlite dashboard email fixes???"):
every proposed goal item names its source evidence — the file, commit, message, or command
from THIS session that produced it — phrased in words Simon would recognize from the session.
Can't cite the evidence → don't propose it.

## 2. Lessons — `docs/lessons.md` → read by future agents
Something broke or a mistake happened. The anti-recurrence trio is all-or-nothing:
(a) lessons.md entry (one per failure class), (b) root cause fixed in the SOP/skill/tool
itself — and grep for siblings that produce the same output class (2026-07-07 audit rule),
(c) one-liner appended to the matching goals row. Nothing broke → report "no lessons" explicitly.

## 3. Friction — skill/SOP edit now, or a queued CC story → read by future agents
NEW: things that were slow or annoying but didn't break — a repeated manual step, a missing
permission, a skill gap, an agent that needed three corrections. Bar: would fixing it save
time in ≥2 future sessions? Propose the concrete fix (which file, what rule) or the story body.

## 4. Scripts — promote to `scripts/` + one line in `scripts/INDEX.md` → read by any future session
One-off scripts written this session (`.tmp/`, scratchpad, inline heredocs) that solved a
real problem and would plausibly be needed again. Bar: parameterizable beyond today's inputs.
Action: move (don't copy), add INDEX.md line (`- name.mjs — what it does (born YYYY-MM-DD)`),
strip hardcoded row ids/dates into args. Standing rule: grep `scripts/INDEX.md` before writing a new tool.

## 5. Handoff — `docs/handoffs/YYYY-MM-DD-<topic>.md` → read by the next session on that work
Work continues past this session AND the next session would need >5 minutes to rebuild
context. Contents: goal, verified context (paths, gotchas, decisions made — mark them
"don't re-litigate"), exact next steps. Committed. Skip if the work is done or trivially resumable.
Before listing a workstream as owed, check the target repo's git log — if it already shipped,
cite the commit/PR instead (lesson 2026-07-12: a handoff listed pgid teardown as owed a day
after PR #58 delivered it; only a pre-plan code read prevented a duplicate implementation).

## 6. Brain facts — `brain save` / note edit → read by `brain find`
Durable facts about Simon's life/business/infra: decisions, numbers, dates, paths, people.
Bar (all three, else drop — no fixed cap, quality is the gate):
- **Atomic** — one fact, concrete, standalone.
- **Recall test** — you can name the realistic future question where `brain find` surfaces
  this note AND it changes the next action. Can't name the trigger question → it's trivia, drop.
  (This is the gate that kills "nice to know" saves — if you can't say *when* it's read, it isn't saved.)
- **Non-derivable test** — not trivially re-discoverable from the live system in seconds
  (`ls` the dir, read the config, `git log`). Save the non-obvious *decision or gotcha*, not the
  discoverable inventory: when a candidate mixes both (device is X, and the gotcha is Y), lead with
  the durable gotcha and cite the inventory only as example context — never enumerate it as the fact.
- **Shape (write the fact, not its story)** — length is free and does not affect STATE compliance
  (the save *pipeline* is what's compliant), but terser recalls better. Two shapes: a *reference card*
  (paths/commands/decisions) may be dense because every clause is a lookup value; a *decision/lesson*
  fact is one crisp sentence + the mechanism (~1–2 lines). Cut provenance narration and connective
  prose — the proposal's `detail` field carries the why for the approval; the saved fact does not.
Boundary: how-Claude-works → lane 7; things the repo/git already records don't qualify.
**Mandatory contradiction pre-check per candidate** — `brain find "<key terms>"`:
- same fact → drop (already known)
- newer/changed → propose an edit to that note, not a duplicate
- session contradicts an existing note → propose the correction even unasked; a confidently
  wrong note is worse than a missing one. Security/posture corrections cite the verifying command + date.

## 7. Auto-memory — Claude memory dir → read by future Claude sessions
How Claude should operate for Simon: corrections he gave, confirmed approaches, workflow
rules. Follow the global CLAUDE.md memory format (one file per fact + MEMORY.md index line).
Check for an existing memory to update before creating; propose deletions for memories proven wrong.

## 8. Humanity snippets — `pipeline.humanity_snippets` → read by the research skill
A genuine, specific lived moment from the session, first person, craft-don't-transcribe
(extract and rewrite into one publishable sentence naming what Simon was doing + what he
realized — never a verbatim quote, never invented feelings). **Never fabricate; no real
moment → no snippet.** Quality gate (2026-07-13, from "snippet kinda sucks lol"): the moment
must pass the same recall test as brain facts — Simon reads it and recognizes the exact moment
without explanation. Generic ("I realized reliability matters") → drop; a skipped snippet beats
a weak one. The research skill ranks snippets by topic overlap and reuses them in drafts.

## 9. Content seed — `pipeline.sessions` (slim row) → read by weekly-review every Friday
One row per session: `core_insight` (1 sentence tied to State Beats Intelligence),
`icp_pain` (one of: non-determinism | prompt whack-a-mole | lack of observability |
automation brittleness | compliance risk), one-line defensive-architecture lesson, tags,
`pattern_confidence`. Viability bar (all three, else propose a `skipped` row with a 1-line reason):
- **2am test** — would a paged senior engineer recognize the problem class?
- **Authority test** — does it make Simon look like a practitioner, not a beginner?
- **Generalizability test** — transferable to production AI systems, or one-off tooling trivia?
Anonymize: no client names, no proprietary internals. Claim provenance rules apply
(lessons.md 2026-07-07): numbers, process narratives, and attributions must trace to what
actually happened this session. Skipped rows are data, not failure — weekly-review needs the denominator.

## 10. Hygiene — actions now, never proposals
Mechanical, execute during the ritual (interactive) or list as findings (sweep):
- test/smoke rows written to pipeline tables → `rejected`/deleted (Data Rule 6)
- scratch litter in the working tree → `git status --short`, clean or commit deliberately
- orphan servers/watchers → kill by port-owner pid only (never broad `pkill`), then
  `systemctl --user is-active command-center story-worker`
