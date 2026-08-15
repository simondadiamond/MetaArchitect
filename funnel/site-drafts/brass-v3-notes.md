# Brass v3 — the gradient question and the imagery question

Base: `practice-v2-b.html` ("Brass"). Untouched on disk (md5 verified before and
after). Both outputs are the base plus one appended treatment stylesheet, built by
`build_v3.py`, which is re-runnable.

**Single variable each, on purpose.** `brass-v3-a.html` changes the ground and
nothing else. `brass-v3-b.html` answers the imagery question and nothing else. They
compose cleanly — nothing in one touches anything in the other — but keeping them
separate is what lets you answer the two questions independently instead of judging
a blend.

Copy is byte-identical to the base in both. Verified by stripping tags and diffing
the visible strings: variant A adds and removes zero lines; variant B adds exactly
two, "Photograph" and "to come", which are the placeholder slot's own label, not
page copy.

---

## 1. The gradient ground

### What your old site actually does

I fetched `newtechn9.netlify.app` and read its stylesheet rather than eyeballing it,
because the exact mechanic matters. It is Astro plus Tailwind, and every major
section carries one of four utilities:

```
bg-gradient-to-br  from-primary-main/20 via-background to-background
bg-gradient-to-tl  from-primary-main/20 via-background to-background
bg-gradient-to-bl  ...
bg-gradient-to-tr  ...
```

in the page order `br, tl, bl, tr, br, tl, bl, tr, br`. In Tailwind `to-br` means the
ramp *runs toward* bottom-right, so the accent sits in the **top-left**. Translated to
where the light actually is, your old page goes:

```
TL, BR, TR, BL, TL, BR, TR, BL, TL
```

Two things follow from that, and only one of them is obvious.

The obvious one: consecutive sections put the light at opposite corners, which is
the "dégradé towards opposing corners" you remembered.

The one that makes it work: because the corners alternate that way, the light lands
on the **same side** of a shared section edge every other time. So the boundary
between sections 1 and 2 is dark on both sides, the boundary between 2 and 3 is lit
on both sides on the right, 3/4 is dark, 4/5 is lit on both sides on the left. Light
crosses the page in a zigzag, right then left then right, and the dark seams between
give it a beat. That structure is the reason it reads as rhythm rather than as
decoration, and it is the part worth stealing.

`via-background to-background` also means the ramp reaches full ground colour at the
midpoint and stays there, so it is a corner *glow*, not a wash across the section.

### What I built, and two places I deliberately departed from it

`brass-v3-a.html`, "Lantern". The corner cycle is copied exactly: hero TL, problem
BR, sprint TR, pricing BL, practice TL, questions BR, close TR. B's fixed three-stop
radial wash is removed — running both would double the light and neither would read.

**Departure 1: the ramp is bounded, not stretched.** `background-size: 100% 880px`
anchored to the lit corner. Your old sections were `py-12 md:py-24`, a few hundred
pixels. Our pricing section is roughly 2000px tall, and a corner ramp stretched over
2000px is a vertical gradient with extra steps — it stops being diagonal at all.
Bounding the reach keeps a true diagonal at every section height, short or long.

**Departure 2: the light is cool, not brass.** Your old site uses the brand accent at
20% in every corner. On this page that would be eight warm blooms, which triples the
brass footprint and destroys the rule that makes B work — brass marks human
commitments only. So the corner light is a petrol lift everywhere, and warm appears
in exactly two places: the hero and the close. The warm enters when the page opens
and returns when it asks for the money. That is a lighting narrative rather than a
decoration, and it costs no new brass uses.

You were warned not to ask for more gold. This is me not giving you any.

### Verdict: A's ground beats B's wash, with a caveat about which version of it

**The corner ramps win, and the reason is structural rather than aesthetic.**

B's fixed wash is `position: fixed`. It is a property of the *viewport*, not of the
document. Scroll past the pricing section twice and it is lit differently each time,
because the light never moved and the content did. You cannot build rhythm out of
that, and it means the wash can only ever be atmosphere.

The corner ramps bind lighting to structure. A section looks the same every time you
reach it, the sequence has direction, and the dark seams give the page a beat it did
not have. It also fixes something B only half-fixed: B answered "the bands don't
read" with vertical gradients on the shaded `.well` sections, which leaves the
*unshaded* sections (sprint, practice) flat. The corner ramps differentiate all
seven.

