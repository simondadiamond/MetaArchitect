# fusion v3 — the offer, put back together

Sibling to v1 and v2; `fusion-v2.src.html` is untouched. v3 = v2 plus the eight
changes Simon specified on 2026-08-17, and nothing else.

```
python3 fusion-v3-build.py && node verify.js fusion-v3.html && python3 audit-contrast.py
python3 sample-report-build.py && node verify.js sample-opportunity-report.html
```

Preview: `/fusion-v3.html` and `/sample-opportunity-report.html` on port 8086.

## The eight

1. **The Workflow Sprint is back, priced.** C$1,750, founding client rate, no
   "starting at". One recurring workflow · up to two major integrations · human
   approval wherever judgment is required · implementation and testing · a
   fourteen day live validation period · a measured result and a short written
   handoff. Plus "Larger builds and multi-workflow systems are scoped separately."
2. **Its CTA is "See if your workflow fits — 20 min"**, pointing at the free fit call.
3. **The session keeps its price and gains the refund guarantee**, with the credit
   demoted to the quiet line under it rather than competing with it.
4. **Acceptance-based sign-off on the Sprint**, as its own gold-marked block.
5. **Every mailto CTA is now a booking link** — see the warning below.
6. **The sample report exists**, and the button points at it.
7. **The ownership sentence** no longer implies owning third-party software.
8. **Two FAQ answers softened** — the security answer explains that architecture
   follows the client's systems and requirements, and "software does not run
   perfectly" is replaced with Simon's wording.

Two consequential edits Simon did not ask for, because leaving them would have
made the page contradict itself: the engagements subtitle said "one published
price" (now "Two prices, both published…"), and the standing line under the cards
kept its ongoing-support sentence.

## The booking links are placeholders — this is the one thing that must change

Every CTA now points at one of two URLs:

| CTA | URL |
|---|---|
| nav, hero, session card, close | `https://cal.com/simonparis/opportunity-session` |
| Sprint card, "not sure" line | `https://cal.com/simonparis/fit-call` |

**Neither exists.** They are the shape of the thing, not the thing. Before any
traffic reaches this page, either create the two Cal.com event types at those exact
slugs, or send me the real URLs and I will swap them. The paid one needs the Stripe
app; the handoff's §9.1 note still stands — whether Cal.com's Stripe app gates
confirmation on payment or collects after is unverified, and the fallback is a
Stripe Payment Link that redirects to the booking page.

The footer's `mailto:me@simonparis.ca` was left alone. It is contact information,
not a call to action.

## The sample report

`sample-opportunity-report.html` — a real document, not a mock. Eight sections
matching the headings on the homepage, written on **the monthly missing-document
chase in a six-person bookkeeping practice**, which is ICP v2's named workflow, so
this doubles as the `/practices` proof asset.

It is labelled twice: a bordered stamp at the top ("Illustrative example — not a
client engagement") and a line under the lede saying the workflow is real and
common but the practice is composed and no client data appears in it.

Two things in it are deliberate and worth keeping if it gets rewritten:

- **Section 08 recommends against Simon twice.** "Do the cheap half" and "buy
  TaxDome or Karbon" are listed above "build the workflow", and the closing note
  says the second option is the honest starting point for the composed practice.
  A recommendation is only a recommendation if it can come out the other way — and
  ICP v2 names TaxDome and Karbon as the substitutes that decide whether the deal
  exists at all. A sample report that pretends they don't exist is a brochure.
- **Section 07 marks its own numbers as estimates**, not benchmarks, and says the
  measurement that counts is the one taken during the live run.

It shares the page's CSS block verbatim, so it cannot drift visually. Replace it
the moment a real engagement produces a redacted one.

## Verification

| | fusion-v3 | sample report |
|---|---|---|
| painted-pixel crops at 3× | 144, **0 failures** | 56, **0 failures** |
| horizontal overflow at 6 widths | none | none |
| reduced motion | 29 reveals, 0 hidden | 4 reveals, 0 hidden |
| external requests | 0 | 0 |

The homepage → sample-report link was verified by clicking it in Chromium and
reading the title of the page it landed on, not by eyeballing the href.

## Revision — 2026-08-17, Simon's walk of v3

- **The sample report's closing question is one line at every width**, 360
  included, and its subtitle is one line from 768 up and two on a phone, which is
  what he asked for. The clamp floor was set from measured line counts at four
  widths, not from taste.
- **The engagements section was too dense.** It is ~300px shorter now. The
  session's opening paragraph is one line instead of three, its bullets go six to
  four, the Sprint's go six to four by merging, the Sprint's opening paragraph is
  gone (it repeated the first bullet and the sign-off block), and the sign-off
  block is two sentences instead of three. The standing line under the cards keeps
  only the ongoing-support sentence — the "defined scope, clear success criteria"
  half had become a duplicate of the sign-off block above it. **Both guarantees
  stayed**, per his instruction that they are the strongest part.
- **The cards are no longer stretched to equal height.** `align-items:start`, so
  the Sprint sits at 665px against the session's 693 — the smaller commitment now
  reads as the smaller card instead of being padded out to match.
- **The sample report gained the parts a practitioner reads.** Three new blocks:
  the acceptance criteria as they would actually be written (five, including two
  that are hard failures rather than percentages), what the workflow does when it
  is unsure (five named cases, each chosen because getting it wrong costs a client
  relationship rather than an hour), and how the number actually gets taken
  (baseline method, the one metric that decides, and what would invalidate the
  measurement). The acceptance-criteria block also does double duty: it shows the
  Sprint's sign-off mechanism in concrete form rather than as a promise.
- **The portrait is unchanged.** Simon has a new, less-shadowed cutout but it
  exists only as a chat attachment; it needs to be on disk before the build can
  use it.

## Still open

- **Which page the outreach links to** — the CRO's sharpest point, still unanswered.
- Taxes are not mentioned next to either price. GST/QST registration at C$30K; a
  buyer who agreed to C$1,750 and receives an invoice for ~C$2,012 feels ambushed.
- US$ prices are still absent, against `practice-plan-v1.md`.
- The deposit terms are gone from the page with v2's terms paragraph — the Sprint
  says when the *final* payment is due but not what starts the work.
