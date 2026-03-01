# STATE Framework — Canonical Reference

**The thesis**: State Beats Intelligence.  
A mid-tier model with proper state management beats a frontier model running stateless — every time.

Production AI systems fail not because models are too weak, but because they lack proper state management, checkpointing, observability, and deterministic boundaries.

> STATE governs every pipeline operation. Risk tier determines which pillars are mandatory.

---

## Risk Tiers

| Tier | Condition | Required Pillars |
|------|-----------|-----------------|
| Low | Internal, read-only, no API calls, non-personalized | S + T |
| Medium | Airtable writes, LLM calls, external API calls, external-facing | S + T + E |
| High | Decisions affecting individuals, financial operations, regulated data, Law 25 scope | All five — no exceptions |

All pipeline commands operate at **medium risk minimum** (S + T + E).

---

## The Five Pillars

### S — Structured
*Explicit state schemas, not implicit context*

Every operation initializes a typed state object before doing any work. Business entities (claims, tickets, portfolios, content items) are first-class state objects with defined schemas. The `stage` field must always reflect current execution position.

**The failure mode it prevents**: Context rot. The agent loses track of where it is in a workflow as the context window fills. Older state gets silently dropped. Behavior degrades without any error signal.

**Diagnostic question**: "If this agent crashed right now, could you look at the last saved state object and know exactly where in the workflow it stopped — without reading the conversation history?"

**Evidence**: CA-MCP research shows 73.5% faster execution and 60% fewer LLM calls when moving from implicit context to shared explicit state.

---

### T — Traceable
*Every step observable, every decision logged*

Log every LLM call, external API call, and meaningful stage transition. Include all required fields. No silent operations. You must be able to reconstruct exactly what the agent did, what it was given, and what it produced — for any execution, after the fact, without guessing.

**The failure mode it prevents**: Blind debugging. "The model did something weird" as a post-mortem. Silent failures that only surface through downstream effects.

**Diagnostic question**: "Can you pull up a trace right now showing every LLM call, tool call, input, and output for a specific execution from last week?"

**Evidence**: Fewer than 1 in 3 enterprise teams are satisfied with their AI observability and evaluation (Cleanlab, 2025).

---

### A — Auditable
*Governance-ready, explainable under Law 25 / OSFI / EU AI Act*

For any automated decision affecting an individual or using personal data, write a decision record. Capture: what personal data was used, what the principal factors were, what model and prompt version ran, who can review it.

**The failure mode it prevents**: Regulatory exposure. The inability to answer a regulator's or individual's question about why an automated decision was made.

**Diagnostic question**: "If a regulator sent a request today asking what data your system used to make a specific decision last month — could you answer it in under 30 minutes?"

**Quebec Law 25 requirements** (non-negotiable for Quebec/Canadian enterprises):
- Notify individuals when a decision is made exclusively through automated processing
- On request: disclose personal information used, reasons and principal factors, right to submit observations for human review
- Applies broadly — not just to legal-status decisions
- Penalties: up to C$10M or 2% of global revenue (administrative); up to C$25M or 4% (penal)

**Note for content pipeline**: Not required for current content pipeline stages (no personal data involved). Required for any consulting deliverable touching customer/client data.

---

### T — Tolerant
*Fault-tolerant and resumable after failure*

When the workflow fails at step 6, it resumes from step 6. Not step 1. Lock before expensive operations (set timestamp). Clear lock on failure. Every command must be retryable — failed runs leave no permanent broken state.

**The failure mode it prevents**: Full restarts after partial failures. Lost work. Systems that only work in the happy-path forward-motion state.

**The Reboot Test**: Before declaring a system production-ready, simulate the state transition:
- Restart the service
- Reboot the container
- Inject a failure at an intermediate step
- Take an external dependency offline for 2 minutes

If the system only works moving forward, it is a demo. If it survives state transitions, it is closer to real.

**Diagnostic question**: "If this workflow crashes at step 6 of 10 right now — does it resume from step 6 or restart from step 1?"

**Evidence**: Enterprises are rebuilding production AI agent systems every 90 days (Cleanlab, 2025).

---

### E — Explicit
*Deterministic boundaries, no magic*

Every LLM or external API output passes through a validation gate before any write or action. Invalid output routes to the error path — never silently continues. Every point where LLM reasoning transitions to real-world action is a named, validated gate.

**The failure mode it prevents**: Hallucination cascades. The LLM wraps JSON in markdown code blocks, the parser dies silently. "Confident but wrong" outputs that trigger downstream actions without a contract check.

**The Seams vs. Components principle**: Testing individual nodes is component testing. Testing the full workflow with live LLM output flowing through every boundary is integration testing. Both are required. Pinned data enables component testing only. Always run at least one full end-to-end execution with live data before shipping.

