# The practice site — theme

**This is the design system for Simon's independent AI implementation practice.
It is NOT The Meta Architect.** Do not read `brand/*` and re-apply `#0F0F0F` /
`#E04500` / `#C97A1A` / Merriweather to anything in this funnel. That reflex is
what made every early draft of this site look identical.

Reference implementation: `fusion-v3.html` (and `sample-opportunity-report.html`,
which shares this CSS block verbatim). **Copy the `<style>` block; do not
re-derive it.**

---

## 1. The feel, in prose

If you are building a page this file does not describe — a vertical landing page,
a case study, an invoice, a slide — build it to this description rather than to
the token table.

**A working document produced by a careful practitioner, printed on good paper.**
Not a brochure, not a dashboard, not a SaaS landing page. The nearest cousins are
a well-set annual report and an architect's drawing set: warm paper, one dark ink,
one metal, rules where structure genuinely changes, and a great deal of nothing.

Five rules that produce it:

1. **Air is the material.** If a section feels wrong, the first thing to try is
   more space, not more elements. ~128–172px between sections at desktop. Every
   drift toward tightness across this project's history made the page look
   cheaper, and every reversal made it look more expensive.
2. **The type does the work.** A dramatic scale jump — 70px display against 12px
   tracked uppercase labels — and almost nothing in between. There is no
   mid-weight "section title" doing duty as decoration.
3. **One mark, and it marks a commitment.** Umber goes on prices, guarantees, and
   phase labels. Never on links, never on body text, never as a fill for the sake
   of colour. Six to ten uses on a long page is the ceiling. A mark that repeats
   becomes a texture, and then it is not a mark.
4. **Restraint reads as expensive; ornament reads as anxious.** No gradients, no
   glows, no metallics, no shadows except one soft drop under a floating card, no
   rounded corners anywhere, no icons. If a device is doing nothing structural,
   it is decoration and it comes out.
5. **Say the awkward part in plain words.** The voice is a practitioner writing to
   another adult: short sentences, no hype, no "unlock", no "seamless", no
   "bespoke". Where a claim has a limit, the limit is on the page. This is a
   typographic property as much as a copy one — the page has room to be honest
   because it is not crowded.

**What it is not:** a luxury-consultancy costume. "Methodology", "forensic
examination", "architecture overhaul", "Executive Summary", "we do not rest until"
— that register was tried and rejected. The visual design already carries the
sophistication; the words should not also announce it.

---

## 2. Palette — locked and measured

Every ratio was measured against **rendered pixels**, not tokens.

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F8F6F1` | the base ground, whole document |
| `--band` | `#F1EDE3` | a section that needs separating. Never neutral grey |
| `--ink` | `#102E33` | all body and heading text, filled buttons |
| `--mass` | `#0D262A` | large dark blocks only — the featured card, the closing band |
| `--muted` | `#43585C` | secondary text |
| `--umber` | `#7E5518` | the mark, on light grounds |
| `--umber-d` | `#C08A3E` | the mark, on mass |
| `--on-mass` | `#F8F6F1` | text on mass |
| `--on-mass-2` | `#93A9AC` | secondary text on mass |
| `--rule` | `rgba(16,46,51,.16)` | hairlines |
| `--rule-soft` | `rgba(16,46,51,.09)` | the nav's bottom hairline |

| Pair | Ratio |
|---|---|
| ink on paper | 13.31 |
| ink on band | 12.30 |
| umber on paper | 6.08 |
| umber on band | 5.61 |
| paper on mass | 14.64 |
| umber-dark on mass | 5.23 |
| on-mass-2 on mass | 6.41 |
| paper on umber (button label) | 6.08 |
| **umber `#7E5518` on mass** | **2.41 — FAILS. This is why umber has two values** |
| **ink on umber** | **2.19 — FAILS. Umber button labels must be paper** |

**No green third tone.** Petrol *is* the green. A legible green lands near
`#2F6B58` — close enough to read as an inconsistency, far enough to read as a
second brand colour, and there is no unowned role for it.

