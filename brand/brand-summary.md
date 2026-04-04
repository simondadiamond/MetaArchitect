# Brand Summary — The Meta Architect
> Condensed operational reference for pipeline LLM calls (writing, research, planning).
> Full detail: brand-guidelines.md, icp.md, state-framework.md

---

## Identity

**Brand**: The Meta Architect | **Owner**: Simon Paris (simonparis.ca)
**Category**: AI Reliability Engineering
**Thesis**: State Beats Intelligence
**Tagline**: "I design AI systems that don't break."

### Key Phrases (use verbatim)
- "State Beats Intelligence" — the framework name, own it
- "The Meta Architect" — personal brand identity
- "AI Reliability Engineering" — the category
- "Production-grade agent systems" — what Simon teaches
- "Control is scarce. Scarcity pays." — the economic argument
- "I design AI systems that don't break." — the one-line positioning statement

### What This Brand Is NOT
- Not prompt engineering, not beginner AI tutorials, not AI hype, not "AI for business"

---

## Voice & Tone

**Core**: Systems thinker who builds in the real world. Contrarian on AI hype. Practitioner-to-practitioner, not guru.

**Characteristics**: Confident, diagnostic, concrete over abstract. Short sentences for emphasis. Longer for explanation. Dry wit allowed.

### Write This / Not This

| ✅ Write This | ❌ Not This |
|---|---|
| "Your agent isn't failing because of the model. Here's what's actually breaking." | "I'm excited to share some thoughts on AI reliability." |
| "Always assume the LLM will fuck up. Design for it." | "It's important to implement robust testing in AI systems." |
| "Can we log why the agent did this? Law 25 says you need to answer that." | "Organizations should consider regulatory compliance in their AI journey." |
| "It's not about the model — it's about the plumbing around it." | "Game-changing LLM architectures for the future of AI." |

### Prohibitions (never use)
- "excited to share" / "thrilled to announce"
- "game-changing" / "revolutionary" / "groundbreaking" / "transformational"
- "in today's fast-paced world" / "in the age of AI" / "cutting-edge" / "state-of-the-art"
- Vague lessons without mechanism ("I learned that testing matters" — always name what broke and why)
- Fabricated personal anecdotes — only use verified humanity snippets
- Passive voice for diagnostic statements
- Hedging the thesis ("in some cases" / "it depends")

### Voice Tests
- **Burned practitioner test**: Would someone paged at 2am because their LLM hallucinated a SQL query read this and think "yes, exactly"?
- **Specificity test**: Could you replace the company/number/failure mode with a placeholder? If yes, too vague.
- **Thesis alignment test**: Does this connect to "state beats intelligence"?

---

## ICP — Ideal Customer Profile

**Label**: LLM Platform & Reliability Lead in a data-sensitive enterprise

**The defining sentence**:
> "Our GenAI stuff is basically a clever prototype duct-taped into production — it's non-deterministic, we can't reproduce failures, and risk is breathing down our neck. I need a proper architecture for stateful, observable, auditable LLM systems so I stop betting my job on vibes."

### 5 Core Frustrations
1. **Non-determinism in production** — Same input, different outputs. Bugs can't be reproduced. Post-mortems end with "the model did something weird."
2. **Prompt whack-a-mole** — Every fix breaks something else. Accuracy requirements can't be reliably met.
3. **No observability** — No traces of prompt chains or tool calls. Problems go unnoticed until users complain.
4. **The compliance gap** — Risk and legal asking: "Can we log why the agent did this?" Law 25 requires documenting automated decisions, data used, principal factors.
5. **Leadership pressure vs. stochastic reality** — 100% feel pressure to implement GenAI. 90% think expectations are unrealistic.

### Language That Lands
"This stuff is non-deterministic" | "Debugging is a game of chance" | "Prompt whack-a-mole" | "There's no stack trace" | "Clever demo duct-taped into production" | "It's not about the model — it's about the plumbing" | "Can we log why the agent did this?"

---

## Content Pillars

| Pillar | Description |
|--------|-------------|
| **Production Failure Taxonomy** | Naming and classifying LLM failure modes with precision. These are always state failures in disguise. |
| **STATE Framework Applied** | Demonstrations of STATE pillars in real architecture decisions. Before/after comparisons. |
| **Defensive Architecture** | Design patterns that make AI systems tolerant by construction. Validation gates, locks, idempotency. |
| **The Meta Layer** | How Simon uses AI to do the work most people do manually — including figuring out what to ask. |
| **Regulated AI & Law 25** | Quebec Law 25, OSFI, EU AI Act as architecture requirements, not compliance checkboxes. |

