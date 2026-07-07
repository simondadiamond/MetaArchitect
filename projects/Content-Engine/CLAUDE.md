@../../brand/brand-summary.md

# Content Engine — Agent Instructions

This folder is the **data layer + execution tools for the live content flow**, plus the archived WAT pipeline.

**What's live here:**
- The `pipeline.*` Supabase schema (posts, ideas, hooks_library, humanity_snippets, logs, …) — the canonical content datastore
- `tools/` — deterministic execution scripts (Supabase data ops, carousel builder, Postiz comment nudger)
- `/score` — the one live slash command in `.claude/commands/`; the only thing that writes `performance_score`
- `.claude/skills/supabase.md` — the column registry and canonical home of the averaging/promote-retire formulas

**The live content flow** (runs from repo root, not here): `teardown-research → teardown-generate → /repurpose → Postiz scheduling`. Those skills read and write `pipeline.*` through the tools in this folder.

**What's archived:** the original WAT weekly-LinkedIn pipeline (/capture, /harvest, /editorial-planner, /research, /draft, /review, /publish, /week and their skills) — dormant since April 2026, moved to `archive/` on 2026-07-07. See [archive/README.md](archive/README.md) for what it was, why it's kept, and the known-bugs list any revival must fix first.

---

## Data Rules (non-negotiable)

1. **Everything goes through `tools/supabase.mjs`.** Never call Supabase MCP from inside commands or recurring scripts (token-conscious rule); MCP is for one-shot DDL and interactive diagnostics only. No raw `@supabase/supabase-js` imports either.
2. **Column registry**: `.claude/skills/supabase.md` — read it before any pipeline write. All columns are snake_case.
3. **`pipeline.posts` is canonical; Postiz is delivery-only.** `draft_content` on the row is the single source of truth for post text.
4. **Editing a scheduled post** = ONE script that: deletes the old Postiz post, re-creates it with new content, writes new `postiz_id` + `draft_content` back to the row, logs to `pipeline.logs`, and ntfy-pings Simon with what changed. Never edit only one side. (Full rule + re-queue addendum in supabase.md.)
5. **Act on captured row ids, never re-query by attribute.** Capture `id`s from the first read and pass them through the workflow — re-querying by topic/status/content mid-run hits the wrong row when data shifts underneath you (lessons 2026-07-06/07).
6. **Test runs that write pipeline tables end by rejecting their rows** (status `rejected` or delete) — never leave smoke/test rows looking like real drafts (lessons 2026-07-06/07).

### Posts status flow
`planned → researching → research_ready → drafted → approved → scheduled → published → scored` (`rejected` at any gate).
`scheduled` = queued in Postiz (`postiz_id` + `scheduled_at` set). Use exactly this value when scheduling — Command Center's `/content` table and its published-reconciler key off `status === "scheduled"`; `approved` rows with a `postiz_id` render as unscheduled (2026-07-06 lesson).

---

## Tools — Execution Scripts

All tools live in `tools/` (relative to this folder). **Before building anything new, check here first.**

| Tool | Status | Purpose |
|------|--------|---------|
| `postiz.mjs` | **live** | The ONLY sanctioned path for scheduling/editing/cancelling posts via Postiz — encodes Data Rules 3–5 atomically (delete+recreate+row-update+log+ntfy). `node tools/postiz.mjs <schedule/edit/cancel/upload/list> …`, every op takes a `pipeline.posts` row id |
| `supabase.mjs` | **live** | Pipeline data layer — reads/writes `pipeline.*`; STATE log/lock helpers. `import { getRecords, getRecord, patchRecord, createRecord, deleteRecord, upsertRecord, logEntry, setLock, clearLock, TABLES, db } from './tools/supabase.mjs'` |
| `db.mjs` | **live** | CLI wrapper for supabase.mjs — `node tools/db.mjs <get/getone/patch/create/delete/log/setlock/clearlock> …` (pass `-` to read JSON from stdin) |
| `carousel.mjs` | **live** | LinkedIn carousel builder — fetches brand-styled 1080x1350 slide PNGs from simonparis.ca OG routes; outputs a PDF (native document post) or numbered PNGs (Postiz multi-image) |
| `draft-complete.mjs` | **live** | Writes a drafted post to `pipeline.posts` from a stdin JSON payload (used by /repurpose and drafting flows) |
| `research-complete.mjs` | **live** | Writes research results (UIF + hooks) to the pipeline from a stdin JSON payload |
| `postiz-comment-nudge.mjs` | **live** | ntfy-pings Simon ~30 min before and at each scheduled Postiz publish with the row's `first_comment` (Postiz can't post LinkedIn comments). Dedupes via `.tmp/nudge-sent.json` |
| `supabase-migrate.mjs` | historical | One-time Airtable → Supabase migration (idempotent, `--dry-run`); keep for reference, nothing to migrate anymore |
| `_smoke_capture.mjs` / `_smoke_research.mjs` | test | Smoke tests for the Supabase data path (no LLM calls). If run, they must clean up / reject their rows (Data Rule 6) |
| `research-perplexity.mjs` | dormant | WAT-era Perplexity runner for the archived `/harvest`; imports `airtable.mjs`, which now lives in `archive/tools-deprecated/` — broken until ported |

