# deep-research Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the `deep-research` n8n workflow — an hourly scheduler that picks one `selected` idea, runs 3 targeted Perplexity searches, compiles results into a Universal Intelligence File (UIF v2.0), saves it to Airtable, and writes extracted hooks to the `hooks_library` table.

**Architecture:** Hourly Schedule Trigger finds one ready idea (status=selected, research_started_at=NULL), locks it immediately, runs Research Architect (Claude) → 3 sequential Perplexity sonar-pro calls → UIF Compiler (Claude) → validates → saves. Two parallel branches on success: Branch A writes hooks to hooks_library, Branch B saves UIF, updates idea status, notifies Telegram, and fires post-spawner webhook (placeholder). Error handler resets the lock on any failure.

**Tech Stack:** n8n (local, localhost:5678), n8n-mcp MCP tools, Airtable, Perplexity API (sonar-pro), Claude claude-sonnet-4-6 (Anthropic), Telegram Bot API.

**Design doc:** `docs/plans/2026-02-25-deep-research-design.md`
**STATE level:** Medium — S + T + E enforced.

---

## Prerequisites — Read Before Starting

**Pattern reminders (from idea-capture):**
- After every HTTP Request node, n8n resets the data context. Always reference upstream nodes by name: `$('Node Name').first().json`
- AI Agent nodes output text in `$json.output`. Always JSON.parse() it in the next Code node.
- Airtable records come back with `$json.id` (record ID) and `$json.fields` (field values) — or fields may be flattened depending on node version. Use `$json.fields?.fieldName ?? $json.fieldName` to be safe.
- `workflowState.entityId` is set in Init State and referenced throughout via `$('Init State').first().json.workflowState.entityId`

**Credentials needed before starting:**
- Anthropic API key (already configured in n8n from idea-capture)
- Airtable access token (already configured)
- Perplexity API key (new — add as Header Auth credential named "Perplexity API")
- Telegram bot token (already configured)

**Airtable IDs to collect before starting:**
- Base ID: `AIRTABLE_BASE_ID` (same as idea-capture)
- Ideas table ID: `AIRTABLE_TABLE_IDEAS` (same as idea-capture)
- Logs table ID: `AIRTABLE_TABLE_LOGS` (same as idea-capture)
- hooks_library table ID: created in Task 1 below

---

## Task 1: Airtable Setup

**Goal:** Add required fields to the `ideas` table and create the `hooks_library` table.

**Step 1: Add fields to `ideas` table in Airtable UI**

Open Airtable → your base → `ideas` table. Add these fields if not already present:

| Field name | Type | Notes |
|---|---|---|
| `intelligence_file` | Long text | Will store UIF JSON string |
| `research_started_at` | Date/time | The lock field. Include time, GMT. |
| `research_completed_at` | Date/time | Gate for post-spawner |

In the `status` single-select field, add these options if not present:
- `researching`
- `researched`
- `research_failed`

**Step 2: Create `hooks_library` table in Airtable UI**

Create a new table named `hooks_library` with these fields:

| Field name | Type | Notes |
|---|---|---|
| `hook_text` | Long text | Required |
| `hook_type` | Single select | Options: contrarian, stat_lead, question, story_open, provocative_claim |
| `source_idea` | Link to another record | Link to `ideas` table |
| `angle_name` | Single line text | |
| `status` | Single select | Options: candidate, proven, retired |
| `created_at` | Created time | Auto-generated |

**Step 3: Record the hooks_library table ID**

In Airtable, go to the table, open the API docs or check the URL for the table ID (starts with `tbl`). Note it as `AIRTABLE_TABLE_HOOKS_LIBRARY`.

**Step 4: Create a test idea record**

In the `ideas` table, create one record manually for testing:
- `title`: "Test: AI Productivity Systems"
- `status`: `selected`
- `research_started_at`: leave empty
- `content_brief`: paste this JSON:
```json
{
  "working_title": "Why AI productivity systems fail for solopreneurs",
  "topic": "AI productivity systems for solo content creators",
  "strategic_intent": "Challenge the hype around generic AI tools by showing why custom systems win",
  "intent": "authority",
  "target_persona": "Solo content creators and consultants overwhelmed by AI tool noise",
  "core_angle": "The problem isn't lacking AI tools — it's lacking a system that compounds",
  "angle_hypotheses": ["Generic AI tools create dependency", "Custom systems create leverage", "Most solopreneurs optimize the wrong layer"],
  "content_format": "linkedin_post",
  "research_directions": ["Studies on productivity system adoption", "AI tool usage data for creators", "Compounding vs one-time value frameworks"],
  "key_messages": ["Systems beat tools", "Specificity beats generality", "The gap is architecture, not intelligence"],
  "brand_alignment_rationale": "Core Meta Architect thesis: custom automation > off-the-shelf AI",
  "distribution_platforms": ["linkedin", "twitter"]
}
```

Note the record ID (starts with `rec`) — you'll use it to verify the workflow processes this exact record.

---

## Task 2: Create Workflow Shell + Trigger Section

**Goal:** Create the workflow and add the first 3 nodes (trigger → find → IF).

**Step 1: Create the workflow**

Use `n8n_create_workflow` MCP tool:
```json
{
  "name": "deep-research",
  "nodes": [
    {
      "id": "node-schedule",
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.2,
      "position": [0, 300],
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 1 }]
        }
      }
    }
  ],
  "connections": {}
}
```

Record the workflow ID returned. All subsequent steps use `n8n_update_partial_workflow` with this ID.

