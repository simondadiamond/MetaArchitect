---
name: weekly-review
description: Use when Simon says "weekly review", "/weekly-review", "how did this week go", asks for a Friday or end-of-week wrap-up, or wants the week's operating numbers before planning next week.
---

# /weekly-review

## Purpose

Compile the weekly operating review for The Meta Architect: goals movement, content cadence vs the 2x/week LinkedIn target, **ICP conversations started vs the ≥2/week target (the headline metric — conversations, not engagement)**, story pipeline health, superstar-list health, lead follow-ups, lessons logged, and (when available) MailerLite subscriber counts. Write the review to `public.weekly_reviews` so Command Center displays it, then print it in chat.

Everything is read-only except two writes: the `weekly_reviews` insert and one `pipeline.logs` run entry.

---

## STATE Compliance

- **Risk: low-medium (read-mostly).** State object: `workflowId` + `stage` only — the full S schema is not required for read-mostly flows; the E validation gates in the scripts are the load-bearing controls. `workflowId` = `weekly-review-<YYYYMMDDTHHMMSS>`; `stage` = the step you're on (gather → compose → insert → verify → log), named in every error.
- **T — Traceable**: log run completion (or failure) to `pipeline.logs` (Step 5).
- **E — Explicit**: every external response is validated before use. `gather.sh` enforces a JSON-array gate on every PostgREST query and exits non-zero naming the failed stage. **Never compose the review from partial core data.** Core sources (goals, posts, stories) ABORT on failure; optional sources (MailerLite, lessons.md) degrade with an explicit note inside the review — silent omission is a violation.
- Error format (mandatory on any abort):
  ```
  ❌ /weekly-review failed at [stage] — [error message] — nothing written, safe to retry
  ```

---

## Step 0 — Week boundaries + workflowId

`week_start` = Monday of the current ISO week:

```bash
python3 -c 'import datetime as d;t=d.date.today();print((t-d.timedelta(days=t.weekday())).isoformat())'
```

The review covers `[week_start, week_start + 7d)`. To review a past week, pass that week's Monday as the argument to `gather.sh`. Set `workflowId = weekly-review-<YYYYMMDDTHHMMSS>` — it goes into the Step 5 log entry.

## Step 1 — Gather data

```bash
bash /home/diamond/projects/MetaArchitect/.claude/skills/weekly-review/scripts/gather.sh > /tmp/weekly-review-data.json
# or: gather.sh 2026-06-29 for a specific week
```

Emits one validated JSON object: `{week_start, week_end, stale_cutoff, goals: {in_progress, completed_this_week, newly_blocked, stale_in_progress}, posts, stories, leads, open_leads, superstars, postiz_drift, engage, lessons, mailerlite, previous_review}`. Non-zero exit = ABORT with the script's `FAILED at <stage>` message. **The exact queries live in `scripts/gather.sh`** — that script is the single source of truth for REST paths, credentials, and validation; don't re-derive them here.

Core sources (goals, posts, stories) abort the script. Everything else is optional and degrades to `{"skipped": true, "reason": ...}` — surface every skip in Flags, never abort over one.

**Reading the optional blocks:**
- `engage` — `{drafted_this_week, engaged, skipped, still_new, sweep_post_errors}`. `drafted_this_week = 0` for a full week means the sweep or triage is dead or the threshold is too strict — flag it; `still_new` piling up means Simon isn't working the queue — a cadence miss, not a system failure; `sweep_post_errors > 0` names posts stuck in `status='error'` (retryable by resetting to `'triaged'`).
- `superstars` — `{targets, posts_this_week}` from `public.engage_targets` (the active target list). Join `posts_this_week.target_id` → targets. **Demotion candidates**: active targets with zero swept posts this week. **Promotion candidates**: targets whose posts keep producing `engaged` replies. The review only names candidates — Simon makes the `priority`/`active` edits. Weekly LinkedIn analytics (which superstars drove ICP-aligned profile visits) stay a manual Simon step — prompt for it, don't fake numbers.
- `open_leads` — the whole lead pipeline, oldest first. Group by `status`; name leads sitting in an early status >7 days (follow-up or explicit stage move needed). The review prompts the moves — Simon makes them in `/admin`.
- `postiz_drift` — `{pipeline_scheduled, pipeline_rows, postiz_queued, drift}`. `drift: true` means the count of `pipeline.posts` rows at `status=scheduled` with a future `scheduled_at` doesn't match Postiz's queue — investigate before calling anything "vanished" (the 2026-07-07 false alarm). Postiz side unreadable → the block carries a nested skip note.

