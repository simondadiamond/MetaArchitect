# STATE Teardown: Intercom Fin AI Engine

*When world-class observability watches the wrong layer.*

---

Intercom's Fin is one of the most technically sophisticated customer-facing AI agents in production. It handles over 13 million conversations across 4,000+ customers. It routes between Anthropic and OpenAI models through Amazon Bedrock with cross-region failover. It tracks time-to-first-token frontend-to-frontend, embeds cost-per-interaction directly into distributed traces, and maintains 99.9%+ uptime against a 99.8% SLA.

And it still burned millions of tokens on conversations it was never supposed to answer.

The bug wasn't hidden. It was visible — in the wrong layer.

## The System

Fin operates as a three-phase engine: query refinement, response generation via a bespoke RAG architecture, and output validation with confidence checks and grounding verification. It sits inside Intercom's workflow system, where customers configure multi-step routing rules that determine whether Fin handles a conversation or a human agent does.

The infrastructure behind it is serious. Hundreds of engineers across 20+ teams ship ~100 changes daily to Fin-related code. The team built cross-vendor failover (Anthropic via Bedrock, Vertex, and direct API; OpenAI via Azure and direct), cross-model fallback to similarly capable alternatives, latency-based routing that dynamically shifts traffic to the fastest available provider, and capacity isolation pools that prevent non-Fin workloads from competing for Fin's resources. They maintain 2-3x buffer capacity for traffic spikes.

The observability stack is equally mature. Honeycomb distributed tracing with low-level spans attached to transaction spans. Event-based SLOs tracking the percentage of interactions faster than an established baseline. Prompt template logging separated from variables for offline evaluation. Real-time cost-per-interaction signals embedded directly into traces — a capability they built after discovering that querying the data warehouse took minutes and refreshed daily.

For escalation decisions, they deployed a custom multi-task ModernBERT encoder model trained on 4 million multilingual examples, achieving 97.4% accuracy on escalation classification. The model cites specific guidelines when escalating and classifies reasons into 8 categories.

This is a well-built system. And the gaps are more interesting because of it.

## STATE Analysis: 6/10

### S — Structured: 1/2

Fin's workflow system tracks conversation state transitions (resolved, escalated, inactive) and supports configurable Conversation Data Attributes. But no typed state schema for the full conversation lifecycle is documented publicly.

The proof is in the bug. Intercom implemented an "eager request" optimization — pre-firing LLM processing in parallel with the standard request flow to shave two seconds off median TTFT. When the routing decision confirmed Fin should handle the conversation, the pre-computed response streamed immediately. Brilliant latency engineering.

But routing context — *whether Fin was supposed to handle a conversation* — wasn't part of the structured state that the eager-request path checked. When workflows routed conversations to human agents (payment-sensitive topics, escalation rules), the LLM calls still fired. The system knew what stage a conversation was in. It didn't know who should be processing it at that stage.

### T — Traceable: 2/2

This is where Intercom genuinely excels, and it's worth saying clearly: their tracing infrastructure is best-in-class.

They rebuilt Honeycomb traces from scratch when the initial implementation lacked the granularity for engineers to correlate high-level signals to code changes. The rebuilt version uses low-level spans attached to transaction spans, distinguishing critical-path operations from background processing and revealing actual temporal dependencies between transactions.

They track TTFT frontend-to-frontend (sub-8-second median as of March 2025), cost-per-interaction in real-time, token-level latency (TTFT and time-to-sample-token separately), and cross-region performance. They log prompt templates separately from variables, enabling powerful offline evaluation.

Full marks here. This pillar is what makes the other gaps so instructive — you can have perfect visibility into every LLM call and still miss the question that matters.

### A — Auditable: 1/2

The custom ModernBERT escalation model is a real auditability win. It cites the specific guideline that triggered escalation, classifies reasons into 8 categories, and handles 90% of escalation decisions at 98%+ accuracy with the remaining 10% falling back to an LLM.

But this covers only escalation decisions — roughly 10-30% of conversations depending on the customer. For the majority of conversations that Fin resolves, there's no documented decision-record mechanism explaining why Fin chose a specific answer, which sources it weighted most heavily, or how it resolved ambiguity between competing knowledge base articles. You can explain why Fin escalated. You can't explain why Fin said what it said.

### Tol — Tolerant: 1/2

Infrastructure fault tolerance is genuinely strong. Cross-vendor, cross-model, and cross-region failover. Latency-based routing. Capacity isolation. Buffer capacity for 2-3x normal traffic. Streaming disabled for non-user-facing calls to enable boto3 client-level retries.

