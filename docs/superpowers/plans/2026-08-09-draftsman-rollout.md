# Draftsman Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the approved "Draftsman" visual system (warm drafting-paper, ink, brass; physical-artifact components) to simonparis.ca's operator pages — `/` (HomeOperator), `/setup`, `/work-with-me`, `/about` — in both locales, with brand-summary v-next as the documented standard and copy corrected against the real offer ladder.

**Architecture:** Tailwind v4 (`@theme` tokens in `app/globals.css`, no config file). Draftsman ships as (a) new token names in `@theme` (utilities like `bg-paper`/`text-ink` that practitioner pages simply never use), (b) a `.theme-draftsman` wrapper class on each operator page root carrying base background/text/selection/motion rules, and (c) a carve-out of the global `border-radius: 0 !important` reset so it no longer applies inside the wrapper. Nav/Footer are shared components rendered in `app/[locale]/layout.tsx`; they restyle via `body:has(.theme-draftsman)` CSS scoping, no prop threading. Shared physical-artifact primitives live in `components/draftsman/`.

**Tech Stack:** Next.js App Router, next-intl (en/fr in `messages/*/`), Tailwind v4 via PostCSS, existing fonts already wired (`--font-merriweather`, `--font-inter`, `--font-roboto-mono`).

## Global Constraints

- **Repos:** Tasks 0–2 edit the MetaArchitect worktree (this branch). Tasks 3–15 edit `simonparis-website` — **in a git worktree, never the primary checkout** (`~/projects/MetaArchitect/projects/simonparis-website` stays on master).
- **Palette (exact):** paper `#F3EEE1`, deep panel `#EAE3D0`, ink `#1C1712`, soft `#5B5346`, faint `#948C7A`, brass `#8C6A2F`, orange `#E04500`.
- **Orange budget:** exactly two uses per page — button hover/press state, and one full-bleed dark closing panel. Nowhere else.
- **Type:** Merriweather display (italic for emphasis words), Inter body. **No monospace anywhere inside `.theme-draftsman`** — `label-mono`/`font-mono` classes must not appear in operator page/component code after rollout.
- **Forbidden patterns:** pill buttons (`rounded-full` on buttons), bordered card grids, glow orbs, colored accent bars on cards, three-equal-card layouts, hype words (brand-summary prohibitions), tool language (agents/LLM/prompt/context window/MCP/orchestration) on operator surfaces.
- **Contrast rules:** `#948C7A` (faint) is decorative/metadata only, never essential text. Brass `#8C6A2F` on paper is labels ≥14px only. Body text is ink or soft.
- **Every operator page keeps the practitioner door strip** (Score my stack · Blog · Work with me pattern — HomeOperator.tsx:299 is the reference), deliberately plainer than the rest of the page.
- **Locales:** every changed string changes in `messages/en/<ns>.json` AND `messages/fr/<ns>.json`. French follows Simon's Québécois register (match existing fr files' tone).
- **Evidence discipline:** 0 paying clients — no new testimonial/proof/number claims anywhere. Copy replacements come only from `funnel/setup-offer/copy-audit-2026-08-09.md` (Task 2 output) or verbatim from `.claude/product-marketing.md` v2.
- **Motion:** interactive transitions 150–300ms ease; every animation/transition wrapped in or clamped by `prefers-reduced-motion: reduce`.
- **Git:** push via `gh`-wired HTTPS (`git push origin <branch>`), never force-push; guard hooks are live — if one blocks, stop and surface to Simon.
- **Deploy gate:** the website PR merges only after Simon's live check of the Vercel preview. Report as "pending Simon's live check".
- **Practitioner surfaces are untouched:** `LegacyHomePractitioner.tsx`, `/score`, `/readiness`, `/blog/**` (visuals), `/terms`, `/privacy`, teardowns. `git diff --stat` at PR time must show no edits to these beyond the shared files this plan names (globals.css, Nav, Footer).

---

### Task 0: Marketing-skills plugin priming check

**Files:**
- Read: `~/.claude/plugins/marketplaces/marketingskills/` (clone), `.claude/skills/` symlinks (MetaArchitect root), `~/projects/MetaArchitect/marketing/` seat
- Possibly modify: symlinks only if broken

**Interfaces:** Produces: a short PASS/FAIL note per check, appended to the PR description of this branch (no separate doc).

