# The Meta Architect — Content Pipeline System Brief
**For agent onboarding. Read this fully before designing or touching any workflow.**

---

## What This System Is

A fully automated content production pipeline built in n8n that takes raw ideas (text, YouTube links, blog posts) from Telegram and moves them through capture → research → drafting → publishing. The owner operates as a solo content creator/strategist. The brand is **The Meta Architect** (simonparis.ca).

The system is governed by the **STATE framework** (see below). Every workflow must be Structured, Traceable, Auditable, Tolerant, and Explicit.

---

## Platform Stack

| Layer | Tool |
|---|---|
| Automation | n8n (local instance, localhost:5678) |
| Database / source of truth | Airtable |
| Input channel | Telegram bot |
| LLM | Claude (Anthropic) — Sonnet 4.6 preferred |
| YouTube transcripts | Supadata API |
| Blog scraping | Jina AI Reader (r.jina.ai/{url}, free) |
| Image generation | TBD — Nano Banana (budget-constrained), possibly Gemini CLI or Claude Code via local tunnel |

---

## STATE Framework — Non-Negotiable Constraints

Every workflow must comply with these five properties. Risk level determines which are mandatory:

- **Low risk** (internal, read-only, non-personal): S + T minimum
- **Medium risk** (external content, API writes, mutations): S + T + E minimum
- **High risk** (decisions affecting individuals, financial, regulated data): all five

**S — Structured**: Every workflow initializes a `workflowState` object with `workflowId`, `stage`, `entityType`, `entityId`, `startedAt`, `lastUpdatedAt`. Stage must always reflect current execution position.

**T — Traceable**: Log every LLM call and stage transition to a persistent `logs` Airtable table. Include `workflow_id`, `entity_id`, `step_name`, `stage`, `timestamp`, `output_summary`, `model_version`, `status`.

**A — Auditable**: For any decision affecting a person or using personal data, write a decision record to a separate table. (Not required for idea-capture but will apply to distribution workflows.)

**T — Tolerant**: Create a draft record in Airtable immediately (before expensive operations). Update it at each phase. On failure: update record to `failed` status, send Telegram notification with stage + workflow ID. This workflow is too fast for full checkpointing — the draft record IS the checkpoint.

**E — Explicit**: Every LLM output passes through a Code node validation gate before triggering any action (Airtable write, Telegram send). Validation checks required fields, correct types, valid enum values. Invalid output routes to error handler, never silently continues.

---

## Data Model

### Entity Hierarchy

```
ideas (1) ──────────────────────── posts (many)
```

One idea can spawn multiple posts (one per platform/format/angle). Draft statuses live on the `posts` table, not `ideas`.

### Airtable Tables

**`brand`** (single record — the brand definition)
- `name`, `colors`, `typography`, `goals`, `icp_short`, `icp_long`, `main_guidelines`

**`ideas`**
- `title`, `status`, `source_type` (text/youtube/blog), `source_url`, `raw_input`
- `workflow_id`, `intent` (authority/virality/community/education/engagement)
- `content_brief` (JSON — the UIF seed document from Brand Strategist)
- `score_brand_fit`, `score_audience_relevance`, `score_originality`, `score_monetization`, `score_production_effort`, `score_virality`, `score_authority`, `score_overall`
- `score_rationales` (JSON), `recommended_next_action`
- `captured_at`, `selected_at`, `research_started_at`, `research_completed_at`
- `status flow`: processing → captured → pending_selection → selected → researching → researched

**`posts`** (not yet built)
- `idea_id` (link to ideas), `platform`, `intent`, `format`, `content_brief`
- `draft_content`, `drafted_at`, `reviewed_at`, `approved_at`, `scheduled_at`, `published_at`
- `status flow`: new → drafting → drafted → reviewing → approved → scheduled → published

**`logs`**
- `workflow_id`, `entity_id`, `step_name`, `stage`, `timestamp`
- `output_summary`, `model_version`, `status` (success/error)

---

## Content Intent Ratios (Posting Strategy)

| Intent | Target % | Purpose |
|---|---|---|
| authority | 50% | Deep expertise, builds credibility |
| education | 30% | How-to, explainers, value delivery |
| community | 15% | Engagement, conversation starters |
| virality | 5% | High-reach, shareable moments |

