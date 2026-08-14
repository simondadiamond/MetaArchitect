---
name: queue-story
description: Use when actually queueing a code task as a story to the Command Center pipeline (POST /api/stories) or creating a recurring schedule (POST /api/schedules) — exact payloads, field rules, agent_target and goal linking. Do NOT use to decide WHETHER a task routes to the pipeline; the routing criteria live in CLAUDE.md.
---

# Queue a story or schedule (Command Center API)

Routing criteria (route-to-pipeline vs keep-in-session, `agent_target` rules, scheduling restraint) live in the root `CLAUDE.md` — this skill is the mechanics only.

## Queue a story

```bash
curl -s -X POST http://100.105.85.5:3737/api/stories \
  -H 'content-type: application/json' \
  -d '{
    "description": "What to change, where, and how to verify it. First line becomes the title. Include checkable success criteria.",
    "target_repo": "simonparis-website",
    "agent_target": "sitemaster",
    "goal_id": "<uuid>"
  }'
```

- `target_repo` (required): `command-center` | `simonparis-website` — the only registered targets (`worker/targets.ts` in the command-center repo)
- `agent_target` (**always set it — pick deterministically, never leave it unset**):
  - **UI / front-end work → `sitemaster`** — anything touching pages, components, styling, layout, copy, or the funnel. When you pick `sitemaster`, the description MUST spell out brand acceptance criteria: default/hover/selected/active states, `#E04500` actions, `#C97A1A` links (never blue), zero border-radius, dark mode.
  - **Everything else → `coo`.**
  - A forgotten `agent_target` is how front-end stories ship off-brand — this is not optional.
- `goal_id` (optional): links a `goals` row — the goal flips `in_progress` on start, `done` on merge
- `auto_merge` (optional): omit to use the global default from `pipeline_settings`
- If the API is down: `systemctl --user start command-center`. Don't insert into `stories` directly — the API applies validation and defaults.

Board: `http://100.105.85.5:3737/pipeline`.

## Queue a schedule

Command Center also runs recurring tasks (Claude prompts or server scripts) on cron schedules — the `/schedules` page. Any Claude session can create one:

```bash
curl -s -X POST http://100.105.85.5:3737/api/schedules \
  -H 'content-type: application/json' \
  -d '{
    "name": "Morning roadmap brief",
    "kind": "prompt",
    "cron": "0 7 * * *",
    "working_dir": "~/projects/MetaArchitect",
    "agent": "coo",
    "prompt": "/roadmap — summarize current phase and today'\''s top task."
  }'
```

### Determinism gate — run this BEFORE writing the schedule

Split the task into the part whose correct output is **exactly specifiable** (which rows are unpaid, which emails are overdue, which records changed since T) and the part that needs **judgment** (what to say about it, what to recommend).

The specifiable part must exist as a committed script that returns a hard result. The prompt may only *interpret* that script's output — never re-derive it. **If you can't name the script, the schedule isn't ready to create**: say so and build the script first.

Why this gate exists: an MCP or API call is deterministic, but a model joining two result sets is not, and its failure mode is silent — a truncated page or a timezone edge gets summarized as complete with full confidence. That is fine for a briefing and unacceptable for "was this paid" or "did the email go out." Test per CLAUDE.md #11: would a better model produce a better answer? No → script it. Yes → keep it in the prompt.

So most real schedules are a pair: a `kind: script` row that produces the hard artifact, or a `kind: prompt` row whose first instruction is to run the script and read its output.

- `kind`: `prompt` (needs `prompt`; `working_dir` defaults to MetaArchitect, `agent` optional) or `script` (needs absolute, executable `script_path`)
- Scripts live in `~/scripts` or the command-center repo's `bin/` (the only dirs the `/schedules` page lists and edits). Anything a schedule runs should be editable in place from that page.
- `cron`: standard 5-field expression, server-local time
- Runs land in the `/runs` log; failures ping Simon's ntfy topic. Missed fires while the service is down are skipped, and overlapping fires of the same schedule are skipped.
- **Only schedule what Simon asked to schedule** — don't create recurring tasks on your own initiative.

Full details: `projects/command-center/README.md` ("Story worker") and `docs/superpowers/plans/golden-path.md` in that repo.
