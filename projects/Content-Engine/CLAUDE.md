# Content Engine — Agent Instructions

You are operating within the **WAT framework** (Workflows, Agents, Tools) enforcing the **STATE Framework** (Structured, Traceable, Auditable, Tolerant, Explicit) on all outputs.

**Your role**: Layer 2 — the decision-maker. Read the relevant workflow, call the right tools in the right order, validate outputs before writing, and recover from failures without losing state.

---

## The WAT Architecture

| Layer | What | Where |
|-------|------|-------|
| **Workflows** | Markdown SOPs — the instructions | `.claude/commands/` (slash commands) + `.claude/skills/` (skill context) |
| **Agents** | Intelligent coordination — you | This file |
| **Tools** | Deterministic execution | `projects/Content-Engine/tools/` |

**The separation that makes this reliable**: reasoning stays with you; side effects stay in tools.

---

## Pipeline Stage Map

| Stage | Command | Gate |
|-------|---------|------|
| 1. Idea Capture | `/capture` | None |
| 2. Editorial Planning | `/editorial-planner` | ≥3 ideas with `Status = "New"` + UIF exists (shallow research runs at capture) |
| 2b. Backlog View | `/ideas` (deprecated) | Read-only display only |
| 3. Research | `/research` | Post stub `status = "planned"` + `research_started_at` empty |
| 4. Draft | `/draft` | Post stub `status = "research_ready"` |
| 5. Review | `/review` | Post `status = "drafted"` |
| 6. Publish | `/publish` | Post `status = "approved"` |
| 7. Score | `/score` | Post `status = "published"` + `performance_score IS NULL` |

All stages are Claude Code slash commands. See [workflows/README.md](workflows/README.md) for the full index.

---

## Tools — Execution Scripts

All tools live in `projects/Content-Engine/tools/`. Run from repo root.

> **Airtable operations use MCP tools directly** — no node scripts for Airtable reads/writes. See `.claude/skills/airtable.md` for the field ID registry and MCP tool reference.

| Tool | Purpose | Invoke |
|------|---------|--------|
| `airtable.mjs` | Reusable Airtable REST client — still used by `research-perplexity.mjs` for logging | `import { getRecords, patchRecord, createRecord, TABLES } from './projects/Content-Engine/tools/airtable.mjs'` |
| `research-perplexity.mjs` | Run Perplexity queries (sonar-pro) + log to Airtable | Called by `/research` command |
| `_draft_check.mjs` | Dev utility — probe Airtable field names | `node projects/Content-Engine/tools/_draft_check.mjs` |

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
| `ideas` | `research_depth` — single select: `shallow` (capture) or `deep` (after /research) |
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
| `AIRTABLE_PAT` | Personal Access Token |
| `AIRTABLE_BASE_ID` | Base ID (starts with `app`) |
| `AIRTABLE_TABLE_IDEAS` | ideas table ID |
| `AIRTABLE_TABLE_POSTS` | posts table ID |
| `AIRTABLE_TABLE_HOOKS` | hooks_library table ID |
| `AIRTABLE_TABLE_FRAMEWORKS` | framework_library table ID |
| `AIRTABLE_TABLE_SNIPPETS` | humanity_snippets table ID |
| `AIRTABLE_TABLE_LOGS` | logs table ID |
| `AIRTABLE_TABLE_BRAND` | brand table ID |
| `PERPLEXITY_API_KEY` | Perplexity API (sonar-pro, used in research phase) |
| `ANTHROPIC_API_KEY` | Claude API (all LLM calls) |

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
  entityId: "<airtable record ID>",
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
4. Update the relevant workflow SOP in `.claude/commands/`
5. Every failure loop ends by logging as a potential content asset (`/capture` the insight)

---

## Where to Find Things

| Asset | Location |
|-------|---------|
| Pipeline SOPs (slash commands) | `.claude/commands/` |
| Reusable skill definitions | `.claude/skills/` |
| Execution scripts | `projects/Content-Engine/tools/` |
| Runtime temp state | `projects/Content-Engine/.tmp/` |
| Session logs + plans | `projects/Content-Engine/docs/` |
| Brand guidelines, ICP, STATE framework | `brand/` |
| Funnel assets | `funnel/` |

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

