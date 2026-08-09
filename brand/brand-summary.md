# Brand Summary — The Meta Architect
> Condensed operational reference for pipeline LLM calls (writing, research, planning).
> Full detail: brand-guidelines.md, icp.md, state-framework.md

---

## Audience Routing (read first — 2026-07-20)

The brand serves TWO audiences. Every content artifact declares one, and that choice routes the ICP, voice test, and CTA:

| Audience | Status | Reference | Voice test | Public CTA |
|---|---|---|---|---|
| **Operator** (Expertise Operator — /setup buyer) | PRIMARY, active | `brand/audiences/operator.md` | Busy owner test | `/setup` (every ~3rd operator post) |
| **Practitioner** (LLM Platform/Reliability Lead) | Pull-only | ICP + voice sections below; `brand/audiences/practitioner.md` | Burned practitioner test | `/score` (every ~3rd practitioner post) |

- The ICP, Voice Tests, Content Pillars, and CTA cadence sections BELOW this line describe the **practitioner lane** and stay authoritative for it. For operator-audience work, `brand/audiences/operator.md` overrides them.
- Shared and audience-neutral: Identity, thesis, prohibitions, post anatomy, STATE framework. Visual identity is lane-split as of 2026-08-09: practitioner keeps the dark brutalist system (Visual Identity section below); operator surfaces use the Draftsman system — see "Operator Lane — Draftsman System".
- `/readiness` is never a public CTA in either lane. Operator content never uses tool language (see operator.md).
- Default LinkedIn mix ~60% operator / 40% practitioner (pending confirmation; revisit after first founding client).

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

**Caution**: "It's not about the model — it's about the plumbing" matches LinkedIn's publicly named AI-tell shape ("it's not X, it's Y"). Keep the phrase in the brand — never in hooks, and vary the phrasing ("The model was fine. The plumbing wasn't.").

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
- AI-tell shapes and em-dash overuse on ANY customer-facing surface (web pages, PDFs, emails — not just pipeline posts); same gates as editorial (lessons.md 2026-07-19)
- Internal business mechanics in customer copy ("built once, delivered every time", margins, automation degree) — operator docs only, never the buyer's page

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
4. **The compliance gap** — Risk and legal asking: "Can we log why the agent did this?" Law 25 requires documenting automated decisions, data used, principal factors. No confirmed Quebec Law 25 enforcement action against an automated-decision/AI system exists yet (verified 2026-07-23) — content must frame this as a legal requirement + architecture spec, never imply Quebec has already fined someone for it. Real enforcement precedent to cite instead: OPC's PIPEDA findings against OpenAI (consent/retention/accuracy, May 2026) and X Corp/xAI (Grok deepfakes, June 2026), and CJEU C-203/22 (GDPR, an automated-decision-explainability case). OSFI's Guideline E-23 (AI model risk) is real but not yet in force — effective May 1, 2027 — usable as a countdown-clock hook, not a claim that enforcement has started.
5. **Leadership pressure vs. stochastic reality** — 100% feel pressure to implement GenAI. 90% think expectations are unrealistic. Backed by named data (verified 2026-07-23): RAND found leadership miscommunicating project intent to engineering is the single most common cause of AI project failure; IDC's Ashish Nadkarni attributes much pilot failure to panic-driven, underfunded board mandates.

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
| **Regulated AI & Law 25** | Quebec Law 25, OSFI, EU AI Act as architecture requirements, not compliance checkboxes. Fresh angle: OSFI Guideline E-23 (AI model risk/explainability) takes effect May 1, 2027 — real deadline, zero enforcement yet. |

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
Line 7-9: Lesson — specific, architectural, actionable — carries the save-worthy element
         (blank line)
Line 10: Close — ONE question only production scar tissue can answer, OR one-line STATE tie-in — never generic ("Agree?", "Thoughts?", "Comment YES" are classifier-detected bait)
```

**Length**: 180–300 words (~1,300–1,900 chars). **Hashtags**: 0–3, 0 preferred — never the final line. **Blank lines**: structural, not decorative.
**Save-worthy element**: every post includes something referenceable — a checklist, score, taxonomy, or field test. Saves are the heaviest ranking signal.
**CTA cadence**: roughly every 3rd LinkedIn post carries a soft CTA to `simonparis.ca/score` — phrased as a practitioner sharing a tool, never a marketer pushing a download. Check mechanically: if neither of the last 2 LinkedIn rows in `pipeline.posts` mentions `/score`, this post carries it. `/score` is the canonical public lead-capture URL — never point public CTAs at `/readiness`.
Full LinkedIn mechanics: `.claude/skills/repurpose/references/linkedin-playbook.md`

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
| Medium | Database writes (Supabase), LLM calls, external APIs | S + T + E |
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
  entityId: string,     // Supabase row id (uuid)
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
- [ ] All LLM/API output validated before any database write
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

**Both lanes:**
1. Orange (`#E04500`) is the only accent/action color — and it is spent, never sprayed
2. Never blue. Anywhere.
3. No pill buttons, no glow effects, no colored accent bars on cards (recognized AI-design clichés — all tried and rejected 2026-08-09)

