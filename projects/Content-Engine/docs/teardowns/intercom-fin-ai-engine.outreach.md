# Intercom Fin Teardown — Distribution Kit

> Companion to `intercom-fin-ai-engine.md` (blog slug: `intercom-fin-ai-engine`)
> v2 (merged) — combines the June 3 draft's engineering-blog evidence with the upgraded template.
> Status: draft — Simon reviews before anything goes live.

## LinkedIn Post (primary)

Intercom built world-class observability for Fin. The token burn still showed up in finance's numbers first.

I ran a STATE teardown on the Fin AI Engine — 7/10, the highest I've scored a commercial agent. Rebuilt Honeycomb traces, cost-per-interaction embedded in spans, a custom escalation model that cites the guideline it escalated under, and a triple gate — confidence, grounding, safety — before any answer ships.

Here's the part that matters. An eager-request optimization pre-fired LLM calls in parallel with workflow routing to save two seconds of latency. Whether Fin was supposed to handle the conversation at all wasn't in the state the hot path checked. Conversations routed to human agents fired the calls anyway. Millions of tokens — invisible in per-call traces, because every individual call looked healthy.

The traces watched execution. Nobody instrumented intent. The fix was one routing-context field in structured state.

One more, for regulated teams: Fin explains why it escalated — the model cites the guideline. It cannot explain why it answered. Under Law 25, that per-decision record is your obligation, not your vendor's.

Observability of execution is not observability of intent. State beats instrumentation.

If your agent burned tokens on work it was never supposed to do — what field would have caught it?

## DM Template (founding-slot outreach — personalize before sending)

{name} — I published a STATE teardown of Intercom Fin: 7/10, the best-instrumented agent I've scored, and the token burn still surfaced in finance's numbers before engineering's — the gap was in the state model, not the traces. Your {their_pattern} carries the same risk profile. The public version works from public evidence only; the interesting version uses interior access. Teardown: [URL]. Worth 30 minutes?

## Alternate Hooks (repurposed posts, later days)

1. **(Structured / deprecation lane)** Intercom deprecated its own agent workflow primitive this year. The replacement carries workflow state in prose the model re-reasons over every turn.

2. **(Auditable / Law 25 lane)** Your AI vendor's ISO certification will not answer the regulator's question. Law 25 asks what data drove one specific decision. That record doesn't exist unless you built it.

3. **(Tolerant lane)** Fin escalates to a human when it detects it's stuck in a loop. Loop detection is a confession: nothing in the architecture knows what step it's on.

## Post Angle (follow-up candidates)

"Observability of execution is not observability of intent" as a standalone Defensive Architecture pillar post; "Certifications are organizational, audits are per-decision" as a Regulated AI pillar post — both generalize past Fin.

## Sources cited in the teardown

- [How Honeycomb Helped Intercom Observe and Operate Fin.ai (case study — eager requests, cost-in-traces)](https://www.honeycomb.io/resources/case-studies/how-honeycomb-helped-intercom-observe-and-operate-fin-ai)
- [The Fin AI Engine — Intercom Help](https://www.intercom.com/help/en/articles/9929230-the-fin-ai-engine)
- [Fin AI Engine — fin.ai](https://fin.ai/ai-engine)
- [How Intercom ensures data privacy and safety in the age of AI](https://www.intercom.com/blog/data-privacy-security-ai-chatbots/)
- [Fin Procedures explained](https://www.intercom.com/help/en/articles/12495167-fin-procedures-explained)
- [How to set up Fin Tasks (deprecation notice)](https://www.intercom.com/help/en/articles/10257113-how-to-set-up-fin-tasks)