**Gotchas (the non-obvious rules — everything mechanical is in gather.sh):**
- Goal `status` vocabulary is `pending | in_progress | done | blocked | archived` — there is no "parked" status. Parked goals are `status=blocked` rows whose title starts with `[PARKED]`. In the review, call those "parked", not "blocked" — a `[PARKED]` goal is a deliberate deferral, a bare `blocked` goal is an obstruction.
- Content-Engine tables live in the **`pipeline` schema** — reads need `Accept-Profile: pipeline`, writes need `Content-Profile: pipeline`. Without the header PostgREST looks in `public` and 404s.
- `stories.stage` terminal values: `merged | failed | needs_review`. "Cancelled" stories are `stage=failed` with `error` starting with "cancelled" — count them as cancelled, not real failures, in the narrative (metrics count raw `failed`).
- Lessons: parse `docs/lessons.md` for headings matching `^## YYYY-MM-DD — title`; keep dates within the week. Entries are NOT in chronological file order — filter by date, don't take the tail.
- **A lead = an actual two-way exchange started** (DM reply, comment thread that turned into a real exchange, inbound inquiry) — a sent-but-unanswered DM is not a conversation. `conversations_started` = count of leads rows created this week. The `leads` table may not exist yet — gather.sh probes it and degrades gracefully if absent.
- `subscribers_delta` = current `subscribers_total` − `previous_review[0].metrics.subscribers_total`. Omit both subscriber keys if MailerLite was skipped; omit delta if there's no previous review with a total.

### Step 1b — Skill freshness (recurring gate from the 2026-07-07 audit)

```bash
cd /home/diamond/projects/MetaArchitect && ./scripts/skill-lint.sh
```

Surface every `FAIL:` line in Flags and every `warn:` line in the review body (Flags or Lessons context, your call). Lint won't run → note that in Flags; never abort.

## Step 2 — Compose the review

Brand voice: direct, diagnostic, concrete. Numbers first, then diagnosis. Name specific goals/stories/posts — no "several items progressed". No filler, no "great week!", no hedging. It reads like a COO wrote it, not a dashboard export. **Under ~500 words.**

Template (`summary_md`):

```markdown
# Week of {week_start}

## Scoreboard
| Metric | This week | Target |
|--------|-----------|--------|
| ICP conversations started | N | 2 |    <!-- headline metric; omit row + note skip in Flags until leads table exists -->
| LinkedIn posts published | N | 2 |
| Engage replies posted / drafted | N / N | ~5/day drafted |    <!-- from engage block; omit row + note skip in Flags if engage skipped -->
| Posts drafted | N | — |
| Stories merged / failed | N / N | — |
| Goals completed | N | — |
| Stale in-progress goals | N | 0 |
| Scheduled queue drift (pipeline vs Postiz) | N vs N | match |    <!-- from postiz_drift; Postiz side skipped → "N vs manual check" and note in Flags -->
| Subscribers | N (+/-Δ) | — |    <!-- omit row if MailerLite skipped; note the skip in Flags -->

## What shipped
- {concrete completed goals + merged stories, named. Empty week → say so plainly.}

## Cadence check
{published vs 2/week target. Behind → say behind and why (no drafts in pipeline? drafts stuck at review?). Diagnose from post statuses, don't just report.}

## Superstar list & lead follow-ups
- {superstar list: N active targets; demotion candidates (zero swept posts this week) and promotion candidates (repeat engaged replies), named. Remind Simon: 5-min LinkedIn analytics pass — which superstars drove ICP-aligned profile visits — then apply priority/active edits in engage_targets. Source skipped → note in Flags.}
- {open leads by status; leads stuck in an early status >7 days named as follow-ups; engagements due a renewal check. Skipped → note in Flags.}

## Goal drift & stale items
- {in_progress goals untouched >14 days, named with days idle}
- {newly blocked goals + what blocks them}

## Lessons logged
- {date — one-line title, per lessons.md entry this week. None → "None logged — either a clean week or nobody wrote them down."}

## Flags
- {risks needing attention: failed stories, needs_review pileups, cadence misses, skipped data sources, Postiz queue drift, skill-lint FAIL lines}

## Next week's top 3
1. {specific, actionable}
2. ...
3. ...
```

## Step 3 — Insert into `weekly_reviews`

Build the payload, then run the insert script (it validates the payload, handles the table-not-yet-created case, and prints the inserted row):

