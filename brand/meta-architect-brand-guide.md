# The Meta Architect — Brand Style Guide

> Version 1.0 · March 2026 · simonparis.ca  
> **State Beats Intelligence.**

---

## 1. Brand Foundation

### Core Thesis
A mid-tier model with proper state management beats a frontier model running stateless — every time.

Every visual decision is an expression of this thesis: control, precision, and state management made aesthetic. Dark. Industrial. Zero-radius. The architecture speaks before the words do.

### The STATE Framework (Visual Anchor)
| Letter | Word | Definition |
|--------|------|------------|
| S | Structured | Explicit state schemas, not implicit context |
| T | Traceable | Every step observable, every decision logged |
| A | Auditable | Governance-ready, explainable under Law 25 |
| T | Tolerant | Fault-tolerant and resumable after failure |
| E | Explicit | Deterministic boundaries, no magic |

---

## 2. Color Palette

Always dark mode. No light mode variant. Pure black backgrounds.

### Backgrounds
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--bg-primary` | `#0F0F0F` | 15, 15, 15 | Primary page background |
| `--bg-surface` | `#1A1A1A` | 26, 26, 26 | Cards, panels, elevated surfaces |
| `--bg-elevated` | `#1F1F1F` | 31, 31, 31 | Modals, dropdowns, overlays |
| `--border` | `#333333` | 51, 51, 51 | All dividers, borders, card edges |

### Text
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--text-primary` | `#EAEAEA` | 234, 234, 234 | Body text, headings (14:1+ contrast ratio) |
| `--text-secondary` | `#B4B4B4` | 180, 180, 180 | Muted text, captions, metadata |
| `--text-muted` | `#777777` | 119, 119, 119 | Disabled, placeholder, tertiary |

### Accents
| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `--accent` | `#E04500` | 224, 69, 0 | **Primary action** — CTAs, buttons, highlights, brand accent |
| `--accent-hover` | `#FF5A1A` | 255, 90, 26 | Hover / active state for primary accent |
| `--accent-link` | `#C97A1A` | 201, 122, 26 | **Links only** — interactive text elements (amber, NOT blue) |
| `--accent-red` | `#F85149` | 248, 81, 73 | **Errors only** — destructive actions, never decorative |

> **Why amber for links, not blue:** Blue is foreign to the palette and breaks the industrial aesthetic. Amber (`#C97A1A`) is visually distinct from orange (action) while staying in the same color family. If it reads too close to orange on your screens, nudge toward `#B8860B`.

### CSS Custom Properties
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

### Color Rules
1. **Always dark mode.** No light mode variant. This is not a toggle — it's a statement.
2. **Orange is the primary action color.** Buttons, CTAs, highlights, brand accents.
3. **Amber for links only.** `#C97A1A` on interactive text. Never blue.
4. **Red is reserved for errors.** Never decorative.
5. **No teal, no green, no blue.** Two accent families: orange (action) and amber (links).

---

## 3. Typography

Three fonts. Each has a single job.

### Font Stack
| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| **Primary — Serif** | Merriweather | 400, 700 | Headlines, section headers, brand name in hero contexts. The authority font. |
| **Secondary — Sans** | Inter | 400, 500, 600 | Body text, long-form content, secondary UI text. Optimized for screens. |
| **Tertiary — Mono** | Roboto Mono | 400, 500, 600 | Code, labels, nav links, metadata, tags. Technical credibility. |

