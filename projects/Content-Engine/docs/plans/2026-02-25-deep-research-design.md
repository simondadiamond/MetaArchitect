# Design: `deep-research` Workflow
**Date**: 2026-02-25
**Status**: Approved
**Pipeline position**: Workflow 3 of 7 (runs after idea-selector sets `status = selected`)

---

## Context

Part of The Meta Architect content pipeline. Consumes the `content_brief` JSON produced by idea-capture's Brand Strategist agent and produces a Universal Intelligence File (UIF v2.0) — the structured research document that every downstream workflow (post-spawner, draft-creator) reads from.

One idea → one UIF → multiple angles → multiple posts.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Research tool | Perplexity sonar-pro API | Purpose-built for web research, returns citations, ~$0.01/call |
| Queries per topic | 3 (sequential) | Facts/context · Statistics · Contrarian angles. Maps cleanly onto UIF sections. |
| Trigger mechanism | Hourly scheduler | Finds one `selected` + `research_started_at IS NULL` idea, processes it alone. No rate limits, idempotent, generalizes to all future workflows. |
| UIF storage | JSON field on `ideas` table (`intelligence_file`) | 1:1 relationship, simpler than separate table, Airtable long-text holds JSON fine. |
| Hooks storage | New `hooks_library` Airtable table | Written at research time (status = candidate). Scoring layer added later. |
| Humanity snippets | Not in this workflow | Separate system — snippet bank extracted from past conversations, used by draft-creator. |
| STATE level | Medium → S + T + E | External API calls, Airtable mutations. No personal data → A not required. |
| Agent type | Structured LLM calls (promptType: define) | Not tool-using agents. Deterministic JSON output. Matches idea-capture pattern. |

---

## UIF Schema v2.0

Key changes from v1:
- `content_brief_summary` added to `meta` (prose paragraph, saves tokens downstream)
- `distribution_formats` removed — replaced by `content_outline` + `hooks` per angle
- Each `angle` gains: `suggested_format`, `platform_fit`, `hooks[]` (typed), `content_outline[]`
- `hooks` items carry `hook_type` enum for Hooks Library categorization
- `context` and `credibility` required on facts
- `minItems` guards on facts (3) and angles (2)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Universal Intelligence File",
  "version": "2.0",
  "type": "object",
  "properties": {
    "meta": {
      "type": "object",
      "properties": {
        "topic": { "type": "string" },
        "research_date": { "type": "string", "format": "date" },
        "strategic_intent": { "type": "string" },
        "content_brief_summary": {
          "type": "string",
          "description": "1-paragraph prose synthesis. Narrative context for draft-creator."
        },
        "provenance_log": {
          "type": "string",
          "description": "Comma-separated Airtable log record IDs for Q1, Q2, Q3 Perplexity calls"
        }
      },
      "required": ["topic", "research_date", "strategic_intent", "content_brief_summary", "provenance_log"]
    },
    "core_knowledge": {
      "type": "object",
      "properties": {
        "facts": {
          "type": "array",
          "minItems": 3,
          "items": {
            "type": "object",
            "properties": {
              "statement": { "type": "string" },
              "source_url": { "type": "string" },
              "credibility": { "type": "string", "enum": ["high", "medium", "low"] },
              "context": { "type": "string", "description": "Why this fact matters for content" }
            },
            "required": ["statement", "source_url", "credibility", "context"]
          }
        },
        "statistics": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "stat": { "type": "string" },
              "value": { "type": "number" },
              "unit": { "type": "string" },
              "source": { "type": "string" }
            },
            "required": ["stat", "source"]
          }
        }
      },
      "required": ["facts"]
    },
    "angles": {
      "type": "array",
      "minItems": 2,
      "maxItems": 5,
      "items": {
        "type": "object",
        "properties": {
          "angle_name": { "type": "string" },
          "target_persona": { "type": "string" },
          "contrarian_take": { "type": "string" },
          "suggested_format": {
            "type": "string",
            "enum": ["list", "story", "case_study", "hot_take", "framework_explainer"]
          },
          "platform_fit": {
            "type": "array",
            "items": { "type": "string", "enum": ["linkedin", "twitter", "youtube", "newsletter"] }
          },
          "hooks": {
            "type": "array",
            "minItems": 1,
            "maxItems": 3,
            "description": "Scroll-stopping opening lines. Written to hooks_library on completion.",
            "items": {
              "type": "object",
              "properties": {
                "text": { "type": "string" },
                "hook_type": {
                  "type": "string",
                  "enum": ["contrarian", "stat_lead", "question", "story_open", "provocative_claim"]
                }
              },
              "required": ["text", "hook_type"]
            }
          },
          "content_outline": {
            "type": "array",
            "minItems": 3,
            "maxItems": 6,
            "description": "Structural bullets for a post at this angle. Skeleton only, not draft copy.",
            "items": { "type": "string" }
          },
          "supporting_facts": {
            "type": "array",
            "items": { "type": "integer", "description": "Indices into core_knowledge.facts[]" }
          }
        },
        "required": [
          "angle_name", "target_persona", "contrarian_take",
          "suggested_format", "platform_fit", "hooks", "content_outline"
        ]
      }
    }
  },
  "required": ["meta", "core_knowledge", "angles"]
}
```

---

## Workflow Architecture

**n8n workflow name**: `deep-research`
**Trigger**: Schedule (every 1 hour)
**Risk level**: Medium — S + T + E
**Estimated nodes**: ~28 main + error branch

### Node Map

```
Schedule Trigger (every 1 hour)
→ Find Ready Idea       [Airtable search: status=selected AND research_started_at IS NULL,
                          sort captured_at ASC, limit 1]
