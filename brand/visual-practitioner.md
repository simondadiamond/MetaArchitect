# Visual Identity — Practitioner Lane

> Load this file when working on practitioner surfaces: `/score`, `/readiness`, blog (all pillars + teardowns), `LegacyHomePractitioner.tsx`, and any content artifact declared practitioner. Operator surfaces use `brand/visual-operator.md` instead. Router + shared rules: `brand/brand-summary.md` §Visual Identity.
> Audience/ICP/voice for this lane: `brand/audiences/practitioner.md`.

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

## Typography

| Role | Font | Usage |
|------|------|-------|
| Serif | Merriweather | Headlines, section headers |
| Sans | Inter | Body text, UI text |
| Mono | Roboto Mono | Code, labels, nav, metadata |

## Non-Negotiable Rules (this lane)

1. Always dark mode — no light mode, no toggle
2. Zero border-radius everywhere; no/instant transitions — raw execution IS the credibility signal for a burned-engineer audience (validated 2026-08-09: brutalism fits this buyer, and only this buyer)
3. Amber (`#C97A1A`) for links only
4. Roboto Mono for labels, nav, metadata

Plus the shared rules (both lanes, from brand-summary): orange `#E04500` is the only accent/action color and it is spent, never sprayed; never blue anywhere; no pill buttons, no glow effects, no colored accent bars on cards.

## Changelog

- 2026-08-09 — Extracted from brand-summary.md into a lane file so sessions load only the lane they're working on. Content unchanged.