**Colour is a null variable versus contrast.** No located evidence supports any
colour effect in B2B professional services. Do not re-open the palette on a
colour-psychology argument.

---

## 3. Type

- **Display:** EB Garamond 400 (`--f-display`). Headings, prices, pull lines,
  the wordmark, `.sheet .t`.
- **Body / UI:** Source Sans 3 400/600/700 (`--f-body`). Everything else.
- Both are base64-inlined from `faces-v2.css`, **latin subset only** — latin-ext
  costs another 535 KB and nothing on the page uses an accented character. When
  the French copy lands, re-run the fetch in `fusion-v3-notes.md`.

| Role | Size |
|---|---|
| h1 | `clamp(43px,5.8vw,70px)` / 1.03 / -.03em / max 15ch |
| h2 | `clamp(32px,3.9vw,48px)` / 1.13 / -.018em / max 22ch |
| h3 | `clamp(23px,2.1vw,28px)` |
| pull line | `clamp(23px,2.5vw,32px)` display serif |
| body | 17px, 18px ≥900px, line-height 1.62 |
| section prose | `clamp(18px,1.5vw,21px)` / 1.6 / max 56ch |
| label / eyebrow / kicker | 11.5–12px, weight 600, `.16–.19em`, uppercase |

**Measure is 50–62ch for prose, never wider.** Long lines are the single most
common way this page has degraded.

---

## 4. Layout

- Measure `1200px`, gutter `32px`, side padding 24px (32 ≥900px).
- `--sect: clamp(64px,6.8vw,86px)`, applied as `padding-block` at both edges, so
  two adjacent sections give one full gap and a banded section still gets its own
  internal air.
- **Never use the `padding` shorthand on an element that also carries `.wrap`** —
  it silently zeroes the side padding and dumps text against the phone's edge.
  Use `padding-block`.
- Zero border-radius. Everywhere. No exceptions.

**Two section-head forms, and only two:**

1. **Centred** — title, optional subtitle, both centred, nothing above them. The
   default.
2. **The rail** — a 3/9 grid with a small uppercase label out in the left margin
   and the title plus body left-aligned in the wide column. Used where a section
   is a block of prose or a list the reader works through: the challenge section,
   the practice section, the questions section (whose label is its sticky title).

A third form exists once, for the sequence row: title left, a small tracked
caption right, on the same baseline.

**Motifs, and there are only three:**

- **A node on a line.** An 8px ink square sitting on a hairline. It means "a point
  in a sequence" and it appears on the phase row. The 5px version is the list
  bullet. Do not invent a second bullet shape.
- **A floating paper card** over the corner of a figure, hairline border and one
  soft shadow. Used at most once per page.
- **A dark block.** The featured card and the closing band, both `--mass`. The
  page gets one or two, never three.

---

## 5. Motion

One reveal: `opacity 0 → 1`, `translateY(14px) → 0`, 0.7s
`cubic-bezier(.22,.61,.36,1)`, fired once by an IntersectionObserver at 10%
with a `-10%` bottom root margin. Nothing else animates except button and link
colour transitions at 0.2–0.25s.

`prefers-reduced-motion: reduce` kills every transition and paints every reveal.
This is verified, not assumed.

---

## 6. Non-negotiables for any new page

- The artifact is **self-contained**: fonts and images base64-inlined, zero
  network requests outside `file://` and `data:`.
- **No horizontal overflow** at 360, 390, 768, 1024, 1180, 1440.
- **WCAG AA against actually painted pixels**, sampling ink as the extreme painted
  pixel at 3× and ground as the modal painted pixel. Auditing the computed colour
  hides real failures — an element at `opacity:.2` paints at 1.28:1 while its
  token says 13.31.
- Run `node verify.js <file>.html && python3 audit-contrast.py` before calling
  anything done. Add new text roles to `ROLES` in `verify.js` or they go
  unaudited.
- **Look at the render.** Every composition defect in this project's history was
  found by looking at a screenshot and none by reading CSS.
