# Handoff — Dark theme refresh: salvage the paper build's winning devices, drop the dev-tool tells

status: built — pending Simon's live preview check (PR #107)
picked_up_by: sitemaster session, 2026-08-10
updated: 2026-08-10
supersedes: nothing — this is the follow-up to `2026-08-09-draftsman-execution.md` (Draftsman/paper rollout, rejected on live check 2026-08-10)

## Follow-up fix #2 (2026-08-10, same PR #107, commit `b8e9eac`) — navy extended page-wide

Simon live-checked the `309bfa8` build and correctly flagged that the navy shift only
reached `.op-hero` (the hero/CTA band) — the rest of each operator page was still on the
old neutral `--color-background*`/`--bg-*` tiers, so the page had two dark backgrounds
fighting each other with a visible seam.

Fix: a new `.op-lane` scope class in `app/globals.css` overrides both background-token
systems in play (Tailwind v4 `--color-background*` theme tokens, which drive the
`bg-background`/`bg-background-deep`/`bg-background-surface`/`bg-background-elevated`
utilities; and the legacy `--bg-primary`/`--bg-surface`/`--bg-elevated` custom
properties, which drive `card-surface`/`card-elevated`/`btn-secondary`) for its
descendant subtree, reusing `.op-hero`'s exact anchor hue (`#0a0e16`, H221° S37.5%) as
the base tier. Tiers hold the *same lightness deltas* as the neutral ramp they replace —
computed via WCAG relative luminance, not eyeballed — so every text token's contrast
ratio against the new tiers is within ±0.12 of its ratio against the old ones (same
accessibility profile, hue-shifted only):

- deep `#070a10` (darkest — zebra-striped section bands)
- base `#0a0e16` (default page background — unchanged, `.op-hero`'s existing anchor)
- surface `#131a29` (card fills)
- elevated `#161f31` (lifted cards — invoice/pricing panels)

`.op-lane` also sets its own `background-color` directly (not just the CSS var
overrides), so sections with no explicit `bg-*` class — most of them — paint navy
instead of falling through to whatever's behind the wrapper.

Applied to the outermost content wrapper of the 4 operator pages only:
`HomeOperator.tsx`, `about/page.tsx`, `setup/page.tsx`, `work-with-me/page.tsx` (each
page's root `<>` fragment became `<div className="op-lane">`). Nav/Footer (shared
chrome, rendered outside this wrapper by `[locale]/layout.tsx`, used by every page
including practitioner ones) were deliberately left out of scope — same reasoning as
before, they're chrome common to both lanes, not part of the "two backgrounds fighting"
complaint.

One surprise: `about/page.tsx` had 4 backgrounds hardcoded as Tailwind arbitrary-value
hex (`bg-[#0F0F0F]`, `hover:bg-[#1A1A1A]`) instead of the semantic token utilities —
those don't respond to a CSS-var scope override (Tailwind bakes arbitrary hex literally
at build time), so they'd have stayed gray-black even inside `.op-lane`. Converted all 4
to `bg-background`/`hover:bg-background-surface`.

Verification: local `next build` + `next start` on port 4173, own-pid confirmed via
`ss -ltnp` before trusting anything, served HTML grepped for `op-lane` (present on all 4
operator pages/both locales, absent on `/score`/`/readiness`/`/blog`) and the served CSS
grepped to confirm the compiled `.op-lane{...}` rule matched the intended hex values.
Full-page (not hero-crop) Playwright screenshots taken for all 4 pages × EN/FR ×
desktop/mobile (16 total) — page now reads as one continuous navy surface top to bottom,
no seam. `/score` screenshotted separately to confirm the practitioner lane is
byte-identical to before (its `:root { --color-background: #0f0f0f }` is untouched,
confirmed by grepping the served CSS directly).

Diff stayed small and mechanical: `app/globals.css` (+40 lines, one new scope rule),
4 page/component files (wrapper `<>` → `<div className="op-lane">`, 4 hex-to-token
conversions on `about/page.tsx`). No copy, layout, or component-structure changes.

## Follow-up fixes (2026-08-10, same PR #107, commit `309bfa8`)

Two items Simon flagged on top of the built PR, fixed on the same `dark-refresh`
branch — no new PR:

1. **Card rotation, dropped again.** `components/operator/ResetVsRemembers.tsx`
   still carried the paper build's whole-card `rotate(-1.3deg)`/`rotate(1deg)`
   tilt — Simon asked for this removed once already (2026-08-09, on paper) and
   it came back in via the dark-refresh salvage. Both inline `style={{ transform:
   ... }}` props removed; cards render level. The tape accent's `-2deg` and
   `FoundingSeal`'s `-8deg` stamp rotation are untouched — those are small
   decorative elements, not the whole-card tilt that was the actual complaint.