→ IF Ideas Found        [records.length > 0]
    FALSE → Stop        [clean exit]
    TRUE ↓

→ Init State            [Code: workflowState { workflowId=$execution.id, stage:"init",
                          entityType:"idea", entityId, startedAt, lastUpdatedAt }]
→ Load Config           [Set: model, perplexity_model, num_queries=3, max_facts=8, max_angles=4]
→ Lock Idea             [Airtable update: research_started_at=now(), status="researching"]
→ Load Brand            [Airtable search: brand table, limit 1]
→ Assemble Context      [Code: merges idea.content_brief + brand into single context block.
                          Uses $('Find Ready Idea').first().json + $('Load Brand').first().json
                          to survive HTTP Request data resets downstream.]

→ Research Architect    [AI Agent / claude-sonnet-4-6, promptType:define]
                         Output JSON: {
                           queries: [
                             { id:"q1", focus:"facts_context",    text:"..." },
                             { id:"q2", focus:"statistics_data",  text:"..." },
                             { id:"q3", focus:"contrarian_angles", text:"..." }
                           ],
                           topic: "...",
                           strategic_intent: "...",
                           content_brief_summary: "..."
                         }

→ Validate Research Plan [Code: queries.length===3, each has id+focus+text,
                           meta fields non-empty. Routes FALSE to Error Handler.]
→ IF Plan Valid
    FALSE → Error Handler
    TRUE ↓

→ Log Research Plan      [Airtable create: logs — full prompt + response, model_version,
                           step_name:"research_architect", status:"success"]

→ Perplexity Q1          [HTTP Request: POST api.perplexity.ai/chat/completions,
                           model=sonar-pro, messages=[{role:user, content:queries[0].text}]]
→ Log Q1                 [Airtable create: logs — full response + citations, step_name:"perplexity_q1"]

→ Perplexity Q2          [HTTP Request: sonar-pro, queries[1].text]
→ Log Q2                 [Airtable create: logs — step_name:"perplexity_q2"]

→ Perplexity Q3          [HTTP Request: sonar-pro, queries[2].text]
→ Log Q3                 [Airtable create: logs — step_name:"perplexity_q3"]

→ Assemble UIF Input     [Code: packages Research Architect meta fields + Q1/Q2/Q3 response
                           content into one context block. References all upstream nodes by
                           name: $('Research Architect').first().json, $('Perplexity Q1').first().json, etc.]

→ UIF Compiler           [AI Agent / claude-sonnet-4-6, promptType:define]
                          Input: assembled research + UIF v2.0 schema (full schema in system prompt)
                          Output: complete UIF JSON

→ Validate UIF           [Code: required top-level keys present, facts.length >= 3,
                           angles.length >= 2, each angle has required fields,
                           suggested_format in enum, hook_type in enum,
                           platform_fit values in enum, content_outline.length >= 3]
