# Intercom Fin STATE Teardown: World-Class Observability, and the State Lives in Prose

> Fin traces every call, meters every token, and gates every answer — and still burned millions of tokens on conversations it was never supposed to handle, because the question that mattered lived in the state model, not the traces.

## What Intercom Fin Is

Fin is Intercom's AI customer-service agent and probably the most architecturally documented commercial agent in production: 13+ million conversations across 4,000+ customers, multi-vendor model routing through Bedrock with cross-region failover, and a seven-phase engine — query refinement, proprietary retrieval and reranking models, generation via their Fin Apex model, then accuracy validation before anything reaches a customer. Intercom reports a 76% average resolution rate. For multi-step automation, Fin executes "Procedures" — natural-language instruction flows that branch, call external systems, and hand off to humans; the older step-based Fin Tasks primitive stops accepting new tasks in March 2026. Fin matters to platform owners for a specific reason: it is the reference architecture leadership points at when they ask why your agent can't do what Fin does.

## The STATE Score

| Pillar | Score | One-line verdict |
|--------|-------|-----------------|
| S — Structured  | 1/2 | Routing context and workflow position live outside the structured state — one of them caused a seven-figure token burn |
| T — Traceable   | 2/2 | Best-in-class: rebuilt Honeycomb traces, cost-per-interaction embedded in spans |
| A — Auditable   | 1/2 | Escalations are explainable — a custom model cites the guideline. Resolutions are not |
| Tol — Tolerant  | 1/2 | Request-level failover is excellent; conversation-level resume is undocumented |
| E — Explicit    | 2/2 | Confidence, grounding, and safety gates, plus a two-stage deployment gate (LLM-judge backtests, then A/B) |
| **Total**       | **7/10** | |

## What Fin Gets Right

Two pillars earn their 2/2 on evidence, not generosity. On Traceable: when Intercom's first tracing implementation proved too coarse to correlate signals to code changes, they rebuilt it from scratch — low-level spans attached to transaction spans, time-to-first-token measured frontend-to-frontend, prompt templates logged separately from variables for offline evaluation, and cost-per-interaction embedded directly into distributed traces instead of waiting on daily warehouse queries. That last pattern is one more teams should steal. On Explicit: confidence checks that trigger clarification, grounding verification against the customer's knowledge sources, safety failures that refuse and escalate — plus a two-stage deployment gate of offline backtesting under an LLM judge followed by A/B tests. And the escalation decision itself runs on a custom ModernBERT encoder trained on 4 million multilingual examples, 97.4% accurate, that cites the specific guideline it escalated under. This is what taking production AI seriously looks like.

## Gap 1: The Bug Was Visible — in the Wrong Layer

Production AI systems fail when they reconstruct operational state from context instead of carrying it as an explicit object. Intercom's eager-request optimization pre-fired LLM processing in parallel with the standard request flow — message storage, customer-configured workflow routing, deciding whether Fin should be engaged at all — so that by the time routing completed, an answer was often already streaming. Brilliant latency engineering: two seconds off median time to first token.

But *whether Fin was supposed to handle the conversation* wasn't part of the structured state the hot path checked. When workflows routed conversations to human agents — payment-sensitive topics, escalation rules — the LLM calls fired anyway. Millions of tokens spent on conversations Fin would never answer, invisible in per-call traces because every individual call looked healthy. The query that quantified the waste belonged to the finance team; engineering used it to validate the fix after the fact. Intercom's own remediation proves the diagnosis: a routing-context field in the state the eager path consults. One field. The world-class traces they had already built then caught the rest.

**Score yourself:** if your agent crashed mid-workflow right now, what would happen to the work in progress — and what fields does your hot path check before it spends money?

## Gap 2: Can a Procedure Resume From Step 3?

A system that only works in the forward-motion state is a demo; production systems fail at step 6 of 10. Fin's fault tolerance is genuinely strong at the request level — cross-vendor, cross-model, and cross-region failover, retries, capacity isolation. But nothing documented operates at the *workflow* level. Procedures are described as "a single, shared instruction flow" where the model, when interrupted, "reasons about what to do next... without rigid scripts" — workflow position is a conclusion the model re-derives from context each turn, not a persisted field. The documented safety net is loop detection with human escalation, and loop detection is a confession: you only need it if nothing in the architecture knows what step it's on. Intercom's own product history reinforces the point — step-based Tasks were deprecated in favor of prose Procedures because prose steps proved unreliable, and the fix was better reasoning over instructions, not an explicit state machine.