2. **Hero/CTA bands: navy + one motivated ambient light.** Simon wanted the flat
   `#0a0a0a`/`#0f0f0f` neutral-black background to read as "next level" — dark
   navy with a subtle, off-center light, not a centered glow (checked against
   `frontend-design` first: a centered radial glow on near-black is one of
   three current AI-generated-design defaults called out by that skill).
   New `.op-hero` utility in `app/globals.css`: `background-color: #0a0e16`
   (deep desaturated navy) + a navy-tinted grid (`#141b2c`, replaces the
   neutral-grid `.bg-blueprint` on operator surfaces) + one soft warm-amber
   (`--color-accent-link`, `#c97a1a` — no new color token) radial light at
   `18% 6%` (upper-left, like a desk lamp), peak opacity 0.08, single
   `prefers-reduced-motion`-respecting fade-in on load, otherwise static.
   Motivated by the hero copy itself ("tuesday · 9:14 pm · invoices, again" —
   someone working late at a desk).
   - **Scoping**: `.op-hero` is a standalone class — `--bg-primary`/`body` and
     `.bg-blueprint` (still shared with `LegacyHomePractitioner`) were never
     touched, so `/score`, `/readiness`, `/blog`, and the practitioner homepage
     render byte-identical to before. Verified: grepped the served HTML for
     `op-hero` on `/score`, `/readiness`, `/blog` (0 matches) vs. the 4 operator
     pages (present, both EN and FR).
   - **Applied once per page** (brief: "spend the effect once"), on whichever
     section is that page's hero/CTA band: `HomeOperator` + `/setup`'s hero
     section (swapped `bg-blueprint` → `op-hero`); `/work-with-me`'s Diagnostic
     panel (its hero has no CTA — the Diagnostic panel is where the value
     framing + single mailto CTA live together, so it carries the treatment
     instead); `/about`'s closing CTA panel (same reasoning — the top hero is a
     plain bio intro with no CTA, so it's the bottom panel, newly boxed to match
     the home/setup closing-CTA convention, that carries it).
   - **Contrast verified analytically** (WCAG relative-luminance formula, not
     just eyeballed): every existing text token's contrast ratio against the
     new `#0a0e16` is equal to or slightly better than against the old
     `#0f0f0f` (`text-muted` #777 ~4.31:1 vs. ~4.28:1 before — pre-existing
     sub-4.5 condition on muted/label text, not a regression I introduced;
     `text-secondary`, `text-primary`, and `accent-link` all clear AA
     comfortably, ~5.7–9.3:1).
   - **Verification**: local `next build` + `next start` on port 4174 (own pid
     confirmed via `ss -ltnp` before trusting any screenshot, plus grepped the
     served HTML for `op-hero` per the 2026-07-20 lesson) — Playwright
     screenshots of all 4 operator pages × desktop (1440×900) + mobile
     (390×844), plus a pixel sample at the glow's peak point confirmed the
     expected alpha-composited color (~rgb(25,23,22) predicted vs. rgb(25,21,22)
     observed).
   - Note for whoever next touches `brand/visual-operator.md`: its "Don't"
     list still carries a blanket "glow orbs / cursor spotlights" ban inherited
     from the paper system's rejected directions. This ambient-light device is
     a deliberate, narrow exception to that (motivated placement, single
     source, 0.08 peak opacity, static) — not a reopening of glow effects
     generally. Worth a one-line carve-out in that doc's changelog next time
     it's edited, same pattern as the amber-token exception it already
     documents.

## Build complete (2026-08-10)

All scope items done in one continuous pass (no per-page subagent fan-out — the
mistake that produced the prior rollout's inconsistency): dev-tool tells removed
(terminal-window hero chrome, blinking cursor, typing-simulation animation, `$ tree`
ASCII directory listing), Draftsman's structural devices salvaged and re-tokened dark
(`ResetVsRemembers`, `PricingSheet`, `FoundingSeal`, `SignatureLine` in
`components/operator/`), applied consistently across all 4 operator pages, copy-audit
fixes ported to `master`, a restrained 4px operator-lane radius token added (checked
against `ui-ux-pro-max`/`frontend-design` first), reviewed against `cro` +
`marketing-psychology` before finishing. `brand/visual-operator.md` and
`brand/brand-summary.md`'s router section rewritten to match.

PR: https://github.com/simondadiamond/simonparis-website/pull/107
Vercel preview: https://simonparis-website-git-dark-refresh-simondadiamonds-projects.vercel.app
(SSO-protected, same as the prior rollout — could not curl-verify directly; verified
instead via a local `next build` + `next start` walk: Playwright screenshots of all 4
pages × EN/FR × desktop/mobile, plus grepping the served HTML for dev-tool-tell
discriminators before trusting any screenshot, per the 2026-07-20 lesson.)

**Merge gate stays hard — PR does not merge without Simon's live preview check.**

One item flagged for Simon's awareness, not fixed in this pass (predates this refresh,
out of scope — an IA decision, not a visual one): both the homepage and `/setup` hero
sections carry two CTAs (primary + a de-emphasized secondary "skip ahead" option).

## Why

Simon live-checked the paper (Draftsman) preview and rejected the direction: the build
read as visually inconsistent (per-section card/panel treatment drifted since 4 pages
were each built by an independent subagent in one day, with no cross-page
component-vocabulary check) and the brass token measurably fails AA contrast
(~4.30:1 on paper, needs 4.5:1) everywhere it's used. Both are real defects, confirmed,
not just taste — see PR #106 (closed, not merged) on `simonparis-website` for the full
history and the branch `draftsman-rollout` (left un-deleted) for reference.