- [ ] **Step 1: Marketplace freshness.** Run `cd ~/.claude/plugins/marketplaces/marketingskills && git fetch origin && git log HEAD..origin/HEAD --oneline`. If commits exist, run `claude plugin marketplace update marketingskills` (or `git pull --ff-only` if the CLI is unavailable) and note new/changed skills.
- [ ] **Step 2: Skill count + context-doc priming.** Run `ls ~/.claude/plugins/marketplaces/marketingskills/skills | wc -l` (expect 49) and `grep -rl "product-marketing.md" ~/.claude/plugins/marketplaces/marketingskills/skills | wc -l`. Confirm the read-first instruction still references `.claude/product-marketing.md`; if the mechanism changed upstream, record what changed — do not restructure anything without Simon.
- [ ] **Step 3: Symlink integrity.** Run `ls -l ~/projects/MetaArchitect/.claude/skills/ | grep '\->'` — the 5 resident skills (marketing-psychology, cro, copywriting, offers, customer-research) must resolve (`test -e` each target). Fix a broken link by re-pointing to the marketplace path; anything more, surface it.
- [ ] **Step 4: Record results** in the working notes for the PR body. No commit (nothing in-repo should change unless a symlink was repaired; if one was, commit just that with message `fix: repair marketing-skill symlink`).

### Task 1: `brand/brand-summary.md` v-next — Operator Lane / Draftsman System

**Files:**
- Modify: `brand/brand-summary.md` (MetaArchitect worktree) — the `### Non-Negotiable Design Rules (both lanes)` and `### Audience Variant — Execution Polish (added 2026-08-09)` blocks (currently ~lines 223–249) and the "Shared and audience-neutral" bullet near the top
- Read first: `docs/handoffs/2026-08-09-operator-visual-rollout-draftsman.md` (§"The approved system, concretely"), `docs/research/operator-trust-criteria-independent-2026-08-09.md`, `.claude/product-marketing.md`