Cost: zero brass, zero DOM, zero motion, zero bytes worth mentioning.

**The caveat, stated plainly.** The version that wins is the disciplined one above.
The version your old site ships — accent at 20% in every corner — would be *worse*
than B's wash on this page, not better. It would read as a 2019 SaaS marketing
template to a buyer whose whole decision is whether you look like a professional or
like someone's side project. The mechanic transfers. The colour does not.

**Two honest weaknesses in A:**

- The hero is wide and short, so `to bottom right` across it is geometrically almost
  horizontal. It reads as a left-to-right wash, not a corner glow. That is geometry,
  not tuning — you would have to make the hero taller to fix it, and it is not worth
  it.
- This is the same discipline trap as the brass. `--lift` at `rgba(38,98,106,.52)`
  and `--reach: 880px` are the ceiling, not a starting point. Raise the alpha and it
  becomes a mesh-gradient landing page in about two steps. If you look at it and
  think "I can barely see it," that is the correct amount.

---

## 2. Imagery

I put this through `taste-skill` and `frontend-design` properly. The short answer to
"does the taste skill have any recommendations" is yes, and its recommendation
contradicts the instinct behind the question.

### The honest answer: this page does not want pictures. It wants a person.

Work through what a landing page normally uses imagery for, against what this page
can honestly supply:

| Normal use | This page |
|---|---|
| Product screenshots | There is no product. The deliverable is a workflow inside someone else's tools |
| Customer logos | The copy explicitly refuses them, by name, as a selling point |
| Team photos | There is one person |
| Lifestyle / office photography | Would be stock, and stock is the single loudest "template" signal to this buyer |
| Illustrated concepts | Would be decoration competing with two diagrams that are already the argument |
| Depiction of the deliverable | Fabricated proof of work that does not exist. Out of bounds, and correctly so |

Almost every landing page has imagery and no argument. This one has the opposite: two
SVG diagrams that carry the actual thesis, which is rare and is the best thing about
the page. Adding decorative imagery around them dilutes the one asset that is
working.

**But the emptiness you felt is real.** It is two separate faults, and only one of
them is about pictures:

1. **The diagrams float.** Both sit on bare ground with nothing under them, so the
   hero's right column reads as a small drawing lost in a large dark area. This needs
   no imagery at all — it needs a plane.
2. **The page makes an intensely personal offer with no person visible.** "I keep
   working at no charge until it is." "I have no client logos and I am not going to
   borrow anyone else's." "Based in Quebec City." That is a person talking, and there
   is no person on the page.

`brass-v3-b.html` fixes both.

### What is in variant B

**A portrait slot — recommended, strongly. This is the answer.**

Placed beside "The work happens in French or in English... Based in Quebec City." —
the one sentence on the page that is about the person and the place. 200px wide, 4:5
crop (172px below 520px viewport width). It ships as a correctly sized, correctly
positioned **empty slot** with a dashed border and a "Photograph to come" label,
because there is no photograph to embed and inventing one is out of bounds.

The reasoning is specific to your buyer, not general taste:

- `icp-v2.md` §2: the practitioner-owner or managing partner signs. One signature, no
  committee. They are buying a person, not a vendor.
- The purchase requires handing over access to systems holding client financial data
  under Law 25. The unspoken question is not "is this workflow buildable," it is "who
  is this person."
- The copy already concedes there is no proof. A face is the one proof asset that is
  neither borrowed nor fabricated. It is the *only* image this page is allowed to
  carry, which is a strong argument for carrying it.
- Professional-services convention. An accountant's, notary's or lawyer's site
  carries the practitioner's photograph. Its absence is noticed by this segment
  specifically.
- Segment-portable. If the 30-day test kills bookkeeping and trades becomes the
  segment, a contractor also wants to see who is turning up. Nothing about the slot
  commits to accounting.

**What you need to supply.** 4:5 portrait crop, 720x900 minimum. Indoors, available
daylight, plain wall. No suit, no stock-photo staging, looking at the camera. It
should look like a person, not like a headshot package — a photograph that reads as
"professional photography" undoes most of what it is there to do. The markup carries
this as a TODO comment with the `<img>` line already written; the `.portrait img`
rule crops it to the plate. Change the dashed border to solid `var(--line)` when the
real image lands.

