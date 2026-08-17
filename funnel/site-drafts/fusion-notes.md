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

- ~~**The twelve-column label rail.**~~ Removed 2026-08-17 — see the second
  revision below. It was the strongest device in the mockup and it set the page's
  left axis, but Simon wanted the eyebrows and the hairlines gone and the titles
  centred, which leaves nothing for a rail to hold.
- **The node-on-a-line sequence.** A hairline across the section with a square
  node where each step begins. Four steps, not Stitch's three — Simon's sequence
  is Map / Build / Run live / Hand off. This replaced `atelier-a`'s offset
  staircase, and it took the big serif ordinal with it: the node carries the
  sequence visually, the `Phase I` label carries it in text, and the 34px numeral
  was only competing with the step heading. (It was also the page's tightest
  contrast at 3.11:1. Two problems, one deletion.)
- **Two cards, the sprint on mass, lifted 22px.** `atelier-a` ran the tiers as
  full-width horizontal shelves; the mockup's paired cards make the two things
  comparable at a glance, which is the whole job of that section.
- **The sticky-rail questions.** "Fair questions." stays put while the answers
  scroll past it.
- **The dark closing band**, and the band-ground footer under it.
- The portrait with a card floating over its corner, and the
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
- **The Blueprint section's download button.** It advertised a sample deliverable
  that does not exist. The section itself is back at Simon's request (2026-08-17)
  and now carries the workflow drawing; there is still nothing to download.
- **Both stock photographs** (the executive portrait, the profile thumbnail beside
  the wordmark), **the logo seal**, and **the "Get Started" nav CTA** — now "Book
  a mapping session", the real one.
- **The hero scribble.** The tangle-into-a-line illustration asserts that messy
  becomes tidy; the audited drawings show the mechanism. `#d2` — the six jobs
  resolving into one workflow with a single approval branch — now lives in the
  blueprint section. `#d1`, the same six jobs converging on "You", is parked in
  the source with no home yet. Both are ink-on-paper line art, both draw on
  scroll, and both stay legible at 360px because the type is bumped in viewBox
  units rather than the drawing being scaled.

## The mark — nine uses, one of them a label

Handoff §3: one accent, and it marks a number or a commitment. The nine:

1. C$350
2. C$1,750 (`#C08A3E` on mass, 5.23:1)
3. the mapping guarantee
4. the sprint guarantee
5. the approval branch in `#d2`
6–9. the four phase labels — Simon's call on 2026-08-17, matching the Stitch
original. This is the one place the mark lands on a label, which §3 rules out;
it is deliberate and it is his, not a slip. 5.61:1 on band.

Plus the focus ring, which is a state and not a paint. **Pulled off** everything
`atelier-a` and Stitch had it on: the dark card's list bullets, the phase labels,
every section-head tick (six on its own), the deliverable checkmarks, and the
founding-rate rule. Bullets are now the same square node the section heads and
the sequence row use — one motif, meaning one thing, in three places.

The hero CTA was umber-filled for one pass, on §3's line about "the primary CTA
fill". Simon reversed it on 2026-08-17 — "the call to action should be the
greenish colour" — so every CTA is now ink, ink-outline, or paper, and the mark
never lands on an action.

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
- **WCAG AA against actually painted pixels.** 136 crops at 3×, ink sampled as
  the extreme painted pixel and ground as the modal painted pixel. **0 failures.**
  Tightest: `#C08A3E` on mass at 5.23 (prices and guarantee marks), then
  `#7E5518` on band at 5.61, then the paper-on-umber button label at 6.08.
  Sampling the computed colour instead of the pixel is what hid two real failures
  in earlier drafts — audit the pixel, not the token.
- **Reduced motion:** 39 reveals, 0 hidden; 6 diagram paths, 0 undrawn.
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

## Revision — Simon's pass, 2026-08-17

He walked it and cut hard. Every item below is his, not a design change I chose.

| Was | Now |
|---|---|
| hero: type + the six-jobs drawing + a founding-rate card | **type only.** "That little box looks like a post-it added to the website." The drawing "has its place somewhere else"; the figure plus its caption was "starting to be much for the hero" |
| problem: 2×2 grid of four claim cards | **heading, one paragraph, the four jobs in one line, the display pull line.** "There's way too much" — he wants the shape of the Stitch original back. The four one-line descriptions under each claim are gone |
| sprint: the workflow drawing + `01 — ninety to one hundred twenty minutes, with you` | **no drawing, and `Phase I — 90 minutes` in gold**, like the Stitch original. "There's already a description, don't need to do that" |
| pricing head: "Two things to buy, both published, both guaranteed." | **"Engagements."** "What does that even mean? I'm the one that's supposed to be doing it" |
| ongoing: four sentences | **"Ongoing monthly support is available following the completion of a sprint."** — the original's line, verbatim |
| blueprint: cut | **back**, and it is where the workflow drawing lives now |
| practice head: "No platform. No licence. Nothing to renew." | **"The human component."** He objected that it overclaims — the tools he picks may well carry a subscription |
| practice: the "This practice is new" disclosure | **parked.** "How about we just skip that part for now? I'll have hopefully some testimonials soon" |