→ IF UIF Valid
    FALSE → Error Handler
    TRUE ↓

    ┌── Branch A: Hooks ──────────────────────────────────────────────────┐
    │  Extract Hooks     [Code: flattens angles[N].hooks[] into array,   │
    │                     adds angle_name + source_idea_id to each item. │
    │                     Returns N items (one per hook).]                │
    │  Save Hook Records [Airtable create: hooks_library, iterates       │
    │                     per item — status="candidate"]                 │
    └─────────────────────────────────────────────────────────────────────┘

    ┌── Branch B: Main ───────────────────────────────────────────────────┐
    │  Save UIF          [Airtable update: ideas.intelligence_file =     │
    │                     JSON.stringify(UIF)]                            │
    │  Update Idea       [Airtable update: research_completed_at=now(),  │
    │                     status="researched"]                           │
    │  Log Completion    [Airtable create: logs — step_name:"complete",  │
    │                     output_summary: topic + angle count + fact count]│
    │  Telegram          ["✅ Research done: {topic}                     │
    │                      {N} angles · {N} facts · {N} hooks extracted"]│
    │  Trigger Next      [HTTP Request: post-spawner webhook —           │
    │                     body: { idea_id }, placeholder URL for now]    │
    └─────────────────────────────────────────────────────────────────────┘

━━━ ERROR HANDLER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(wired from: IF Plan Valid FALSE, IF UIF Valid FALSE, any HTTP error)
→ Format Error          [Code: { stage, step, error, entity_id }]
→ Reset Lock            [Airtable update: research_started_at=null, status="research_failed"]
→ Log Error             [Airtable create: logs — status:"error", full error details]
→ Telegram Error        ["❌ Research failed: {topic} at {stage} — {error}"]
```

---

## STATE Compliance

| Pillar | Implementation |
|---|---|
| **S — Structured** | `workflowState` initialized in Init State node with `workflowId`, `stage`, `entityType:"idea"`, `entityId`, `startedAt`, `lastUpdatedAt`. Stage transitions: init → locking → researching → compiling → complete / failed |
| **T — Traceable** | Airtable log after: Research Architect, each Perplexity call (full response + citations), UIF Compiler, completion/failure. All entries include `workflow_id`, `entity_id`, `step_name`, `stage`, `timestamp`, `model_version`, `status` |
| **A — Auditable** | Not required — no personal data, no decisions affecting individuals |
| **T — Tolerant** | Lock (`research_started_at`) is cleared on failure → next hourly run retries cleanly. Perplexity responses logged in full (reconstruction possible). Error handler resets idea to `research_failed` so owner can see and re-select if needed |
| **E — Explicit** | Two validation gates: (1) Research Plan — before any Perplexity call fires; (2) UIF — before any Airtable write. Both hard-route FALSE to error handler. No silent failures. |

---

## New Airtable Assets Required

### Field additions to `ideas` table
| Field | Type |
|---|---|
| `intelligence_file` | Long text (stores UIF JSON) |
| `research_started_at` | Date/time (the lock field) |
| `research_completed_at` | Date/time (the gate for post-spawner) |
| `status` values to add | `researching`, `researched`, `research_failed` |

### New table: `hooks_library`
| Field | Type | Notes |
|---|---|---|
| `hook_text` | Long text | The opening line |
| `hook_type` | Single select | contrarian / stat_lead / question / story_open / provocative_claim |
| `source_idea` | Link to `ideas` | Traceability |
| `angle_name` | Text | Which angle it came from |
| `status` | Single select | candidate (default) / proven / retired |
| `created_at` | Created time | Auto |

---

## Data Flow Notes

- **HTTP Request data reset**: After every Perplexity call (HTTP Request node), n8n's data context resets. All Code nodes downstream must reference upstream nodes explicitly: `$('Node Name').first().json`. The Assemble UIF Input node is responsible for consolidating all upstream data before the UIF Compiler agent.
- **Branch A/B parallel execution**: n8n runs both branches from the same source node. Branch A (hooks) is fire-and-forget — its completion is not required before Branch B proceeds. Both branches start from the IF UIF Valid TRUE output.
- **Hourly idempotency**: The scheduler finds ideas with `research_started_at IS NULL`. Once locked, the same idea will not be picked up again unless the error handler resets the field. One idea processed per hour maximum.

---

## Agent Prompts (to be written during implementation)

### Research Architect
- Role: Read content_brief → produce 3 targeted Perplexity search queries + UIF meta fields
- Query 1 (`facts_context`): Current state, real-world examples, key definitions
- Query 2 (`statistics_data`): Quantitative data, research findings, trend numbers
- Query 3 (`contrarian_angles`): Opposing views, underexplored angles, common myths to debunk
- Output: strict JSON matching the Research Architect output schema above

### UIF Compiler
- Role: Synthesize Research Architect meta + 3 Perplexity responses → complete UIF v2.0 JSON
- Must populate all required fields
- Must generate 2–5 angles, each with 1–3 hooks (typed), 3–6 content_outline bullets
- Output: strict JSON matching UIF v2.0 schema (schema provided verbatim in system prompt)
- Validation gate follows — no lenient output tolerated