But this operates at the request level, not the conversation level. There's no documented evidence of mid-workflow checkpoint/resume. Fin 3 introduced Procedures — multi-step workflows where Fin resolves complex queries like damaged order claims from start to finish. If a Procedure fails at step 3 of 5, there's no indication the conversation resumes from step 3 rather than restarting entirely. The auto-close timer is a fixed 4-minute value, not a state-aware recovery mechanism.

As Fin takes on increasingly complex multi-step procedures, this gap grows proportionally.

### E — Explicit: 1/2

The three-phase engine includes genuine validation gates: confidence checks before responding, grounding verification against knowledge sources, and disambiguation when certainty is low. The deployment pipeline uses a two-stage gate: offline backtesting (thousands of parallel queries evaluated by LLM-as-judge) followed by A/B testing.

But the eager-request optimization created a code path that bypassed the first gate entirely. LLM calls fired before the system determined whether Fin should be processing that conversation. The validation gates protect the *response path* but not the *invocation path*. A system where the hot path circumvents the explicit gates has an E gap, regardless of how well the gates work when they're on the path.

## The Gaps

### Gap 1: Routing-Context Blindness

**Mechanism**: The eager-request optimization invoked LLM processing in parallel with workflow routing, without checking whether Fin would ultimately handle the conversation.

**Evidence**: Honeycomb case study explicitly describes this: conversations routed to human agents (payment-sensitive topics) triggered LLM calls that went unused because Fin wasn't actually engaged.

**Production consequence**: Millions of wasted tokens. Margin degradation detected by the finance team through quarterly reviews before engineering found it through monitoring — because the per-call traces showed healthy individual calls, not wasted ones.

### Gap 2: Trace Semantics — Calls Made vs. Calls Warranted

**Mechanism**: Distributed traces instrument the execution path but not the decision path. Cost-per-interaction is tracked, but cost-per-*warranted*-interaction isn't. A wasted LLM call looks identical to a useful one in the trace.

**Evidence**: The data warehouse query that could surface the waste took minutes and refreshed daily. By the time Intercom embedded cost signals into real-time traces, the traces still lacked the semantic context to distinguish warranted from unwarranted calls. Finance found the waste before engineering.

**Production consequence**: Engineering shipped ~100 changes daily without real-time visibility into whether those changes introduced new categories of waste. The feedback loop for cost efficiency was hours to days, not seconds.

### Gap 3: No Conversation-Level Checkpoint/Resume

**Mechanism**: Fault tolerance operates at the request level (retry the LLM call, failover to another vendor) but not the workflow level (resume a multi-step Procedure from where it failed).

**Evidence**: The reliability engineering blog documents cross-vendor, cross-model, and cross-region failover but explicitly does not describe checkpoint/resume, idempotency, or distributed locks. Chaos monkey testing is planned but not yet implemented.

**Production consequence**: As Fin 3 takes on multi-step Procedures (damaged order claims, account troubleshooting), a mid-workflow failure means repeating the entire interaction — burning tokens and degrading the customer experience. This gap scales with the complexity of what Fin is asked to do.

## What They Do Well

Credit where it's earned:

- **Tracing rebuild**: They recognized their first tracing implementation was too high-level and rebuilt it from scratch. That takes institutional discipline.
- **Escalation model**: A custom ModernBERT encoder for escalation decisions is architecturally stronger than most teams' "ask the LLM if it should escalate" approach. 97.4% accuracy on 4M multilingual examples.
- **Infrastructure resilience**: Cross-vendor, cross-model, cross-region failover with capacity isolation and buffer capacity. 99.9%+ uptime on a system that depends on external LLM providers.
- **Cost-in-trace innovation**: Embedding cost-per-interaction directly into distributed traces — rather than relying on warehouse queries — is a pattern more teams should adopt.
- **Honest latency engineering**: The eager-request optimization delivered a genuine 2-second TTFT reduction. The bug it introduced was a gap in the state model, not a flaw in the optimization itself.

## The Lesson

Intercom's Fin proves a counterintuitive principle: **observability of execution is not observability of intent.**

You can trace every LLM call, measure every token, track every millisecond of latency — and still miss the question "should this call have been made at all?" The answer to that question lives in the state model, not the trace. If the state model doesn't capture *who should be processing this conversation right now*, then no amount of call-level instrumentation will catch the moment when the system does the right thing for the wrong conversation.

The fix isn't more traces. It's a routing-context field in the structured state that the eager-request path checks before firing. One field. The traces they already built would catch the rest.

State beats instrumentation. Every time.

---

*Want to know how your production AI system scores? [Take the STATE assessment →](/score)*
