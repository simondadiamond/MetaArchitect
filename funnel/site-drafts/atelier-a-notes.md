> **SUPERSEDED 2026-08-17.** This draft's palette and typefaces are dead.
> The live design system is `THEME.md`; the live page is `fusion-v3.html`.
> Kept for lineage only — do not build on anything below.

# atelier-a — the Stitch direction, rebuilt on the practice offer

Sibling draft to `bookend-c.html`. Nothing existing was overwritten.

**Two files, one of them generated.** Edit `atelier-a.src.html`; run the build to
produce `atelier-a.html` (it inlines the fonts and the portrait as base64, which is
what keeps the artifact self-contained). The build is ~15 lines of PIL + base64; it
lives in the session transcript, not in the repo yet. If this direction survives,
promote it to `scripts/`.

## What came from the Stitch mockup

Simon's verdict was that Stitch beat every draft on "layout, colors, theme", and he
asked for the colours to be changed. Taken from it:

- warm paper ground, near-white rather than cream
- editorial serif display (Libre Caslon Text) against small uppercase tracked labels
  (Hanken Grotesk) — a real scale jump, 61px against 12px
- the offset card staircase
- the portrait with a card floating over its corner
- the whitespace budget: 1140px measure, `--sect` between sections

## What did NOT come from it, and why

- **All of its copy.** It was written for a VC-backed founder ("AI Strategy for the
  Modern Founder", "Executive Advisory", "Quiet Luxury in Strategy"). The buyer here is
  a 1–20 person practice. Every word on this page is carried over byte-for-byte from
  `bookend-c.html`, which the handoff freezes until the 30-day segment test resolves.
- **Its trust bar.** Four invented logos under "Trusted by leaders shaping the future",
  for a practice with zero clients. The page already says out loud that it has no
  client logos and will not borrow anyone else's. Replaced with nothing; the guarantee
  does that job.
- **Its palette.** Pure black on cream is the one genuinely templated thing in the
  mockup. Ink is the practice's own petrol `#102E33`, accent its bronze `#7E5518`.

## The system

One ground: paper `#F8F6F1`, uniform down the whole document. This is Simon's own
rule from the gradient review — every section shares the same base background, no
bands, so there are no seams to line up. It also kills the double-padding hole at
every section boundary: `.sect` uses `margin-top`, which collapses, not padding,
which stacks.

**The brass rule survives, re-pigmented.** Bronze marks human commitments only: the
two published prices, both guarantee blocks, the deliverable checkmarks, the approval
branch in the sprint diagram, the founding-rate rule, and the section head-tick.
Eight marks. The bronze problem the handoff flagged — brass `#D2A968` is 1.8:1 on
bone — is solved by pigment, not by deleting the rule: `#7E5518` measures 6.08:1 on
paper, so it can carry text.

**The primary CTA is petrol-filled, not bronze** (13.3:1). Same reasoning as before:
colour carries meaning, contrast keeps the action.

**The portrait is the only dark object on the page.** It is a rim-lit cutout that
would look wrong floating on paper, so it sits on a petrol plate — which turns a
constraint into the page's one focal moment. Cropped 4:5 from
`projects/simonparis-website/public/simon-paris.png`, desaturated to 42%. No shoot
needed, as the handoff said.

**Diagrams are ink on paper now**, not plated — they read as a plan drawn on the
page. Both still draw themselves on scroll, which is still the argument: six
obligations resolving into one route.

Removed: the grain layer. The `bookend-c` notes proved it was a measurable no-op
(0 pixels changed on flat ground). One accessory off.

## Verification — rendered, not reasoned about

Chromium via playwright-core.

- **No horizontal overflow** at 360, 390, 768, 1024, 1180, 1440.
- **WCAG AA against actually painted pixels** — 27 text roles sampled from 3×
  screenshots, ink taken as the extreme painted pixel (not the computed colour) and
  ground as the modal painted pixel. **0 failures.** Tightest: `.proc-n` at 3.11:1
  (needs 3.0), price figures and bronze marks at 6.08:1, muted body at 6.97:1.
- Sampling the *computed* colour first hid a real fail: `.proc-n` was `--ink` at
  `opacity:.2`, which paints at 1.28:1. Fixed to a flat `#7C9092`. This is the same
  class of miss as the `--bone-3` fail — **audit the pixel, not the token.**
- **Reduced motion**: 36 reveal elements, 0 hidden; 0 undrawn diagrams.
- **Self-contained**: 0 network requests outside `file://` and `data:`.

## Open, unchanged from the handoff

- Every CTA is still a `mailto:` placeholder. Needs a real booking link before traffic.
- Still English-only for a Quebec City audience.
- No email capture for visitors not ready to spend C$350.
- `me@simonparis.ca` used throughout; the address is still a positioning decision.