**Interfaces:** Produces: the operator visual system doc — since split (2026-08-09, Simon's modular-loading rule) to **`brand/visual-operator.md`**, with `brand/visual-practitioner.md` as the dark-lane counterpart and brand-summary §"Visual Identity — Lane-Routed" as the router. Tasks 4–11 cite `brand/visual-operator.md` as the design authority.

- [ ] **Step 1: Replace the Execution Polish patch.** Delete the `### Audience Variant — Execution Polish` section and the `--radius-card`/`--transition-standard` css block inside it. In its place write `## Operator Lane — Draftsman System (2026-08-09)` containing, in order:
  1. *Why this register* — 3–4 sentences: operator buyer trusts a person and a craft studio, not a tech product (cite the research doc path); brutalism validated only for the practitioner lane; comprehension-over-cleverness rule (floor-plan metaphor rejection) stated as a standing law: **a first-time non-technical visitor must decode nothing**.
  2. *Palette table* — the seven hex values from Global Constraints with role and usage-limit columns (orange's two-uses rule; faint = decorative only; brass = labels ≥14px).
  3. *Type* — Merriweather display + italic emphasis, Inter body, "no monospace on operator surfaces" as a hard rule with the reason (mono = practitioner tell).
  4. *Component patterns* — one short spec paragraph each: note card (background-differentiated, real box-shadow, 1–2° rotation, torn-tape pin), spec-sheet pricing (lifted sheet, ~0.4° tilt, pin-dot, `01  Item ······ $X` leader-dot rows, no ruled borders), ink-stamp founding seal (circular, stamped not badged), rectangular buttons (ink fill → orange hover → scale-down press), personal signature line near final CTA (person-over-company, cite research).
  5. *Motion* — 150–300ms ease on interactive states; `prefers-reduced-motion` respected always.
  6. *Don't list* — pill buttons, bordered card grids, glow orbs, colored accent bars on cards, three-equal-card layouts, monospace, dark-mode assumption on operator surfaces. One line each with "rejected in session 2026-08-09" where true.
  7. *Persuasion placement map* — where each psychological lever lives: signature line (person-over-company), audit-credit near every price mention (risk reversal), own-the-account + fixed-scope adjacent to the $6,500 figure (anxiety answers), founding seal (honest scarcity: 3 slots, real). Note: ICP + customer language canonical in `.claude/product-marketing.md` — link, don't restate.
- [ ] **Step 2: Fix the both-lanes rules block.** `### Non-Negotiable Design Rules (both lanes)` currently says "Always dark mode" — restate as: rule 1 splits by lane (practitioner: always dark; operator: Draftsman paper system per section below); rules for orange/amber stay both-lanes; the "structural dividers 0px both lanes" rule moves under practitioner-only (Draftsman governs its own dividers). Update the top-of-doc "Shared and audience-neutral" bullet to match.
- [ ] **Step 3: Version bump + changelog** one-liner per the doc's existing convention (newest first): what changed, why, source pointers (handoff + research doc).
- [ ] **Step 4: Self-check** — grep the new section for hype words (`grep -iE "elevate|seamless|unleash|game-chang|excited"` = no hits); confirm practitioner sections byte-identical (`git diff` shows changes only in the blocks named above).
- [ ] **Step 5: Commit** `git add brand/brand-summary.md && git commit -m "brand: Operator Lane — Draftsman System (v-next)"`.

### Task 2: Copy audit — operator surfaces vs product-marketing v2

**Files:**
- Create: `funnel/setup-offer/copy-audit-2026-08-09.md` (MetaArchitect worktree)
- Read: `messages/en/{homeOperator,setup,audit,about,nav,footer,offerCards,optInForm,stateGrid,failureTrace,blog}.json` and the same in `messages/fr/` (website repo, read-only from the primary checkout is fine — no writes there); the four page/component files; `.claude/product-marketing.md`; `brand/brand-summary.md` (post-Task-1)

**Interfaces:** Produces: per-page fix lists that Tasks 8–11 and 13 consume. **Format contract (the discriminator rule):** each finding is
`- [namespace.key] ("en"|"fr") — CURRENT: "<verbatim current string>" → REPLACE: "<verbatim new string>" — WHY: <one line, cite the product-marketing section or brand rule>`
grouped under headings `## /setup`, `## Homepage`, `## /work-with-me`, `## /about`, `## Blog (copy-only)`, `## Nav+Footer (shared)`. Findings with no replacement needed are omitted — the doc lists only actionable fixes.

- [ ] **Step 1: Offer-ladder sweep.** For every price, timeframe, or promise in the message files, check against product-marketing's ladder table (Demo free warm-intro-only/never advertised; Sessions $125/hr; Audit $2,500 credited; Setup $6,500, founding 3×$5,000, ~30 days, fixed scope; Retainer ~$600/mo post-setup only). Hunt specifically for the known bug class: an outcome promised on the wrong rung's timeframe ("leave with a working setup" attached to a 2-hour context). Also check `lib/pricing.ts` values match the ladder.
- [ ] **Step 2: Language sweeps.** (a) Tool language: `grep -inE "agent|LLM|prompt|context window|orchestrat|MCP|state manage" messages/en/{homeOperator,setup,audit,about,nav,footer,offerCards,optInForm}.json` and same for fr — every hit on an operator surface gets a fix using the customer-language bank. (b) Hype words per brand prohibitions. (c) Busy Owner Test: read each hero + section heading as the invoice-Sunday owner; flag anything abstract ("workflows optimized") for replacement with verbatim-bank language ("admin stops eating your evenings").
- [ ] **Step 3: fr parity pass.** For every en fix, write the fr counterpart in the same entry (or a paired entry). Flag any string that exists in en but is missing/stale in fr.
- [ ] **Step 4: Blog copy-only findings** — scan `messages/en/blog.json` + blog page metadata for ladder contradictions and operator-surface tool language leaks (blog chrome copy only; post bodies are out of scope).
- [ ] **Step 5: Commit** the audit doc: `git commit -m "funnel: operator copy audit vs product-marketing v2 (fix list for Draftsman rollout)"`.

### Task 3: Website worktree setup

**Files:** none in-repo (infrastructure step)

- [ ] **Step 1:** `cd ~/projects/MetaArchitect/projects/simonparis-website && git fetch origin && git worktree add ../simonparis-website-draftsman -b draftsman-rollout origin/master`
- [ ] **Step 2:** `cd ../simonparis-website-draftsman && npm install` (worktrees don't share node_modules) and verify baseline: `npm run build` passes before any change. Record the pass.

*(All Tasks 4–14 run inside `~/projects/MetaArchitect/projects/simonparis-website-draftsman`.)*

### Task 4: Reference mockup rebuild

**Files:**
- Create: `design/draftsman-reference.html` (website worktree — self-contained single file, committed for the record; not routed, not shipped: `design/` is outside `app/`)

**Interfaces:** Produces: the visual reference every page task screenshots against. Single static HTML, inline CSS, Google-Fonts link for Merriweather+Inter, no JS beyond a reduced-motion-safe hover demo.

- [ ] **Step 1: Build the page** from the handoff's authoritative description (§"The approved system, concretely" — the claude.ai artifact is unreachable). It is a full `/setup`-shaped page containing every signature device: hero (Merriweather display, italic emphasis word, paper bg); the *reset vs. remembers* twin note cards (rotated ±1–2°, box-shadow `0 8px 24px rgba(28,23,18,0.12)`, torn-tape pseudo-element, left card: greyed repeated "Hi, I run a coaching business, and—" chat; right card: Voice / Rates / Clients rows persisted); the spec-sheet rate card (`0.4deg` tilt, pin-dot, rows `01  Working Session ·········· $125/hr` with `border-bottom: none`, leader dots via a dotted-flex spacer, tiers per the ladder); the founding seal (circular SVG stamp "FOUNDING RATE · 3 OF 3" around the rim, brass stroke, slight rotation); rectangular buttons (ink `#1C1712` fill, white text, hover `#E04500`, `:active { transform: scale(0.97) }`); a quiet practitioner-door strip; the single full-bleed dark closing panel (ink background, orange spent here) with the personal signature line ("— Simon Paris" + one quiet sentence) and the honest multi-entry CTA ("One call. No pitch — just a plan for where you actually are — session, audit, or the full setup.").
- [ ] **Step 2: Verify in browser** — serve with `npx serve design` or open file://, screenshot at 1440px and 390px widths. Check against the don't-list (no pills, no bordered grids, no accent bars) and the orange budget (exactly: button hover + dark panel).
- [ ] **Step 3: Commit** `git add design/draftsman-reference.html && git commit -m "design: Draftsman reference mockup (rebuilt from approved-direction handoff)"`.

### Task 5: Theme layer in `app/globals.css`

**Files:**
- Modify: `app/globals.css` — `@theme` block (~lines 3–72) and the `@layer utilities` brand-variables block (~lines 237–310)

**Interfaces:** Produces (used by every later task): Tailwind utilities `bg-paper`, `bg-paper-deep`, `text-ink`, `text-ink-soft`, `text-ink-faint`, `text-brass`, `border-ink/10` (via color), `font-serif`/`font-sans` (existing); scope class `theme-draftsman`; CSS vars `--shadow-sheet`, `--transition-draftsman`. The global radius reset no longer applies inside `.theme-draftsman`.

- [ ] **Step 1: Add tokens to `@theme`** (inside the existing block):

```css
  /* ─── Draftsman (operator lane) ─── */
  --color-paper: #f3eee1;
  --color-paper-deep: #eae3d0;
  --color-ink: #1c1712;
  --color-ink-soft: #5b5346;
  --color-ink-faint: #948c7a;
  --color-brass: #8c6a2f;
```

- [ ] **Step 2: Carve the radius reset.** Replace the universal reset selector (currently `*, *::before, *::after { box-sizing: border-box; border-radius: 0 !important; }`) with:

```css
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  :where(body :not(.theme-draftsman, .theme-draftsman *)),
  :where(body :not(.theme-draftsman, .theme-draftsman *))::before,
  :where(body :not(.theme-draftsman, .theme-draftsman *))::after {
    border-radius: 0 !important; /* practitioner lane: zero-radius stays enforced */
  }
```

(`:where()` keeps specificity at zero so existing practitioner overrides like `.op-radius` still behave until Task 12 removes them.)

- [ ] **Step 3: Add the scope block** (same `@layer utilities`, after the `.op-*` rules):

```css
  /* ─── Draftsman scope (operator pages) ─── */
  .theme-draftsman {
    --shadow-sheet: 0 8px 24px rgba(28, 23, 18, 0.12);
    --transition-draftsman: 200ms ease;
    background-color: var(--color-paper);
    color: var(--color-ink);
  }
  .theme-draftsman ::selection {
    background: var(--color-ink);
    color: var(--color-paper);
  }
  body:has(.theme-draftsman) nav.site-nav {
    background-color: var(--color-paper);
    border-color: rgba(28, 23, 18, 0.12);
  }
  body:has(.theme-draftsman) footer.site-footer {
    background-color: var(--color-paper-deep);
    color: var(--color-ink-soft);
    border-color: rgba(28, 23, 18, 0.12);
  }
  @media (prefers-reduced-motion: reduce) {
    .theme-draftsman *,
    .theme-draftsman *::before,
    .theme-draftsman *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
    }
  }
```

(Nav/Footer class hooks `site-nav`/`site-footer` are added in Task 7; harmless until then.)

- [ ] **Step 4: Verify no practitioner drift.** `npm run build`, then `npm run start -- -p 3001` and screenshot `/score` and `/blog` — pixel-identical to master (no `.theme-draftsman` exists in the DOM yet, and the `:where()` rewrite must not change practitioner rendering). Compare against screenshots taken from master build if in doubt.
- [ ] **Step 5: Commit** `git commit -m "feat(theme): Draftsman tokens + scoped theme layer, radius reset carve-out"`.

### Task 6: Draftsman primitives in `components/draftsman/`

**Files:**
- Create: `components/draftsman/DraftsmanButton.tsx`, `components/draftsman/NoteCard.tsx`, `components/draftsman/SpecSheet.tsx`, `components/draftsman/InkSeal.tsx`

**Interfaces:** Produces (exact signatures consumed by Tasks 8–11):

```tsx
DraftsmanButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "quiet" })
NoteCard({ tilt = 1, children, className = "" }: { tilt?: number; children: React.ReactNode; className?: string })
SpecSheet({ rows, footnote }: { rows: { num: string; label: string; price: string; detail?: string; sealed?: boolean }[]; footnote?: string })
InkSeal({ label, count }: { label: string; count: string })  // e.g. label="Founding rate", count="3 of 3"
```

- [ ] **Step 1: DraftsmanButton** — server component, `Link` from `@/i18n/navigation`:

```tsx
import { Link } from "@/i18n/navigation";

export default function DraftsmanButton({ href, children, variant = "primary" }: {
  href: string; children: React.ReactNode; variant?: "primary" | "quiet";
}) {
  const base =
    "inline-block px-7 py-4 font-sans text-[15px] font-medium no-underline " +
    "transition-[background-color,transform] duration-200 ease-out active:scale-[0.97] " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  const variants = {
    primary: "bg-ink text-paper hover:bg-accent",
    quiet: "bg-transparent text-ink border border-ink/25 hover:border-ink",
  };
  return <Link href={href} className={`${base} ${variants[variant]}`}>{children}</Link>;
}
```

- [ ] **Step 2: NoteCard** — rotated sheet with tape pseudo-accent (tape as a real `<span>` so no pseudo-element class gymnastics):

```tsx
export default function NoteCard({ tilt = 1, children, className = "" }: {
  tilt?: number; children: React.ReactNode; className?: string;
}) {
  return (
    <div
      className={`relative bg-paper-deep p-6 md:p-8 shadow-[var(--shadow-sheet)] ${className}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span
        aria-hidden
        className="absolute -top-3 left-1/2 -translate-x-1/2 h-6 w-16 bg-paper/70 border border-ink/10 rotate-[-2deg]"
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: SpecSheet** — the rate card; leader dots via flex spacer with dotted border:

```tsx
import InkSeal from "./InkSeal";

export default function SpecSheet({ rows, footnote }: {
  rows: { num: string; label: string; price: string; detail?: string; sealed?: boolean }[];
  footnote?: string;
}) {
  return (
    <div className="relative bg-paper-deep p-8 md:p-10 shadow-[var(--shadow-sheet)] rotate-[0.4deg]">
      <span aria-hidden className="absolute top-4 left-4 h-2 w-2 rounded-full bg-ink/30" />
      <ul className="list-none m-0 p-0">
        {rows.map((r) => (
          <li key={r.num} className="py-5">
            <div className="flex items-baseline gap-3">
              <span className="text-brass text-sm font-medium tabular-nums">{r.num}</span>
              <span className="font-serif text-lg text-ink">{r.label}</span>
              <span aria-hidden className="flex-1 border-b border-dotted border-ink/30 translate-y-[-4px]" />
              <span className="font-serif text-lg text-ink whitespace-nowrap">{r.price}</span>
              {r.sealed && <InkSeal label="Founding rate" count="3 of 3" />}
            </div>
            {r.detail && <p className="mt-1 ml-8 text-[15px] leading-relaxed text-ink-soft">{r.detail}</p>}
          </li>
        ))}
      </ul>
      {footnote && <p className="mt-6 text-sm text-ink-soft">{footnote}</p>}
    </div>
  );
}
```

(Note: `rounded-full` on the pin-dot span is fine — the don't-list bans pill *buttons*, not a 2px dot. The radius carve-out from Task 5 makes it render.)

- [ ] **Step 4: InkSeal** — circular stamp, pure SVG, brass ink, slight rotation:

```tsx
export default function InkSeal({ label, count }: { label: string; count: string }) {
  const text = `${label} · ${count} · `.toUpperCase();
  return (
    <svg viewBox="0 0 96 96" className="h-20 w-20 shrink-0 rotate-[-8deg] opacity-90" role="img"
      aria-label={`${label}: ${count}`}>
      <circle cx="48" cy="48" r="45" fill="none" stroke="#8C6A2F" strokeWidth="1.5" />
      <circle cx="48" cy="48" r="30" fill="none" stroke="#8C6A2F" strokeWidth="1" />
      <defs><path id="seal-rim" d="M 48,48 m -37,0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" /></defs>
      <text fill="#8C6A2F" fontSize="8.5" letterSpacing="1.5" fontFamily="var(--font-inter)">
        <textPath href="#seal-rim">{text.repeat(2)}</textPath>
      </text>
      <text x="48" y="52" textAnchor="middle" fill="#8C6A2F" fontSize="11" fontFamily="var(--font-merriweather)" fontStyle="italic">{count}</text>
    </svg>
  );
}
```

- [ ] **Step 5: Verify** — `npm run lint && npm run build` pass (components compile even though unrouted). Commit `git commit -m "feat(draftsman): physical-artifact primitives (button, note card, spec sheet, ink seal)"`.

### Task 7: Theme-aware Nav and Footer

**Files:**
- Modify: `components/Nav.tsx` (111 lines), `components/Footer.tsx` (104 lines)

**Interfaces:** Consumes the `body:has(.theme-draftsman)` CSS from Task 5. Produces: `nav.site-nav` / `footer.site-footer` class hooks; inside Draftsman scope both render paper-toned (dark text on paper) without any JS/prop changes.

- [ ] **Step 1:** Add `site-nav` to the root `<nav>` className and `site-footer` to the root `<footer>` className.
- [ ] **Step 1b: Lane-aware "Work With Me" item (Simon-approved 2026-08-09).** In `Nav.tsx`, the "Work With Me" item must point to `/setup` when the current route is an operator page (`/` and `/setup`), and to `/work-with-me` everywhere else. Use `usePathname` from `@/i18n/navigation` (locale-stripped) and derive: `const isOperatorPage = pathname === "/" || pathname.startsWith("/setup"); const workHref = isOperatorPage ? "/setup" : "/work-with-me";` — label unchanged in both locales.
- [ ] **Step 2:** Audit both components for hardcoded dark-only utility classes that `body:has()` background overrides can't fix (e.g. `text-text-primary` resolves to near-white — illegible on paper). For each such class, move the color to a CSS rule pair in `globals.css` under the existing pattern: default (dark) value outside, paper value under `body:has(.theme-draftsman)`. Keep the JSX class-name churn minimal — prefer 3–4 semantic hooks (`site-nav-link`, `site-nav-brand`) over rewriting every className string.
- [ ] **Step 3: Verify both worlds.** `npm run build && npm run start -- -p 3001`; screenshot Nav+Footer on `/score` (dark, unchanged vs master) — no operator page uses the wrapper yet, so also temporarily add `theme-draftsman` to a scratch page or check via DevTools class toggle that the paper variant renders legibly. Commit `git commit -m "feat(draftsman): theme-aware nav/footer via :has() scoping"`.

### Task 8: `/setup` page rollout

**Files:**
- Modify: `app/[locale]/setup/page.tsx` (617 lines), `components/SetupHeroWindow.tsx`, `components/FAQ.tsx`, `components/SetupSignupForm.tsx`, `messages/en/setup.json`, `messages/fr/setup.json`. (Verified 2026-08-09: `StateGrid`/`FailureTrace`/`OfferCards` are imported ONLY by `LegacyHomePractitioner.tsx` — the original handoff's component list was stale. Do not touch them.)
- Read: `design/draftsman-reference.html`, `brand/visual-operator.md`, `funnel/setup-offer/copy-audit-2026-08-09.md` §/setup

**Interfaces:** Consumes Task 6 primitives (exact signatures above). Produces: the first shipped Draftsman page — subsequent page tasks match its rendered idiom, not just the reference file.

- [ ] **Step 1: Wrap and re-skin.** Add `theme-draftsman` to the page's root element. Convert section by section (current map — hero:116, gap:180, Cowork vignette:204, workspace signature:254, steps:314, pricing:348, proof:463, FAQ:488, dark CTA:512): paper background, Merriweather headings with one italic emphasis word each, Inter body in ink/soft, brass for eyebrow labels (replacing `label-mono` — **remove every mono class**), section dividers as subtle `border-ink/10`.
- [ ] **Step 2: Deploy the signature devices.** Hero or gap section: the *reset vs. remembers* twin `NoteCard`s (this replaces `SetupHeroWindow`'s terminal-window framing — a terminal is a practitioner tell; rebuild that component's content as the chat-that-resets card pair per the reference). Pricing section: replace the current grid with `SpecSheet` (rows: `01 Working Session — $125/hr`, `02 Audit + Roadmap — $2,500` detail "credited in full to a Setup", `03 Business OS Setup — $6,500` `sealed: true` detail per audit doc, `04 Retainer — from $600/mo` detail "after setup only"). `StateGrid`/`FailureTrace`: re-skin to paper tokens; if either reads as tool-language-y after re-skin (grep finding from Task 2), apply the audit doc's replacement copy. Final CTA: full-bleed ink panel (the page's only orange besides button hover), `DraftsmanButton`, personal signature line, honest multi-entry copy from the audit doc.
- [ ] **Step 3: Copy fixes.** Apply every `## /setup` entry from the audit doc to both `messages/en/*` and `messages/fr/*` — verbatim replacements, no improvisation.
- [ ] **Step 4: Keep the practitioner door** — quiet strip above the footer (plain text links: Score my stack · Blog · Work with me), styled plainer than everything around it.
- [ ] **Step 5: Verify.** `npm run lint && npm run build`; `npm run start -- -p 3001`; screenshot `/setup` and `/fr/setup` at 1440/768/390px; compare against `design/draftsman-reference.html`; run the checklist: orange budget (2), zero mono classes (`grep -n "font-mono\|label-mono" app/[locale]/setup/page.tsx components/Setup* components/StateGrid.tsx components/FailureTrace.tsx components/FAQ.tsx` = no hits), don't-list clean, keyboard-tab through CTAs shows focus rings, reduced-motion (DevTools emulation) kills tilt/press animations.
- [ ] **Step 6: Commit** `git commit -m "feat(setup): Draftsman system rollout + audited copy (en/fr)"`.

### Task 9: Homepage (`HomeOperator`) rollout

**Files:**
- Modify: `components/home/HomeOperator.tsx` (380 lines), `messages/en/homeOperator.json`, `messages/fr/homeOperator.json`
- Read: audit doc §Homepage; `/setup` as rendered idiom

**Interfaces:** Consumes Task 6 primitives. Do NOT touch `components/home/LegacyHomePractitioner.tsx` or `app/[locale]/page.tsx` routing.

- [ ] **Step 1: Wrap and re-skin** all sections (hero:83 "tuesday 9:14pm", pain:148, proof:194, ladder:247, practitioner band:299, CTA:338) to the Draftsman idiom per Task 8's pattern: paper, serif display + italic emphasis, brass eyebrows replacing `section-number` mono labels, no mono anywhere.
- [ ] **Step 2: Devices.** Pain or hero section gets the twin NoteCards if the section's content maps naturally (the "Tuesday 9:14pm" conceit maps to the chat-that-resets card); ladder section: compact `SpecSheet` (the four rungs, one line each — depth stays on /setup); CTA section: ink panel + orange + signature line. Practitioner band at :299 stays the deliberately-plain door (restyle to quiet paper, don't redesign).
- [ ] **Step 3: Copy fixes** from audit doc §Homepage, en + fr.
- [ ] **Step 4: Verify** — same checklist as Task 8 Step 5, for `/` and `/fr`; additionally confirm `/score` and `/blog` still render dark-identical (shared-file regression check).
- [ ] **Step 5: Commit** `git commit -m "feat(home): Draftsman rollout on HomeOperator + audited copy (en/fr)"`.

### Task 10: `/work-with-me` rollout

**Files:**
- Modify: `app/[locale]/work-with-me/page.tsx` (288 lines), `messages/en/audit.json`, `messages/fr/audit.json`
- Read: audit doc §/work-with-me

**Interfaces:** Consumes Task 6 primitives.

**Scope correction (Simon-approved 2026-08-09):** this page is a PRACTITIONER page (AI Readiness Diagnostic / Production Audit / Team Training / Fractional ladder — see `funnel/setup-offer/copy-audit-2026-08-09.md` headline finding). It gets the Draftsman **visual system only**; its copy stays practitioner-voiced as written — the operator tool-language rules do NOT apply here, and the no-mono rule is relaxed to "mono only where it serves the technical register" (prefer removing it anyway for visual coherence). Simon's rationale: the whole public face goes Draftsman; the practitioner lane stays open underneath until social proof justifies more.

- [ ] **Step 1: Wrap and re-skin** (hero:106, diagnostic:125 with guarantee/founding block:164, what-you-keep:208, progression:251). The diagnostic tier presentation is the natural `SpecSheet` + `InkSeal` home (founding count here is **5 slots** — pass `count="5 of 5"`, don't copy /setup's 3); progression section: leader-dot rows, not boxes.
- [ ] **Step 2: No copy changes.** The audit found zero fixes for this page (its enterprise framing is correct for its audience). Do not "operatorize" any string.
- [ ] **Step 3: Verify** (Task 8 Step 5 checklist minus the no-mono grep, both locales) and commit `git commit -m "feat(work-with-me): Draftsman visual system (copy unchanged, practitioner register)"`.

### Task 11: `/about` rollout

**Files:**
- Modify: `app/[locale]/about/page.tsx` (284 lines), `messages/en/about.json`, `messages/fr/about.json`
- Read: audit doc §/about

**Interfaces:** Consumes Task 6 primitives.

**Scope correction (Simon-approved 2026-08-09):** currently a PRACTITIONER identity page (STATE pillars, LLM copy, CTAs to /score — see audit doc headline finding). Same rule as Task 10: Draftsman **visual system only**, copy unchanged — no operatorizing, no tool-language edits, mono-grep relaxed. An operator-first /about rewrite is a separate, later decision (post-social-proof).

- [ ] **Step 1: Wrap and re-skin** (hero + photo:72 — replace the "orange corner accent" on the photo (:105) with a paper-frame treatment: the photo as a physical print, slight tilt, shadow, tape; thesis:117; remaining sections to idiom). End with the personal signature line — it fits the page's register regardless of lane.
- [ ] **Step 2: No copy changes** (audit: zero findings under its own lane's rules).
- [ ] **Step 3: Verify** (standard checklist minus no-mono grep, both locales) and commit `git commit -m "feat(about): Draftsman visual system (copy unchanged, practitioner register)"`.

### Task 12: Remove superseded `.op-*` layer

**Files:**
- Modify: `app/globals.css` (the `.op-radius`/`.op-grid`/`.op-transition`/`.op-radius-t` block and the `--radius-card`/`--transition-standard` vars), any remaining `.op-` references

- [ ] **Step 1:** `grep -rn "op-radius\|op-grid\|op-transition" app components` — expect zero hits after Tasks 8–9 rebuilt HomeOperator/SetupHeroWindow; if any remain, replace with Draftsman idiom first.
- [ ] **Step 2:** Delete the `.op-*` rules and the two vars; `npm run build`; screenshot `/` `/setup` `/score` — unchanged.
- [ ] **Step 3: Commit** `git commit -m "chore: remove superseded .op-* execution-polish layer"`.

### Task 13: Blog copy-only fixes

**Files:**
- Modify: `messages/en/blog.json`, `messages/fr/blog.json` (and only these — zero visual/component changes)

- [ ] **Step 1:** Apply audit doc §Blog entries verbatim, both locales. If the audit found nothing, record "no findings" and skip the commit.
- [ ] **Step 2:** `npm run build`; screenshot `/blog` — dark system untouched, only strings changed. Commit `git commit -m "fix(blog): copy corrections from operator copy audit (en/fr)"`.

### Task 14: QA pass

**Files:**
- Create: `design/qa-2026-08-XX.md` (website worktree — findings log; XX = actual date at execution)

- [ ] **Step 1: Taste checklist.** WebFetch `https://github.com/Leonxlnx/taste-skill` (raw README/checklist), run every check against the four rendered pages: generic three-equal-card layouts, AI-fingerprint gradients, bordered/table components, cliché copy words ("Elevate", "Seamless", "Unleash"), missing interactive/focus states. Log per-page PASS/FAIL.
- [ ] **Step 2: Contrast.** Run this against every text-color/background pair in use (script inline with `node -e`): ink/paper, soft/paper, brass/paper, ink/paper-deep, soft/paper-deep, paper/ink (CTA panel). Formula: WCAG relative luminance ratio; require ≥4.5:1 for body text, ≥3:1 for ≥18.66px-bold headings and labels. Known expectation: faint `#948C7A` on paper fails body-text AA (~2.9:1) — verify it appears only in decorative/aria-hidden roles; brass passes only as large/label text — verify usage.
- [ ] **Step 3: Interaction audit.** Keyboard-tab every page: visible focus on every link/button/summary. DevTools reduced-motion emulation: no tilt/scale/fade animation runs. 390px viewport: note cards stack, spec sheet rows wrap without leader-dot overflow, nav collapses correctly on paper.
- [ ] **Step 4: Regression sweep.** Screenshot `/score`, `/blog`, `/readiness`, one blog post, `/terms` — all pixel-identical to master (only shared-file changes could leak; if any drift, fix before PR).
- [ ] **Step 5:** Fix everything found, re-run the failing check, commit fixes + the QA log: `git commit -m "qa: draftsman rollout — taste/contrast/a11y/regression pass"`.

### Task 15: PR + preview handoff

- [ ] **Step 1:** `git push origin draftsman-rollout` then `gh pr create` on simondadiamond/simonparis-website — title "Draftsman visual system: operator pages (home, /setup, /work-with-me, /about)", body: scope summary, screenshots (all four pages × en/fr × desktop/mobile), QA log summary, Task 0 plugin-check note, and the line **"Merge gate: pending Simon's live check of the Vercel preview — do not merge."**
- [ ] **Step 2:** **Do NOT merge.** Post the Vercel preview URL to Simon with the discriminator: the preview shows warm paper `#F3EEE1` backgrounds on the four pages; production still shows dark `#0f0f0f`.
- [ ] **Step 3:** In the MetaArchitect worktree: update the handoff doc status line to "built — pending Simon's live preview check (PR #N)", commit.

---

## Self-review notes

- Spec coverage: deliverable 1 (polish/QA) → Tasks 4, 14; deliverable 2 (brand doc) → Task 1; deliverable 3 (plugin) → Task 0; deliverable 4 (copy audit) → Tasks 2, 8–11, 13; deliverable 5 (apply system) → Tasks 5–12. Blog visuals: deferred by session decision, copy-only Task 13. ✔
- Type consistency: primitive signatures in Task 6 match usage in Tasks 8–11 (`SpecSheet rows` shape, `sealed` flag, `InkSeal label/count`). ✔
- The `:where()` radius carve-out keeps `.op-*` semantics intact until Task 12 removes them — ordering is safe. ✔
