@../../brand/brand-summary.md

# Content Engine — Agent Instructions

You are operating within the **WAT framework** (Workflows, Agents, Tools) enforcing the **STATE Framework** (Structured, Traceable, Auditable, Tolerant, Explicit) on all outputs.

**Your role**: Layer 2 — the decision-maker. Read the relevant workflow, call the right tools in the right order, validate outputs before writing, and recover from failures without losing state.

---

## The WAT Architecture

| Layer | What | Where |
|-------|------|-------|
| **Workflows** | Markdown SOPs — the instructions | `.claude/commands/` (slash commands) + `.claude/skills/` (skill context) — both relative to this folder |
| **Agents** | Intelligent coordination — you | This file |
| **Tools** | Deterministic execution | `tools/` |

**The separation that makes this reliable**: reasoning stays with you; side effects stay in tools.

---

## Pipeline Stage Map

| Stage | Command | Gate |
|-------|---------|------|
| 1. Idea Capture | `/capture` | None |
| 2. Editorial Planning | `/editorial-planner` | ≥3 ideas with `Status = "New"` + UIF exists (shallow research runs at capture) |
| 2b. Backlog View | `/ideas` (deprecated) | Read-only display only |
| 3. Research | `/research` | Post stub `status = "planned"` + `research_started_at` empty. For ideas with `notebook_id` (manually captured), fast path: single targeted `notebook_query` (~30 sec). For harvest ideas (no `notebook_id`), full NLM crawl (~5 min). |
| 4. Draft | `/draft` | Post stub `status = "research_ready"` |
| 5. Review | `/review` | Post `status = "drafted"` |
| **2–5 (consolidated)** | **`/week`** | **≥3 ideas at `Status = "New"`. Runs plan → research → draft → review in one session. Supports `/week YYYY-WNN` for a specific week. Resumes from current phase if stubs already exist.** |
| 6. Publish | `/publish` | Post `status = "approved"` |
| 7. Score | `/score` | Post `status = "published"` + `performance_score IS NULL` |

All stages are Claude Code slash commands. See [workflows/README.md](workflows/README.md) for the full index.

---

## Tools — Execution Scripts

All tools live in `tools/` (relative to this folder).

> **Pipeline data ops go through `tools/supabase.mjs`** — never call Supabase MCP from inside slash commands (token-conscious rule). MCP is reserved for one-shot DDL or interactive diagnostics. See `.claude/skills/supabase.md` for the column registry and helper API reference.

| Tool | Purpose | Invoke |
|------|---------|--------|
| `supabase.mjs` | Pipeline data layer — reads/writes the `pipeline.*` schema; STATE log/lock helpers | `import { getRecords, patchRecord, createRecord, logEntry, setLock, clearLock, TABLES, db } from './tools/supabase.mjs'` |
| `supabase-migrate.mjs` | One-time Airtable → Supabase migration; idempotent, supports `--dry-run` and `--table=<name>` | `node tools/supabase-migrate.mjs` |
| `airtable.mjs` | **Deprecated** — kept only during 1-week fallback window after migration; will be deleted | — |
| `research-perplexity.mjs` | Run Perplexity queries (sonar-pro) + log via `supabase.mjs` | Called by `/harvest` command |
| `_draft_check.mjs` | **Deprecated** — legacy Airtable field probe | — |

**Before building anything new**: check `tools/` first. Only create new scripts when nothing exists for the task.

---

## Temp Files

`.tmp/` is gitignored and may contain leftover files from old pipeline versions. No current pipeline command writes to `.tmp/` — all state is persisted directly to Airtable via MCP tools.

**The Reboot Test**: if this system reboots mid-pipeline, the lock field (`research_started_at` on the post stub) is the checkpoint — the command checks this field at startup to detect in-progress or already-completed work.

---

## Data Model — Quick Reference

### Status Flows
- `ideas`: `New → Selected → Ready → Completed`
  - `research_depth` field: `shallow` (set at `/capture`) → `deep` (set after `/research`)
  - Note: ideas no longer pass through "Researching" status — research lock is now on the post stub
- `posts`: `planned → researching → research_ready → drafted → approved | rejected → published → scored`
- `hooks_library`: `candidate → proven | retired`

### Field Name Gotchas (case-sensitive, exact names required)