`airtable.mjs` and `_draft_check.mjs` (Airtable-era) were moved to `archive/tools-deprecated/` on 2026-07-07.

---

## Commands

| Command | Gate | Notes |
|---------|------|-------|
| `/score` | Post `status = "published"` + `performance_score IS NULL` | The only live command in this folder. Writes `performance_score` and updates hook/framework/snippet running averages — formulas are canonical in `.claude/skills/supabase.md` |

Everything else that used to live in `.claude/commands/` is in `archive/commands/`.

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL (`https://ashwrqkoijzvakdmfskj.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role JWT — bypasses RLS, used by `tools/supabase.mjs` |
| `SUPABASE_ANON_KEY` | Anon key (RLS-respecting clients — currently unused server-side) |
| `PERPLEXITY_API_KEY` | Perplexity API (sonar-pro) — used by research flows |
| `POSTIZ_API_URL` / `POSTIZ_API_KEY` / `NTFY_URL` | Postiz queue + ntfy pings for `postiz-comment-nudge.mjs` (source: command-center `.env`) |

`AIRTABLE_*` vars are dead — Airtable is decommissioned; safe to remove from `.env`.

LLM calls run via the Claude Max subscription (Claude Code in-session, or `claude -p` headless for cron). **No `ANTHROPIC_API_KEY` — never call the SDK directly.**

Load from `.env` at repo root (dotenv walks up automatically). Never hardcode values.

---

## STATE Requirements — Medium Risk Minimum (S + T + E)

Every command or script that **writes to Supabase** or calls an external API must satisfy S + T + E (full spec: `../../brand/state-framework.md`):

**S — Structured**: Initialize a state object before any work.
```javascript
const state = {
  workflowId: randomUUID(),
  stage: "init",
  entityType: "idea" | "post" | "hook",
  entityId: "<pipeline row uuid>",
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};
```

**T — Traceable**: Log every LLM call and external API call to `pipeline.logs` via `logEntry()`.
```javascript
{ workflow_id, entity_id, step_name, stage, timestamp, output_summary, model_version, status: "success" | "error" }
```

**E — Explicit**: All LLM/API output passes a validation gate before any Supabase write. Invalid output → error path, never silent continue.

### Lock Pattern
Set a timestamp lock (`setLock`) before any expensive/long operation on a row; clear it (`clearLock`) on the failure path. **The Reboot Test**: if the system reboots mid-workflow, the lock field is the checkpoint — check it at startup to detect in-progress or completed work.

### Error Format
```
❌ [Command] failed at [stage] — [error message] — lock reset, safe to retry
```

---

## Self-Improvement Loop

When something breaks:
1. Identify root cause (stochastic agent failure vs. deterministic tool failure)
2. Fix the tool in `tools/`
3. Verify the fix
4. Update the relevant SOP/skill (`.claude/skills/supabase.md` for data rules) and add a `docs/lessons.md` entry at repo root
5. Log the failure as a potential content asset

---

## Where to Find Things

All paths relative to `projects/Content-Engine/` (this folder).

| Asset | Location |
|-------|---------|
| Live command (`/score`) | `.claude/commands/score.md` |
| Column registry + data-layer skill | `.claude/skills/supabase.md` |
| Execution scripts | `tools/` |
| Archived WAT pipeline (commands, skills, deprecated tools) | `archive/` — read `archive/README.md` first |
| Runtime temp state (gitignored) | `.tmp/` |
| Session logs + plans | `docs/` |
| Brand guidelines, ICP, STATE framework | `../../brand/` |
| Funnel assets | `../../funnel/` |

---

## Key Rules

1. `performance_score` — the only scoring signal for the self-improvement loop; written only by `/score`
2. `post_url` — required on every published row (the reconciler stamps it; if a published post is deleted and re-queued, null it — see supabase.md re-queue addendum)
3. STATE S+T+E minimum on everything that writes or calls APIs
4. Validate all LLM output before any Supabase write
5. Postiz is delivery-only — never treat it as the source of truth

State Beats Intelligence.

# RTK
Handled by a global PreToolUse hook — no instructions needed here.
