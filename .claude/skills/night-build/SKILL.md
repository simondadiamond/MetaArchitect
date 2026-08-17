---
name: night-build
description: Use when the Command Center schedule fires '/night-build' (nightly 1:00am) or Simon explicitly says to run a night build now. Picks the single highest-RICE night-ready goal (agent_eligible, scoped acceptance criteria, pending) and builds it end-to-end with all output landing gated. Do NOT trigger for scoping a build (live-chat ritual, COO behavior #9), daytime task triage (weekly-brief), or goals without a filled outcome sentence.
---

# /night-build

## Purpose

Scoped, agent-buildable goals get built overnight without costing Simon anything but the scoping chat he already had. One goal per night, output waiting gated in the morning, ntfy telling him where to look. Design doc: `docs/superpowers/specs/2026-07-31-night-build-lane-design.md`.

## How this skill is designed

Meta skill: outcomes and invariants, not procedures. How to build the selected artifact is your judgment — the goal's `acceptance_criteria` is the contract you build against. The shell below (selection rule, routing rule, invariants, logging) is not negotiable; creativity lives inside it, never in it.

## Selection (fixed contract)

A goal is **night-ready** iff ALL hold:
- `agent_eligible = true`
- `status = pending`
- `acceptance_criteria` filled, and its **first line is the outcome sentence** (one sentence, no technology in it)
- its `description` carries **no prior `night-build YYYY-MM-DD: built` line** — a built goal stays `pending` until Simon reviews it (invariant 3), so without this clause the same goal is re-selected every night and its unreviewed output gets overwritten

Read via command-center Supabase REST (service key from `projects/command-center/.env`). Pick the single highest `rice_score` (nulls last). A row failing the outcome-sentence test is **skipped, never interpreted** — append `night-build YYYY-MM-DD: skipped — unscoped outcome sentence` to its `description` so it surfaces for re-scoping, **once**: a row that already carries a `night-build YYYY-MM-DD: skipped` line is left untouched (re-annotating nightly is the log spam this rule exists to prevent).

`agent_eligible` is a **scouting flag set at capture time**, not a readiness flag — only the scoping ritual writes `acceptance_criteria`. Acceptance criteria written into the `description` body (a `## Acceptance criteria` markdown section) do NOT count; the column is the contract, and reading the body would be interpreting an unscoped row. This gap is structural and silent by design here — the weekly fuel gauge in `weekly-brief` is what surfaces a permanently dry lane (lessons.md 2026-08-14).

**Nothing night-ready → exit silently.** No output, no makework, no log spam.

## Routing (fixed contract)

- **Code in command-center or simonparis-website** → queue as a story (invoke `queue-story` skill; `agent_target` rules apply — UI → `sitemaster` with brand acceptance criteria). The story pipeline does the build; your job ends at a well-formed story + goal annotation.
- **Everything else** (documents, lead magnets, skills, research artifacts, MetaArchitect work) → build directly this session. Worktree rules apply to any code in shared checkouts. Respect sterling's memory headroom: no heavy parallelism, one build at a time.

## Ruthless invariants

1. **ONE goal per night.** Never a second, even if the first finishes fast.
2. **Nothing customer-facing ships.** PRs stay open (never merge), posts land as `pipeline.posts` drafts, emails are drafted never sent, documents land as files. Morning is review, not damage control.
3. **Never flip goal status.** Append one line to the goal's `description`: `night-build YYYY-MM-DD: built — <where to review>`. Simon flips status after review.
4. **On failure: stop.** Append `night-build YYYY-MM-DD: failed — <one-line reason>` to the goal, ntfy, exit. No retries into the night, no half-shipped output. Systemic cause → lessons.md anti-recurrence loop.
5. **Always ntfy at the end of a run that selected a goal** (built or failed): one line, what + where to review.

## STATE compliance

Risk: medium (writes to goals `description`, possibly stories/pipeline tables). `workflowId` = `night-build-<YYYYMMDDTHHMMSS>`; stages: `select → route → build → land → annotate → notify`. Name the stage in every error. Validate every API/DB response before use; validate payloads before every write. Error format on abort:

```
❌ /night-build failed at [stage] — [message] — goal annotated, nothing shipped
```
