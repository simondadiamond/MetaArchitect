# Brand Guidelines — The Meta Architect

**Brand**: The Meta Architect
**Owner**: Simon Paris (simonparis.ca)
**Core thesis**: State beats intelligence. Reliable AI systems are architectural, not model-dependent.
**Category**: AI Reliability Engineering
**Tagline**: "I design AI systems that don't break."

---

## 1. Brand Identity

### Positioning Statement
The Meta Architect sits at the intersection of production AI systems, state management, and regulated enterprise environments. The positioning category is **AI Reliability Engineering** — not AI automation, not prompt engineering, not MLOps. This distinction is intentional and must be maintained consistently.

### Key Phrases (use these verbatim in content)
- "State Beats Intelligence" — the framework name, own it
- "The Meta Architect" — personal brand identity
- "AI Reliability Engineering" — the category
- "Production-grade agent systems" — what Simon teaches
- "Control is scarce. Scarcity pays." — the economic argument
- "I design AI systems that don't break." — the one-line positioning statement

### What The Meta Architect Is Not
- Not a prompt engineering resource
- Not a beginner AI tutorial channel
- Not an AI hype amplifier
- Not a general "AI for business" brand

---

## 2. Visual Identity

### Design Philosophy
Dark. Industrial. Zero-radius. Every visual decision is an expression of the core thesis: control, precision, and state management made aesthetic.

### Color Palette

#### Backgrounds
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--bg-primary` | `#0F0F0F` | 15, 15, 15 | Primary page background |
| `--bg-surface` | `#1A1A1A` | 26, 26, 26 | Cards, panels, elevated surfaces |
| `--bg-elevated` | `#1F1F1F` | 31, 31, 31 | Modals, dropdowns, overlays |
| `--border` | `#333333` | 51, 51, 51 | All dividers, borders, card edges |

#### Text
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--text-primary` | `#EAEAEA` | 234, 234, 234 | Body text, headings (14:1+ contrast ratio) |
| `--text-secondary` | `#B4B4B4` | 180, 180, 180 | Muted text, captions, metadata |
| `--text-muted` | `#777777` | 119, 119, 119 | Disabled, placeholder, tertiary |

#### Accents
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--accent` | `#E04500` | 224, 69, 0 | **Primary action** — CTAs, buttons, highlights |
| `--accent-hover` | `#FF5A1A` | 255, 90, 26 | Hover / active state |
| `--accent-link` | `#C97A1A` | 201, 122, 26 | **Links only** — amber, never blue |
| `--accent-red` | `#F85149` | 248, 81, 73 | **Errors only** — never decorative |

> **Why amber for links, not blue:** Blue is foreign to the palette and breaks the industrial aesthetic. Amber (`#C97A1A`) is visually distinct from orange (action) while staying in the same color family. If it reads too close to orange on your screens, nudge toward `#B8860B`.

```css
:root {
  --bg-primary:    #0F0F0F;
  --bg-surface:    #1A1A1A;
  --bg-elevated:   #1F1F1F;
  --border:        #333333;
  --text-primary:  #EAEAEA;
  --text-secondary:#B4B4B4;
  --text-muted:    #777777;
  --accent:        #E04500;
  --accent-hover:  #FF5A1A;
  --accent-link:   #C97A1A;
  --accent-red:    #F85149;
}
```

### Tailwind Config Extension
```js
colors: {
  background: { DEFAULT: '#0F0F0F', surface: '#1A1A1A', elevated: '#1F1F1F' },
  border:     { DEFAULT: '#333333' },
  text:       { primary: '#EAEAEA', secondary: '#B4B4B4', muted: '#777777' },
  accent:     { DEFAULT: '#E04500', hover: '#FF5A1A', link: '#C97A1A', red: '#F85149' },
}
```

### Typography

Three fonts. Each has one job.

| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| **Serif** | Merriweather | 400, 700 | Headlines, section headers, brand name. The authority font. |
| **Sans** | Inter | 400, 500, 600 | Body text, long-form content, UI text. |
| **Mono** | Roboto Mono | 400, 500, 600 | Code, labels, nav, metadata, tags. |

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Merriweather:wght@400;700&family=Roboto+Mono:wght@400;500;600&display=swap');

:root {
  --font-serif: 'Merriweather', Georgia, 'Times New Roman', serif;
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:  'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body           { font-family: var(--font-sans); }
h1, h2, h3, h4 { font-family: var(--font-serif); }
code, pre,
nav a, .label  { font-family: var(--font-mono); }
```

### Type Scale (1.25 Major Third ratio)
| Name | Size | Line Height | Weight | Font | Usage |
|------|------|-------------|--------|------|-------|
| Display | 48px / 3rem | 1.1 | 700 | Merriweather | Hero headlines |
| H1 | 36px / 2.25rem | 1.15 | 700 | Merriweather | Page titles |
| H2 | 28px / 1.75rem | 1.2 | 700 | Merriweather | Section headers |
| H3 | 22px / 1.375rem | 1.3 | 400 | Merriweather | Subsection headers |
| Body Large | 18px / 1.125rem | 1.6 | 400 | Inter | Lead paragraphs |
| Body | 16px / 1rem | 1.7 | 400 | Inter | Default body text |
| Body Small | 14px / 0.875rem | 1.6 | 400 | Inter | Captions, metadata |
| Code | 14px / 0.875rem | 1.5 | 400 | Roboto Mono | Inline code, blocks |
| Label | 12px / 0.75rem | 1.4 | 500 | Roboto Mono | Tags, badges, nav links |

### Design Rules (Non-Negotiable)
1. **Always dark mode.** No light mode. No toggle.
2. **Zero border-radius everywhere.** No rounding, ever. Sharp edges are the architectural signature.
3. **Orange is the only primary action color.** One CTA color.
4. **Amber for links only.** `#C97A1A`. Never blue.
5. **Red for errors only.** Never decorative.
6. **No teal, no green, no blue** as accent colors.
7. **Mono font for all labels and navigation** with letter-spacing 0.10–0.20em.
8. **14:1+ contrast ratio** for primary text (WCAG AAA).

### Components

**All components: zero border-radius. No exceptions.**

```css
/* Buttons */
.btn {
  display: inline-block;
  padding: 12px 24px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.05em;
  border-radius: 0;
  transition: background 0.15s ease;
}
.btn-primary        { background: var(--accent); color: #fff; border: none; }
.btn-primary:hover  { background: var(--accent-hover); }
.btn-ghost          { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
.btn-ghost:hover    { background: var(--accent); color: #fff; }
.btn-secondary      { background: transparent; color: var(--text-primary); border: 1px solid var(--border); }
.btn-secondary:hover{ border-color: var(--text-muted); }

/* Tags / Badges */
.tag {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  background: var(--bg-elevated);
  color: var(--text-secondary);
  border: 1px solid var(--border);
  border-radius: 0;
}
.tag-accent { border-color: var(--accent); color: var(--accent); }

/* Cards */
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  padding: 24px;
  border-radius: 0;
}

/* Code Blocks */
pre, .code-block {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  padding: 20px 24px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-secondary);
  border-radius: 0;
  overflow-x: auto;
}

/* Links */
a { color: var(--accent-link); text-decoration: underline; text-underline-offset: 3px; }
a:hover { color: var(--accent-hover); }

/* Grid Dividers (1px gap trick) */
.grid-divided { display: grid; gap: 1px; background: var(--border); border: 1px solid var(--border); }
.grid-divided > * { background: var(--bg-surface); }
```

### Spacing & Layout

Base unit: **8px**. Max content width: **1100px**. Horizontal padding: **32px**.

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Inline gaps, micro spacing |
| sm | 8px | Tag gaps, tight element spacing |
| md | 16px | Component inner padding |
| lg | 24px | Card padding, section sub-elements |
| xl | 32px | Page horizontal padding, large gaps |
| 2xl | 48px | Header padding, major separations |
| 3xl | 80px | Section spacing, page rhythm |

### Logo & Wordmark

```
[mono eyebrow, 10px, #E04500, letter-spacing 0.22em, uppercase]
THE META ARCHITECT

[serif wordmark, 22px bold, #EAEAEA]
Simon Paris

[mono tagline, 10px, #777777, letter-spacing 0.10em]
State Beats Intelligence
```

Logo don'ts: never on a light background, never colored wordmark, never border-radius on containing element.

---

## 3. Voice & Tone

### Core Voice
Systems thinker who builds in the real world. Contrarian on AI hype. Teacher who shows, doesn't just tell. Not a guru — a practitioner who thinks carefully and shares what he learned the hard way.

### Tone Characteristics
- Confident, diagnostic, practitioner-to-practitioner
- No cheerleading — treat the reader as an engineer who's already burned
- Concrete over abstract: "the model hallucinated a join condition" beats "AI can make mistakes"
- First-person only when anchored in a specific moment, never for general claims
- Short sentences for emphasis. Longer sentences for explanation.
- Dry wit is allowed and encouraged
- Bilingual brain — occasional French phrasing or Quebec context is natural, not forced

### Voice Tests
- **The burned practitioner test**: Would someone who got paged at 2am because their LLM hallucinated a SQL query read this and think "yes, exactly"?
- **The specificity test**: Could you replace the company name / number / failure mode with a generic placeholder? If yes, it's too vague.
- **The thesis alignment test**: Does this post connect to "state beats intelligence"? If not, what's it doing here?

### Prohibitions (never use these)
- "excited to share" / "thrilled to announce"
- "game-changing" / "revolutionary" / "groundbreaking" / "transformational"
- "in today's fast-paced world" / "in the age of AI"
- "cutting-edge" / "state-of-the-art"
- Vague lessons without mechanism: "I learned that testing matters" — always name what broke and why
- Fabricated personal anecdotes — only use humanity snippets from the verified snippet bank
- Passive voice for diagnostic statements
- Hedging the thesis: never soften "state beats intelligence" with "in some cases" or "it depends"

### Write This / Not This
| ✅ Write This | ❌ Not This |
|--------------|------------|
| "Your agent isn't failing because of the model. Here's what's actually breaking." | "I'm excited to share some thoughts on AI reliability." |
| "Always assume the LLM will fuck up. Design for it." | "It's important to implement robust testing in AI systems." |
| "The backtick thing happened to me at 11pm, client demo the next morning." | "As a practitioner, I've seen many JSON parsing issues." |
| "Can we log why the agent did this? Law 25 says you need to answer that." | "Organizations should consider regulatory compliance in their AI journey." |
| "It's not about the model — it's about the plumbing around it." | "Game-changing LLM architectures for the future of AI." |

---

## 4. Content Pillars (5)

All five pillars are expressions of the spine. They are lenses on State Beats Intelligence, not independent topics.

| Pillar | Description | Post Examples |
|--------|-------------|---------------|
| **Production Failure Taxonomy** | Naming and classifying LLM failure modes with precision. These failures are always state failures in disguise. | "Why your RAG pipeline fails silently", "3 production failures and the architectural pattern behind all of them" |
| **STATE Framework Applied** | Demonstrations of STATE pillars in real architecture decisions. | "Run your agent through the STATE checklist", "Before/after: stateless vs. stateful agent diagram" |
| **Defensive Architecture** | Design patterns that make AI systems tolerant by construction. | "The validation gate you're skipping", "Always assume the LLM will fuck up — here's what that means architecturally" |
| **The Meta Layer** | How Simon uses AI to do the work most people do manually — including figuring out what to ask the AI. | "I didn't know what I wanted to build. So I asked an AI what question I should be asking." (origin story — write first, pin it) |
| **Regulated AI & Law 25** | Quebec's Law 25 as an architecture requirement, not a checkbox. | "Quebec's Law 25 just became your AI architecture spec", "The accidental compliance win: build stateful, observable agents and Law 25 comes for free" |

**The spine check**: At least 2 posts per week should explicitly or implicitly land on State Beats Intelligence.

---

## 5. Post Anatomy (LinkedIn Standard Template)

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

**Length**: 150–250 words.
**Diagrams**: Before/after architecture comparisons beat 300 words.
**Blank lines**: Structural, not decorative — they control reading pace.
**Hook (Line 1)**: Must stand alone. Works as the first line of a cold read.
**Close (Line 10)**: Must earn its position. No "what do you think?" unless it's genuine.

---

## 6. Intent Ratios (Posting Strategy)

| Intent | Target % | Purpose |
|--------|----------|---------|
| authority | 50% | Deep expertise, builds credibility as a practitioner |
| education | 30% | How-to, explainers, tactical value delivery |
| community | 15% | Engagement, conversation starters, audience activation |
| virality | 5% | High-reach, shareable moments, punchy takes |

If the queue has >60% authority posts, surface other intents for balance.

---

## 7. Platform Rules

### LinkedIn (Primary)
- **Length**: 150–250 words
- **Format**: 10-line anatomy with blank lines as specified
- **Hashtags**: 3–5 at end — `#AIReliabilityEngineering #LLMOps #StateManagement #Law25` or similar
- **CTA**: Optional — only if it opens a genuine conversation
- **First line**: Must appear in preview (no blank lines before hook)

### X / Twitter (Secondary)
- **Single tweet**: ≤280 characters
- **Thread**: Each tweet marked `/1`, `/2`, etc. First tweet must work standalone.
- **No hashtags in threads** unless specifically relevant
- **Voice**: More punchy, less explanatory than LinkedIn

### YouTube (Future)
- `youtube_angle` = 1–2 sentence concept summary only, not a script
- Script production is a separate process

---

## 8. The Origin Story Post (write first, pin it)

**Topic**: Why The Meta Architect exists.
**Hook**: "I didn't know what I wanted to build. So I asked an AI what question I should be asking."
**Arc**: Didn't know the right question → deep research → asked LLM to write the prompt → answer became the brand.
**Lesson**: The meta skill isn't prompting. It's knowing what to ask.
**Format**: Mini case study. Personal voice. Minimal AI assistance.
**Why first**: Everything else points back to it. Explains the name, establishes the voice, demonstrates the meta-layer pillar live.

---

## 9. Humanity Snippets

A humanity snippet is a short, specific, lived detail that makes AI-generated content feel real.

**What good snippets look like**:
- "The backtick thing happened to me at 11pm, client demo the next morning"
- "I was embarrassed to show the client — it had worked perfectly in every test"
- "My first instinct was to blame the model. It wasn't the model."
- "I asked an LLM what question I should be asking. The answer became my brand name."

**Rules for use**:
- One snippet per post maximum
- Woven in organically — not announced
- Only use snippets from the verified snippet bank
- The snippet must be specific and real — not dramatized

---

## 10. Quick Reference for AI Code Generation

When generating any frontend, UI, or design asset for The Meta Architect:

```
ALWAYS:
- background: #0F0F0F (page) / #1A1A1A (cards) / #1F1F1F (elevated)
- border-radius: 0 on everything
- border: 1px solid #333333
- buttons: font-family Roboto Mono, background #E04500
- links: color #C97A1A (amber), never blue
- headings: font-family Merriweather
- body: font-family Inter, line-height 1.7
- labels/code/nav: font-family Roboto Mono

NEVER:
- border-radius > 0
- blue color anywhere in the UI
- light background
- Inter or Roboto for headings (use Merriweather)
- green, teal, purple as accent colors
```
