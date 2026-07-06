# Logo Generation Spec — The Meta Architect

> **RESOLVED 2026-07-06**: Simon chose concept D ("Locked State" — viewfinder corners
> holding a solid orange state square). Final vector assets live in `brand/logo/`
> (`mark.svg`, `mark-dark.svg`, `avatar-1024.png`, `banner-1584x396.png`, `banner.svg`).
> This file is kept as reference for future derivative assets.

> Paste-ready spec for image generators (ChatGPT/GPT-4o, Gemini/Imagen).
> Derived from brand-guidelines.md §2. Keep this file in sync with the palette there.

## What the logo must communicate

- **Brand**: The Meta Architect — Simon Paris, simonparis.ca
- **Category**: AI Reliability Engineering ("I design AI systems that don't break")
- **Thesis made visual**: control, precision, state. Engineered, not decorated.
- **Audience**: senior engineers and platform leads burned by non-deterministic LLM systems in production. The logo must read as *practitioner infrastructure*, not startup-brand friendliness.
- **Feels like**: a terminal, a blueprint, a circuit schematic, industrial signage
- **Never feels like**: AI hype (sparkles, brains, neurons), SaaS-friendly (rounded, pastel, gradient), corporate-safe (blue)

## Hard constraints (non-negotiable)

| Rule | Value |
|---|---|
| Background | near-black `#0F0F0F` — never white, never light |
| Primary mark color | burnt orange `#E04500` — the ONLY accent |
| Support colors | off-white `#EAEAEA` text, dark gray `#333333` borders/lines only |
| Corners | zero border-radius — every edge sharp, 90° |
| Forbidden | blue, teal, green, purple, gradients, glows, drop shadows, 3D, rounded shapes, circles as containing shapes, sparkles/brains/robots |
| Typography (if any) | monospace (Roboto Mono style), uppercase, wide letter-spacing; serif (Merriweather style) only for "Simon Paris" wordmark |
| Style | flat 2D vector, geometric, high contrast, generous negative space |

## LinkedIn deliverables & sizes

| Asset | Size | Note |
|---|---|---|
| Profile/company logo | 1024×1024 (LinkedIn min 400×400) | **LinkedIn crops profile images to a circle** — keep the mark inside the central ~70% so sharp corners of the mark survive; the square frame/border will be cropped away, so don't rely on it |
| Banner | 1584×396 | mark left or right third, wordmark + tagline beside it |
| Post/OG image corner mark | 1200×627 | small mark + `simonparis.ca` in mono |

## Existing brand marks to build from

1. **Favicon mark (live on the site)**: bold monospace orange "S" centered in a `#0F0F0F` square with a 1px `#333333` border. The logo can be an evolution of this.
2. **Wordmark lockup (from brand-guidelines.md)**:
   - Eyebrow: `THE META ARCHITECT` — mono, orange `#E04500`, letter-spacing 0.22em, uppercase
   - Wordmark: `Simon Paris` — serif, off-white `#EAEAEA`, bold
   - Tagline: `State Beats Intelligence` — mono, gray `#777777`, letter-spacing 0.10em

## Concept directions (pick one, generate variations)

**A — The State Block (recommended).** A filled orange square (a "state cell") locked inside a thin gray outline square grid — one cell of a state machine, deterministic and contained. Monogram-free, survives circle crop, scales to 16px.

**B — Monogram "S/A".** Sharp-edged geometric monogram built from rectangular strokes only (no curves) — reads as "S" (Simon/State) constructed like a circuit trace. Orange on near-black.

**C — The Validation Gate.** Two vertical bars with a square node passing between them — input → gate → output. Abstract, engineering-diagram feel.

## Master prompt (paste into ChatGPT or Gemini)

```
Design a minimalist flat vector logo mark for "The Meta Architect", a personal
brand in AI Reliability Engineering run by an infrastructure engineer. The brand
thesis is "State Beats Intelligence" — control, precision, and deterministic
systems made visual.

STYLE: flat 2D geometric vector, industrial, terminal/blueprint aesthetic,
high contrast, generous negative space. Think circuit schematic or state-machine
diagram, not friendly startup branding.

COMPOSITION: a single abstract mark centered on a solid near-black background
(#0F0F0F), occupying roughly the central 60% of a square canvas so it survives
a circular crop. [INSERT CONCEPT: e.g. "The mark is one filled orange square
cell locked inside a thin dark-gray (#333333) 3x3 grid of outline squares —
one active state in a state machine."]

COLORS — exact and strict:
- background: #0F0F0F (near black)
- mark accent: #E04500 (burnt orange) — the only bright color
- secondary lines: #333333 (dark gray)
- optional text: #EAEAEA (off-white)

HARD RULES: zero rounded corners — every edge is a sharp 90° angle. No
gradients, no glow, no shadow, no 3D, no blue, no green, no purple, no
sparkles, no brain or robot imagery, no circles as containing shapes.
If text is included, it must be uppercase monospace with wide letter-spacing.

OUTPUT: 1:1 square, high resolution, flat solid colors, crisp edges.
```

## Variant prompts

**Banner (1584×396):** same style block, then:
```
Wide LinkedIn banner, 4:1. Solid #0F0F0F background. The mark sits in the left
third. To its right, in uppercase monospace #E04500 with wide letter-spacing:
"THE META ARCHITECT", below it in smaller gray (#777777) monospace:
"STATE BEATS INTELLIGENCE". Right two-thirds mostly empty dark space with a
faint #333333 grid or schematic line-work. Keep all text left of center
(LinkedIn overlays the profile photo bottom-left — keep that corner clear).
```

**Monogram variant:** replace the COMPOSITION line with:
```
The mark is a bold geometric letter "S" constructed only from straight
rectangular strokes with sharp 90° corners, like a circuit trace or maze path —
no curves anywhere. Solid #E04500 on #0F0F0F.
```

## Generator workflow tips

- Generators approximate hex codes. Generate for shape/concept first; color-correct to exact hexes afterward (or ask me to rebuild the winning concept as a clean SVG — then it's pixel-exact forever and scales to any size).
- Ask for "flat solid colors, crisp edges, vector style" every time — models drift toward gradients and glow on dark backgrounds.
- Avoid asking the generator to render small text (taglines) in the square mark — it will mangle it. Text belongs in the banner, or gets typeset properly in SVG later.
- Generate 4+ variations per concept, pick by the 16px test: shrink it — if it turns to mush, reject it.