| Table | Gotcha |
|-------|--------|
| `ideas` | `Topic` (not "title"), `Status` (not "status"), `Intelligence File` (not "intelligence_file") |
| `ideas` | `research_started_at`, `research_completed_at` (lowercase, underscore) |
| `ideas` | `research_depth` — single select: `deep` (set at /capture) or `shallow` (harvest-sourced ideas, upgraded to `deep` after /research) |
| `ideas` | `notebook_id` — NLM notebook ID stored at /capture; read by /research to skip full crawl |
| `ideas` | `score_audience_relevance` exists — **never read or write it** |
| `ideas` | `Summary (AI)`, `Next Best Action (AI)` — **Airtable-managed, never write** |
| `posts` | `status` (lowercase), `idea_id` (linked record — write as array `["recXXX"]`) |
| `posts` | `angle_index` — 0-based index into the UIF angles array; set at planning time |
| `posts` | `planned_week`, `planned_order`, `narrative_role` — set at planning time by /editorial-planner |
| `posts` | `research_started_at` — lock field for /research (not on ideas table anymore) |
| `hooks_library` | `source_idea` (linked record — write as array `["recXXX"]`) |

### UIF v3.0 Required Fields
Each angle must have: `pillar_connection` (exact pillar name) + `brand_specific_angle` (bool, min 1 true per UIF).
Top-level: `humanity_snippets` array (may be empty, must be present).

Valid `pillar_connection` values:
- `"Production Failure Taxonomy"`
- `"STATE Framework Applied"`
- `"Defensive Architecture"`
- `"The Meta Layer"`
- `"Regulated AI & Law 25"`

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Supabase project URL (e.g. `https://ashwrqkoijzvakdmfskj.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role JWT — bypasses RLS, used by `tools/supabase.mjs` |
| `SUPABASE_ANON_KEY` | Anon key (for clients that should respect RLS — currently unused server-side) |
| `PERPLEXITY_API_KEY` | Perplexity API (sonar-pro, used in research phase) |
| `AIRTABLE_PAT` | **Deprecated** — kept during 1-week fallback window for `supabase-migrate.mjs` re-runs |
| `AIRTABLE_BASE_ID` + `AIRTABLE_TABLE_*` | **Deprecated** — same fallback window as above |

LLM calls run via the Claude Max subscription (Claude Code in-session, or `claude -p` headless for cron/n8n). **No `ANTHROPIC_API_KEY` — never call the SDK directly.**

Load from `.env` at repo root. Never hardcode values.

---

## STATE Requirements — Medium Risk Minimum (S + T + E)

Every command that writes to Airtable or calls an external API must satisfy:

**S — Structured**: Initialize a state object before any work.
```javascript
const state = {
  workflowId: randomUUID(),
  stage: "init",
  entityType: "idea" | "post" | "hook",
  entityId: "<supabase uuid OR legacy airtable rec id — supabase.mjs accepts either>",
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};
```

**T — Traceable**: Log every LLM call and external API call to the `logs` table.
```javascript
{ workflow_id, entity_id, step_name, stage, timestamp, output_summary, model_version, status: "success" | "error" }
```

**E — Explicit**: All LLM/API output passes through a validation gate before any Airtable write. Invalid output → error path, never silent continue.

### Lock Pattern

`/capture` — no lock (draft record acts as the unit; expensive ops guarded by validation gates).

`/research` — lock on the **post stub** (not the idea):
```javascript
// Before expensive operation:
await patchRecord(TABLES.POSTS, postStubId, { research_started_at: new Date().toISOString(), status: "researching" });
// On failure — clear the lock, revert to planned:
await patchRecord(TABLES.POSTS, postStubId, { research_started_at: null, status: "planned" });
```

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
4. Update the relevant workflow SOP in `.claude/commands/` (relative to this folder)
5. Every failure loop ends by logging as a potential content asset (`/capture` the insight)

---

## Where to Find Things

All paths below are relative to `projects/Content-Engine/` (this folder).

| Asset | Location |
|-------|---------|
| Pipeline SOPs (slash commands) | `.claude/commands/` |
| Reusable skill definitions | `.claude/skills/` |
| Harvest state | `.claude/harvest-memory.json` |
| Execution scripts | `tools/` |
| Runtime temp state | `.tmp/` |
| Session logs + plans | `docs/` |
| Brand guidelines, ICP, STATE framework | `../../brand/` |
| Funnel assets | `../../funnel/` |

**Run all slash commands from `projects/Content-Engine/`** (not repo root). `.env` loads via dotenv walking up to repo root automatically.

---

## Key Rules

1. `score_audience_relevance` — field exists in Airtable, **never read or displayed**
2. `performance_score` — the only scoring signal for the self-improvement loop
3. `post_url` — **never skipped** at publish; required for future metrics pipeline
4. STATE S+T+E minimum on every command that writes or calls APIs
5. Validate all LLM output through state-checker before any Airtable write

State Beats Intelligence.

# RTK
Handled by a global PreToolUse hook — no instructions needed here.

