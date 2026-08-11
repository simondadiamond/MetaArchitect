---
name: to-tickets
description: Break a goal, spec, or the current conversation into typed tracer-bullet slices published to the Command Center goals table — spec on a feature-kind goal row, slices as task-kind children, code-shaped slices additionally queued as stories. One source of truth; no second tracker.
disable-model-invocation: true
---

<!--
Vendored from https://github.com/mattpocock/skills (MIT)
Path: skills/engineering/to-tickets · Commit: 84fdeffd12f2ee307994d1eb6feb48173b6e0502 · Vendored: 2026-08-11
Heavily modified — see "Modified from upstream" at the bottom before "fixing"
anything back toward upstream.
-->

# To Tickets

Break a goal, spec, or conversation into **typed slices** — tracer-bullet
vertical pieces of the goal, each a puzzle-bit the mornings can advance —
and publish them to the Command Center goals table.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user
passes a reference (a spec path, a goals row id) as an argument, fetch it
and read its full body. If the goal hasn't been grilled yet (no outcome
sentence, open design questions), run the `grilling` skill first — slicing
an unexamined goal produces confident garbage.

### 2. Explore the territory

Slices here are mostly NOT code. For code-shaped work, explore the target
repo to understand current state; ticket titles and descriptions use the
project's vocabulary. **Verify every route, table, lib, or surface a slice
names actually exists (or mark it "to be created") before writing criteria
that reference it** — never spec against an imagined codebase (lessons.md
2026-07-31). For non-code work, check the owning master's playbook and
recent journal so slices don't duplicate what a play already does.

Look for opportunities to prefactor: "make the change easy, then make the
easy change."

### 3. Draft vertical slices

Break the work into **tracer bullet** slices.

<vertical-slice-rules>

- Each slice cuts a narrow but COMPLETE path through every layer — vertical,
  NOT a horizontal slice of one layer
- A completed slice is demoable or verifiable on its own
- Each slice is sized to fit in a single fresh context window (story slices:
  ~1–5 files, describable in a few sentences)
- Any prefactoring is its own slice, done first

</vertical-slice-rules>

**Wide refactors are the exception to vertical slicing.** One mechanical
change whose blast radius fans across a whole codebase gets sequenced as
**expand–contract**: expand (add the new form beside the old), migrate call
sites in batches (each its own slice), contract (delete the old form last).

### 4. Type every slice

Each slice gets exactly one type — upstream assumes every ticket is code;
our goals mostly aren't:

- **`story`** — a code change in a registered repo (`command-center` or
  `simonparis-website` only), with checkable success criteria. Gets a
  deterministic `agent_target` per the `queue-story` skill's rules (UI/
  front-end → `sitemaster` with brand acceptance criteria spelled out;
  everything else → `coo`).
- **`work`** — research, content, drafts, analysis: the owning master
  (CMO/CRO) executes it inside its own daily runs. `agent_target` = the
  owning master.
- **`simon`** — a decision or action only Simon can make. It becomes a
  typed proposal in the queue (advisor-mode membrane), never silently
  assumed. If Simon is present in the briefing, resolve it live instead.

### 5. Order as a linear chain

Order slices as a **linear chain** in dependency order — blockers first —
and record each slice's blocker in its description. **Queue a dependent
story only after its blocker's PR merges**; do not queue the whole chain up
front. The story worker is strict FIFO per repo with no edge awareness, so
a failed blocker's dependents would still get built on top of the missing
piece. (This rule relaxes to a true blocking-edge frontier if/when the
`stories` table gains `blocked_by` — a worker change, in-session work, not
part of this skill.)

### 6. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Type**: `story` / `work` / `simon` (+ `agent_target`)
- **Blocked by**: the previous slice in the chain, or "None — can start
  immediately"
- **What it delivers**: the end-to-end behaviour or outcome this slice
  makes real

Ask: does the granularity feel right? Are the types right — is anything
marked `story` that actually needs a decision first? Should any slices be
merged or split? Iterate until approved.

### 7. Publish to Command Center

One source of truth: the `goals` table. No local ticket files, no GitHub
issues, no second tracker.

1. **Spec → feature goal.** The spec body lands on a `kind='feature'` goals
   row via `POST http://100.105.85.5:3737/api/goals`. The outcome sentence
   (no technology in it) is **line one of `acceptance_criteria`**; the rest
   of the criteria follow, one per line. Set `agent_target` to the owning
   master where one owns the goal.
2. **Slices → task children.** Each slice becomes a `kind='task'` goals row
   with `parent_id` = the feature goal's id, its type and blocker noted in
   the description, and `agent_target` set per step 4.
3. **Story slices → the pipeline.** Each `story` slice additionally queues
   via the `queue-story` skill's exact payload (`POST /api/stories`) with
   `goal_id` = its task child's id — respecting the linear-chain rule:
   only the frontier slice (all blockers merged) is queued at any time.
4. **Simon slices** surface as typed proposals per step 4.

Do NOT close or modify any parent goal.

<slice-template>

## What to build

The end-to-end behaviour or outcome this slice makes real, from the user's
perspective — not a layer-by-layer implementation list.

## Acceptance criteria

Every checkbox must be **machine-checkable by driving the running app or
reading test output** — an agent with no context must be able to judge
pass/fail. That means literal discriminators: routes, selectors, states,
exact strings, hex values. "Make it nicer" never qualifies; "the nav links
render in `#C97A1A` on /blog" does.

- File paths and literal values are ENCOURAGED, not banned — the verify
  stage needs them. If a path may not exist yet, write "to be created".
- UI slices spell out brand criteria: default/hover/selected/active states,
  `#E04500` actions, `#C97A1A` links (never blue), zero border-radius,
  dark mode.
- A criterion that drives a MUTATING action (promote/delete/publish) must
  tell the verifier to create its own disposable fixture and clean it up —
  never name a production row as the click target (lessons.md 2026-07-16).

- [ ] Criterion 1
- [ ] Criterion 2

## Blocked by

The previous slice in the chain (title + goal id), or "None — can start
immediately".

</slice-template>

Code snippets from a prototype that encode a decision more precisely than
prose (state machine, schema, type shape) may be inlined, trimmed to the
decision-rich parts.

## Modified from upstream

Deliberate deltas from `mattpocock/skills` `to-tickets` — do not "fix"
these back:

1. **Acceptance criteria are machine-verifiable, with file paths and
   literal values encouraged.** Upstream bans file paths and never requires
   verifiable criteria. Our story pipeline's verify stage and brand rules
   REQUIRE literal discriminators (routes, hex values, selectors, states) —
   without them, front-end stories ship off-brand and verify stages can't
   judge pass/fail.
2. **Publishing goes to Command Center, not a tracker.** The `.scratch/`
   files / GitHub / Linear modes and the `setup-matt-pocock-skills`
   dependency are deleted. Spec → feature goal, slices → task children,
   code slices → stories with `goal_id`. One source of truth: the goals
   table. A second tracker is drift waiting to happen.
3. **Typed routing step added** (`story` / `work` / `simon`). Upstream
   assumes every ticket is code; most of our goals aren't, and advisor mode
   means Simon-decisions must surface as typed proposals.
4. **Linear chains only, queue-on-merge.** Upstream's blocking-edge
   frontier has no executor here: the story worker is strict FIFO per repo
   with no edge awareness, so a failed blocker's dependents would still get
   built. Relaxes when `stories` gains `blocked_by`.
