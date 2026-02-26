# Ideal Customer Profile — The Meta Architect

---

## Primary ICP

**Title variants**: ML Engineer, AI Engineer, Senior Software Engineer (AI/ML), Staff Engineer, Principal Engineer, Solutions Architect (AI), Platform Engineer

**Experience level**: 3–10 years in software. 1–3 years working with LLMs in production or near-production contexts. Not a researcher — a builder.

**Accountability context**: Owns or co-owns a system that has an LLM in it. Has been paged (or will be). Has had to explain to a non-technical stakeholder why the AI "behaved unexpectedly."

**The defining sentence**: They built a prototype that worked in demos, got it to production, and discovered a category of problems they hadn't anticipated — not model quality problems, but architectural problems.

---

## Frustrations

- "The LLM does great in testing, then hallucinates in a way I can't reproduce."
- "I have no idea which call caused this output."
- "My pipeline has no checkpoints — if step 4 fails, I have to restart from the beginning."
- "I can't explain to compliance why the model made that decision."
- "I feel like I'm doing prompt engineering when I should be doing systems engineering."
- "The tutorials show me how to call the API. Nobody shows me how to make it not break."

---

## Language Patterns (how they talk)

- Operational: "in production", "at scale", "in the wild", "when it actually runs"
- Precision-seeking: "reproducible", "deterministic", "observable", "auditable"
- Failure-fluent: "edge case", "silent failure", "race condition", "timeout", "retry storm"
- Skeptical of hype: "it depends", "in theory vs. practice", "benchmarks aren't real workloads"
- Tool-literate: LangChain, LlamaIndex, Pydantic, FastAPI, Airtable, n8n, Temporal, Redis

---

## Secondary ICP

**Title variants**: CTO (startup, 10–50 person), VP Engineering, Engineering Manager (AI team), Director of AI/ML

**Context**: Technically literate but not in the day-to-day code. Accountable for reliability without always being able to diagnose it. Needs frameworks they can explain to boards, legal, compliance.

**Core need**: Vocabulary + frameworks that help them ask better questions of their engineers and make defensible architectural decisions.

---

## Where to Find Them

- LinkedIn: follows #MLOps, #LLMEngineering, #AIEngineering, #GenerativeAI (the skeptical posts)
- X/Twitter: in threads debating LLM reliability, prompt engineering vs. systems engineering
- Newsletters: reads The Batch, Import AI, practical AI ops newsletters
- Communities: Latent Space Discord, MLOps Community Slack, indie hackers building with AI

---

## Voice Calibration Notes (for writer skill)

- Never talk down to this reader — they know the basics
- Never oversimplify failure modes — use precise language they recognize
- Lead with the operational reality, not the theoretical possibility
- Personal anecdotes work **only** when they name a specific technical moment ("the RAG pipeline was returning empty results and logging success")
- "We" is acceptable for generic engineer experience; "I" only for Simon's specific experience
- Avoid academic framing: no "studies suggest", "research indicates" — use "in practice", "what I see"

---

## The Burned Practitioner Test

Before publishing any post, ask: **Would someone who got paged at 2am because their LLM hallucinated a SQL query read this and feel understood?**

If the answer is "they'd roll their eyes at the vagueness," rewrite.
If the answer is "they'd screenshot this," publish.