```bash
cat > /tmp/weekly-review-payload.json <<'EOF'
{
  "week_start": "2026-06-29",
  "title": "Week of 2026-06-29",
  "summary_md": "…full markdown…",
  "metrics": {
    "posts_published": 0, "posts_target": 2,
    "stories_merged": 0, "stories_failed": 0,
    "goals_completed": 0, "goals_stale": 0,
    "conversations_started": 0, "conversations_target": 2,
    "subscribers_total": 0, "subscribers_delta": 0
  },
  "flags": ["…"],
  "next_actions": ["…", "…", "…"]
}
EOF
bash /home/diamond/projects/MetaArchitect/.claude/skills/weekly-review/scripts/insert-review.sh /tmp/weekly-review-payload.json
```

(Write the payload with a heredoc or a small python `json.dump` — summary_md contains quotes and newlines; do not hand-escape it.)

- `metrics` jsonb: `posts_published, posts_target, stories_merged, stories_failed, goals_completed, goals_stale` required; `subscribers_total, subscribers_delta` optional (omit when MailerLite skipped / no previous total); `conversations_started, conversations_target` optional (omit if the leads table is absent — skip goes in Flags).
- `flags` jsonb: array of strings. `next_actions` jsonb: array of strings (next week's top 3).
- Table is `public.weekly_reviews` (no schema header needed). `week_start` is a `date` (the Monday); `title` = `"Week of {week_start}"`.
- **Exit 0** → row inserted, stdout is the row JSON (capture the `id`).
- **Exit 2** → table missing (PGRST205 on both of 2 attempts); review was saved to `projects/Content-Engine/.tmp/weekly-review-fallback.md`. Tell Simon the table is missing and the review is in the fallback file. Do NOT create the table yourself.
- **Exit 1** → real insert failure. ABORT loudly with the response body, but still print the composed review in chat and save it to the fallback path — the compilation work is not lost to a write error.

## Step 4 — Verify the row

Read it back and confirm it renders (skip if Step 3 fell back to file):

```bash
cd /home/diamond/projects/MetaArchitect/projects/command-center && set -a && source .env && set +a
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/weekly_reviews?id=eq.<ROW_ID>&select=id,week_start,title,summary_md,metrics,flags,next_actions" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Gate: exactly one row; `week_start` matches; `summary_md` non-empty and starts with `# Week of`; `metrics` has the six required keys; `flags`/`next_actions` are arrays. Any mismatch → ABORT with the error format (the row exists but is malformed — say which field).

## Step 5 — Log the run + print

One Traceable entry to `pipeline.logs` (note **`Content-Profile: pipeline`** — it's a write):

```bash
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/logs" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "content-type: application/json" -H "Content-Profile: pipeline" \
  -d '{"workflow_id":"<workflowId>","entity_id":"<row id or week_start>","step_name":"weekly_review_complete","stage":"complete","output_summary":"Week of <ws>: <n> published, <n> merged, <n> goals done; inserted <row id | fallback>","model_version":"<current model>","status":"success"}'
```

On failure paths, log the same entry with `status: "error"` and the failed stage in `output_summary`.

Then print the **full review markdown in chat** and end with the single most important next action (COO rule — never end without one).

---

## Error Handling

| Failure | Action |
|---------|--------|
| `.env` missing / vars unset | ABORT at `env` |
| goals / posts / stories query fails or returns non-array | ABORT at that stage (core data — no partial reviews) |
| `leads` / `open_leads` block skipped (table absent or unreadable) | SKIP conversations metric / follow-ups line with note in Flags |
| `engage` block skipped / zero drafts all week / sweep_post_errors > 0 | SKIP row or FLAG per the diagnostic reading in Step 1 — never abort over engage |
| `superstars` block skipped | SKIP superstar-list section with note in Flags — never abort |
| `postiz_drift` skipped (pipeline side) or Postiz side unreadable | SKIP or half-fill the drift row with note in Flags — never abort |
| `skill-lint.sh` won't run | Note in Flags — never abort |
| `docs/lessons.md` missing | SKIP section with note in review |
| No MailerLite key found | SKIP subscribers with note in Flags |
| MailerLite call fails / invalid JSON | SKIP subscribers with note in Flags |
| `weekly_reviews` insert → PGRST205 (table missing) | RETRY once after 5s — 2 attempts total (handled by `insert-review.sh`) |
| Still missing after 2 attempts | Fallback: save markdown to `projects/Content-Engine/.tmp/weekly-review-fallback.md`, tell Simon, still print review in chat |
| Insert fails for another reason | ABORT loudly with response body; print review in chat + save fallback anyway |
| Verify GET returns 0 rows or malformed fields | ABORT naming the bad field |
| `pipeline.logs` write fails | Report it, but don't discard the finished review |

Skips must surface in the review's Flags section. Aborts must use the error format and never claim partial success.