I put the slot at the head of the "This practice is new." card first. It rendered
fine, but it added ~316px to the right column and turned the bottom-left of the
section into a void, which is the exact complaint this whole exercise started from.
Moving it next to the Quebec City sentence balances the two columns and binds the
face to the claim instead of to a panel. That change came from looking at the render,
not from reasoning about the markup.

**Plates under both diagrams.** The hero diagram and the sprint diagram now sit on
the same raised plane with a hairline border. B had fixed the hero one with a warm
radial pool and left the sprint one floating — two treatments for two instances of
the same thing. The pool survives as the halo *around* the hero plate rather than as
a substitute for one. This is the single biggest visual change in variant B and it
requires no imagery: the hero's right column is now an object instead of a drawing on
a wall.

Bonus: the plate padding catches the diagram label overflow at ≤640px, so the
"Supplier orders" spill now lands inside the plate rather than in the page gutter.

**Grain.** One fixed, pointer-events-none inline SVG turbulence layer at very low
alpha, soft-light blended. Not an image and not a pattern — it stops the ground
reading as an empty colour field and starts it reading as a surface. This is the
honest substitute for the photography the page cannot have. It is static, so it costs
one paint. **It is also the first thing I would cut** if you look at the page and
cannot see it; unlike C's guilloche it does not fail on a bad monitor, but it is a
small effect and it is not load-bearing.

### What I deliberately did not build, and why

This list matters as much as the list above, because each of these is what an
unconstrained pass would have produced.

- **A logo or monogram.** Fabricated brand equity for a practice that admits on the
  same page that it is new. It would also directly contradict the copy.
- **A signature graphic under the guarantee.** Visually strong, and it is an invented
  signature. That is fabricated proof.
- **A third diagram of Map / Build / Run live / Hand off.** The process list sits
  directly beneath diagram 2. A third drawing in the same vocabulary, ten inches
  below the second, stops reading as thinking and starts reading as a house style.
  The sequence is already legible in words.
- **Illustrated icons on the pricing features.** The checkmarks already do that job,
  and they are one of the eight brass uses. Icons would spend brass or introduce a
  second mark system.
- **Any depiction of the written plan or the handoff document.** That is a fabricated
  screenshot of work that does not exist. Explicitly barred, and the constraint is
  right — it is the most tempting thing on the page and the most damaging.
- **Reviving guilloche.** Dead, per your call. Correctly: at 5% it was invisible, and
  the fix for invisible is the failure mode.

---

## 3. Taste-skill guidance that actually changed a decision

Only the ones that changed something. Everything else was already satisfied.

1. **§4.8, the asset escalation ladder** (image-gen tool → real photography →
   *clearly-labeled placeholder slots, and tell the user what to supply*). No gen tool
   here and no external assets permitted, which lands on the skill's own last-resort
   path. That is what turned "invent something to fill the space" into "build the slot
   at the right size in the right place and name the spec." The placeholder is the
   prescribed answer, not a compromise.
2. **§9.D, no generic avatars.** This stopped me putting an abstract head-and-
   shoulders silhouette in the slot, which was my first instinct. The slot is empty on
   purpose. A silhouette is a fake person, which the constraints bar anyway, and the
   skill independently flags it as an AI tell.
3. **§4.8, hand-rolled decorative SVG strongly discouraged.** This killed the third
   diagram and the monogram. It is also the test that *clears* the two existing
   diagrams: they are the argument, not decoration, which is the stated exemption.
4. **§4.4, Shape Consistency Lock.** This is why both diagrams get the same plate
   rather than the hero keeping its pool and the sprint one getting a plate. Two
   treatments for one repeated element is a broken system, and I would otherwise have
   left B's asymmetry alone.
5. **§6.E, grain only on fixed pointer-events-none layers.** Determined the grain
   implementation directly — never on a scrolling container.
6. **§4.2, the premium-consumer palette ban.** Worth reporting because it is a near
   miss. The skill bans the `#b08947` brass family as a default reach. It does **not**
   apply here: the ban is specifically brass-on-cream/beige with espresso text, and
   brass on deep petrol is a different family. But it is a real warning about where
   brass goes if the ground ever lightens. If a future variant moves toward a paper
   ground, the brass has to go with it.
7. **Pre-Flight, em-dash ban.** Checked: zero em-dashes and zero en-dashes in the
   visible copy, in the base and in both variants. Whoever wrote this copy already
   did that.

