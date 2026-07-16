---
name: hero-figure
description: Generate the brand-locked hero schematic for a blog post — author an SVG of the post's core mechanism, refine it through a render→critique loop, publish to storage, and set the post's hero columns. Use after a post's markdown is final (draft or published).
---

# Hero Figure — author → render → critique → publish

Every simonparis.ca post gets one hero figure: an engineering schematic of the post's core mechanism, drawn in the blueprint idiom. It renders in a fixed template slot (2:1, between header and body) with a `FIG. 01` caption — you only produce the asset and the alt text; positioning is the template's job. **No photos, no AI-art, no decoration: if the figure doesn't diagram the post's argument, it doesn't ship.**

## 1. Extract the mechanism

Read the post's `body_markdown`. Name the ONE causal mechanism the post argues (a crash-and-resume path, a layered contract, a feedback loop, a taxonomy). If you can't state it as "X → Y unless Z" or a structural relation, re-read — don't draw vibes.

## 2. Author the SVG

Canvas: `1360×680` viewBox (2:1). Reuse this skeleton:

- Background: `#0F0F0F` + 40px grid pattern of `#1A1A1A` hairlines
- Boxes: fill `#1A1A1A`, stroke `#333333`, zero radius
- Text: `font-family="'Roboto Mono', monospace"`; eyebrow 13px letter-spacing 2 `#777777` at top-left (x=140, y=86); labels 12-13px `#B4B4B4`/`#EAEAEA`; annotations 11-12px `#777777`
- Arrows: 1.5px `#777777` or `#333333` with small chevron markers; dashed = failed/blocked/naive path
- **Exactly one orange (`#E04500`) element** — the thing the post says is right
- Red (`#F85149`) only for failures/consequences
- Footer takeaway line (12px `#777777`) allowed, one line max

Working files go in your session scratchpad. Reference examples live in `blog-assets/<slug>/hero.svg` for the first three posts (Supabase Storage).

## 3. The loop (minimum 2 iterations)

```bash
node ~/projects/MetaArchitect/scripts/blog-hero-figure/render.mjs fig.svg fig-v1.png
```

Read the PNG (the image, not the file listing) and critique against this checklist — fix and re-render until all pass, minimum two rendered versions:

1. Mechanism-true: does the diagram assert what the post asserts? Would the post's author object to any arrow?
2. One orange element only; red only on failure; every other color from the palette
3. No text overflows its box; no line crossings at meaningful points; labels don't collide
4. Vertically balanced on the canvas (no floating in the top half)
5. Legible at 680px wide (the reading column) — squint test on the PNG at half size
6. Zero border-radius, no gradients, no shadows, no emoji glyphs beyond ✕

## 4. Publish

```bash
node ~/projects/MetaArchitect/scripts/blog-hero-figure/publish.mjs <slug> fig-vN.png fig.svg "<alt text>"
```

Alt text: one or two sentences describing the schematic's assertion (it doubles as the visible `FIG. 01` caption — write it for a reader, not a screen-reader checkbox). The script refuses unknown slugs, uploads PNG + source SVG to `blog-assets/<slug>/`, and sets `hero_image_url` / `hero_image_alt`. The live page picks it up on the next ISR revalidation (hourly).
