---
name: session-close
description: Use when Simon says "end session", "wrap up", "/end", "we're done", or equivalent — also at the natural end of any session that produced real output (propose it). /pattern and /log route here too (content-lanes-only mode). Do NOT trigger mid-session for a single task completing.
---

# /session-close — the harvest ritual

## Purpose

Every session deposits its reusable value into stores with named readers — the close is
how work compounds instead of evaporating. This skill is the interactive entry point; the
daily session sweep harvests transcripts that never got one (same lanes, same digest
script — one mechanism). Design: `docs/superpowers/specs/2026-07-10-session-close-unified-design.md`.

**Modes:** full triggers run everything. `/pattern` or `/log` run lanes 8–9 only
(snippet + content seed), skipping straight to a two-lane board.

## The ritual

### 1. Find this session's transcript
Echo a fresh random UUID in chat (just print it), then:
`grep -l "<uuid>" ~/.claude/projects/-home-diamond-projects-MetaArchitect/*.jsonl`
— the matching file is this session's transcript, even after compaction.

### 2. Digest it
`node scripts/session-digest.mjs <transcript> > <scratchpad>/digest.md`
(user/assistant text, every bash command, every file written — tool results stripped).

**Fallback:** transcript not found or digest fails → harvest from in-context memory alone,
flag "harvested without transcript" on the board, and SKIP step 7 so the sweep gets a second pass.

### 3. Harvest (one subagent)
Dispatch a single subagent: the digest + `references/harvest-lanes.md`, returning per-lane
candidates as JSON (`{lane, summary, action, detail}` per item). Then merge with what you
know live that the transcript shows poorly (current DB state, what Simon confirmed verbally,
work still in flight). The transcript remembers what compaction forgot; you know the present.

### 4. Deterministic pre-checks (main agent, before the board)
- `brain find "<key terms>"` per brain candidate — apply the same/update/contradict logic (lane 6)
- goals query for rows touched by this session's work
- `git status --short` + orphan-process check (lane 10 inputs)
- last 2 LinkedIn rows CTA check only if content lanes produced post-bound material

### 5. The board — ONE message, ONE reply
Present every lane in one message. Numbered items, each showing the EXACT action it will
take (the `brain save` line, the goal PATCH, the `git mv`, the story POST body). Empty
lanes say "nothing" — an explicit nothing is information, silence is a bug. No mid-ritual
questions: a missing context field is `[N/A]`, never an interrogation.

```
## Session harvest — YYYY-MM-DD
**Goals**: 1. mark <goal> done  2. append "<one-liner>" to <goal>
**Lessons**: 3. <title> (entry + root-cause fix in <file> + goal one-liner) | none
**Friction**: 4. <fix or story body> | none
**Scripts**: 5. promote <path> → scripts/<name> | none
**Handoff**: 6. docs/handoffs/<file> for <work> | not needed
**Brain**: 7. brain save "<fact>" --domain <d> [--tags ...]  8. UPDATE note <slug>: <what> | nothing brain-worthy
**Memory**: 9. <memory-file>: <fact> | none
**Snippet**: 10. "<crafted sentence>" | no real moment
**Content seed**: 11. <core insight> [confidence] | skipped: <reason>
**Hygiene**: <done: what was cleaned / clean already>
Reply: "all", "all except N", or edits.
```

### 6. Execute
Run confirmed items. A lane failure never aborts the rest — note it in the receipt, keep going.
- Content seed + snippet: write the seed JSON to `projects/Content-Engine/.tmp/session_seed.json`,
  then `node .claude/skills/session-close/scripts/push_pattern_to_supabase.mjs --model <actual model id>`
  (validation gate inside; never hardcode the model id).
- Items Simon defers ("later") → append as pending, lane-typed proposals to
  `~/projects/brain/.reconciler/proposals.json` (schema in RECONCILER.md) — deferred ≠ dropped;
  they surface in the CC Approvals tab.

### 7. Mark the session closed
Append `{path, lastLineTimestamp}` for this transcript to
`~/projects/brain/.reconciler/processed.json` (read the last line's `timestamp` field) —
this is what stops the daily sweep from double-harvesting a properly closed session.

### 8. Receipt
```
✅ Session closed
Done: <what shipped, one line each>
Harvest: <per lane, one line — including explicit "none"s>
Deferred: <n proposal(s) → Approvals tab | none>
**Next Action → [the single next task]** — [command/step, ~time]
```

## Invariants

- This skill never does new project work. "Wrap up" containing a task → task first, then this.
- Nothing writes to brain/goals/content stores without Simon's approval. Approving IS the confirm.
- One board, one reply. Never interrogate mid-ritual.
- The ritual completing imperfectly beats the ritual not completing — failures are noted, never fatal.
- Every harvested item lands where its lane's reader looks (see `references/harvest-lanes.md`) —
  saving somewhere else is the same as not saving it.
- Anti-recurrence trio (lane 2) is all-or-nothing: entry + root-cause fix + goal one-liner.
- Snippets and content claims: never fabricate; provenance rules from lessons.md 2026-07-07.
