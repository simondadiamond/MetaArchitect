---
name: weekly-brief
description: Use when Simon says "/weekly-brief", "generate my brief", "what should I do this week", when the Monday schedule fires, or when the Command Center regenerate button queues a run. Produces the week's 3–5 ranked tasks and writes them to public.briefs. Do NOT trigger for the Friday retrospective (weekly-review) or for one-off task triage in chat.
---

# /weekly-brief

## Purpose

Produce **this week's operator brief**: the 3–5 tasks Simon should actually do, ranked, so the Command Center home card spoon-feeds the week. Simon has ADD and limited time — the brief is the answer to "I just logged in, what do I do?", not a status report. The Friday `/weekly-review` looks backward; this looks forward.

Write the brief to `public.briefs` via `POST /api/briefs` so the launcher "This week" card renders it, then print it in chat.

## How this skill is designed (read this before executing)

This is a **meta skill**: it specifies *outcomes and invariants*, not procedures. There is deliberately no `gather.sh`. You — the executing agent — decide what state matters this week and you author the prompts for the sub-agents that gather and judge it. A better model executing this same file should produce a better brief. Two consequences:

1. **Don't look for a script to run.** The open-ended middle (what to investigate, how to weigh it) is your judgment, exercised fresh each week.
2. **The shell is not negotiable.** Anchor reads, the validation gate, the write path, and the log entry are fixed contracts — creativity lives between them, never in them.

## Objective function (stable — rank against this)

1. **Revenue speed first.** What moves money soonest: open leads and ICP conversations, `/score` funnel, cohort/workshop sales, follow-ups going cold.
2. **Compounding second.** What grows while Simon sleeps: teardowns (SEO juice), publishing cadence, evergreen assets, the engage queue's relationship capital.
3. **System health last, and only when it's blocking 1 or 2.** Broken plumbing earns a slot only if it gates revenue or compounding work.

The 3–5 tasks should **span categories** — a good week has money-now items AND a compounding item, not five of one kind. Every task must be something Simon can start today without a meeting with himself: concrete verb, named object, time-boxed.

## STATE Compliance

- **Risk: low-medium (read-mostly).** State object: `workflowId` + `stage`. `workflowId` = `weekly-brief-<YYYYMMDDTHHMMSS>`; stages: `anchor → explore → rank → write → verify → log` — name the stage in every error.
- **T — Traceable**: one `pipeline.logs` entry at completion or failure (Step 5).
- **E — Explicit**: the payload passes the Step 4 gate before the POST; API/DB responses are validated before use. Never compose a brief from failed anchor reads.
- Everything is read-only except two writes: the `briefs` insert and the `pipeline.logs` entry. **Never write to `goals` rows** — if a goal's status or priority looks wrong, say so in the brief (propose, don't write).
- Error format (mandatory on any abort):
  ```
  ❌ /weekly-brief failed at [stage] — [error message] — nothing written, safe to retry
  ```

## Step 1 — Anchors (MUST read, abort if unreadable)

`week_start` = Monday of the current ISO week:

```bash
python3 -c 'import datetime as d;t=d.date.today();print((t-d.timedelta(days=t.weekday())).isoformat())'
```

Anchor reads (Command Center API, Tailscale):

```bash
curl -s "http://100.105.85.5:3737/api/goals?status=pending,in_progress&limit=200"
curl -s "http://100.105.85.5:3737/api/weekly-reviews?limit=1"
```

- **Goals** are the ground truth of intent — use `priority` (p0–p3), `rice_score`, `kind`, and `description`. A brief whose tasks float free of the goals table is hallucination; every task carries a `goal_id` when a matching goal exists.
- **Latest weekly review** is the ground truth of momentum — its `next_actions`, `flags`, and metrics tell you what last week left undone. If it's older than ~10 days, note that in the brief's context rather than treating it as current.
- API down → `systemctl --user start command-center`, retry once, then ABORT at `anchor`.

## Step 2 — Explore (open-ended, yours)

Decide what else you need to know **this week** to rank well, and dispatch **2–4 read-only sub-agents** (Agent tool) to get it. You write their prompts — each prompt states the outcome you need ("tell me which open leads have gone >5 days without a reply, oldest first, with links"), not a procedure. Angles that have mattered before — a menu, not a checklist: story pipeline state, LinkedIn cadence vs the 2x/week target, engage queue backlog, open leads aging, `docs/lessons.md` recency, Postiz queue vs `pipeline.posts`. Skip what doesn't matter this week; chase what does.

