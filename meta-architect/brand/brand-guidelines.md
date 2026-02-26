# Brand Guidelines — The Meta Architect

**Brand**: The Meta Architect
**Owner**: Simon Paris (simonparis.ca)
**Core thesis**: State beats intelligence. Reliable AI systems are architectural, not model-dependent.

---

## Voice Rules

### Prohibitions (never use these)
- "excited to share" / "thrilled to announce"
- "game-changing" / "revolutionary" / "groundbreaking"
- "in today's fast-paced world" / "in the age of AI"
- Vague lessons: "I learned that communication matters" — always name the specific mechanism
- Fabricated personal anecdotes — only use humanity snippets from the verified snippet bank
- Passive voice for diagnostic statements: "mistakes were made" → "the system failed because..."
- Hedging the thesis: never soften "state beats intelligence" with "in some cases" or "it depends"

### Voice Tests
- **The burned practitioner test**: Would someone who got paged at 2am because their LLM hallucinated a SQL query read this and think "yes, exactly"?
- **The specificity test**: Could you replace the company name / number / failure mode with a generic placeholder? If yes, it's too vague.
- **The thesis alignment test**: Does this post connect to "state beats intelligence"? If not, what's it doing here?

### Tone Characteristics
- Confident, diagnostic, practitioner-to-practitioner
- No cheerleading — treat the reader as an engineer who's already burned
- Concrete over abstract: "the model hallucinated a join condition" beats "AI can make mistakes"
- First-person-singular only when anchored in a specific moment, never for general claims
- Short sentences for emphasis. Longer sentences for explanation.

---

## Post Anatomy (LinkedIn Standard Template)

Every LinkedIn post follows this 10-line structure:

```
Line 1:  Hook — scroll-stopping opening, one sentence
Line 2:  (blank)
Line 3:  Problem/tension setup — what's broken or counterintuitive
Line 4:  Elaboration — why this matters, what makes it non-obvious
Line 5:  (blank)
Line 6:  The reframe or insight — the STATE-aligned diagnosis
Line 7:  Evidence/example — specific, not hypothetical
Line 8:  Mechanism — why this is architecturally true
Line 9:  (blank)
Line 10: Close — the implication, the question, or the principle to take away
```

Notes:
- Blank lines are structural, not decorative — they control reading pace
- The hook (Line 1) must stand alone. It should work as the first line of a cold read.
- The close (Line 10) must earn its position — no "what do you think?" unless it's genuine

---

## Content Pillars (5)

| Pillar | Description | Post Examples |
|---|---|---|
| **Production Failure Taxonomy** | Naming and classifying LLM failure modes with precision | "Why your RAG pipeline fails silently", "The hallucination that looked like success" |
| **STATE Framework Applied** | Demonstrations of STATE pillars in real architecture decisions | "Why I write the Airtable record before the LLM call", "The lock pattern that saved my pipeline" |
| **Defensive Architecture** | Design patterns that make AI systems tolerant by construction | "The validation gate you're skipping", "Draft first, process second" |
| **The Meta Layer** | What building AI systems teaches you about AI systems — recursive insights | "Building a content pipeline taught me why my AI was unreliable" |
| **Regulated AI & Law 25** | Compliance, auditability, and what regulated industries actually need | "What Law 25 means for your AI audit trail", "Why 'we logged it' isn't enough" |

---

## Intent Ratios (Posting Strategy)

| Intent | Target % | Purpose |
|---|---|---|
| authority | 50% | Deep expertise, builds credibility as a practitioner |
| education | 30% | How-to, explainers, tactical value delivery |
| community | 15% | Engagement, conversation starters, audience activation |
| virality | 5% | High-reach, shareable moments, punchy takes |

The `/ideas` command flags over-indexing. If the queue has >60% authority posts, it will surface other intents for selection.

---

## Platform Rules

### LinkedIn
- **Length**: 150–250 words (hard limits enforced by state-checker)
- **Format**: 10-line anatomy with blank lines as specified
- **Hashtags**: 3–5 at end, topic-specific (e.g., #AIEngineering #LLMReliability #MLOps)
- **CTA**: Optional — only if it opens a genuine conversation
- **First line**: Must appear in preview (no blank lines before hook)

### X (Twitter)
- **Single tweet**: ≤280 characters (hard limit)
- **Thread**: Each tweet marked `/1`, `/2`, etc. First tweet must work standalone.
- **No hashtags in threads** unless specifically relevant
- **Voice**: More punchy, less explanatory than LinkedIn — assume the reader will click through

### YouTube (future)
- `youtube_angle` in UIF = 1-2 sentence concept summary only, not a script
- Script production is a separate process not in current pipeline scope
