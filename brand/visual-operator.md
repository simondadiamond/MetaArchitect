# Visual Identity — Operator Lane (The Draftsman System)

> Load this file when working on operator surfaces: homepage (`HomeOperator`), `/setup`, and — visuals only — `/work-with-me` and `/about` (their copy stays practitioner-voiced; see the 2026-08-09 scope ruling in `funnel/setup-offer/copy-audit-2026-08-09.md`); also Command Center (Simon's internal ops app) as of 2026-08-09 — this is now the default lane for any new build with no stated audience, see `brand/brand-summary.md` §Visual Identity. Practitioner surfaces use `brand/visual-practitioner.md` instead. Router + shared rules: `brand/brand-summary.md` §Visual Identity.
> Audience/ICP/customer language for this lane: `.claude/product-marketing.md` (canonical) + `brand/audiences/operator.md`.
>
> **Internal-tool adaptation (Command Center, 2026-08-09):** on dense functional UI, three rules adapt rather than apply literally — (1) no rotation/tilt on cards (reserved for singular marketing elements, not dense grids); (2) IDs/timestamps use Inter `tabular-nums` instead of mono for column alignment — this is what the no-monospace rule is actually solving for; the xterm terminal surface is a functionally-required exception and keeps its mono rendering; (3) status tags use ink/ink-soft text, never brass (brass is restricted to ≥14px labels per the AA rule below, and status tags run smaller).


**Why this register.** The operator buyer (solo consultant/coach/fractional exec — see `.claude/product-marketing.md`, canonical for ICP and customer language) hires a *person practicing a craft*, not a tech product: independent trust-criteria research found this buyer responds to a named human and visible craftsmanship over company polish (`docs/research/operator-trust-criteria-independent-2026-08-09.md`). Brutalism reads as engineering credibility only to engineers; for a premium-service buyer it reads as unfinished. The Draftsman direction leans into the brand name literally — a boutique architecture-studio register: drafting paper, ink, brass, physical artifacts. Approved by Simon 2026-08-09 after three rejected directions (token-softening, navy/gold glow, Apple-clone twins).

**Standing law — comprehension beats cleverness.** A clever ownable metaphor is worth less than instant comprehension for a first-time, non-technical visitor. (An animated floor-plan metaphor was dropped mid-session for exactly this.) If a device requires decoding, label it inline or cut it. Never ship a metaphor on instinct alone.

### Palette

| Token | Hex | Role | Usage limit |
|---|---|---|---|
| paper | `#F3EEE1` | page background | — |
| paper-deep | `#EAE3D0` | panels, cards, sheets | — |
| ink | `#1C1712` | headings, body, buttons at rest, the closing dark panel | — |
| ink-soft | `#5B5346` | secondary text | body-safe |
| ink-faint | `#948C7A` | decorative metadata only | never essential text (fails AA on paper) |
| brass | `#8C6A2F` | eyebrow labels, seal, detail accents | labels ≥14px only (large-text AA) |
| orange | `#E04500` | exactly two uses per page | button hover/press + one full-bleed dark closing panel |

Text links in Draftsman scope: ink, underlined; hover brass. (Amber fails contrast on paper — it stays practitioner-only.)

### Type

- **Merriweather** (serif) for display/headlines, *italic for the emphasis word* — a confident serif is a differentiator against the sea of grotesk AI/SaaS sites
- **Inter** for body and UI text
- **No monospace on operator surfaces.** Mono is a practitioner-audience tell — `label-mono`/`font-mono` must not appear in operator page code

### Component patterns

- **Note card** — a physical index card: paper-deep background, real box-shadow (`0 8px 24px rgba(28,23,18,0.12)`), rotated 1–2° off-axis, torn-tape accent pinning it down. Signature use: the *reset vs. remembers* pair — a chat that starts over ("Hi, I run a coaching business, and—" repeated, greyed) beside a workspace that persists (Voice / Rates / Clients).
- **Spec-sheet pricing** — the rate card as a lifted physical sheet: ~0.4° tilt, pin-dot top-left, rows as numbered leader-dot lines (`01  Working Session ······ $125/hr`), never ruled table borders or a bordered box grid.
- **Ink-stamp founding seal** — circular brass stamp graphic ("Founding rate · 3 of 3") marking the flagship tier. A stamp, never a badge or colored border.
- **Buttons** — rectangular, ink fill, orange on hover, scale-down on press (tactile). No pills.
- **Personal signature line** — near the final CTA, attributing the work to Simon by name. Person-over-company is a measured trust driver for this buyer; don't drop it as "extra."

### Motion

Interactive states get real 150–300ms ease transitions. `prefers-reduced-motion` is always respected — tilt, press-scale, and fades collapse to none.

### Don't (each of these was tried or identified and rejected, 2026-08-09)

- Pill buttons; bordered card grids ("a table with borders turned on"); glow orbs / cursor spotlights; colored accent bars on rounded cards; three-equal-card layouts
- Monospace anywhere; dark-mode-by-default on operator surfaces
- Terminal/console framing devices (practitioner tell)
- Cliché copy: "Elevate", "Seamless", "Unleash" + all Prohibitions above

### Persuasion placement map

Where each lever lives on an operator page — placement is part of the system:

| Lever | Placement |
|---|---|
| Person-over-company | Signature line at final CTA; `/about` carries the strongest personal register |
| Risk reversal | "$2,500 audit, credited in full" adjacent to every $6,500 mention — never separated from the big number |
| Anxiety answers | Own-the-account-from-day-one + fixed scope sit next to the price, not in an FAQ graveyard |
| Honest scarcity | Founding seal — 3 slots, real count, never fake urgency |
| Comprehension | Every section passes the Busy Owner Test before any cleverness survives |

Gate-B note: this system re-skins approved scope. The *full* homepage rebuild (new sections, proof/case-study treatment) stays gated on the first paying client.

## Changelog

- 2026-08-09 (c) — Extended to Command Center (internal ops app) as the default lane for all new builds; internal-tool adaptations documented (no rotation, tabular-nums IDs, ink-only status tags).
- 2026-08-09 — Execution Polish patch (radius/transition tokens) superseded by the full Draftsman system; design rules split by lane; amber ruled practitioner-only (AA failure on paper). Sources: Draftsman handoff + trust-criteria research.
- 2026-08-09 — Extracted from brand-summary.md into a lane file so sessions load only the lane they're working on. Content unchanged.