Rules for this stage:
- Sub-agents are **read-only** — no writes, no story queuing, no schedule creation.
- A sub-agent failing or returning nothing degrades that angle (note it in the brief's context) — never abort over exploration.
- Don't gather for gathering's sake: if the anchors already determine the ranking, two sub-agents are plenty.

Domain facts that have burned a brief before (encode these in any prompt that touches the area):
- **Read goal descriptions, not titles — and check trigger conditions** (2026-07-11): a goal's description often names a precondition ("send within 7 days of audit delivery"). A task whose trigger hasn't happened is not actionable, whatever its RICE score — rank the upstream task that creates the trigger instead. The first brief ranked "send testimonial asks" #1 on title + RICE alone; Simon has delivered zero audits, so there was no one to ask.
- **Engage inventory: respect skips, weigh age, diagnose staleness** (2026-07-11): Simon's skips persist in `engage_comments.status` (and `stale` on `engage_posts`) — skipped/engaged/stale rows are done, never backlog. Drafted replies decay fast, so check `posted_at` before counting them actionable: the first brief ranked 4-day-old drafts #1 and Simon skipped the whole list. But don't just discount old drafts — if inventory is consistently stale at first sight, the sweep is missing the targets' posting windows; the brief should flag that as the system problem (per-target pattern-adaptive sweep timing), not prescribe posting stale replies.

## Step 3 — Rank and compose

Apply the objective function to everything you now know. Output: **3–5 tasks**, each:

- `rank` — 1 = do first
- `task` — concrete, starts with a verb, names its object (≤120 chars; the card shows this line)
- `why` — one or two sentences, the diagnostic reason this ranks where it does (shown on expand)
- `payoff` — `revenue` | `compounding` | `system`
- `est_minutes` — honest integer estimate; nothing over ~240 (bigger than half a day → break off this week's slice)
- `goal_id` — uuid of the matching goals row, or omit if genuinely none (then say in `why` why it's still on the list)

Plus `title` ("Week of {week_start}: <7-word theme>") and `summary_md` — **under 200 words** of context: what shaped the ranking, what you deliberately left off, any degraded data sources. Brand voice: direct, diagnostic, no filler, no hedging.

## Step 4 — Validation gate, then write

**Run the validator, don't eyeball it**: `node scripts/validate-brief.mjs <payload.json> <goals.json>` enforces the whole gate below (3–5 tasks, ranks 1..N with no gaps, payoff + est_minutes on every task, ≥2 distinct payoff kinds, every `goal_id` present in the Step 1 goals snapshot) and exits 1 on any failure. Never POST a payload the script rejects.

Gate (check mechanically before the POST — any failure means fix or ABORT at `write`, never post junk):
- 3–5 tasks; ranks are 1..N with no gaps; every `task` non-empty; every task has `payoff` and `est_minutes`; at least two distinct `payoff` values across the set; every `goal_id` you include exists in the Step 1 goals response.

```bash
curl -s -X POST "http://100.105.85.5:3737/api/briefs" -H 'content-type: application/json' \
  -d @/tmp/weekly-brief-payload.json
```

Payload: `{week_start, title, summary_md, tasks}` (write the JSON with python `json.dump`, not hand-escaping). Expect **201** with the row. Non-201 → ABORT at `write` with the response body, and print the composed brief in chat anyway — the thinking is not lost to a write error.

## Step 5 — Verify, log, print

1. `curl -s "http://100.105.85.5:3737/api/briefs?limit=1"` — gate: newest row id matches the 201 response, `week_start` correct, task count matches. Mismatch → ABORT at `verify` naming the field.
2. One `pipeline.logs` entry (creds from `projects/command-center/.env`; note **`Content-Profile: pipeline`**):
   ```bash
   curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/logs" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "content-type: application/json" -H "Content-Profile: pipeline" \
     -d '{"workflow_id":"<workflowId>","entity_id":"<brief row id>","step_name":"weekly_brief_complete","stage":"complete","output_summary":"Week of <ws>: <n> tasks (<payoff mix>)","model_version":"<current model>","status":"success"}'
   ```
   Failure paths log the same entry with `status:"error"` and the failed stage. A failed log write is reported, never silently dropped — but doesn't un-ship the brief.
3. Print the full brief in chat (tasks with why + estimates, then the context) and end with the rank-1 task as the Next Action.

## Error Handling

| Failure | Action |
|---------|--------|
| Anchor read fails (goals or weekly-reviews API) after one service-restart retry | ABORT at `anchor` |
| Latest weekly review absent entirely | Proceed — note "no weekly review on record" in `summary_md`, lean harder on goals |
| A Step 2 sub-agent fails / returns nothing | Degrade that angle with a note in `summary_md` — never abort |
| Validation gate fails and can't be honestly fixed | ABORT at `write` — a padded or fake-diverse brief is worse than none |
| POST non-201 | ABORT at `write` with response body; still print the brief in chat |
| Verify mismatch | ABORT at `verify` naming the field |
| `pipeline.logs` write fails | Report it; brief stands |