**Step 2: Add Find Ready Idea node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-find-idea",
    "name": "Find Ready Idea",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [220, 300],
    "parameters": {
      "operation": "search",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_IDEAS", "mode": "id" },
      "filterByFormula": "AND({status}='selected',{research_started_at}='')",
      "sort": {
        "property": [{ "field": "captured_at", "direction": "asc" }]
      },
      "returnAll": false,
      "limit": 1
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

Replace `AIRTABLE_BASE_ID`, `AIRTABLE_TABLE_IDEAS`, `AIRTABLE_CREDENTIAL_ID` with real values.

**Step 3: Add IF Ideas Found node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-if-found",
    "name": "IF Ideas Found",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [440, 300],
    "parameters": {
      "conditions": {
        "options": { "version": 2 },
        "conditions": [
          {
            "leftValue": "={{ $items().length }}",
            "operator": { "type": "number", "operation": "gt" },
            "rightValue": 0
          }
        ]
      }
    }
  }
}
```

**Step 4: Add connections for trigger section**

```json
[
  { "type": "addConnection", "connection": { "source": "Schedule Trigger", "target": "Find Ready Idea", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Find Ready Idea", "target": "IF Ideas Found", "sourceOutput": 0, "targetInput": 0 } }
]
```

**Step 5: Validate**

Run `n8n_validate_workflow` with the workflow ID. Expected: no errors on these nodes.

---

## Task 3: Init + Config + Lock + Brand + Context Nodes

**Goal:** Add the 5 nodes that initialize state, load config, lock the idea, load brand, and assemble context.

**Step 1: Add Init State node (Code)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-init-state",
    "name": "Init State",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [660, 240],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "const idea = $('Find Ready Idea').first().json;\n\nconst workflowState = {\n  workflowId: $execution.id,\n  stage: 'init',\n  entityType: 'idea',\n  entityId: idea.id,\n  ideaTitle: idea.fields?.title ?? idea.title ?? '',\n  startedAt: new Date().toISOString(),\n  lastUpdatedAt: new Date().toISOString()\n};\n\nreturn [{ json: { workflowState } }];"
    }
  }
}
```

**Step 2: Add Load Config node (Set)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-load-config",
    "name": "Load Config",
    "type": "n8n-nodes-base.set",
    "typeVersion": 3.4,
    "position": [880, 240],
    "parameters": {
      "mode": "manual",
      "assignments": {
        "assignments": [
          { "name": "model", "value": "claude-sonnet-4-6", "type": "string" },
          { "name": "perplexity_model", "value": "sonar-pro", "type": "string" },
          { "name": "perplexity_endpoint", "value": "https://api.perplexity.ai/chat/completions", "type": "string" },
          { "name": "max_facts", "value": 8, "type": "number" },
          { "name": "max_angles", "value": 4, "type": "number" },
          { "name": "workflow_name", "value": "deep-research", "type": "string" }
        ]
      },
      "options": { "includeBinaryData": false }
    }
  }
}
```

**Step 3: Add Lock Idea node (Airtable update)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-lock-idea",
    "name": "Lock Idea",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [1100, 240],
    "parameters": {
      "operation": "update",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_IDEAS", "mode": "id" },
      "id": "={{ $('Init State').first().json.workflowState.entityId }}",
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "research_started_at": "={{ new Date().toISOString() }}",
          "status": "researching"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 4: Add Load Brand node (Airtable search)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-load-brand",
    "name": "Load Brand",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [1320, 240],
    "parameters": {
      "operation": "search",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_BRAND", "mode": "id" },
      "returnAll": false,
      "limit": 1
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

Replace `AIRTABLE_TABLE_BRAND` with real brand table ID.

**Step 5: Add Assemble Context node (Code)**

This node rebuilds full context after HTTP Request resets. It's the last node before expensive LLM calls.

```json
{
  "type": "addNode",
  "node": {
    "id": "node-assemble-context",
    "name": "Assemble Context",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1540, 240],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "const idea = $('Find Ready Idea').first().json;\nconst brand = $('Load Brand').first().json;\nconst state = $('Init State').first().json.workflowState;\nconst config = $('Load Config').first().json;\n\nconst ideaFields = idea.fields ?? idea;\nconst brandFields = brand.fields ?? brand;\n\nlet contentBrief = {};\ntry {\n  const raw = ideaFields.content_brief ?? '{}';\n  contentBrief = typeof raw === 'string' ? JSON.parse(raw) : raw;\n} catch(e) {\n  contentBrief = { parse_error: e.message };\n}\n\nconst brandContext = {\n  name: brandFields.name ?? '',\n  goals: brandFields.goals ?? '',\n  icp_short: brandFields.icp_short ?? '',\n  main_guidelines: brandFields.main_guidelines ?? ''\n};\n\nreturn [{\n  json: {\n    workflowState: { ...state, stage: 'assembling_context', lastUpdatedAt: new Date().toISOString() },\n    config,\n    ideaId: idea.id,\n    ideaTitle: ideaFields.title ?? '',\n    contentBrief,\n    brandContext\n  }\n}];"
    }
  }
}
```

**Step 6: Add connections for this section**

```json
[
  { "type": "addConnection", "connection": { "source": "IF Ideas Found", "target": "Init State", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Init State", "target": "Load Config", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Load Config", "target": "Lock Idea", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Lock Idea", "target": "Load Brand", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Load Brand", "target": "Assemble Context", "sourceOutput": 0, "targetInput": 0 } }
]
```

**Step 7: Validate**

Run `n8n_validate_workflow`. Expected: no errors.

---

## Task 4: Research Architect Agent + Validation + Log

**Goal:** Add the Research Architect AI Agent, its Anthropic LLM sub-node, the validation Code node, IF gate, and log node.

**Step 1: Add Anthropic LLM sub-node for Research Architect**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-anthropic-ra",
    "name": "Anthropic Research Architect",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.3,
    "position": [1760, 420],
    "parameters": {
      "model": "claude-sonnet-4-6",
      "options": { "maxTokens": 1024 }
    },
    "credentials": { "anthropicApi": { "id": "ANTHROPIC_CREDENTIAL_ID", "name": "Anthropic" } }
  }
}
```

