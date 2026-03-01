@brand/state-framework.md
@brand/brand-guidelines.md
@brand/icp.md

# The Meta Architect — Brand OS

This is the command-driven workspace for Simon Paris's solo content brand: **The Meta Architect** (simonparis.ca).
Focus: AI reliability engineering content for practitioners.

## Repository Layout

```
.claude/commands/   — slash commands for the content pipeline (/capture, /research, /draft, etc.)
.claude/skills/     — reusable skill definitions (airtable, fetcher, researcher, writer, etc.)
brand/              — brand reference files (state-framework.md, brand-guidelines.md, icp.md)
lib/                — Node.js utility scripts (airtable.mjs, research-*.mjs)
funnel/             — landing pages, lead magnets, workshop assets
projects/           — project-specific folders (cohort-beta, readiness-audit, auto-root-eval)
docs/               — system briefs, design docs, session logs
```

Run all slash commands from the **repo root**. All `lib/` scripts and `.env` resolution assume the repo root as the working directory.

---

## Pipeline Stage Map

| Stage | Command | Status Field Gate |
|---|---|---|
| 1. Idea Capture | `/capture` | prompts for input → writes `status = pending_selection` |
| 2. Idea Selection | `/ideas` | requires `status = pending_selection` → writes `status = selected` |
| 3. Research | `/research` | requires `status = selected` + `research_started_at IS NULL` → writes `status = researched` |
| 4. Draft | `/draft` | requires `status = researched` + `research_completed_at IS NOT NULL` → writes `status = drafted` |
| 5. Review | `/review` | requires `status = drafted` → writes `status = approved` or `rejected` |
| 6. Publish | `/publish` | requires `status = approved` → writes `status = published` |
| 7. Score | `/score` | requires `status = published` + `performance_score IS NULL` → writes `status = scored` |

**All stages are Claude Code slash commands.** No external n8n workflows required.

---

## Data Model Summary

### `ideas` table
Status flow: `processing` → `pending_selection` → `selected` → `researching` → `researched` → `research_failed`

Key fields: `title`, `status`, `intent`, `content_brief` (JSON — UIF seed), `intelligence_file` (JSON — UIF v3.0),
`score_overall`, `score_brand_fit`, `score_originality`, `score_monetization`, `score_production_effort`,
`score_virality`, `score_authority`, `score_rationales`, `recommended_next_action`,
`selected_at`, `research_started_at`, `research_completed_at`

**Note**: `score_audience_relevance` exists in Airtable but is **never read or displayed** by any command.

### `posts` table
Status flow: `drafted` → `approved` → `rejected` → `published` → `scored`

Key fields: `idea_id` (linked record), `platform`, `intent`, `format`, `draft_content`,
`hook_id` (linked), `framework_id` (linked), `humanity_snippet_id` (linked), `needs_snippet` (boolean),
`post_url`, `performance_score`, `score_source`,
`drafted_at`, `approved_at`, `published_at`

### `hooks_library` table
Status flow: `candidate` → `proven` | `retired`

Key fields: `hook_text`, `hook_type`, `source_idea` (linked), `angle_name`, `intent`,
`status`, `avg_score`, `use_count`, `created_at`

### `framework_library` table
Status flow: `candidate` → `proven` | `retired`

Key fields: `framework_name`, `pattern_type`, `best_for`, `template`,
`status`, `use_count`, `avg_score`

### `humanity_snippets` table
Key fields: `snippet_text`, `tags`, `status` (`active` / `inactive`), `used_count`

### `logs` table
Key fields: `workflow_id`, `entity_id`, `step_name`, `stage`, `timestamp`,
`output_summary`, `model_version`, `status`

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `AIRTABLE_PAT` | Airtable Personal Access Token |
| `AIRTABLE_BASE_ID` | Base ID (starts with `app`) |
| `AIRTABLE_TABLE_IDEAS` | `ideas` table ID (starts with `tbl`) |
| `AIRTABLE_TABLE_POSTS` | `posts` table ID |
| `AIRTABLE_TABLE_HOOKS` | `hooks_library` table ID |
| `AIRTABLE_TABLE_FRAMEWORKS` | `framework_library` table ID |
| `AIRTABLE_TABLE_SNIPPETS` | `humanity_snippets` table ID |
| `AIRTABLE_TABLE_LOGS` | `logs` table ID |
| `AIRTABLE_TABLE_BRAND` | `brand` table ID |
| `PERPLEXITY_API_KEY` | Perplexity API key (for `/research`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (for all LLM calls) |

Load from `.env` at repo root. Never hardcode values.

---

## Key Rules

1. `score_audience_relevance` — field exists in Airtable, **never read or displayed**
2. `performance_score` — the only scoring signal for the self-improvement loop
3. `post_url` — **never skipped** at publish; required for future metrics pipeline
4. STATE S+T+E minimum on every command that writes or calls APIs
5. Validate all LLM output through state-checker before any Airtable write