**Diagnostic question**: "For every LLM call in this workflow — what is the worst thing it could output, and what stops that output from becoming a real-world action?"

---

## Scoring System

Each pillar scores 0–2 based on the two diagnostic questions:
- **2** = both questions answered YES
- **1** = one question answered YES  
- **0** = both answered NO or "not sure"

| Score | Label |
|-------|-------|
| 0–3 | Critical Risk |
| 4–5 | High Risk |
| 6–7 | Developing |
| 8–9 | Production-Ready |
| 10 | STATE-Compliant |

---

## Gap Matrix — Where Existing Frameworks Stop

| Framework | S | T | A | Tol | E |
|-----------|---|---|---|-----|---|
| LangGraph | ✅ | ◑ | ❌ | ✅ | ◑ |
| DataStates-LLM | ✅ | ◑ | ❌ | ✅ | ◑ |
| W&B Weave | ❌ | ✅ | ❌ | ❌ | ◑ |
| LangSmith | ❌ | ✅ | ❌ | ❌ | ◑ |
| Arize Phoenix | ❌ | ✅ | ◑ | ❌ | ❌ |
| OpenTelemetry GenAI | ❌ | ✅ | ❌ | ❌ | ◑ |

✅ Strong | ◑ Partial | ❌ Absent

**Key finding**: Auditable (A) is genuinely unowned by every existing tool and framework. Explicit boundary ontology does not exist anywhere in the current literature. This is where STATE fills real gaps rather than renaming documented patterns.

---

## State Object Schema

```javascript
{
  workflowId: string,      // unique per command execution (use crypto.randomUUID())
  stage: string,           // current stage name (e.g., "init", "locking", "researching")
  entityType: string,      // "idea" | "post" | "hook"
  entityId: string,        // Airtable record ID
  startedAt: string,       // ISO timestamp
  lastUpdatedAt: string    // ISO timestamp, updated at each stage transition
}
```

---

## Log Entry Schema

```javascript
{
  workflow_id: string,      // matches state.workflowId
  entity_id: string,        // Airtable record ID
  step_name: string,        // e.g., "research_architect", "uif_compiler"
  stage: string,            // current stage at time of log
  timestamp: string,        // ISO timestamp
  output_summary: string,   // brief description of what happened
  model_version: string,    // e.g., "claude-sonnet-4-6" or "sonar-pro" or "n/a"
  status: "success" | "error"
}
```

---

## Lock Pattern

**Before any expensive operation (LLM call, external API call, multi-step write):**

```javascript
// 1. Set lock timestamp BEFORE the operation
await airtable.patch(recordId, { research_started_at: new Date().toISOString() });

// 2. If operation fails, clear the lock
await airtable.patch(recordId, { research_started_at: null, status: "research_failed" });
```

Lock fields by stage:
- Research: `research_started_at`
- Draft: `drafted_at` (set when drafting begins, updated on completion)

**Idempotency check** — at command start, verify the lock field is null:
```javascript
if (record.fields.research_started_at !== null) {
  return "⚠ Already in progress or completed — check status before retrying.";
}
```

---

## Error Format

All error reports follow this structure:
```
❌ [Command] failed at [stage] — [error message] — lock reset, safe to retry
```

Example:
```
❌ Research failed at uif_compiler — UIF validation: angles array empty — lock reset, safe to retry
```

---

## S+T+E Checklist (Medium Risk — content pipeline minimum)

Before marking any command complete, verify:
- [ ] State object initialized with all required fields
- [ ] Stage updated at each transition
- [ ] Every LLM call logged to `logs` table with required fields
- [ ] Every external API call logged to `logs` table
- [ ] Lock set before expensive operations
- [ ] Lock cleared on failure
- [ ] All LLM/API output validated before Airtable write
- [ ] Error path reports: stage + error message + confirms lock reset

## All-Five Checklist (High Risk — regulated data / personal data)

All of the above, plus:
- [ ] Decision record written for any decision affecting an individual
- [ ] Personal data fields enumerated in decision record
- [ ] Model version and prompt version captured in decision record
- [ ] Human-in-the-loop approval node present for high-risk decisions
- [ ] Retention policy documented for decision records

---

## Named Principles

**The Reboot Test**: Before declaring a system production-ready, simulate the state transition. If it only works moving forward, it's a demo.

**Seams vs. Components**: Testing individual nodes is not the same as testing the workflow. Always run at least one full end-to-end execution with live data before shipping.

**The STATE Question**: "Does your agent pass the STATE test?" — applies to any AI system, any stack, any scale. Use it in content, consulting, and cohort delivery.

---

## What STATE Is Not

- Not a model evaluation framework (does not assess model quality or capability)
- Not an MLOps framework (does not cover training pipelines or dataset management)
- Not a security framework (does not replace threat modeling)
- Deliberately incomplete — covers the five properties most commonly missing in production agent systems
