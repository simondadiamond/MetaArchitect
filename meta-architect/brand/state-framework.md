# STATE Framework — Canonical Reference

STATE governs every pipeline operation. Risk tier determines which pillars are mandatory.

---

## Risk Tiers

| Tier | Condition | Required Pillars |
|---|---|---|
| Low | Internal, read-only, no API calls | S + T |
| Medium | Airtable writes, LLM calls, external API calls | S + T + E |
| High | Decisions affecting individuals, financial, regulated data | All five |

All content-engine commands operate at **medium risk minimum** (S + T + E).

---

## The Five Pillars

**S — Structured**
Every operation initializes a state object before doing any work. Stage must always reflect current execution position.

**T — Traceable**
Log every LLM call, external API call, and meaningful stage transition to the `logs` Airtable table. Include all required fields. No silent operations.

**A — Auditable**
For decisions affecting a person or using personal data, write a decision record. Not required for current content pipeline stages (no personal data).

**T — Tolerant**
Lock before expensive operations (set timestamp). Clear lock on failure. Every command must be retryable — failed runs leave no permanent broken state.

**E — Explicit**
Every LLM or external API output passes through a validation gate (state-checker) before any Airtable write. Invalid output routes to error path, never silently continues.

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
  step_name: string,        // e.g., "research_architect", "perplexity_q1", "uif_compiler"
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

## S+T+E Checklist (Medium Risk)

Before marking any command complete, verify:
- [ ] State object initialized with all required fields
- [ ] Stage updated at each transition
- [ ] Every LLM call logged to `logs` table
- [ ] Every external API call logged to `logs` table
- [ ] Lock set before expensive operations
- [ ] Lock cleared on failure
- [ ] All LLM/API output validated by state-checker before Airtable write
- [ ] Error path reports stage + error + confirms lock reset