The consequence has a dollar sign: a Procedure that calls a billing API at step 4 and fails at step 5 gets "adapted" by re-reasoning, and without documented idempotency on connector calls, re-derivation can mean re-execution.

**Score yourself:** if your workflow died at step 6 right now, does it resume from step 6 — or have you never tested it?

## Gap 3: Can You Explain One Specific Answer From Last Month?

In regulated environments, "the model did something unexpected" is not an acceptable explanation. Fin's escalation decisions are genuinely auditable — the ModernBERT model cites the triggering guideline and classifies the reason into one of eight categories. But escalations are maybe 10–30% of conversations. For the resolved majority, no documented mechanism records why Fin chose a specific answer, which knowledge sources it weighted, which of the customer's personal data fields were used, or the principal factors behind the outcome. You can explain why Fin escalated; you cannot explain why Fin said what it said.

Intercom's organizational compliance is excellent — SOC 2 Type II, ISO 27001, ISO 42001, HIPAA BAAs, EU data residency. But certifications attest to the organization, not to individual decisions. If you deploy Fin in Quebec, Law 25 requires that an individual can be informed, on request, of the personal information used and the principal factors behind an automated decision. The regulator will not send that request to Intercom. They will send it to you — and the vendor's audit surface doesn't reach it.

**Score yourself:** if a regulator asked what data drove one specific decision last month, could you answer in under 30 minutes?

## What Good Looks Like

You can't fix Fin's internals — it's closed. But a deploying team can wrap it at the boundary it already controls, and the wrap is roughly two tables and a discipline. First, a shadow state record fed by Intercom's webhooks — run ID, stage, stage history, routing context — so workflow position exists somewhere queryable. Second, a decision record per automated resolution, so the Law 25 question has a 30-minute answer instead of a forensic project:

```sql
CREATE TABLE fin_decision_records (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     text NOT NULL,          -- Intercom conversation ID
  resolved_at         timestamptz NOT NULL,
  procedure_name      text,                   -- which Procedure ran, if any
  stage_history       jsonb NOT NULL,         -- [{stage, entered_at}] from webhook events
  knowledge_sources   jsonb NOT NULL,         -- article/PDF IDs surfaced in the answer
  personal_data_used  text[] NOT NULL,        -- fields passed via data connectors
  principal_factors   text NOT NULL,          -- plain-language basis for the outcome
  model_version       text NOT NULL,
  escalated_to_human  boolean NOT NULL DEFAULT false
);
```

Third, idempotency keys on every connector action that touches money or records, so a re-derived step can't execute twice. Intercom's own token-burn fix — one routing-context field in structured state — is the proof this pattern pays for itself.

## The Generalizable Lesson

Observability of execution is not observability of intent. You can trace every LLM call, meter every token, track every millisecond — and still miss the question "should this call have been made at all?" That answer lives in the state model, not the trace, and no volume of call-level instrumentation catches a system doing the right thing for the wrong conversation. The corollary for regulated deployers: certifications are organizational, audits are per-decision. Gates guard the message; state guards the process. State beats instrumentation — which is the same law that governs everything else in production AI: state beats intelligence.

## FAQ

**Is Intercom Fin compliant with Quebec Law 25?**
Intercom's certifications (SOC 2, ISO 42001, HIPAA BAAs, EU data residency) cover its organization — but Law 25's automated-decision transparency obligation falls on the deployer. Fin documents explainability for escalations only; a per-decision record for resolved conversations — data used, principal factors — is not a documented surface and has to be built at the deployment boundary.

**Can Fin resume a multi-step workflow after a failure?**
Failover is documented at the request level (cross-vendor, cross-model, cross-region). Workflow-level checkpoint/resume — resuming a Procedure from the step where it failed — does not appear in the public material; the documented safety net is loop detection with escalation to a human.

**Does Fin log why it gave a specific answer?**
Execution logging is world-class: distributed traces, cost-per-interaction in spans, prompt templates logged for offline evaluation. Decision records exist for escalations (the model cites the triggering guideline) but not for resolutions — why Fin chose a specific answer is not reconstructible from any documented customer-facing surface.

---

*Want to know how your production AI system scores? [Take the STATE assessment →](/score)*