**Step 2: Add Research Architect Agent node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-research-architect",
    "name": "Research Architect",
    "type": "@n8n/n8n-nodes-langchain.agent",
    "typeVersion": 1.7,
    "position": [1760, 240],
    "parameters": {
      "agent": "conversationalAgent",
      "promptType": "define",
      "text": "={{ $json.contentBrief ? JSON.stringify($json.contentBrief) : 'No content brief available' }}",
      "systemMessage": "You are the Research Architect for The Meta Architect content system (brand: simonparis.ca).\n\nYour job: analyze a content brief and generate exactly 3 targeted Perplexity search queries that will collectively fill a Universal Intelligence File (UIF).\n\nThe 3 queries must cover:\n1. q1 (facts_context): Real-world facts, current state, concrete examples, key definitions\n2. q2 (statistics_data): Quantitative data, research findings, trend statistics, numbers that prove the point\n3. q3 (contrarian_angles): Opposing views, underexplored angles, common myths to debunk, what experts get wrong\n\nEach query should be a complete, specific search question — not just keywords. Write queries as if briefing a research journalist.\n\nAlso generate UIF meta fields from the brief.\n\nBrand context:\n{{ JSON.stringify($('Assemble Context').first().json.brandContext) }}\n\nReturn ONLY valid JSON in this exact format, no markdown, no explanation:\n{\n  \"queries\": [\n    { \"id\": \"q1\", \"focus\": \"facts_context\", \"text\": \"<full search query>\" },\n    { \"id\": \"q2\", \"focus\": \"statistics_data\", \"text\": \"<full search query>\" },\n    { \"id\": \"q3\", \"focus\": \"contrarian_angles\", \"text\": \"<full search query>\" }\n  ],\n  \"topic\": \"<concise topic name>\",\n  \"strategic_intent\": \"<which business goal this serves>\",\n  \"content_brief_summary\": \"<1-paragraph prose synthesis of what this research should uncover and why>\"\n}",
      "options": {}
    }
  }
}
```

**Step 3: Connect Anthropic LLM to Research Architect Agent**

```json
{
  "type": "addConnection",
  "connection": {
    "source": "Anthropic Research Architect",
    "sourceOutput": 0,
    "target": "Research Architect",
    "targetInput": 0,
    "type": "ai_languageModel"
  }
}
```

**Step 4: Add Validate Research Plan node (Code)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-validate-plan",
    "name": "Validate Research Plan",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [1980, 240],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "let plan;\ntry {\n  const raw = $json.output ?? $json.text ?? JSON.stringify($json);\n  plan = typeof raw === 'string' ? JSON.parse(raw) : raw;\n} catch(e) {\n  return [{ json: { valid: false, errors: [`JSON parse error: ${e.message}`], plan: null } }];\n}\n\nconst errors = [];\nconst validFocus = ['facts_context','statistics_data','contrarian_angles'];\n\nif (!plan.queries || !Array.isArray(plan.queries)) {\n  errors.push('queries must be an array');\n} else {\n  if (plan.queries.length !== 3) errors.push(`queries must have 3 items, got ${plan.queries.length}`);\n  plan.queries.forEach((q, i) => {\n    if (!q.id) errors.push(`queries[${i}].id missing`);\n    if (!q.focus || !validFocus.includes(q.focus)) errors.push(`queries[${i}].focus invalid: ${q.focus}`);\n    if (!q.text || q.text.trim().length < 10) errors.push(`queries[${i}].text too short`);\n  });\n}\n\nif (!plan.topic?.trim()) errors.push('topic missing');\nif (!plan.strategic_intent?.trim()) errors.push('strategic_intent missing');\nif (!plan.content_brief_summary || plan.content_brief_summary.trim().length < 20) errors.push('content_brief_summary missing or too short');\n\nreturn [{ json: { valid: errors.length === 0, errors, plan } }];"
    }
  }
}
```

**Step 5: Add IF Plan Valid node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-if-plan-valid",
    "name": "IF Plan Valid",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [2200, 240],
    "parameters": {
      "conditions": {
        "options": { "version": 2 },
        "conditions": [
          {
            "leftValue": "={{ $json.valid }}",
            "operator": { "type": "boolean", "operation": "true", "singleValue": true }
          }
        ]
      }
    }
  }
}
```

**Step 6: Add Log Research Plan node (Airtable create)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-log-plan",
    "name": "Log Research Plan",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [2420, 180],
    "parameters": {
      "operation": "create",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_LOGS", "mode": "id" },
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "workflow_id": "={{ $('Init State').first().json.workflowState.workflowId }}",
          "entity_id": "={{ $('Init State').first().json.workflowState.entityId }}",
          "step_name": "research_architect",
          "stage": "planning",
          "timestamp": "={{ new Date().toISOString() }}",
          "output_summary": "={{ `Topic: ${$('Validate Research Plan').first().json.plan.topic} | Queries: ${$('Validate Research Plan').first().json.plan.queries.map(q=>q.focus).join(', ')}` }}",
          "model_version": "claude-sonnet-4-6",
          "status": "success"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 7: Add connections for this section**

```json
[
  { "type": "addConnection", "connection": { "source": "Assemble Context", "target": "Research Architect", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Research Architect", "target": "Validate Research Plan", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Validate Research Plan", "target": "IF Plan Valid", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "IF Plan Valid", "target": "Log Research Plan", "sourceOutput": 0, "targetInput": 0 } }
]
```

Note: IF Plan Valid FALSE output (index 1) connects to Error Handler — wired in Task 8.

**Step 8: Validate**

Run `n8n_validate_workflow`. Expected: no errors.

---

## Task 5: Three Perplexity Calls

**Goal:** Add Perplexity Q1, Q2, Q3 HTTP Request nodes and their log nodes (6 nodes total).

Before adding: add the Perplexity Header Auth credential in n8n UI:
- Name: "Perplexity API"
- Type: Header Auth
- Name: `Authorization`
- Value: `Bearer YOUR_PERPLEXITY_API_KEY`

**Step 1: Add Perplexity Q1 node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-perplexity-q1",
    "name": "Perplexity Q1",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [2640, 180],
    "parameters": {
      "method": "POST",
      "url": "https://api.perplexity.ai/chat/completions",
      "authentication": "genericCredentialType",
      "genericAuthType": "httpHeaderAuth",
      "sendHeaders": false,
      "sendBody": true,
      "contentType": "json",
      "body": {
        "model": "={{ $('Load Config').first().json.perplexity_model }}",
        "messages": [
          {
            "role": "system",
            "content": "You are a research assistant. Provide detailed, accurate, well-sourced information. Include specific facts, examples, and cite sources where possible."
          },
          {
            "role": "user",
            "content": "={{ $('Validate Research Plan').first().json.plan.queries[0].text }}"
          }
        ],
        "max_tokens": 2000,
        "return_citations": true,
        "return_related_questions": false
      },
      "options": { "timeout": 30000 }
    },
    "credentials": { "httpHeaderAuth": { "id": "PERPLEXITY_CREDENTIAL_ID", "name": "Perplexity API" } }
  }
}
```