```css
/* Font import */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Merriweather:wght@400;700&family=Roboto+Mono:wght@400;500;600&display=swap');

:root {
  --font-serif: 'Merriweather', Georgia, 'Times New Roman', serif;
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono:  'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

/* Apply the system */
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

### Typography Rules
1. **Headlines in serif.** Merriweather for all h1–h3. This is the brand signature — authority, not just code.
2. **Body in sans-serif.** Inter for readability in long-form content.
3. **Mono for technical accents.** Navigation, labels, code, metadata — the seasoning, not the main course.
4. **Three fonts, no more.** Serif + sans + mono covers every context.
5. **Generous line height on dark backgrounds.** 1.6–1.7 for body text.
6. **Letter-spacing on mono labels.** Add 0.10–0.20em tracking on uppercase mono labels.
7. **No decorative fonts.** No script, no display-only faces.

---

## 4. Logo & Wordmark

### Construction
```
[mono eyebrow, 10px, #E04500, letter-spacing 0.22em, uppercase]
THE META ARCHITECT

[serif wordmark, 22px bold, #EAEAEA]
Simon Paris

[mono tagline, 10px, #777777, letter-spacing 0.10em]
State Beats Intelligence
```

### Approved Backgrounds
| Background | Hex | Notes |
|------------|-----|-------|
| Primary (default) | `#0F0F0F` | Standard use |
| Surface | `#1A1A1A` | On cards, elevated contexts |
| Orange | `#E04500` | High-impact, use sparingly — wordmark and eyebrow go white |

### Logo Don'ts
- Never place on a light background
- Never use a colored wordmark (only white or `#EAEAEA`)
- Never alter the font stack
- Never add a border-radius to a containing element

---

## 5. Components

**All components: zero border-radius. No exceptions.**

### Buttons
```css
.btn {
  display: inline-block;
  padding: 12px 24px;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.05em;
  border-radius: 0;              /* always */
  transition: background 0.15s ease;
}

/* Primary */
.btn-primary  { background: var(--accent); color: #fff; border: none; }
.btn-primary:hover { background: var(--accent-hover); }

/* Ghost */
.btn-ghost    { background: transparent; color: var(--accent); border: 1px solid var(--accent); }
.btn-ghost:hover  { background: var(--accent); color: #fff; }

/* Secondary */
.btn-secondary { background: transparent; color: var(--text-primary); border: 1px solid var(--border); }
.btn-secondary:hover { border-color: var(--text-muted); }
```

### Tags / Badges
```css
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
```

### Cards
```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  padding: 24px;
  border-radius: 0;
}
```

### Code Blocks
```css
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
```

### Links
```css
a {
  color: var(--accent-link);         /* amber, NOT blue */
  text-decoration: underline;
  text-underline-offset: 3px;
}
a:hover { color: var(--accent-hover); }
```

### Grid Dividers (1px gap trick)
```css
.grid-divided {
  display: grid;
  gap: 1px;
  background: var(--border);   /* gap color becomes border */
  border: 1px solid var(--border);
}
.grid-divided > * {
  background: var(--bg-surface);  /* cells fill over the gap */
}
```

---

## 6. Spacing & Layout

Base unit: **8px**. Max content width: **1100px**.

| Token | Size | Usage |
|-------|------|-------|
| xs | 4px | Inline gaps, micro spacing |
| sm | 8px | Tag gaps, tight element spacing |
| — | 12px | Button padding (vertical) |
| md | 16px | Component inner padding |
| lg | 24px | Card padding, section sub-elements |
| xl | 32px | Page horizontal padding, large gaps |
| 2xl | 48px | Header padding, major separations |
| 3xl | 80px | Section spacing, page rhythm |

### Layout Rules
1. **Max-width 1100px, centered.** Horizontal padding 32px.
2. **1px borders in `#333333`.** Borders separate surfaces; they never decorate.
3. **Zero border-radius everywhere.** Sharp edges are the architectural signature.
4. **Use the 1px grid trick** for dividers — cleaner than adding border rules per element.

---

## 7. Voice & Tone

### The Test
Would someone who's been burned by a production LLM failure read this and think *"yes, exactly"*? If not, rewrite it.

### Write This / Not This
| ✅ Write This | ❌ Not This |
|--------------|------------|
| "Your agent isn't failing because of the model. Here's what's actually breaking." | "I'm excited to share some thoughts on AI reliability." |
| "Always assume the LLM will fuck up. Design for it." | "It's important to implement robust testing in your AI systems." |
| "The backtick thing happened to me at 11pm, client demo the next morning." | "As a practitioner, I've seen many JSON parsing issues." |
| "Can we log why the agent did this? Law 25 says you need to answer that." | "Organizations should consider regulatory compliance in their AI journey." |
| "It's not about the model — it's about the plumbing around it." | "Game-changing LLM architectures for the future of enterprise AI." |

### Six Writing Rules
1. **Specific over general.** Name the tool, the error, the exact failure mode.
2. **Practitioner voice, not expert voice.** The scar is the credential.
3. **Make the audience feel seen first.** They've hit this wall. Start there.
4. **No hype language.** Cut: "game-changing," "revolutionary," "I'm excited to share."
5. **Dry wit is allowed.** Careful precision and sharp humor coexist here.
6. **French is natural, not forced.** Quebec context appears organically — never performatively.

### Words to Avoid
- "game-changing" / "revolutionary" / "transformational"
- "I'm excited to share" / "thrilled to announce"
- "the future of AI" / "AI-powered" (as a standalone claim)
- "cutting-edge" / "state-of-the-art" (ironic given the brand)
- Any sentence that could have been written by someone who hasn't shipped anything

---

## 8. Non-Negotiable Design Rules

These are the load-bearing constraints. Equivalent to the STATE framework, applied to design.

| # | Rule |
|---|------|
| 1 | **Always dark mode.** No light mode. No toggle. |
| 2 | **Orange is the only primary action color.** One CTA color, full stop. |
| 3 | **Amber for links only.** `#C97A1A`. Never blue. |
| 4 | **Red for errors only.** Never decorative, never as brand color. |
| 5 | **14:1+ contrast ratio** for primary text (WCAG AAA). |
| 6 | **Zero border-radius everywhere.** No rounding, ever. |
| 7 | **No teal, no green, no blue.** Orange + amber. That's it. |
| 8 | **Mono font for all labels and navigation.** Letter-spacing 0.10–0.20em on uppercase labels. |

---

## 9. Quick Reference for AI Code Generation

When generating UI components, landing pages, or any frontend code for The Meta Architect, apply these rules automatically:

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
- blue color anywhere
- light background
- Inter or Roboto for headings (use Merriweather)
- green, teal, purple as accent colors
```

---

*The Meta Architect · simonparis.ca · State Beats Intelligence*