From `frontend-design`, one line changed a decision: *spend your boldness in one
place.* This page already spent it, on brass at the published price. That is the
argument for the corner light in variant A being cool rather than warm — the boldness
budget is gone, and the ground is not where you top it up.

---

## 4. A real bug found in the base, not introduced here

Rendering caught a WCAG failure that is **present in `practice-v2-b.html` and in all
three v2 variants**, and that the v2 pass reported as clean.

`--bone-3` `#93A6A7` over `--raise-2` `#1B454A` measures **4.13:1**. That is the
Workflow Sprint shelf, and the two roles sitting on it are `.figure-alt` ("US$1,750,
founding rate for the first three clients") and `.terms` (the deposit and refund
paragraph), both 14.5px, both needing 4.5:1. The pricing terms on your highest-value
product are the text that fails.

The v2 pass reported "zero results below 4.5:1" because it sampled the *nearest
painted background* and resolved `--raise`, not `--raise-2`. The lesson is the one in
this brief: sample the actual painted pixel under the glyphs.

Fixed in both v3 files by raising `--bone-3` to `#9FB2B3`, which measures 4.75:1 on
that ground. Variant A needed the same fix independently — its lit hero corner
reaches `rgb(29,67,71)`, which dropped `.hero-cta .quiet` to 4.24:1 at 390px.

**`practice-v2-b.html` still has this bug** if that file goes anywhere. So do
`practice-v2-a.html`, `practice-v2-c.html` and `sm-site-b.html`.

---

## 5. Verification

Rendered in Chromium via Playwright. Nothing below was read out of source.

- **Horizontal scroll**: `scrollWidth === clientWidth` at 1440, 390 and 360 on both
  variants. A first render of variant A failed here in a different way: the hero and
  the close are `.wrap` elements, so painting the ramp on them directly produced two
  hard vertical edges at the 1120px column boundary. Both now sit in full-bleed band
  wrappers.
- **Contrast**: 93 to 97 text roles per variant per viewport, at 1440 and 390.
  Method: render once to collect each element's colour and the client rects of its
  own text nodes, render again with `color: transparent` so backgrounds survive and
  glyphs do not, screenshot full-page, then read the painted pixels back through a
  canvas at five points across every line rect and keep the worst. **Zero roles below
  their AA threshold on either variant at either width.** Worst on the page is
  4.75:1.
  The first version of this harness sampled element boxes rather than text rects and
  produced a screenful of phantom failures — it was reading the page ground through
  the rounded corners of the pill CTA, and the bone `+` toggle in the FAQ padding.
  Both were sampling artifacts. Neither was a real defect, and reporting them would
  have been worse than not checking at all.
- **Reduced motion**: emulated `prefers-reduced-motion: reduce` on both. Zero elements
  with a running animation or a transition over 50ms, zero text below 0.9 opacity,
  zero undrawn diagram paths, zero untranslated reveals. Neither treatment adds
  motion of any kind — every background here is a static gradient or a static SVG.
- **Self-contained**: grepped both files for external references. Zero external
  stylesheets, fonts, scripts, image URLs or `data:` URIs. The only `url()` in either
  file is `url(#g-noise)`, an internal SVG filter reference. No raster anywhere.
- **Copy**: tag-stripped diff against the base. A is identical. B adds only
  "Photograph" and "to come", the slot's own label.
- **Base files**: md5 unchanged on `practice-v2-{a,b,c}.html` and `sm-site-{a,b}.html`.

Screenshots: `v3-{a,b}-{desk,mob}-{full,hero}.png`, plus
`v3-{a,b}-{pricing,practice,sprint}.png` and `v3-b-mob-me.png`.

Sizes: A 40KB, B 40KB, against the base's 35KB.

---

## 6. Recommendation

**Ship A's ground and B's imagery answer together.** They are orthogonal — A touches
only section backgrounds, B touches only two figures, one card-adjacent block and a
fixed overlay. Nothing in either file conflicts. Combining them is roughly a one-line
change to `build_v3.py` (apply both treatment sheets to one output); I left them
separate so the two questions could be answered separately, and did not build the
combined file uninvited. Say the word.

If you only take one: **take B.** The corner gradient is the better *ground*, but the
portrait is the better *page*. A is a refinement of something B already did
adequately. The portrait is the only thing on this list that changes whether a
stranger trusts you with their clients' bank statements, and it is the one deliverable
that needs something from you rather than from me.

**The thing to do this week is get the photograph taken.** Everything else here is
finished.