But the reason the paper rollout got started at all was real too: the current
production dark theme has practitioner/dev-tool tells — monospace type, a blinking
terminal cursor on the "Tuesday · 9:14pm" hero conceit, traffic-light window-control
dots on the invoice mockup card — that read as "developer tool" to this ICP (2–30
person owner-operated service business, "curious and slightly overwhelmed" about AI,
not a developer; see `funnel/setup-offer/icp.md`). Reverting to dark without fixing
those specific signals just undoes the one thing that was actually right about
yesterday's work.

**Simon's framing, verbatim intent:** keep dark, but it needs "something not flashy but
more than just text" — some graphic/illustrative device, not pure typographic
minimalism, and not the blinking-cursor gimmick either.

## Scope

1. **Analyze both versions first.** Read the current production dark pages
   (`app/[locale]/{setup,about,work-with-me}/page.tsx`, `components/home/HomeOperator.tsx`
   on `master`) side by side with the paper build (`draftsman-rollout` branch, same
   files, plus `components/draftsman/*.tsx` and `design/draftsman-reference.html`).
   Identify concretely:
   - **Keep/adapt from paper** (Simon liked these in principle): the reset-vs-remembers
     twin note-card device illustrating "the tool remembers your business" (currently
     `SetupHeroWindow`'s terminal-window framing in dark — replace the framing, not the
     idea), the spec-sheet/leader-dot pricing ladder, the founding-rate seal/scarcity
     badge, a personal signature line near the final CTA, the honest "no client logos
     yet — here's what there is instead" proof framing.
   - **Remove from dark production**: monospace font on any operator-facing text,
     the blinking-cursor animation, traffic-light window-control dots on the invoice/chat
     mockup, and any other component that reads as a code editor / terminal rather than
     a workspace or a physical artifact.
   - Write this analysis down (a short before/after list) before touching code — it's
     the spec every page then follows, so the "different CSS per section" mistake
     doesn't repeat.
2. **Design the dark-compatible versions of the keeper devices once**, as shared
   components (mirror the pattern of `components/draftsman/*.tsx` but dark-toned) —
   invoice/chat mockup card without terminal chrome, pricing ladder, seal badge,
   signature line. No blinking/pulsing animation anywhere; standard hover/press
   transitions only (150–300ms, `prefers-reduced-motion` respected).
3. **Apply the SAME shared components consistently across all 4 operator pages**
   (`HomeOperator`, `/setup`, `/work-with-me`, `/about`) — do this as one continuous
   pass, not independent per-page subagent dispatches, so the whole surface reads as
   one system. This is the direct fix for what broke last time.
4. **Port the copy-audit fixes.** `funnel/setup-offer/copy-audit-2026-08-09.md`'s
   CURRENT→REPLACE pairs are theme-independent (offer-ladder accuracy, tool-language
   removal, fr parity) and were only ever applied on the now-closed `draftsman-rollout`
   branch. Cherry-pick or reapply them to `master`'s `messages/en/*` and `messages/fr/*`.
5. **Rewrite `brand/visual-operator.md` and the brand-summary router.** The Draftsman/
   paper mandate is stale. Keep the reusable judgment (component-pattern descriptions,
   the comprehension-over-cleverness rule, the persuasion-placement map) but rebase it
   on: dark stays canonical, no monospace/terminal-cursor/traffic-light-dot patterns
   anywhere on operator surfaces (this is the actual hard-won rule, not "no dark mode"),
   graphic devices allowed and encouraged (note-card metaphor, spec-sheet, seal) as long
   as they're dark-toned and not gimmicky/animated. Add a changelog entry: paper tried
   2026-08-09, reverted 2026-08-10 (Simon's live-check verdict + real AA/consistency
   defects), superseded by this dark-refresh direction.
6. **Practitioner-only surfaces stay untouched**: `LegacyHomePractitioner.tsx`, `/score`,
   `/readiness`, blog visuals, `/terms`, `/privacy`, teardowns.

## Execution notes

- Work in a fresh worktree off `master` (never the primary `simonparis-website`
  checkout) — `git worktree add ../simonparis-website-dark-refresh -b dark-refresh
  origin/master`.
- Prefer ONE agent/session doing the analysis-through-build pass sequentially, not a
  fan-out of independent page-builders — that fan-out is exactly what produced the
  inconsistency Simon flagged.
- **Merge gate stays hard**: PR does not merge without Simon's live preview check.
  Report the preview URL with a clear discriminator of what changed vs. current
  production.
- If a background/async agent dispatch pattern is used at any point, do not rely on a
  subagent messaging back by name to report results — that channel silently failed
  during the paper rollout (`docs/lessons.md` 2026-08-09 entry). Prefer synchronous
  dispatch.

## Done means

Dark theme on all 4 operator pages: dev-tool signals gone, winning graphic devices
present and dark-toned, consistent component vocabulary across pages, copy-audit fixes
ported to master, `brand/visual-operator.md` rewritten to match, PR open with
screenshots awaiting Simon's live check.