**Practitioner lane** (`/score`, `/readiness`, blog, teardowns, `LegacyHomePractitioner`):
4. Always dark mode — no light mode, no toggle
5. Zero border-radius everywhere; no/instant transitions — raw execution IS the credibility signal for this audience
6. Amber (`#C97A1A`) for links only
7. Roboto Mono for labels, nav, metadata

**Operator lane** (homepage, `/setup`, `/work-with-me`, `/about`): the Draftsman system below governs — including its own light palette, link treatment, and motion rules.

## Operator Lane — Draftsman System (2026-08-09)

**Why this register.** The operator buyer (solo consultant/coach/fractional exec — see `.claude/product-marketing.md`, canonical for ICP and customer language) hires a *person practicing a craft*, not a tech product: independent trust-criteria research found this buyer responds to a named human and visible craftsmanship over company polish (`docs/research/operator-trust-criteria-independent-2026-08-09.md`). Brutalism reads as engineering credibility only to engineers; for a premium-service buyer it reads as unfinished. The Draftsman direction leans into the brand name literally — a boutique architecture-studio register: drafting paper, ink, brass, physical artifacts. Approved by Simon 2026-08-09 after three rejected directions (token-softening, navy/gold glow, Apple-clone twins).

**Standing law — comprehension beats cleverness.** A clever ownable metaphor is worth less than instant comprehension for a first-time, non-technical visitor. (An animated floor-plan metaphor was dropped mid-session for exactly this.) If a device requires decoding, label it inline or cut it. Never ship a metaphor on instinct alone.

### Palette

| Token | Hex | Role | Usage limit |
|---|---|---|---|
| paper | `#F3EEE1` | page background | — |
| paper-deep | `#EAE3D0` | panels, cards, sheets | — |
| ink | `#1C1712` | headings, body, buttons at rest, the closing dark panel | — |
| ink-soft | `#5B5346` | secondary text | body-safe |
| ink-faint | `#948C7A` | decorative metadata only | never essential text (fails AA on paper) |
| brass | `#8C6A2F` | eyebrow labels, seal, detail accents | labels ≥14px only (large-text AA) |
| orange | `#E04500` | exactly two uses per page | button hover/press + one full-bleed dark closing panel |

Text links in Draftsman scope: ink, underlined; hover brass. (Amber fails contrast on paper — it stays practitioner-only.)

### Type

- **Merriweather** (serif) for display/headlines, *italic for the emphasis word* — a confident serif is a differentiator against the sea of grotesk AI/SaaS sites
- **Inter** for body and UI text
- **No monospace on operator surfaces.** Mono is a practitioner-audience tell — `label-mono`/`font-mono` must not appear in operator page code

### Component patterns

- **Note card** — a physical index card: paper-deep background, real box-shadow (`0 8px 24px rgba(28,23,18,0.12)`), rotated 1–2° off-axis, torn-tape accent pinning it down. Signature use: the *reset vs. remembers* pair — a chat that starts over ("Hi, I run a coaching business, and—" repeated, greyed) beside a workspace that persists (Voice / Rates / Clients).
- **Spec-sheet pricing** — the rate card as a lifted physical sheet: ~0.4° tilt, pin-dot top-left, rows as numbered leader-dot lines (`01  Working Session ······ $125/hr`), never ruled table borders or a bordered box grid.
- **Ink-stamp founding seal** — circular brass stamp graphic ("Founding rate · 3 of 3") marking the flagship tier. A stamp, never a badge or colored border.
- **Buttons** — rectangular, ink fill, orange on hover, scale-down on press (tactile). No pills.
- **Personal signature line** — near the final CTA, attributing the work to Simon by name. Person-over-company is a measured trust driver for this buyer; don't drop it as "extra."

### Motion

Interactive states get real 150–300ms ease transitions. `prefers-reduced-motion` is always respected — tilt, press-scale, and fades collapse to none.

### Don't (each of these was tried or identified and rejected, 2026-08-09)

- Pill buttons; bordered card grids ("a table with borders turned on"); glow orbs / cursor spotlights; colored accent bars on rounded cards; three-equal-card layouts
- Monospace anywhere; dark-mode-by-default on operator surfaces
- Terminal/console framing devices (practitioner tell)
- Cliché copy: "Elevate", "Seamless", "Unleash" + all Prohibitions above

### Persuasion placement map

Where each lever lives on an operator page — placement is part of the system:

| Lever | Placement |
|---|---|
| Person-over-company | Signature line at final CTA; `/about` carries the strongest personal register |
| Risk reversal | "$2,500 audit, credited in full" adjacent to every $6,500 mention — never separated from the big number |
| Anxiety answers | Own-the-account-from-day-one + fixed scope sit next to the price, not in an FAQ graveyard |
| Honest scarcity | Founding seal — 3 slots, real count, never fake urgency |
| Comprehension | Every section passes the Busy Owner Test before any cleverness survives |

Gate-B note: this system re-skins approved scope. The *full* homepage rebuild (new sections, proof/case-study treatment) stays gated on the first paying client.

### Changelog

- 2026-08-09 — Execution Polish patch (radius/transition tokens) superseded by the full Draftsman system; design rules split by lane; amber ruled practitioner-only (AA failure on paper). Sources: Draftsman handoff + trust-criteria research.
