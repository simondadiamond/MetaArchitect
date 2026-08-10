# Handoff — Dark theme refresh: salvage the paper build's winning devices, drop the dev-tool tells

status: built — pending Simon's live preview check (PR #107)
picked_up_by: sitemaster session, 2026-08-10
updated: 2026-08-10
supersedes: nothing — this is the follow-up to `2026-08-09-draftsman-execution.md` (Draftsman/paper rollout, rejected on live check 2026-08-10)

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