Intent is **assigned by the Brand Strategist agent** based on the idea's natural fit and brand goals. The Idea Selector workflow (not yet built) uses these ratios to balance the selection queue — if too many authority posts are queued, it will prioritize other intents.

---

## Pipeline Architecture

Each pipeline stage is **one workflow**. The Airtable record is the source of truth. Timestamps are the gates between workflows. One workflow sets a timestamp, the next checks for it as its precondition.

```
1. idea-capture        ← BUILT (workflow ID: nnGXgwrcp7rUh9N3)
2. idea-selector       ← not built
3. deep-research       ← not built
4. post-spawner        ← not built
5. draft-creator       ← not built
6. review-approval     ← not built
7. scheduler-publisher ← not built
```

**Pipeline gate pattern** (applies to every workflow):
```
Trigger → Load record → Check precondition timestamp
  → IF already done: exit cleanly (idempotent)
  → IF ready: do work → set completion timestamp → trigger next workflow
```

---

## Workflow 1 — `idea-capture` (BUILT)

**n8n ID**: `nnGXgwrcp7rUh9N3`
**Trigger**: Telegram message (text, YouTube URL, or blog URL)
**Risk level**: Medium — S + T + E

### Node Map (31 nodes)

```
Telegram Trigger
→ Detect Source (Code — regex-based type detection)
→ Init State (Code — workflowState object + workflowId = $execution.id)
→ Load Config (Set — scoring_dimensions, intent_types, distribution_platforms, posting_ratios)
→ IF YouTube
    TRUE → Fetch YouTube Transcript (Supadata API) → Set YouTube Content (Code)  ─┐
    FALSE → IF Blog                                                                 │
              TRUE → Fetch Blog (Jina AI) → Set Blog Content (Code)              ──┤→ Merge Content
              FALSE → Set Text Content (Code)                                    ──┘
→ Fetch Brand (Airtable search — brand table, max 1 record)
→ Create Draft Record (Airtable create — ideas table, status: processing)
→ Set Entity ID (Code — captures Airtable record ID into workflowState.entityId)
→ Brand Strategist (AI Agent + Anthropic claude-sonnet-4-6)
→ Validate Brief (Code — validates JSON schema, intent enum)
→ IF Brief Valid
    TRUE → Log Phase 1 (Airtable log) → Brand Scorer (AI Agent + Anthropic)
                                       → Validate Scores (Code)
                                       → IF Scores Valid
                                           TRUE → Log Phase 2 → Update Idea Record → Telegram Confirm ✅
                                           FALSE → Update Failed (Scores) → Telegram Error ❌
    FALSE → Update Failed (Brief) → Telegram Error ❌
```

### Config Set Node (Load Config)
Update these values to change system behavior without touching agent prompts:
- `scoring_dimensions`: comma-separated list of scoring criteria
- `intent_types`: valid intent enum values
- `distribution_platforms`: target platforms
- `posting_ratios`: target content mix

### Agent 1 — Brand Strategist
- **Role**: Takes raw input (any format) + brand guidelines → produces a structured content brief
- **Output**: JSON content brief (UIF seed document) with: `working_title`, `topic`, `strategic_intent`, `intent`, `target_persona`, `core_angle`, `angle_hypotheses[]`, `content_format`, `research_directions[]`, `key_messages[]`, `brand_alignment_rationale`, `distribution_platforms[]`
- **This brief is designed to feed the deep-research workflow directly**

### Agent 2 — Brand Scorer
- **Role**: Scores the content brief on 7 dimensions (1–10)
- **Output**: JSON with `score_brand_fit`, `score_audience_relevance`, `score_originality`, `score_monetization`, `score_production_effort`, `score_virality`, `score_authority`, `score_overall` + 1-sentence rationale per dimension + `recommended_next_action`
- **Note**: `production_effort` is inverted — 10 = easiest to produce, 1 = hardest

