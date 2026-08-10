# Visual Identity — Operator Lane (Dark Refresh)

> Load this file when working on operator surfaces: homepage (`HomeOperator`), `/setup`, and `/work-with-me` and `/about` (their copy stays practitioner-voiced; visuals only — see the 2026-08-09 scope ruling in `funnel/setup-offer/copy-audit-2026-08-09.md`). Practitioner surfaces use `brand/visual-practitioner.md` instead. Router + shared rules: `brand/brand-summary.md` §Visual Identity.
> Audience/ICP/customer language for this lane: `.claude/product-marketing.md` (canonical) + `brand/audiences/operator.md`.

**Status:** this supersedes the Draftsman/paper system (2026-08-09). Paper was built, PR'd (simonparis-website #106), and rejected on Simon's live preview check 2026-08-10 — see Changelog for the full reasoning. Dark stays canonical for the operator lane. The paper build's structural ideas were not wasted: several were salvaged and re-tokened dark (see "Signature devices" below). Branch `draftsman-rollout` stays un-deleted as a component-structure reference.

**Why dark, still.** Two independent, real defects killed paper, not the color itself: the build read as visually inconsistent (four pages, four independent subagents, no cross-page component-vocabulary check — card/panel treatment drifted section to section) and the brass accent token measured ~4.30:1 on paper, failing WCAG AA at every size it was used. Dark already carries weeks of real iteration paper never had, and the operator ICP's actual objection — confirmed directly by Simon — was never "this is dark," it was "this reads like a developer built it for himself."

**The real rule: no developer-tool tells, not no-dark-mode.** The specific signals that read as "for developers, not for me" to a 2–30 person owner-operator: monospace type standing in for a whole interface's voice, a blinking terminal cursor, traffic-light window-control dots, ASCII/box-drawing directory listings, and looping typing-simulation animations. None of those are inherent to dark mode — they're specific, nameable components. Remove the components, keep the palette.

**Standing law — comprehension beats cleverness.** Unchanged from the paper system: a clever ownable metaphor is worth less than instant comprehension for a first-time, non-technical visitor. Every device below carries an explicit inline label — nothing requires decoding.

### Palette (unchanged — this is still the site's one dark system)

| Token | Hex | Role |
|---|---|---|
| background | `#0F0F0F` | page background |
| background-surface / -elevated / -deep | `#1A1A1A` / `#1F1F1F` / `#0A0A0A` | panels, cards, artifacts |
| text-primary / -secondary / -muted | `#EAEAEA` / `#B4B4B4` / `#777777` | body copy, hierarchy |
| accent (orange) | `#E04500` / hover `#FF5A1A` | the only action color — buttons, one emphasis word per hero, never sprayed |
| accent-link (amber) | `#C97A1A` | links, and — new this refresh — the seal/spec-sheet-number color. Deliberately NOT a new "brass" token: amber is already validated at AA on these dark surfaces, so reusing it closes the exact defect (brass failing AA on paper) that killed the last system instead of re-risking it |
| border | `#333333` | hairlines |

### Radius — new this refresh

A small, restrained **4px** radius (`--radius-card`, down from the short-lived 6px execution-polish patch) on operator-lane surfaces only, via the existing `.op-radius` / `.op-grid` / `.op-radius-t` carve-out of the site's global zero-radius reset. Reasoning, checked against `ui-ux-pro-max`'s style database and the `frontend-design` skill before adopting: zero-radius is specifically tagged brutalist/editorial/avant-garde or developer-tool ("Terminal CLI" — which the database itself pairs with a blinking cursor, i.e. exactly the signal this refresh removes) — nothing ties it to "approachable" or "trustworthy" for a non-technical small-business buyer, and hairline-rules-plus-zero-radius is independently named by `frontend-design` as one of the generic AI-templated defaults to watch for. 4px reads as "a real workspace/document," not soft/pill-shaped SaaS. **Practitioner lane is untouched** — `/score`, `/readiness`, blog, `LegacyHomePractitioner`, `/terms`, `/privacy` keep the sharp zero-radius reset; that audience is more technical and the signal likely works differently for them. Shared chrome (Nav, Footer) is also untouched — it renders on both lanes.

### Type

- **Merriweather** (serif) for display/headlines, *italic for emphasis* — a confident serif is a differentiator against the sea of grotesk AI/SaaS sites. Unchanged.
- **Inter** for body and UI text.
- **Monospace is not banned outright** — Roboto Mono still carries small structural chrome shared across both lanes (nav links, footer, `section-number` "02 / 09" counters, `label-mono` eyebrows) and changing that shared, site-wide CSS layer would bleed into practitioner surfaces this refresh must leave untouched. What's gone is monospace **standing in for a whole component's voice** — a hero eyebrow rendered as a shell prompt, an "ask" line with a blinking cursor, a directory tree rendered as literal `$ tree` output. If a new operator-lane component reaches for monospace as its primary voice rather than a wayfinding label, that's the tell to catch in review.

### Don't (dev-tool tells — dropped 2026-08-10, do not reintroduce on operator surfaces)

- Terminal/console window chrome: traffic-light title-bar dots, `$ command` prompts, shell-style `>` prefixes
- Blinking cursors and looping typing-simulation animations (type → think → reveal loops)
- ASCII/box-drawing directory listings (`├──`, `└──`, literal `tree` output)
- A brand-new low-contrast accent token introduced without checking it against the surfaces it will actually render on (the brass lesson — always verify against the real background, not the design system in isolation)

(Carried forward, unchanged, from the paper system's own don't-list: pill buttons, bordered card grids, glow orbs / cursor spotlights, colored accent bars on rounded cards, three-equal-card layouts, cliché copy — "Elevate", "Seamless", "Unleash".)

