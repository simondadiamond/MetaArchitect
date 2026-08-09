# Draftsman Rollout — Design Spec

**Date:** 2026-08-09
**Source handoff:** `docs/handoffs/2026-08-09-operator-visual-rollout-draftsman.md` (authoritative for the approved visual system and the session history behind it — decisions there are locked, not re-litigated here)
**Approved by:** Simon, this session (approach A + scope answers + design sections)

## Mission

Take the approved "Draftsman" visual direction to production on simonparis.ca's operator conversion path, make `brand/brand-summary.md` the documented standard for it (visual system + marketing strategy, not just tokens), audit operator-facing copy against the real offer ladder, and verify the marketing-skills plugin priming. Nothing deploys without Simon's live check of a preview.

## Scope decisions (made this session)

- **Pages in the visual rollout:** homepage (`HomeOperator`), `/setup`, `/work-with-me`, `/about`. Both locales (en/fr).
- **Blog: visuals deferred to phase 2.** All blog surfaces keep the current dark system for now; blog theming is decided after the first four pages are live. Blog **copy** is still in the audit (text fixes only).
- **Practitioner lane untouched:** `LegacyHomePractitioner.tsx`, `/score`, `/readiness`, practitioner blog pillars, teardowns. The scoped theme layer must make inheritance by these surfaces impossible, not just avoided.
- **Practitioner door stays on every operator page** — quiet strip (Score my stack · Blog · Work with me), deliberately less designed.

## Work order

### 0. Plugin priming check (independent, first)

Marketplace repo (`~/.claude/plugins/marketplaces/marketingskills/`) freshness vs github.com/coreyhaines31/marketingskills; symlink integrity for the 5 resident skills; confirm skills still read `.claude/product-marketing.md` first. Fix drift if found.

### 1. `brand/brand-summary.md` v-next

Absorb the 2026-08-09 "Audience Variant — Execution Polish" patch into a full **"Operator Lane — Draftsman System"** section:

- **Palette:** paper `#F3EEE1`, deep panel `#EAE3D0`, ink `#1C1712`, soft `#5B5346`, faint `#948C7A` (labels/metadata only — never body text), brass `#8C6A2F` (labels + detail accents), orange `#E04500` spent in exactly two places: button hover/press, and one full-bleed dark closing panel per page.
- **Type:** Merriweather display with italic emphasis words; Inter body; **no monospace on operator surfaces**.
- **Components:** note cards (background-differentiated, real shadow, slight rotation, torn-tape pin); spec-sheet pricing (lifted sheet, ~0.4° tilt, pin-dot, numbered leader-dot rows); ink-stamp founding seal; rectangular ink-fill buttons (orange hover, scale-down press); personal signature line near final CTA.
- **Motion:** real 150–300ms ease transitions on interactive states; `prefers-reduced-motion` respected.
- **Don't-list:** pill buttons, bordered card grids, glow orbs, colored accent bars on cards, generic three-equal-card layouts, monospace, always-dark assumption on operator surfaces.
- **Strategy layer:** why the design-studio register converts this buyer (cite `docs/research/operator-trust-criteria-independent-2026-08-09.md`); persuasion placement map (person-over-company → signature line; risk reversal → audit-credit presentation; anxiety answers → own-the-account + fixed scope near price); the comprehension-over-cleverness lesson (floor-plan metaphor rejection) as a standing design rule.
- **Boundaries:** ICP + customer language stay canonical in `.claude/product-marketing.md` — link, don't duplicate. Practitioner sections untouched. Version bump + one-line changelog per doc convention.

### 2. Copy audit

Surfaces: the four rollout pages + blog copy, en and fr (`messages/` namespaces). Checks, against `product-marketing.md` v2:

1. Offer-ladder contradictions (prices, timeframes, promises per rung — the "two-hour working setup vs $6,500/~30-day" class of bug)
2. Busy Owner Test failures
3. Tool language on operator surfaces (hard rule)
4. Brand prohibition hype words
5. Verbatim-bank alignment (use their words where copy invents new ones)
6. en/fr parity for every changed string

Output: per-page fix list with **literal current-string → replacement-string pairs** (discriminator rule). Fixes to rollout pages fold into implementation; blog fixes are text-only edits.

### 3. Implementation (simonparis-website, git worktree — never the primary checkout)

- **Theme layer:** Draftsman CSS custom properties scoped under an operator-page wrapper (class on the page/layout root). Practitioner pages never carry the wrapper → cannot inherit. Extend Tailwind config with the tokens.
- **Shared components:** `components/draftsman/` — NoteCard, SpecSheet, InkSeal, Button, section primitives.
- **Theme-aware Nav/Footer** (shared across lanes; render paper treatment inside the wrapper, current dark outside).
- **Page order:** `/setup` (mockup is the reference — try WebFetch of the claude.ai artifact once; the handoff's written description is authoritative on failure) → homepage → `/work-with-me` → `/about`. Copy fixes land with each page, both locales.
- **Execution:** sitemaster agents under subagent-driven development; CMO reviews each page against brand-summary v-next before the next starts.
- Stories #154/#155 already softened radii/transitions — expected starting state, superseded by this work.

### 4. QA + ship gate

- Taste-skill redesign-audit checklist (github.com/Leonxlnx/taste-skill) re-run against production pages
- WCAG AA contrast on the warm palette; keyboard focus states; `prefers-reduced-motion`
- Mobile viewports on a local `next start` (never restart the live service)
- One PR on simonparis-website. **Merge gate: Simon's live check of the Vercel preview.** Status reported as "pending Simon's live check", never "verified".

## Constraints carried from the handoff

- Evidence discipline: WTP unproven, 0 paying clients — no new proof/testimonial claims.
- Gate B still gates the *full* homepage rebuild (new sections/proof treatment); this rollout re-skins and copy-corrects approved scope only. No new sections without Simon.
- Brand prohibitions apply everywhere; guard hooks are live — surface blocks, don't work around; `gh` for all pushes.

## Testing

Build + lint pass; per-page screenshots (desktop + mobile, en + fr) attached to the PR; contrast checks scripted where possible. No new test infrastructure — these are static marketing pages; the verify weight is visual QA + the copy discriminator list.

## Phase 2 (explicitly deferred, not designed here)

Blog theming under Draftsman (per-lane split vs full chrome), decided after the four pages are live and Simon has seen the system in production.