### Credentials to Configure
- Telegram bot token (Telegram Trigger + all Telegram send nodes)
- Anthropic API key (Anthropic Strategist + Anthropic Scorer nodes)
- Airtable access token (all Airtable nodes)
- Replace all `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_*` placeholders with real IDs
- Replace `SUPADATA_API_KEY_HERE` on Fetch YouTube Transcript node

---

## Workflow 2 — `deep-research` (NOT YET BUILT)

**Trigger**: Webhook from idea-capture (or manual for selected ideas)
**Input**: idea record with `content_brief` populated, `status: selected`
**Goal**: Use the content brief to generate a research prompt, execute deep research, produce a Universal Intelligence File (UIF)

### UIF Schema (target output)
```json
{
  "meta": { "topic", "research_date", "strategic_intent", "provenance_log" },
  "core_knowledge": {
    "facts": [{ "statement", "source_url", "credibility", "context" }],
    "statistics": [{ "stat", "value", "unit", "source" }]
  },
  "angles": [{ "angle_name", "target_persona", "contrarian_take", "supporting_facts[]" }],
  "distribution_formats": {
    "linkedin_post": [],
    "twitter_thread": [],
    "youtube_script_outline": []
  }
}
```

### Planned Architecture
1. Load idea record + brand guidelines
2. Research Architect Agent: uses content brief → generates targeted research prompt (angles, stats to find, contrarian takes to explore)
3. Deep research execution (TBD — web search, Perplexity, or similar)
4. UIF Compiler Agent: structures findings into UIF schema
5. Save UIF to Airtable (new `uifs` table, linked to idea)
6. Update idea: `research_completed_at`, `status: researched`
7. Trigger post-spawner

---

## Workflow 3 — `idea-selector` (NOT YET BUILT)

**Trigger**: Scheduled (daily or on-demand)
**Goal**: From all `pending_selection` ideas, surface the top 5 balanced by intent ratios and scoring, for owner approval

### Logic
- Query all ideas with `status: pending_selection`
- Score them against current queue composition (are we over-indexed on authority? prioritize others)
- Present top 5 via Telegram with title, intent, overall score
- Owner selects via Telegram reply → selected ideas get `selected_at` timestamp, `status: selected`

---

## Workflow 4 — `post-spawner` (NOT YET BUILT)

**Trigger**: Webhook from deep-research
**Goal**: From one researched idea, create N post records in the `posts` table

### Logic
- Load UIF + content brief
- Post Spawner Agent: decides which platforms/formats this idea supports
- Creates one `posts` record per platform/format combination
- Each post record starts with `status: new`, linked to the idea

---

## Architecture Decisions (Locked)

1. **Timestamps as gates**: `NULL = not done`, `ISO timestamp = done`. Each workflow checks its precondition timestamp before proceeding. This makes all workflows idempotent.

2. **One workflow per pipeline stage**: Clean separation, independent scaling, simpler debugging.

3. **Previous workflow triggers next via webhook**: Not polling. At end of each workflow, HTTP Request node calls the next workflow's webhook. Scheduled polling as a safety net for anything that slipped through.

4. **Config lives in a Set node**: All configurable constants (intent types, scoring dimensions, posting ratios) in a single Set node near the top. Update the node to change behavior — no agent prompt editing needed.

5. **Draft record created immediately**: Before any expensive LLM or API call, the Airtable record exists. This is the Tolerant-pillar checkpoint. If the workflow crashes, the record shows where it got to.

6. **$('NodeName').first().json pattern**: Used throughout to reference upstream data after HTTP Request nodes reset the data flow. Code nodes in content branches rebuild full context from `$('Load Config').first().json`.

7. **AI Agents are not tool-using agents**: Brand Strategist and Brand Scorer are effectively structured LLM calls with JSON output. No tools connected. The `promptType: "define"` pattern is used, not `auto`.

---

## What The Owner Wants To Avoid

- Over-engineering for hypothetical future requirements
- Spending on API calls when subscriptions cover the work (hence Gemini CLI / Claude Code via local tunnel for image generation)
- Polling-based architectures
- Manual status updates — everything should flow automatically once triggered

---

*System Brief v1.0 — Covers pipeline through post-spawner design.*
*Updated: 2026-02-25*
*Workflow 1 (idea-capture) is the only completed workflow.*
