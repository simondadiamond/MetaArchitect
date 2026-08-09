# Operator Copy Audit — 2026-08-09

Audited against `.claude/product-marketing.md` v2 (offer ladder, customer language, tool-language prohibition) and `brand/brand-summary.md` (prohibitions, Busy Owner Test). Consumed by the Draftsman rollout plan (`docs/superpowers/plans/2026-08-09-draftsman-rollout.md`, Tasks 8–11, 13). Format: literal CURRENT → REPLACE pairs — builders apply verbatim, never improvise.

## Headline finding — surface classification correction

**`/work-with-me` and `/about` are practitioner pages, not operator pages.** `/work-with-me` (namespace `audit`) sells the corporate ladder: AI Readiness Diagnostic ($2,500 founding/$3,500), Production AI Audit ($6,500/$9,500), Team Training, Fractional LLMOps — EU AI Act/NIST/STATE framing throughout. `/about` is the practitioner identity page (STATE pillars, LLM failure copy, CTAs to /score and the Diagnostic). Also verified: `StateGrid`/`FailureTrace`/`OfferCards` are imported only by `LegacyHomePractitioner.tsx` — the original handoff's /setup component list was stale; `/setup` uses only `SetupSignupForm`, `SetupHeroWindow`, `FAQ`.

**Consequence:** the operator lane = homepage (`HomeOperator`) + `/setup`. The 2026-08-09 session decision to include /work-with-me and /about in the Draftsman rollout was made on a wrong premise (mine) — awaiting Simon's corrected call. Operator copy rules (no tool language) do NOT apply to those two pages; they are correct for their audience as written.

## /setup

1. `[setup.meta.title]` (en) — CURRENT: `"Claude Code setup for your business · Simon Paris"` → REPLACE: `"Claude setup for your business · Simon Paris"` — WHY: "Claude Code" is a developer-tool name; the operator buyer pays for "Claude". Delivery language locked as "Claude's desktop app" (product-marketing Glossary; offer-v4 Cowork decision).
2. `[setup.meta.title]` (fr) — CURRENT: `"Configuration Claude Code pour votre entreprise · Simon Paris"` → REPLACE: `"Configuration Claude pour votre entreprise · Simon Paris"` — WHY: same.
3. `[setup.hero.title2]` (en) — CURRENT: `"running on Claude Code."` → REPLACE: `"running on Claude."` — WHY: same as #1; also contradicts the flagship tier's own line "Installed in Claude's desktop app… (no code)" — the hero names a code tool, the offer promises no code.
4. `[setup.hero.title2]` (fr) — CURRENT: `"propulsée par Claude Code."` → REPLACE: `"propulsée par Claude."` — WHY: same.
5. `[setup.cta.mailSubject]` (en) — CURRENT: `"Claude Code workspace setup: discovery call"` → REPLACE: `"Claude workspace setup: discovery call"` — WHY: same.
6. `[setup.cta.mailSubject]` (fr) — CURRENT: `"Configuration d'espace de travail Claude Code : appel découverte"` → REPLACE: `"Configuration d'espace de travail Claude : appel découverte"` — WHY: same.
7. `[setup.steps.items[1].body]` (en) — CURRENT: `"About two weeks, part-time, without disrupting your operations. I build in passes and check in as pieces land."` → REPLACE: `"About thirty days, part-time, without disrupting your operations. I build in passes and check in as pieces land."` — WHY: ladder contradiction — the pricing section on the SAME page says "~30 days, part-time" and product-marketing locks the flagship at ~30 days. Same bug class as the fixed "two-hour working setup" CTA.
8. `[setup.steps.items[1].body]` (fr) — CURRENT: `"Environ deux semaines, à temps partiel, sans perturber vos opérations. Je construis par étapes et je fais le point à mesure."` → REPLACE: `"Environ trente jours, à temps partiel, sans perturber vos opérations. Je construis par étapes et je fais le point à mesure."` — WHY: same.
9. `[setup.faq.items[4].a]` (en) — CURRENT: `"…compressed into two weeks, plus someone who's seen where these systems break."` → REPLACE: `"…compressed into a single setup, plus someone who's seen where these systems break."` — WHY: same 30-day contradiction; "a single setup" removes the timeframe from a sentence that never needed one.
10. `[setup.faq.items[4].a]` (fr) — CURRENT: `"…compressé en deux semaines, plus quelqu'un qui sait où ces systèmes cassent."` → REPLACE: `"…compressé en une seule installation, plus quelqu'un qui sait où ces systèmes cassent."` — WHY: same.
11. `[setup.faq.items[2].a]` (en) — CURRENT: `"Everything lives on your machine, under your Claude account. I work in your workspace during the sprint and keep no access after handover."` → REPLACE: `"Everything lives on your machine, under your Claude account — which is yours from day one; I never independently hold the credentials. I work in your workspace during the sprint and keep no access after handover."` — WHY: recommended (not a contradiction): product-marketing v2 added the account-ownership answer as the data-anxiety objection response; this FAQ is its natural home.
12. `[setup.faq.items[2].a]` (fr) — CURRENT: `"Tout demeure sur votre machine, sous votre compte Claude. Je travaille dans votre espace pendant le sprint et je ne conserve aucun accès après le transfert."` → REPLACE: `"Tout demeure sur votre machine, sous votre compte Claude — qui vous appartient dès le premier jour; je ne détiens jamais vos identifiants de mon côté. Je travaille dans votre espace pendant le sprint et je ne conserve aucun accès après le transfert."` — WHY: same.

Checked and clean: pricing tiers vs ladder (all five rungs match product-marketing, founding $5,000 correct, audit credit stated, retainer post-setup-only stated), hype-word sweep (0 hits), verbatim-bank alignment (strong — "re-explain my business", "sounds like AI wrote it", evenings framing all present), founding-slots count ("3 of 3 open" — true at 0 clients).

## Homepage (HomeOperator)

No fixes. Ladder rungs, founding exchange ($5,000/$6,500 + case study), CTA framing, and voice all check out against product-marketing v2. Tool-language hits ("Enterprise LLM team?", "production LLM systems") are confined to the practitioner-door elements, where naming the other audience is the door's job. `"3 of 3 founding slots open"` must be updated the day a slot fills — flagged for the case-study-capture loop, not a copy bug today.

## Nav + Footer (shared)

**Flag for Simon (routing, not copy):** on operator pages the nav item "Work With Me" links to `/work-with-me` — the enterprise diagnostic. An operator clicking it mid-funnel lands on EU-AI-Act copy. Options: lane-aware nav (operator pages point that item at `/setup`), rename the item per lane, or accept as-is. Recommend lane-aware routing inside plan Task 7 (Nav is already being touched). No string replacements pending that decision.

## Blog (copy-only)

No findings. Blog chrome copy (`blog.json`) is practitioner-voiced for a practitioner surface — correct as written. No operator rules apply.

## /work-with-me and /about

Reclassified practitioner (see headline finding) — audited only for internal consistency, not operator rules. One strategic note, no copy action: the site now carries **two different $2,500 offers** (operator "Audit + Roadmap" on /setup; practitioner "AI Readiness Diagnostic" founding rate on /work-with-me). Distinct audiences, but a referral or curious buyer who sees both may conflate them. Worth a naming/positioning look post-Gate-B, not a blocker.