**Narrow exception (2026-08-10):** the blanket glow-orb/cursor-spotlight ban above still holds for decorative glows. It does not cover `.op-hero` (`app/globals.css`) — a single, off-center, copy-motivated ambient light (peak opacity 0.08, static, `prefers-reduced-motion`-safe) on the hero/CTA band only, reusing `--accent-link` amber rather than a new color. That device was checked against `frontend-design` specifically to avoid the generic centered-glow default this rule exists to block. Don't cite this line to justify a *centered* glow, a *second* light source on the same page, or glow anywhere outside the hero/CTA band — those are exactly what's still banned.

### Signature devices (salvaged from the closed paper build, re-tokened dark)

Structural ideas from `draftsman-rollout`'s `components/draftsman/*.tsx` (PR #106) carried over — same concepts, same comprehension-first intent, repainted for the dark palette instead of paper's `#F3EEE1`. Shared components: `components/operator/{ResetVsRemembers,PricingSheet,FoundingSeal,SignatureLine}.tsx`.

- **Reset vs. remembers** (`ResetVsRemembers`) — twin physical note cards: one muted/repeated ("Every other tool" — a chat prompt said again and again), one persisted ("This workspace" — Voice / Rates / Clients, retained). `bg-background-elevated`, real dark box-shadow, ±1–2° off-axis rotation, a small torn-tape accent. Replaces literal chat/terminal simulation with a static, labeled artifact.
- **Spec-sheet pricing** (`PricingSheet`) — numbered rows on a dotted leader line (`01  Working Session ······ $125/hr`) instead of a bordered box grid. One shared component used identically on the homepage ladder, `/setup`'s full pricing table, and `/work-with-me`'s progression list.
- **Founding-rate seal** (`FoundingSeal`) — circular ink-stamp SVG, amber stroke/text (not the failed brass token), marking a founding-rate tier. A stamp, never a badge or colored border.
- **Personal signature line** (`SignatureLine`) — a quiet italic line near a page's final CTA, attributing the work to Simon by name. Person-over-company is a measured trust driver for this buyer (`docs/research/operator-trust-criteria-independent-2026-08-09.md`) — don't drop it as "extra." Placed *after* the primary CTA, not competing with it for visual anchor.
- **Honest "no client logos yet" proof framing** — unchanged, already correct on the homepage's "Proof, honestly" section. Nothing to redo here.
- **Hero artifact** (`SetupHeroWindow`, shared by home + `/setup`) — kept the underlying idea (a plain-language ask producing a ready invoice proves the workspace knows the business) but dropped every terminal-chrome element: static card, off-axis tilt, real shadow, a small tape accent instead of a title bar, no animation.

### Persuasion placement map (unchanged from the paper system, still holds)

| Lever | Placement |
|---|---|
| Person-over-company | Signature line at final CTA; `/about` carries the strongest personal register |
| Risk reversal | "$2,500 audit, credited in full" adjacent to every $6,500 mention — never separated from the big number |
| Anxiety answers | Own-the-account-from-day-one + fixed scope sit next to the price, not in an FAQ graveyard |
| Honest scarcity | Founding seal — real slot counts, never fake urgency |
| Comprehension | Every section passes the Busy Owner Test before any cleverness survives |

Gate-B note: unchanged. This system re-skins approved scope. The *full* homepage rebuild (new sections, proof/case-study treatment) stays gated on the first paying client.

## Changelog

- **2026-08-10 (b) — Card rotation dropped again + hero/CTA ambient light.** `ResetVsRemembers`'s whole-card rotation (carried over from paper into the dark salvage) removed — cards render level; tape/seal decorative rotations untouched. New `.op-hero` device: navy background (`#0a0e16`) + navy-tinted grid + one static, off-center, copy-motivated amber ambient light on the hero/CTA band of each operator page, peak 0.08 opacity. Added the narrow glow-orb exception above for this specific device. `--bg-primary`/`.bg-blueprint` untouched — practitioner surfaces unaffected. Same PR #107, commit `309bfa8`. Full detail: `docs/handoffs/2026-08-10-dark-refresh.md`.
- **2026-08-10 — Dark refresh** (supersedes Draftsman/paper). Paper tried 2026-08-09 (PR #106), rejected on Simon's live preview check 2026-08-10: cross-page visual inconsistency (4 pages, 4 independent subagents, no shared component vocabulary) and the brass token failing WCAG AA (~4.30:1) at every size used. Root cause of the original impulse to leave dark — practitioner/dev-tool tells (monospace-as-voice, blinking cursor, terminal window chrome, ASCII directory trees) — addressed directly instead: dropped those specific components, kept dark, salvaged paper's structural devices re-tokened for the dark palette (amber in place of brass), added a restrained 4px operator-lane radius token (checked against `ui-ux-pro-max` + `frontend-design`, zero-radius ties to brutalist/dev-tool categories, not this ICP), reviewed against `cro` + `marketing-psychology` for CTA hierarchy and trust-signal placement before shipping. `draftsman-rollout` branch left un-deleted as a component-structure reference.
- 2026-08-09 (b) — Visual identity split into lane files (`visual-operator.md`, `visual-practitioner.md`) with a router, so sessions load one lane, not both (Simon's modular-loading rule).
- 2026-08-09 (a) — Execution Polish patch superseded by the full Draftsman system; design rules split by lane; amber ruled practitioner-only (AA failure on paper). *Superseded 2026-08-10 — amber is back in the operator lane, on dark surfaces where it clears AA; it was only ever unsafe on paper.*
