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
| 2. Idea Selection | `/ideas` | `Status = pending_selection` |
| 3. Research | `/research` | `Status = Selected` + `research_started_at IS NULL` |
| 4. Draft | `/draft` | `Status = Ready` + `research_completed_at IS NOT NULL` |
| 5. Review | `/review` | `status = drafted` |
| 6. Publish | `/publish` | `status = approved` |
| 7. Score | `/score` | `status = published` + `performance_score IS NULL` |

All stages are Claude Code slash commands. See [workflows/README.md](workflows/README.md) for the full index.

---

## Tools — Execution Scripts

All tools live in `projects/Content-Engine/tools/`. Run from repo root.

| Tool | Purpose | Invoke |
|------|---------|--------|
| `airtable.mjs` | Reusable Airtable client — import in all scripts | `import { getRecords, patchRecord, createRecord, TABLES } from './projects/Content-Engine/tools/airtable.mjs'` |
| `research-init.mjs` | Load brand + idea context for research | `node projects/Content-Engine/tools/research-init.mjs` |
| `research-lock.mjs` | Set research lock + STATE init | `node projects/Content-Engine/tools/research-lock.mjs` |
| `research-perplexity.mjs` | Run 3 Perplexity queries (sonar-pro) | Called internally |
| `research-hooks.mjs` | Extract + write hooks to hooks_library | Called internally |
| `research-fetch.mjs` | Fetch + lock override utility | Called internally |
| `.tmp_research.mjs` | Research pipeline runner (phase1–4 + unlock) | `node projects/Content-Engine/tools/.tmp_research.mjs <phase1\|phase2\|phase3\|phase4\|unlock>` |
| `.tmp_draft.mjs` | Write pre-generated drafts to Airtable | `node projects/Content-Engine/tools/.tmp_draft.mjs` |
| `_draft_check.mjs` | Dev utility — probe Airtable field names | `node projects/Content-Engine/tools/_draft_check.mjs` |

**Before building anything new**: check `tools/` first. Only create new scripts when nothing exists for the task.

---

## Temp Files

Runtime state lives in `projects/Content-Engine/.tmp/` (gitignored). These files are disposable — they can always be regenerated.

| File | Written by | Read by |
|------|-----------|---------|
| `.research_ctx.json` | phase1 | phase2, phase3, phase4, unlock |
| `.research_queries.json` | Claude (you) | phase2 |
| `.research_results.json` | phase2 | phase3 |
| `.research_uif.json` | Claude (you) | phase3 |
| `.research_hooks.json` | Claude (you) | phase4 |

**The Reboot Test**: if this system reboots mid-pipeline, the `.tmp/` files let it resume from the last completed phase — not from scratch.

---

## Data Model — Quick Reference

### Status Flows
- `ideas`: `New → Selected → (lock) Researching → Ready | Research_failed`
- `posts`: `drafted → approved | rejected → published → scored`
- `hooks_library`: `candidate → proven | retired`

### Field Name Gotchas (case-sensitive, exact names required)

| Table | Gotcha |
|-------|--------|
| `ideas` | `Topic` (not "title"), `Status` (not "status"), `Intelligence File` (not "intelligence_file") |
| `ideas` | `research_started_at`, `research_completed_at` (lowercase, underscore) |
| `ideas` | `score_audience_relevance` exists — **never read or write it** |
| `ideas` | `Summary (AI)`, `Next Best Action (AI)` — **Airtable-managed, never write** |
| `posts` | `status` (lowercase), `idea_id` (linked record — write as array `["recXXX"]`) |
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
```javascript
// Before expensive operation:
await patchRecord(TABLES.IDEAS, id, { research_started_at: new Date().toISOString() });
// On failure — clear the lock:
await patchRecord(TABLES.IDEAS, id, { research_started_at: null, Status: "Research_failed" });
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
