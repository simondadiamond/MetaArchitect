# Handoff — practice site, v3 and what comes next (2026-08-17)

> Written by `sitemaster` at the end of the 2026-08-17 session. Supersedes the
> build sections of [`2026-08-16-practice-site-fusion.md`](2026-08-16-practice-site-fusion.md),
> which is still correct on how Stitch behaves (§10) and on the verification
> standard (§7). The 2026-08-15 handoff is still correct on the business and the
> ICP.
>
> **Nothing is deployed. No outreach has been sent. Every CTA points at a
> Calendly event type that does not exist yet.**

## 0. Read this first

**Your brand-enforcement rule is suspended.** This practice is not The Meta
Architect. Do not read `brand/*` and re-apply `#0F0F0F` / `#E04500` / `#C97A1A` /
Merriweather. The design system is `funnel/site-drafts/THEME.md` — read it before
touching anything visual, and copy the `<style>` block from `fusion-v3.src.html`
rather than re-deriving it.

Then read, in order:

1. `funnel/site-drafts/THEME.md` — the design system, and the feel in prose
2. `funnel/practice-plan-v1.md` — offer, pricing, guarantees, quit triggers
3. `funnel/icp-v2.md` — the buyer (v2.2, moderate confidence, test not yet run)
4. `funnel/site-drafts/fusion-v3-notes.md` — what v3 is and what is open
5. `funnel/site-drafts/fusion-v2-cro-verdict.md` — the CRO seat's rulings on the offer

## 1. State in one paragraph

Three drafts exist side by side. **`fusion-v3.html` is the live candidate** and is
ready to become the home page. `fusion.html` (v1) and `fusion-v2.html` are kept
for comparison and should not be edited further. `sample-opportunity-report.html`
is the proof asset the home page links to. All three build from `.src.html`
sources via their own build scripts, and all three pass the verification standard.

## 2. The files

| File | What |
|---|---|
| `fusion-v3.src.html` | **edit this** |
| `fusion-v3-build.py` | inlines fonts + portrait → `fusion-v3.html` |
| `sample-opportunity-report.src.html` / `sample-report-build.py` | the proof asset |
| `faces-v2.css` | EB Garamond + Source Sans 3, base64, latin subset |
| `simon-paris-v3.png` | the portrait, fetched from the website repo |
| `verify.js` | render, overflow, reduced motion, network, and the 3× crops |
| `audit-contrast.py` | WCAG against painted pixels |
| `shot.js` | screenshots |
| `THEME.md` | the design system |

```
python3 fusion-v3-build.py && node verify.js fusion-v3.html && python3 audit-contrast.py
```

**Preview:** `python3 -m http.server 8086 --bind 100.105.85.5` from
`funnel/site-drafts/`. Tailscale IP, never `0.0.0.0`.

**Superseded, reference only — do not build on these:** `atelier-a*`,
`stitch-quiet-luxury-v2.html`, `bookend-*`, `brass-v3-*`, `practice-v2-*`,
`sm-site-b.html`, and their notes files. Their palettes and typefaces are all
dead. `THEME.md` is the only live description of the design.

## 3. The offer, as it now stands on the page

| | |
|---|---|
| **AI Workflow Opportunity Session** | C$350. Ninety minutes plus a written report. Guarantee: *"You'll leave with a written recommendation you can act on. If, after reviewing it, you genuinely don't believe the session was worth C$350, I'll refund it."* Credited in full toward implementation within thirty days. |
| **Workflow Sprint** | C$1,750 founding client rate. One recurring workflow, up to two major integrations, human approval where judgment is required, implementation and testing, a fourteen-day live run, a measured result and a written handoff. Signed off against acceptance criteria agreed in writing before the build; final payment due when they are met. Larger builds scoped separately. |

Method is **Find / Design / Implement**, and Design's wording is load-bearing:
*"AI, deterministic automation, existing software, custom code, or a
combination."* Not automatically prescribing AI is the credibility play.

**Three decisions Simon made on 2026-08-17, so don't re-litigate them:**

- **The session is not a prerequisite.** The Sprint includes its own mapping. The
  session is the cheaper door for someone not ready to commit, not a toll gate.
- **The free 20-minute fit call stays**, because the disqualifying question —
  is there already a practice-management tool — has to be asked before either
  party spends an hour. **The qualifying questions belong on the Calendly booking
  form, not in a separate form or an extra step.**
- **No tax line on the prices** until he registers for GST/QST. Business buyers
  recover it, and advertising a tax he is not charging would be wrong.

## 4. The blocker: booking

Every CTA points at one of two URLs, and **neither exists yet**:

- `https://calendly.com/me-simonparis/opportunity-session` — paid, C$350
- `https://calendly.com/me-simonparis/fit-call` — free, 20 min

The Calendly account is real: `NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/me-simonparis/30min`
in `projects/simonparis-website/.env.local.example`, and `/30min` already exists
(it is The Meta Architect's presentation call — do not reuse it for the practice).

Two things to settle before traffic:

1. Create both event types. The paid one needs Calendly's paid-bookings feature
   (Stripe or PayPal, plan-gated) — **verify whether it collects payment before
   confirming the booking or after**; the earlier note about Cal.com's Stripe app
   had the same open question and it was never answered. Fallback is a Stripe
   Payment Link that redirects to the booking page.
2. When this becomes a Next.js page, the URLs come from env vars, the way the
   existing site does it, not hardcoded.

Until then there is **no funnel event between "arrived" and "an email showed up"**,
which is the CRO's sharpest operational point: the 30-day segment test decides a
segment's fate on booked sessions, and with no booking mechanism a single booking
cannot be distinguished from a broken page.

## 5. What to build next, in order

1. **Port `fusion-v3` to the Next.js site as the new home page.** Extract the
   `<style>` block into the project's styling layer, keep the tokens as CSS
   variables with the exact names in `THEME.md`, and keep the portrait as a real
   asset rather than base64. `simonparis.ca` is EN + FR via `next-intl` — every
   string needs both locales or a `TODO`. **Note the brand collision:** the
   existing site is The Meta Architect (dark, orange, Merriweather). Whether the
   practice replaces it, or lives at a different domain or path, is Simon's call
   and is not settled. Do not merge the two design systems.
2. **`/practices`** — the bookkeeping vertical page. **The 40-name outreach links
   here, never to the home page.** ICP v2's post-mortem on v1 is that a
   description fitting every small business is unfalsifiable, and the home page's
   "I help businesses…" is deliberately that broad. The vertical surface is small
   by design: the hero line, the four problem sentences, and the named workflow.
   Everything else — design, guarantees, pricing, the sample report — is shared.
   This page is also where `C$2,500` and any "typical first implementation" framing
   belongs, not the home page.
3. **`/field`** — trades and field service, the designated fallback segment. Same
   spine, different evidence block. Only after the bookkeeping test resolves.
4. The remaining pages inherit `THEME.md`. A page that is not described there
   should be built to §1, the feel in prose, rather than by copying a layout.

## 6. Open, and each one is Simon's

- **The two Calendly event types.** Blocking everything.
- **Is the sample report strong enough to keep linked?** It gained acceptance
  criteria, failure modes and a measurement method this session, and section 08
  recommends against Simon twice on purpose. He was ambivalent about whether a
  composed example helps or hurts. Replace it with a redacted real one as soon as
  one exists; he mentioned doing it properly with Sym.
- **The Sprint card's CTA wording.** "See if your workflow fits — 20 min"
  describes the call, not the card it sits on. The flow is right; the label may
  read as a switch.
- **The portrait carries an "edited with AI" sparkle watermark** in the export.
  The build crops the bottom 7% to remove it. A clean re-export beats a crop, and
  the crop is commented as temporary in `fusion-v3-build.py`.
- **The deposit terms are missing.** The Sprint says when the *final* payment is
  due but not what starts the work. `practice-plan-v1.md` says 50% deposit.
- **US$ prices are absent**, against `practice-plan-v1.md`, which keeps both
  published. Do not restate the parity out loud — it makes an American notice
  they are paying ~40% more.
- **English-only for a Quebec City audience** while claiming service in French or
  English. Needs a lawyer, not an agent. All Bill 96 specifics found in prior
  research were fabricated — do not cite article numbers.

## 7. How this session went wrong, so you don't repeat it

- **An outside AI reviewed the Stitch mockup, not the fusion**, and about half of
  its critique was of copy that had already been deleted. When someone brings back
  a review, check which artifact it read before acting on it.
- **The verification harness had two silent bugs** that were only exposed by a
  page whose layout differed: crops were sampled mid-transition, and the
  translucent sticky nav was captured over any element scrolled beneath it,
  reporting gold-on-band text at 1.15:1 when it computes at 5.61:1. Both are
  fixed. The lesson generalises: auditing the pixel is right, but it has to be the
  *final* pixel of the *right* element.
- **Section spacing eroded across six passes** and nobody noticed until Simon did.
  White space is the one variable the located evidence actually supports for
  perceived quality; it should be the last thing economised, not the first.
- **Deleting CSS by comment range is dangerous** — `.proc` lived inside a block
  labelled `blueprint`, and a range delete would have silently taken the
  methodology row with it.
