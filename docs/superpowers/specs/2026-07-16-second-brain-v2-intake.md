# Second Brain v2 — intake redesign (evidence tier)

**Date**: 2026-07-16 · **Approved by**: Simon (hybrid evidence tier, in-session)
**Supersedes**: the brain-fact approval flow in `session-sweep.md` / `RECONCILER.md` / harvest-lanes lane 6.
**Inputs**: audit of the live intake path + two reference repos (AgriciDaniel/claude-obsidian, NateBJones-Projects/OB1 "smart-ingest").

## Problem

The auto-intake approval queue was the system's highest-friction point and its output was low-value:

1. **The approval unit was an audit log, not a fact.** Proposal `detail` fields carried provenance narration, sweep dates, and pre-check bookkeeping; the actual fact was buried in `argv[1]`. Reviewing one item was a reading assignment, not a 3-second yes/no.
2. **The harvester was obligated to emit.** Nothing made "this session yields zero facts" the expected outcome, so marginal proposals crept out to justify each run.
3. **The sweep digested noise.** 400+ transcript backlog dominated by story-pipeline stage runs that structurally never yield (their outcomes already live in the story board/PRs).
4. **Notes duplicated metadata.** Provenance narration inside fact bodies; description ≈ first sentence ≈ INDEX line.

## Design (what changes)

### 1. Evidence tier — brain-fact saves stop queuing

Auto-harvested facts that clear the extraction contract save **immediately** as `status: evidence` notes. No approval proposal. Properties:

- Searchable by `brain find`, but results are labeled `[evidence]` — unconfirmed.
- An evidence note **never overrides a confirmed note**: if a candidate contradicts a confirmed note, the sweep must NOT save it — it files a queued `kind: "edit"` correction proposal instead (corrections to confirmed knowledge remain human-gated).
- Promotion path: `brain promote <slug>` (evidence → confirmed) and `brain drop <slug>` (delete note + INDEX line). Both atomic + committed.
- Weekly reconciler gains a **promote/prune digest**: lists all `status: evidence` notes (slug + fact first line), ntfy ping, reviewable from CC `/brain` (Evidence view — separate story) or in-chat ("review evidence"). No auto-delete; evidence older than 60 days unpromoted gets flagged in the digest.
- Interactive `session-close` lane 6 saves as `evidence` too when Simon isn't confirming inline; facts Simon states or confirms in-session save as `confirmed` directly (his word IS the gate).

### 2. Extraction contract v2 (the OB1 "smart-ingest" bar)

Rewrites harvest-lanes lane 6. Core rules:

- **Durable-memory framing**: "You are extracting durable long-term memories, not summarizing a session."
- **Returning zero facts is the expected outcome for most sessions.** 1–3 = a rich session. Hard cap 8.
- **Atomic, self-contained months later, ≤280 chars**, declarative present tense — *write the knowledge, not the conversation* ("Not: 'the session explored X.' Yes: 'X works by Y.'").
- **REJECT list** (never save): questions-as-memories; generic advice; encyclopedia facts; anything re-derivable from the live system in seconds; transient scheduling; session narration; vague interest statements ("Simon cares about X"); fragments that don't stand alone.
- **Importance 0–6, strict** ("most qualifying facts are 3"; 6 is Simon-flagged only, never self-assigned). Floor: `< 3` → drop silently, no proposal, no evidence save.
- **Provenance = one snippet**, not narration: frontmatter `snippet:` carries one ≤140-char quote/command from the transcript; `source:` carries `sweep:<transcript-id-8>`. Fact bodies contain zero provenance prose.
- Contradiction pre-check per candidate stays (`brain find` first): duplicate → drop; refines an evidence note → overwrite that evidence note; contradicts a confirmed note → queued correction.

### 3. Proposal format v2 (for what still queues)

Queued kinds that remain: note **edits/corrections**, and the other 9 lanes' `task` proposals. New rules:

- `summary` ≤ 100 chars, the action in Simon-recognizable words.
- `detail` ≤ 500 chars, action-first. Provenance is one trailing token — `[src: <transcript-8> <date>]` — never a sentence.
- Lessons lane: `detail` carries the 2–3 sentence essence; the applying session writes the full lessons.md entry. Never inline full documents into proposals.

### 4. Sweep noise purge

- `session-sweep.md` step 1 excludes transcript dirs matching `*story-worktrees*` (their outcomes are already recorded by the story board, story_events, and PRs — the pipeline's own audit trail is the harvest).
- One-time: bulk-append the existing story-worktree backlog to `processed.json` with last-line timestamps.

### 5. Note format slimming

- New frontmatter fields: `status: evidence|confirmed` (absent = confirmed, backwards compatible), `snippet:` (optional).
- Fact bodies: no provenance narration, no connective prose. Reference cards may stay dense (every clause a lookup value); decision/lesson facts are 1 crisp sentence + mechanism.
- INDEX lines for evidence notes carry an `[evidence]` marker so `brain find` can label without opening the file.

## What we deliberately did NOT copy

- **claude-obsidian's frontmatter/metadata surface** (status lifecycles, addresses, key_claims, mode routers) — metadata soup for a per-file brain. Its winning ideas are behavioral: declarative rewrite, skip-list-in-the-generator, length caps.
- **OB1's default `capture_thought` path** — no quality bar; it's the fluff machine. The gate (smart-ingest) is what we took.
- **OB1's governance ceremony** (recall traces, audit-event tables, 7 provenance statuses, scope hierarchy) — built for multi-agent team memory; solo brain needs only evidence-vs-confirmed + promote/drop.
- **Embeddings-first retrieval** — `brain find`'s deterministic lexical index stays; it beats similarity-at-0.5 for exact recall and costs zero tokens.

## Implementation map

| Piece | Where | Route |
|---|---|---|
| `--status` / `snippet` on save, `[evidence]` in find/INDEX, `promote`/`drop` commands, doctor awareness | `~/projects/brain/tools/` | session work (this session) |
| Lane 6 rewrite (extraction contract v2) | `.claude/skills/session-close/references/harvest-lanes.md` | session work |
| Sweep SOP: evidence auto-save, worktree exclusion, proposal format v2 | `.claude/skills/session-close/references/session-sweep.md` | session work |
| Weekly job: promote/prune digest, brain-save proposals removed | `~/projects/brain/RECONCILER.md` | session work |
| Backlog bulk-mark | `~/projects/brain/.reconciler/processed.json` | session work (script) |
| CC `/brain` Evidence view (promote/drop buttons) + approvals card slimming | command-center | story → `sitemaster` |
| `how-the-second-brain-works` note rewrite | brain repo | session work (subsumes approved proposal 00d21d07) |