**Two costs he accepted, both flagged to him:**

1. The gold phase labels put the mark on a label, which handoff §3 rules out. It
   is four more uses of the accent, taking the page from six to nine.
2. Parking the disclosure also parks *"that narrowness is the reason the
   guarantee can be this specific"* — the line that explains why a seller with no
   track record can promise what he promises. The guarantee now stands
   unexplained. It comes back with the testimonials, or that sentence needs a new
   home.

**Two things still open from his pass:**

- **The six-jobs drawing (`#d1`) has no home.** It is parked in an HTML comment
  in the source, not deleted. He said it belongs somewhere; he did not say where.
  The obvious candidate is the problem section — it is literally a picture of
  "you are the junction" — but he had just asked for that section to carry *less*,
  so I did not put it there on my own.
- **"What a sprint is"**, the quiet link beside the hero CTA. "We could leave it,
  but whatever… I think it'll look great without it, but nah, that's okay." Read
  as keep. One word either way.

**Judgment calls inside his instructions**, so they are easy to reverse:

- The blueprint copy is the only place frozen sentences were recombined: the
  workflow drawing's old caption became the section's opening line, and "you keep
  the written plan whatever happens next" was spliced with the hand-off sentence.
- The phase durations are shortened to fit the `Phase I — 1 week` shape of the
  original: `90 minutes`, `2 to 3 weeks`, `14 days`, `one document`.
- The floating card over the portrait is the same device as the hero post-it he
  rejected. He did not call this one out and Stitch's approved layout has an
  offset element there, so it stayed.

## Second revision — 2026-08-17, later

Two more from Simon, both on the whole page rather than one section.

**1. No rules, no section eyebrows, titles centred.** Every section used to open
with a hairline carrying an ink node, then a small uppercase label out in a
three-column margin (`PRICING`, `THE PROBLEM`), then the title in the wide
column. All of that is gone. A section now opens on its centred title, and its
subtitle centres under it. Consequences worth knowing:

- **The page's left axis went with it.** Five sections used to hang off the same
  line at 25%; body content now sits in centred columns instead (`.body-col` is
  62ch, the questions column 860px). Everything below a head keeps its own
  alignment — only the title and subtitle centre. Centring the body prose as well
  would give the reader a ragged left edge on every line.
- **The sticky-rail questions came back** the same day, on Simon's word — "it
  was cool and looked great." It is the one rail left on the page: no eyebrow,
  but "Fair questions." holds the left column and stays pinned at 124px while the
  answers scroll past it, releasing as the section ends (verified by scrolling,
  not by reading the CSS). Its title is left aligned, unlike every other title on
  the page — a heading that sticks has to sit on an edge, and a centred one would
  drift against the column it is pinned beside.
- **The node-on-a-line motif now appears once**, in the sequence row, rather than
  once per section head. The list bullets still use the same square.
- The eyebrow class survives on the floating card over the portrait ("WHERE AND
  IN WHICH LANGUAGE"). That is a label on an object, not a section mini-title, so
  it stayed — one word if it should go too.

**2. The hero names AI.** Simon: *"just because outcomes should not talk about
technology, doesn't mean my brand can't."* This is the first change to frozen
main-page copy, so it wants his sign-off rather than mine:

- lede was *"I turn one of those into a workflow that runs on its own, and asks
  you only when it matters."* → *"I take one of those and build it into an **AI
  workflow** that runs on its own, does the job inside your business, and asks you
  only when it matters."*
- a signature line under the action: *"Independent AI implementation practice.
  Quebec City, in French or English."* — his own words, lifted from the footer.

The headline is untouched. It leads with the problem, which is the brand rule;
naming the technology in the line under it means the hero says what he does
without opening on what he uses. The signature sits **below** the CTA
deliberately — the same words above the headline would be the eyebrow device he
had just removed.

The hero also stays left aligned while the section heads centre. That is the
Stitch pattern (its hero was left, its pricing head centred) and it keeps the
opening from reading as a fully centred, and much more generic, page.

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