**Step 2: Add Log Q1 node (Airtable create)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-log-q1",
    "name": "Log Q1",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [2860, 180],
    "parameters": {
      "operation": "create",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_LOGS", "mode": "id" },
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "workflow_id": "={{ $('Init State').first().json.workflowState.workflowId }}",
          "entity_id": "={{ $('Init State').first().json.workflowState.entityId }}",
          "step_name": "perplexity_q1",
          "stage": "researching",
          "timestamp": "={{ new Date().toISOString() }}",
          "output_summary": "={{ $('Perplexity Q1').first().json.choices?.[0]?.message?.content?.substring(0,500) ?? 'No content' }}",
          "model_version": "sonar-pro",
          "status": "success"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 3: Add Perplexity Q2 node**

Same as Q1 but:
- `"id": "node-perplexity-q2"`, `"name": "Perplexity Q2"`
- `"position": [3080, 180]`
- Content: `"={{ $('Validate Research Plan').first().json.plan.queries[1].text }}"`

**Step 4: Add Log Q2 node**

Same as Log Q1 but:
- `"id": "node-log-q2"`, `"name": "Log Q2"`
- `"position": [3300, 180]`
- `"step_name": "perplexity_q2"`
- output_summary references `$('Perplexity Q2').first().json`

**Step 5: Add Perplexity Q3 node**

Same as Q1 but:
- `"id": "node-perplexity-q3"`, `"name": "Perplexity Q3"`
- `"position": [3520, 180]`
- Content: `"={{ $('Validate Research Plan').first().json.plan.queries[2].text }}"`

**Step 6: Add Log Q3 node**

Same as Log Q1 but:
- `"id": "node-log-q3"`, `"name": "Log Q3"`
- `"position": [3740, 180]`
- `"step_name": "perplexity_q3"`
- output_summary references `$('Perplexity Q3').first().json`

**Step 7: Add connections for this section**

```json
[
  { "type": "addConnection", "connection": { "source": "Log Research Plan", "target": "Perplexity Q1", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Perplexity Q1", "target": "Log Q1", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Log Q1", "target": "Perplexity Q2", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Perplexity Q2", "target": "Log Q2", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Log Q2", "target": "Perplexity Q3", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Perplexity Q3", "target": "Log Q3", "sourceOutput": 0, "targetInput": 0 } }
]
```

**Step 8: Validate**

Run `n8n_validate_workflow`. Expected: no errors.

---

## Task 6: UIF Compiler + Validation

**Goal:** Add Assemble UIF Input, UIF Compiler agent, Validate UIF, and IF UIF Valid nodes.

**Step 1: Add Assemble UIF Input node (Code)**

This node consolidates all upstream data for the UIF Compiler, surviving the HTTP Request resets.

```json
{
  "type": "addNode",
  "node": {
    "id": "node-assemble-uif-input",
    "name": "Assemble UIF Input",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [3960, 180],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "const plan = $('Validate Research Plan').first().json.plan;\nconst q1 = $('Perplexity Q1').first().json;\nconst q2 = $('Perplexity Q2').first().json;\nconst q3 = $('Perplexity Q3').first().json;\nconst context = $('Assemble Context').first().json;\n\nconst extractContent = (r) => r.choices?.[0]?.message?.content ?? '';\nconst extractCitations = (r) => (r.citations ?? []).slice(0, 10);\n\nconst uifInput = {\n  meta: {\n    topic: plan.topic,\n    strategic_intent: plan.strategic_intent,\n    content_brief_summary: plan.content_brief_summary,\n    research_date: new Date().toISOString().split('T')[0]\n  },\n  research: {\n    q1: { focus: 'facts_context', query: plan.queries[0].text, content: extractContent(q1), citations: extractCitations(q1) },\n    q2: { focus: 'statistics_data', query: plan.queries[1].text, content: extractContent(q2), citations: extractCitations(q2) },\n    q3: { focus: 'contrarian_angles', query: plan.queries[2].text, content: extractContent(q3), citations: extractCitations(q3) }\n  },\n  brandContext: context.brandContext,\n  ideaId: context.ideaId\n};\n\nreturn [{ json: { uifInput } }];"
    }
  }
}
```

**Step 2: Add Anthropic LLM sub-node for UIF Compiler**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-anthropic-uif",
    "name": "Anthropic UIF Compiler",
    "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
    "typeVersion": 1.3,
    "position": [4180, 360],
    "parameters": {
      "model": "claude-sonnet-4-6",
      "options": { "maxTokens": 4096 }
    },
    "credentials": { "anthropicApi": { "id": "ANTHROPIC_CREDENTIAL_ID", "name": "Anthropic" } }
  }
}
```

**Step 3: Add UIF Compiler Agent node**

The system prompt contains the full UIF v2.0 schema to enforce strict output.

```json
{
  "type": "addNode",
  "node": {
    "id": "node-uif-compiler",
    "name": "UIF Compiler",
    "type": "@n8n/n8n-nodes-langchain.agent",
    "typeVersion": 1.7,
    "position": [4180, 180],
    "parameters": {
      "agent": "conversationalAgent",
      "promptType": "define",
      "text": "={{ JSON.stringify($json.uifInput) }}",
      "systemMessage": "You are the UIF Compiler for The Meta Architect content system. You synthesize raw research into a Universal Intelligence File (UIF v2.0).\n\nYou receive a JSON object with: meta fields, three research blocks (q1=facts/context, q2=statistics, q3=contrarian angles), and brand context.\n\nOutput ONLY a single valid JSON object. No markdown, no explanation, no code fences. JSON only.\n\nRULES:\n- facts: extract minimum 3, maximum 8. Use source URLs from citations. credibility: high=peer-reviewed/official, medium=reputable outlet, low=blog/opinion\n- statistics: only include if a real numeric value exists. Do not fabricate numbers.\n- angles: 2-5 angles. Each angle should be genuinely different (different persona, different framing, different platform fit)\n- hooks: each hook must be ONE scroll-stopping sentence under 30 words. It is the first line of a post — not a title, not a summary\n- content_outline: 3-6 bullets describing POST STRUCTURE (what sections/moves the post makes), not draft copy\n- contrarian_take: must challenge received wisdom. If q3 research didn't surface one, derive it from q1/q2 evidence\n- platform_fit: hot_take → twitter; framework_explainer → linkedin; story → linkedin or newsletter; list → linkedin or twitter; case_study → linkedin or youtube\n- provenance_log: write the string 'pending' — the workflow will update it\n\nREQUIRED OUTPUT SCHEMA:\n{\n  \"meta\": {\n    \"topic\": string,\n    \"research_date\": \"YYYY-MM-DD\",\n    \"strategic_intent\": string,\n    \"content_brief_summary\": string,\n    \"provenance_log\": \"pending\"\n  },\n  \"core_knowledge\": {\n    \"facts\": [\n      { \"statement\": string, \"source_url\": string, \"credibility\": \"high\"|\"medium\"|\"low\", \"context\": string }\n    ],\n    \"statistics\": [\n      { \"stat\": string, \"value\": number, \"unit\": string, \"source\": string }\n    ]\n  },\n  \"angles\": [\n    {\n      \"angle_name\": string,\n      \"target_persona\": string,\n      \"contrarian_take\": string,\n      \"suggested_format\": \"list\"|\"story\"|\"case_study\"|\"hot_take\"|\"framework_explainer\",\n      \"platform_fit\": [\"linkedin\"|\"twitter\"|\"youtube\"|\"newsletter\"],\n      \"hooks\": [\n        { \"text\": string, \"hook_type\": \"contrarian\"|\"stat_lead\"|\"question\"|\"story_open\"|\"provocative_claim\" }\n      ],\n      \"content_outline\": [string],\n      \"supporting_facts\": [number]\n    }\n  ]\n}",
      "options": {}
    }
  }
}
```

**Step 4: Add Validate UIF node (Code)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-validate-uif",
    "name": "Validate UIF",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [4400, 180],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "let uif;\ntry {\n  const raw = $json.output ?? $json.text ?? JSON.stringify($json);\n  uif = typeof raw === 'string' ? JSON.parse(raw) : raw;\n} catch(e) {\n  return [{ json: { valid: false, errors: [`JSON parse error: ${e.message}`], uif: null } }];\n}\n\nconst errors = [];\nconst VALID_FORMATS = ['list','story','case_study','hot_take','framework_explainer'];\nconst VALID_PLATFORMS = ['linkedin','twitter','youtube','newsletter'];\nconst VALID_HOOK_TYPES = ['contrarian','stat_lead','question','story_open','provocative_claim'];\nconst REQUIRED_META = ['topic','research_date','strategic_intent','content_brief_summary','provenance_log'];\nconst REQUIRED_ANGLE = ['angle_name','target_persona','contrarian_take','suggested_format','platform_fit','hooks','content_outline'];\n\nif (!uif.meta) { errors.push('meta missing'); }\nelse { REQUIRED_META.forEach(f => { if (!uif.meta[f]) errors.push(`meta.${f} missing`); }); }\n\nif (!Array.isArray(uif.core_knowledge?.facts)) {\n  errors.push('core_knowledge.facts missing or not array');\n} else if (uif.core_knowledge.facts.length < 3) {\n  errors.push(`facts has ${uif.core_knowledge.facts.length} items, minimum 3`);\n} else {\n  uif.core_knowledge.facts.forEach((f,i) => {\n    if (!f.statement) errors.push(`facts[${i}].statement missing`);\n    if (!f.source_url) errors.push(`facts[${i}].source_url missing`);\n    if (!['high','medium','low'].includes(f.credibility)) errors.push(`facts[${i}].credibility invalid: ${f.credibility}`);\n    if (!f.context) errors.push(`facts[${i}].context missing`);\n  });\n}\n\nif (!Array.isArray(uif.angles)) {\n  errors.push('angles missing or not array');\n} else if (uif.angles.length < 2) {\n  errors.push(`angles has ${uif.angles.length} items, minimum 2`);\n} else {\n  uif.angles.forEach((a,i) => {\n    REQUIRED_ANGLE.forEach(f => { if (a[f] === undefined || a[f] === null || a[f] === '') errors.push(`angles[${i}].${f} missing`); });\n    if (!VALID_FORMATS.includes(a.suggested_format)) errors.push(`angles[${i}].suggested_format invalid: ${a.suggested_format}`);\n    if (!Array.isArray(a.platform_fit) || a.platform_fit.length === 0) {\n      errors.push(`angles[${i}].platform_fit missing or empty`);\n    } else {\n      a.platform_fit.forEach(p => { if (!VALID_PLATFORMS.includes(p)) errors.push(`angles[${i}].platform_fit value invalid: ${p}`); });\n    }\n    if (!Array.isArray(a.hooks) || a.hooks.length === 0) {\n      errors.push(`angles[${i}].hooks missing or empty`);\n    } else {\n      a.hooks.forEach((h,j) => {\n        if (!h.text) errors.push(`angles[${i}].hooks[${j}].text missing`);\n        if (!VALID_HOOK_TYPES.includes(h.hook_type)) errors.push(`angles[${i}].hooks[${j}].hook_type invalid: ${h.hook_type}`);\n      });\n    }\n    if (!Array.isArray(a.content_outline) || a.content_outline.length < 3) errors.push(`angles[${i}].content_outline must have at least 3 items`);\n  });\n}\n\nreturn [{ json: { valid: errors.length === 0, errors, uif } }];"
    }
  }
}
```