**Spine check**: ≥2 posts per week should explicitly or implicitly land on State Beats Intelligence.

---

## Post Anatomy (LinkedIn)

```
Line 1:  Hook — specific failure, contrarian claim, or question assuming shared pain
         (blank line)
Line 2-3: Setup — what most people think or do
         (blank line)
Line 4-6: The turn — what's actually happening / what Simon learned
         (blank line)
Line 7-9: Lesson — specific, architectural, actionable
         (blank line)
Line 10: Close — question inviting response OR one-line STATE tie-in
```

**Length**: 150–250 words. **Hashtags**: 3–5 at end. **Blank lines**: structural, not decorative.

### Intent Ratios
| Intent | Target | Purpose |
|--------|--------|---------|
| authority | 50% | Deep expertise, builds credibility |
| education | 30% | How-to, explainers, tactical value |
| community | 15% | Engagement, conversation starters |
| virality | 5% | High-reach, punchy takes |

---

## STATE Framework (Operational Summary)

**Thesis**: State Beats Intelligence. A mid-tier model with proper state management beats a frontier model running stateless — every time.

### Risk Tiers

| Tier | Condition | Required Pillars |
|------|-----------|-----------------|
| Low | Read-only, no API calls, internal | S + T |
| Medium | Airtable writes, LLM calls, external APIs | S + T + E |
| High | Individual decisions, financial, regulated data, Law 25 | All five |

**Content pipeline minimum**: medium (S + T + E).

### The Five Pillars

| Pillar | One-line definition |
|--------|-------------------|
| **S — Structured** | Every operation initializes a typed state object; `stage` always reflects current execution position |
| **T — Traceable** | Every LLM call, API call, and stage transition is logged with all required fields |
| **A — Auditable** | Any automated decision affecting an individual has a decision record (not required for content pipeline) |
| **T — Tolerant** | Workflow resumes from step 6 after a crash at step 6, not from step 1 |
| **E — Explicit** | Every LLM/API output passes a validation gate before any write; invalid output → error path, never silent continue |

### State Object Schema
```javascript
{
  workflowId: string,   // randomUUID() per run
  stage: string,        // current stage name
  entityType: string,   // "idea" | "post" | "hook"
  entityId: string,     // Airtable record ID
  startedAt: string,    // ISO timestamp
  lastUpdatedAt: string // ISO timestamp, updated per stage
}
```

### Log Entry Schema
```javascript
{
  workflow_id, entity_id, step_name, stage, timestamp,
  output_summary, model_version, status: "success" | "error"
}
```

### S+T+E Checklist (Medium Risk — content pipeline minimum)
- [ ] State object initialized with all required fields
- [ ] Stage updated at each transition
- [ ] Every LLM call logged to `logs` table
- [ ] Every external API call logged
- [ ] Lock set before expensive operations
- [ ] Lock cleared on failure
- [ ] All LLM/API output validated before Airtable write
- [ ] Error path reports: stage + error message + confirms lock reset

### Error Format
```
❌ [Command] failed at [stage] — [error message] — lock reset, safe to retry
```

---

## Visual Identity (Quick Reference)

```css
:root {
  --bg-primary:    #0F0F0F;   /* page background */
  --bg-surface:    #1A1A1A;   /* cards, panels */
  --bg-elevated:   #1F1F1F;   /* modals, overlays */
  --border:        #333333;   /* all dividers */
  --text-primary:  #EAEAEA;   /* body, headings */
  --text-secondary:#B4B4B4;   /* muted, captions */
  --text-muted:    #777777;   /* disabled, placeholders */
  --accent:        #E04500;   /* CTAs, buttons */
  --accent-hover:  #FF5A1A;   /* hover state */
  --accent-link:   #C97A1A;   /* links only — never blue */
  --accent-red:    #F85149;   /* errors only */
}
```

### Typography
| Role | Font | Usage |
|------|------|-------|
| Serif | Merriweather | Headlines, section headers |
| Sans | Inter | Body text, UI text |
| Mono | Roboto Mono | Code, labels, nav, metadata |

### Non-Negotiable Design Rules
1. Always dark mode — no light mode, no toggle
2. Zero border-radius everywhere — sharp edges are the signature
3. Orange (`#E04500`) is the only primary action color
4. Amber (`#C97A1A`) for links only — never blue
