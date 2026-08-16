# fusion — Stitch's layout carrying the practice's content

The build called for in `docs/handoffs/2026-08-16-practice-site-fusion.md` §5.
**This supersedes `atelier-a.html` and `stitch-quiet-luxury-v2.html`.**

Three files, one of them generated:

| File | What |
|---|---|
| `fusion.src.html` | edit this |
| `fusion-build.py` | inlines fonts + portrait, writes `fusion.html` |
| `fusion.html` | the artifact — self-contained, 418 KB |
| `faces.css` | Libre Caslon Text 400/400i/700 + Hanken Grotesk 400/500/600/700, base64 |
| `verify.js` / `audit-contrast.py` | the §7 verification standard, as scripts |

```
python3 fusion-build.py && node verify.js fusion.html && python3 audit-contrast.py
```

`faces.css` is now in the repo. The previous build read it from `/tmp/faces.css`,
which does not survive a reboot — that was one power cut away from an unbuildable
source file.

**Preview:** `python3 -m http.server 8086 --bind 100.105.85.5` from this directory,
then `http://100.105.85.5:8086/fusion.html`. Tailscale IP, never `0.0.0.0`.

## What came from Stitch (the layout donor)

- **The twelve-column label rail.** Eyebrow out in a 3-col margin, the argument in
  the 9-col column. This is the single strongest thing in the mockup and it now
  sets the page's left axis: every section head, every body column, and the
  questions accordion hang off the same line.
- **The node-on-a-line sequence.** A hairline across the section with a square
  node where each step begins. Four steps, not Stitch's three — Simon's sequence
  is Map / Build / Run live / Hand off. This replaced `atelier-a`'s offset
  staircase, and it took the big serif ordinal with it: the node carries the
  sequence visually, the small `01 —` label carries it in text, and the 34px
  numeral was only competing with the step heading. (It was also the page's
  tightest contrast at 3.11:1. Two problems, one deletion.)
- **Two cards, the sprint on mass, lifted 22px.** `atelier-a` ran the tiers as
  full-width horizontal shelves; the mockup's paired cards make the two things
  comparable at a glance, which is the whole job of that section.
- **The sticky-rail questions.** "Fair questions." stays put while the answers
  scroll past it.
- **The dark closing band**, and the band-ground footer under it.
- The hero split, the portrait with a card floating over its corner, and the
  whitespace budget (1200px measure, ~110–130px between sections).

## What did NOT come from it

Everything it said. Every word on this page is `atelier-a`'s, byte for byte, and
`atelier-a`'s came from `bookend-c`, which the 2026-08-15 handoff freezes until
the segment test resolves. Specifically killed, per handoff §5:

- **The "100% Satisfaction Guarantee. We do not rest until…" line.** An
  unconditional guarantee from a seller with no track record is the exact
  configuration that invites "why does he need to promise that?". Simon's two
  scoped, collectable guarantees replace it and are stronger.
- **"Audit / Build / Deploy"**, "bespoke", "Intelligent Efficiency for the Small
  Firm", "The Weight of the Invisible", "I do not build software. I build
  capacity.", "Quiet Luxury in Consultancy."
- **The invented deliverables in the pricing cards** — "Custom Agent Development
  (Up to 3)", "90 Days Retained Support", "30 Days Post-Deploy Support". None of
  those are the offer.
- **The Blueprint section.** It advertised a downloadable sample deliverable that
  does not exist. Cut rather than faked; the sprint diagram does that section's
  job of showing what you get.
- **Both stock photographs** (the executive portrait, the profile thumbnail beside
  the wordmark), **the logo seal**, and **the "Get Started" nav CTA** — now "Book
  a mapping session", the real one.
- **The hero scribble**, replaced by the audited `#d1`: six labelled jobs
  converging on a node called "You". The tangle-into-a-line illustration asserts
  that messy becomes tidy; this one shows the mechanism. `#d2` sits in the sprint
  section. Both are ink-on-paper line art, both draw on scroll, both keep their
  labels legible at 360px because the type is bumped in viewBox units rather than
  the drawing being scaled.

## The mark — six uses, none of them a label

Handoff §3: one accent, and it marks a number or a commitment. The six:

1. the hero CTA fill (`#7E5518`, paper label, 6.08:1)
2. C$350
3. C$1,750 (`#C08A3E` on mass, 5.23:1)
4. the mapping guarantee
5. the sprint guarantee
6. the approval branch in `#d2`

Plus the focus ring, which is a state and not a paint. **Pulled off** everything
`atelier-a` and Stitch had it on: the dark card's list bullets, the phase labels,
every section-head tick (six on its own), the deliverable checkmarks, and the
founding-rate rule. Bullets are now the same square node the section heads and
the sequence row use — one motif, meaning one thing, in three places.

The hero CTA is umber-filled, which reverses `atelier-a`'s call that the primary
action stays petrol for contrast. Handoff §3 names "the primary CTA fill" as one
of the three sanctioned accent uses and measures the label at 6.08:1, so it
passes AA and it puts the page's one warm mark on the one element the page exists
to get clicked. The other four CTAs stay ink, ink-outline, or paper.

## Grounds

Paper is the base the whole way down. **Band `#F1EDE3` appears twice** — the
sprint section and the footer — and that is a deliberate reading of a tension in
the handoff: §3 gives band the role "sections needing separation", §4 restates
Simon's uniform-base rule from the gradient review. At 1.08 against paper the
band is a whisper, not a stripe, and it separates the page's one long structural
section without producing a seam to line up. Everything else is paper, mass
(featured card, closing band, and the plate under the portrait), or ink.

## Verification — rendered in Chromium, not reasoned about

- **No horizontal overflow** at 360, 390, 768, 1024, 1180, 1440.
- **WCAG AA against actually painted pixels.** 165 crops at 3×, ink sampled as
  the extreme painted pixel and ground as the modal painted pixel. **0 failures.**
  Tightest: `#C08A3E` on mass at 5.23 (prices and guarantee marks), then
  `#7E5518` on band at 5.61, then the paper-on-umber button label at 6.08.
  Sampling the computed colour instead of the pixel is what hid two real failures
  in earlier drafts — audit the pixel, not the token.
- **Reduced motion:** 35 reveals, 0 hidden; 12 diagram paths, 0 undrawn.
- **Self-contained:** 0 network requests outside `file://` and `data:`.

## What the render changed after the first pass

Five things static review would not have caught, all found by looking at the
screenshots:

1. The founding-rate card floated in the margin beside the hero diagram instead
   of over it — the wider hero grid had moved the drawing out from under it.
2. The sprint diagram and its caption sat on a different left edge than the
   section head above them.
3. The questions grid was 4/8 while every section head was 3/9 — two left axes
   on one page.
4. Two ragged left-aligned rules stacked under the pricing cards, at 74ch and
   64ch. One rule across the measure now.
5. The two pricing cards were bottom-ragged. `align-items:stretch` with the CTA
   pinned by `margin-top:auto`, so both shelves close on an action.

Prose measure was also pulled in to ~50–58ch across the page.

## Open, unchanged

- Every CTA is still `mailto:` — handoff §9.1. Needs a real booking link before
  traffic; that is Simon's and the CRO's decision, not this build's.
- English-only for a Quebec City audience.
- No email capture for a visitor not ready to spend C$350.
- `me@simonparis.ca` throughout; still a positioning decision.
- **Next: the per-vertical landing pages** (handoff §6). The sector-bearing
  surface is six SVG input labels, four problem claims, and one hero line —
  everything else on this page is shared. Note the current labels and claims are
  quietly trades-flavoured, which is a message-match break for bookkeeper
  outreach. `/practices` first.