**Step 5: Add IF UIF Valid node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-if-uif-valid",
    "name": "IF UIF Valid",
    "type": "n8n-nodes-base.if",
    "typeVersion": 2.2,
    "position": [4620, 180],
    "parameters": {
      "conditions": {
        "options": { "version": 2 },
        "conditions": [
          {
            "leftValue": "={{ $json.valid }}",
            "operator": { "type": "boolean", "operation": "true", "singleValue": true }
          }
        ]
      }
    }
  }
}
```

**Step 6: Add connections for this section**

```json
[
  { "type": "addConnection", "connection": { "source": "Log Q3", "target": "Assemble UIF Input", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Assemble UIF Input", "target": "UIF Compiler", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Anthropic UIF Compiler", "target": "UIF Compiler", "sourceOutput": 0, "targetInput": 0, "type": "ai_languageModel" } },
  { "type": "addConnection", "connection": { "source": "UIF Compiler", "target": "Validate UIF", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Validate UIF", "target": "IF UIF Valid", "sourceOutput": 0, "targetInput": 0 } }
]
```

**Step 7: Validate**

Run `n8n_validate_workflow`. Expected: no errors.

---

## Task 7: Success Branches (Hooks + Main)

**Goal:** Add Branch A (hooks extraction + save) and Branch B (save UIF + update idea + log + Telegram + trigger).

### Branch A — Hooks

**Step 1: Add Extract Hooks node (Code)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-extract-hooks",
    "name": "Extract Hooks",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [4840, 80],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "const uif = $('Validate UIF').first().json.uif;\nconst ideaId = $('Init State').first().json.workflowState.entityId;\n\nconst hooks = [];\nuif.angles.forEach(angle => {\n  (angle.hooks ?? []).forEach(hook => {\n    hooks.push({\n      hook_text: hook.text,\n      hook_type: hook.hook_type,\n      angle_name: angle.angle_name,\n      source_idea_id: ideaId,\n      status: 'candidate'\n    });\n  });\n});\n\nreturn hooks.map(h => ({ json: h }));"
    }
  }
}
```

**Step 2: Add Save Hook Records node (Airtable create)**

This node runs once per hook item (n8n iterates automatically over multiple items).

```json
{
  "type": "addNode",
  "node": {
    "id": "node-save-hooks",
    "name": "Save Hook Records",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [5060, 80],
    "parameters": {
      "operation": "create",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_HOOKS_LIBRARY", "mode": "id" },
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "hook_text": "={{ $json.hook_text }}",
          "hook_type": "={{ $json.hook_type }}",
          "angle_name": "={{ $json.angle_name }}",
          "status": "candidate"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

Note: The `source_idea` linked field requires the Airtable record ID format `["recXXXX"]`. If the Airtable node supports linked record arrays, add: `"source_idea": "={{ [$json.source_idea_id] }}"`. If not, leave it out for now — it can be added later.

### Branch B — Main

**Step 3: Add Save UIF node (Airtable update)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-save-uif",
    "name": "Save UIF",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [4840, 280],
    "parameters": {
      "operation": "update",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_IDEAS", "mode": "id" },
      "id": "={{ $('Init State').first().json.workflowState.entityId }}",
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "intelligence_file": "={{ JSON.stringify($('Validate UIF').first().json.uif) }}"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 4: Add Update Idea Status node (Airtable update)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-update-idea",
    "name": "Update Idea Status",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [5060, 280],
    "parameters": {
      "operation": "update",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_IDEAS", "mode": "id" },
      "id": "={{ $('Init State').first().json.workflowState.entityId }}",
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "research_completed_at": "={{ new Date().toISOString() }}",
          "status": "researched"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 5: Add Log Completion node (Airtable create)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-log-complete",
    "name": "Log Completion",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [5280, 280],
    "parameters": {
      "operation": "create",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_LOGS", "mode": "id" },
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "workflow_id": "={{ $('Init State').first().json.workflowState.workflowId }}",
          "entity_id": "={{ $('Init State').first().json.workflowState.entityId }}",
          "step_name": "complete",
          "stage": "researched",
          "timestamp": "={{ new Date().toISOString() }}",
          "output_summary": "={{ `UIF compiled. Topic: ${$('Validate UIF').first().json.uif.meta.topic} | Angles: ${$('Validate UIF').first().json.uif.angles.length} | Facts: ${$('Validate UIF').first().json.uif.core_knowledge.facts.length}` }}",
          "model_version": "claude-sonnet-4-6",
          "status": "success"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 6: Add Telegram Success node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-telegram-success",
    "name": "Telegram Success",
    "type": "n8n-nodes-base.telegram",
    "typeVersion": 1.2,
    "position": [5500, 280],
    "parameters": {
      "chatId": "YOUR_TELEGRAM_CHAT_ID",
      "text": "={{ `✅ Research complete\\n\\n*${$('Validate UIF').first().json.uif.meta.topic}*\\n${$('Validate UIF').first().json.uif.angles.length} angles · ${$('Validate UIF').first().json.uif.core_knowledge.facts.length} facts · ${$('Validate UIF').first().json.uif.angles.reduce((sum, a) => sum + (a.hooks?.length ?? 0), 0)} hooks extracted\\n\\nReady for post-spawner.` }}",
      "additionalFields": { "parse_mode": "Markdown" }
    },
    "credentials": { "telegramApi": { "id": "TELEGRAM_CREDENTIAL_ID", "name": "Telegram" } }
  }
}
```

Replace `YOUR_TELEGRAM_CHAT_ID` with your chat ID.

**Step 7: Add Trigger Next node (HTTP Request — placeholder)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-trigger-next",
    "name": "Trigger Post-Spawner",
    "type": "n8n-nodes-base.httpRequest",
    "typeVersion": 4.2,
    "position": [5720, 280],
    "parameters": {
      "method": "POST",
      "url": "http://localhost:5678/webhook/post-spawner-placeholder",
      "sendBody": true,
      "contentType": "json",
      "body": {
        "idea_id": "={{ $('Init State').first().json.workflowState.entityId }}",
        "triggered_by": "deep-research",
        "timestamp": "={{ new Date().toISOString() }}"
      },
      "options": {
        "timeout": 5000,
        "ignore404": true
      }
    }
  }
}
```

Note: This will return a 404 until post-spawner exists. The `ignore404` option prevents it from failing the branch.

**Step 8: Add all Branch A + B connections**

```json
[
  { "type": "addConnection", "connection": { "source": "IF UIF Valid", "target": "Extract Hooks", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Extract Hooks", "target": "Save Hook Records", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "IF UIF Valid", "target": "Save UIF", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Save UIF", "target": "Update Idea Status", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Update Idea Status", "target": "Log Completion", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Log Completion", "target": "Telegram Success", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Telegram Success", "target": "Trigger Post-Spawner", "sourceOutput": 0, "targetInput": 0 } }
]
```

**Step 9: Validate**

Run `n8n_validate_workflow`. Expected: no errors.

---

## Task 8: Error Handler

**Goal:** Add the shared error handler (Format Error → Reset Lock → Log Error → Telegram Error) and wire the FALSE outputs of both IF nodes to it.

**Step 1: Add Format Error node (Code)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-format-error",
    "name": "Format Error",
    "type": "n8n-nodes-base.code",
    "typeVersion": 2,
    "position": [2420, 460],
    "parameters": {
      "mode": "runOnceForAllItems",
      "jsCode": "const state = $('Init State').first().json?.workflowState ?? {};\n\nreturn [{\n  json: {\n    stage: state.stage ?? 'unknown',\n    entityId: state.entityId ?? 'unknown',\n    ideaTitle: state.ideaTitle ?? 'unknown',\n    workflowId: state.workflowId ?? $execution.id,\n    error: $json.errors ? $json.errors.join('; ') : ($json.error ?? $json.message ?? JSON.stringify($json).substring(0, 300)),\n    timestamp: new Date().toISOString()\n  }\n}];"
    }
  }
}
```

**Step 2: Add Reset Lock node (Airtable update)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-reset-lock",
    "name": "Reset Lock",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [2640, 460],
    "parameters": {
      "operation": "update",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_IDEAS", "mode": "id" },
      "id": "={{ $('Format Error').first().json.entityId }}",
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "research_started_at": "",
          "status": "research_failed"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 3: Add Log Error node (Airtable create)**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-log-error",
    "name": "Log Error",
    "type": "n8n-nodes-base.airtable",
    "typeVersion": 2.1,
    "position": [2860, 460],
    "parameters": {
      "operation": "create",
      "base": { "value": "AIRTABLE_BASE_ID", "mode": "id" },
      "table": { "value": "AIRTABLE_TABLE_LOGS", "mode": "id" },
      "columns": {
        "mappingMode": "defineBelow",
        "value": {
          "workflow_id": "={{ $('Format Error').first().json.workflowId }}",
          "entity_id": "={{ $('Format Error').first().json.entityId }}",
          "step_name": "error_handler",
          "stage": "={{ $('Format Error').first().json.stage }}",
          "timestamp": "={{ $('Format Error').first().json.timestamp }}",
          "output_summary": "={{ $('Format Error').first().json.error }}",
          "status": "error"
        }
      }
    },
    "credentials": { "airtableTokenApi": { "id": "AIRTABLE_CREDENTIAL_ID", "name": "Airtable" } }
  }
}
```

**Step 4: Add Telegram Error node**

```json
{
  "type": "addNode",
  "node": {
    "id": "node-telegram-error",
    "name": "Telegram Error",
    "type": "n8n-nodes-base.telegram",
    "typeVersion": 1.2,
    "position": [3080, 460],
    "parameters": {
      "chatId": "YOUR_TELEGRAM_CHAT_ID",
      "text": "={{ `❌ Research failed\\n\\n*${$('Format Error').first().json.ideaTitle}*\\nStage: ${$('Format Error').first().json.stage}\\nError: ${$('Format Error').first().json.error}\\n\\nIdea reset to research_failed. Check logs.` }}",
      "additionalFields": { "parse_mode": "Markdown" }
    },
    "credentials": { "telegramApi": { "id": "TELEGRAM_CREDENTIAL_ID", "name": "Telegram" } }
  }
}
```

**Step 5: Wire error handler connections**

```json
[
  { "type": "addConnection", "connection": { "source": "IF Plan Valid", "target": "Format Error", "sourceOutput": 1, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "IF UIF Valid", "target": "Format Error", "sourceOutput": 1, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Format Error", "target": "Reset Lock", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Reset Lock", "target": "Log Error", "sourceOutput": 0, "targetInput": 0 } },
  { "type": "addConnection", "connection": { "source": "Log Error", "target": "Telegram Error", "sourceOutput": 0, "targetInput": 0 } }
]
```

**Step 6: Full workflow validation**

Run `n8n_validate_workflow`. Expected: no errors on any node.

---

## Task 9: Credentials + Placeholder Substitution

**Goal:** Replace all placeholder values with real credentials and IDs.

**Step 1: Collect real values**

You need:
- `AIRTABLE_BASE_ID` — from Airtable API or URL
- `AIRTABLE_TABLE_IDEAS` — ideas table ID
- `AIRTABLE_TABLE_LOGS` — logs table ID
- `AIRTABLE_TABLE_BRAND` — brand table ID
- `AIRTABLE_TABLE_HOOKS_LIBRARY` — created in Task 1
- `AIRTABLE_CREDENTIAL_ID` — n8n credential ID for Airtable token
- `ANTHROPIC_CREDENTIAL_ID` — n8n credential ID for Anthropic API
- `PERPLEXITY_CREDENTIAL_ID` — n8n credential ID for Perplexity header auth
- `TELEGRAM_CREDENTIAL_ID` — n8n credential ID for Telegram bot
- `YOUR_TELEGRAM_CHAT_ID` — your Telegram chat ID

**Step 2: Update all Airtable nodes**

Use `n8n_update_partial_workflow` with `updateNode` operations to patch each Airtable node's `base.value` and `table.value` with real IDs.

**Step 3: Update all credential references**

Patch each node's `credentials` object with real credential IDs from your n8n instance.

**Step 4: Validate again**

Run `n8n_validate_workflow`. Expected: no credential or configuration errors.

---

## Task 10: End-to-End Test

**Goal:** Run the workflow against the test idea created in Task 1 and verify all outputs.

**Step 1: Confirm test idea is ready**

In Airtable `ideas` table, verify the test idea has:
- `status = selected`
- `research_started_at` = empty
- `content_brief` = populated JSON

**Step 2: Activate the workflow and manually trigger**

In n8n UI, activate the `deep-research` workflow. Then either:
- Click "Test workflow" (runs from trigger), OR
- Use `n8n_test_workflow` MCP tool with the workflow ID

**Step 3: Watch execution in n8n UI**

Open the execution view. Verify each node turns green in sequence:
- Schedule Trigger → Find Ready Idea (finds 1 record) → IF Ideas Found (TRUE path)
- Init State → Load Config → Lock Idea → Load Brand → Assemble Context
- Research Architect (check output: should be JSON with 3 queries)
- Validate Research Plan (valid: true)
- Log Research Plan → Perplexity Q1 → Log Q1 → Perplexity Q2 → Log Q2 → Perplexity Q3 → Log Q3
- Assemble UIF Input → UIF Compiler (check output: should be UIF JSON)
- Validate UIF (valid: true)
- Both branches: Extract Hooks + Save Hook Records (Branch A) | Save UIF + Update Idea + Log Completion + Telegram + Trigger Next (Branch B)

**Step 4: Verify Airtable outputs**

In Airtable `ideas` table — test idea should now have:
- `status = researched`
- `research_started_at` = timestamp from when workflow ran
- `research_completed_at` = timestamp
- `intelligence_file` = populated JSON (parse it to verify it matches UIF v2.0 schema)

In Airtable `hooks_library` table:
- Should have N new records (one per hook across all angles)
- Each with `hook_text`, `hook_type`, `angle_name`, `status = candidate`

In Airtable `logs` table:
- Should have entries for: research_architect, perplexity_q1, perplexity_q2, perplexity_q3, complete

**Step 5: Verify Telegram**

Check your Telegram bot — should have received:
`✅ Research complete\n\n*[topic]*\n[N] angles · [N] facts · [N] hooks extracted\n\nReady for post-spawner.`

**Step 6: Run a second time immediately**

Without changing anything, trigger the workflow again. Expected: Find Ready Idea returns 0 records (idea is now `researched`, not `selected`). Workflow exits cleanly at IF Ideas Found FALSE. No duplicate processing.

**Step 7: Test the error path**

In Airtable, create a second test idea with:
- `status = selected`
- `research_started_at` = empty
- `content_brief` = `"not valid json"`

Trigger the workflow. Expected:
- Assemble Context handles the parse error gracefully (outputs `{ parse_error: "..." }`)
- Research Architect produces queries anyway (or produces malformed output)
- Validate Research Plan fails → IF Plan Valid FALSE → error handler fires
- Test idea status = `research_failed`, `research_started_at` = empty (lock reset)
- Telegram error message received

---

## Completion Checklist

- [ ] `ideas` table has `intelligence_file`, `research_started_at`, `research_completed_at` fields
- [ ] `hooks_library` table exists with correct fields
- [ ] `deep-research` workflow created in n8n with ~28 nodes
- [ ] All credentials configured (Airtable, Anthropic, Perplexity, Telegram)
- [ ] All placeholder IDs replaced with real values
- [ ] Workflow validates with no errors
- [ ] Test idea processed successfully end-to-end
- [ ] UIF JSON written to `ideas.intelligence_file` and matches v2.0 schema
- [ ] Hook records written to `hooks_library`
- [ ] Log entries written for all major steps
- [ ] Telegram success notification received
- [ ] Idempotency verified (second trigger exits cleanly)
- [ ] Error path verified (bad input → reset lock → Telegram error)
