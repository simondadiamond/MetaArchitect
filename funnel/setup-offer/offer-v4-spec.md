# Setup Offer v4 — Spec (locked 2026-07-27) — **SUPERSEDED 2026-08-16, HISTORICAL ONLY**

> **SUPERSEDED 2026-08-18 — HISTORICAL CONTEXT, NOT THE CURRENT PLAN.**
> Current direction: `funnel/setup-offer/positioning-brief-2026-08.md` and
> `funnel/setup-offer/offer-v5-ladder.md`. Kept for the research and language in it;
> do not optimize for the ICP, ladder or segment described below.

> ⛔ **Do not price, position, or write copy from this file.** The five-rung ladder it locks
> (free demo → $125/hr → $2,500 audit → $6,500 OS Setup → $600/mo retainer) closed zero clients and
> is deprecated. The live offer is a service-led one-workflow implementation practice —
> see `brand/audiences/operator.md` ("Offer → segment mapping") and `.claude/product-marketing.md` v4.
> Kept for the research base and the objection-handling material only.

> Supersedes v3 (Working Sessions / Audit / OS Setup, CLI-delivered). Research base:
> 4 deep-research passes 2026-07-27 (form factor, UI pricing, feature benchmark,
> audit-vs-hourly boundary) — findings in brain `src-*` notes dated 2026-07-27.
> Gating validation still open: Cowork port test (kit installed + skills verified in
> the Claude Cowork desktop app on a real machine — sister session).

## The one structural change

**Delivery surface is Claude Cowork (desktop app), not the terminal.** Every verified
comparable fronts a GUI or hides the tech entirely; Anthropic's own SMB product runs
exclusively in Cowork ("built for people who live in documents and spreadsheets, not
code") and is free with the client's Claude Pro plan. We sell the Wellforce-style wrap
(their verified band: $2,500–$9,500 flat for design + connectors + skills + training +
AI policy around stock Cowork). No custom dashboard: no priced market exists for one
(verified negative), and GHL anchors SMB software expectations at $97/mo. Simon's CLI
stays an install/maintenance tool, never the buyer-facing product.

## The ladder

| Rung | Price | What it is | Boundary line |
|---|---|---|---|
| Demo build | Free | 1 library skill personalized on their real task, one sitting — **delivered from Simon's machine (demo/screen-share); nothing installed on theirs until paid work** (Simon, 2026-07-31) | Library-only, hard-capped. Needs new base building → it's a Working Session, say so |
| Working Sessions | $125/hr | Hands on whatever they point at | "You know what you want built" |
| Audit + Roadmap | $2,500, credited to Setup | Bounded verdict: system map + ROI-ranked automation roadmap | "You don't know what to build first." Setup is only quoted from an audit — always where we start |
| OS Setup | $6,500 (founding 3× $5K) | The full install (below), fixed scope, ~30 days | Skill cap explicit; extras = sessions |
| Retainer | ~$600/mo, post-setup only | Keeps the system current and compounding | Never sold before setup; sessions cover continuity for clients 1–3 |

Credit mechanic (audit → setup) is a differentiator: none of the six surveyed
vendors offer it. Market it as risk reversal.

## OS Setup $6,500 — inclusion list

- Discovery + business-type variant selection (kit runbook)
- Cowork install on their machine; connectors wired to their actual stack
- Personalized CLAUDE.md, folder map, memory conventions seeded (5 memory files day one)
- **3 library skills personalized + up to 2 custom skills** built on their workflows
  (custom #3+ = Working Sessions — the cap is stated on the page)
- Owner training to independence: driving test at handover
- Applied education modules: recorded walkthroughs of THEIR skills on THEIR data
- EN/FR Owner's Manual + safety card
- 30 days of friction-clearing after go-live

**Pricing logic (the sentence Simon must own):** skills are apps; the setup is the
operating system plus a trained driver. A standalone skill is $250–500 at the hourly
rate — the other ~$4K is the system, the training, and the handover. Never price or
defend per skill.

## Retainer ~$600/mo — inclusion list

- Kit updates pushed to their workspace as KIT_VERSION advances (flow-back rule:
  every client inherits every improvement — say this, nobody else has it)
- 1 monthly working session
- 1 skill per month: a **library skill installed/personalized, or an existing skill
  revised** (20–40 min each — the generic core is pre-built). Net-new custom builds
  are Working Sessions at every tier, retainer included; retained clients get
  priority booking for them. The retainer distributes the compounding library — it
  never funds bespoke R&D.
- Priority booking + support channel
- Client education module access (see below)

Priced against the budget slot the ICP already spends: VA/OBM/bookkeeper at
$500–1,500/mo ("less than your bookkeeper"). Parity with parts at hourly — sells
continuity and compounding, never discount. ~1.5 hrs/client/month delivery →
10 retained clients ≈ $6K MRR at ~15 hrs/month (vs. the $8K MRR quit-trigger).

## Education model (Simon's inversion)

Client modules are the **canonical master asset**: applied walkthroughs recorded as
byproducts of real client sessions — never built upfront as a library project
(project-stacking guard). Included in Setup + Retainer, never sold standalone.
YouTube gets re-cut mini-derivatives of VIP content (not straight excerpts — Shorts
need standalone hooks). Public generic content = funnel; applied content = product.
If standalone training revenue ever: live cohorts, verified band $295–$1,500/seat.

## Currency

All published prices are **USD** — every verified comp band (Wellforce $2.5–9.5K,
Notionalize $5–25K, Notion-OS market) is USD, and at $6,500 USD we sit mid-band.
The /setup page labels prices "USD" explicitly. Local warm deals (sister, friend)
may be taken CAD-at-par as the real founding discount — a better founding story
than another price cut.

## How kit updates reach clients

**Never automatic.** Client machines never see the kit repo (install-by-copy, rule #1).
Simon applies updates during retainer sessions, verifies them on the client's real
work, and bumps the KIT_VERSION stamp in their CLAUDE.md. No silent changes land in a
live business's workspace (STATE: validated change, never silent continue). This is a
core part of what the retainer pays for — if updates were auto, the retainer weakens.

**Skill architecture supports this (audited 2026-07-27, all 6 skills):** skill bodies
are generic process + invariants; client specifics live in (a) 1–4 `{{TOKENS}}` per
skill and (b) workspace files read at runtime (`operations/pricing.md`,
`how-we-work.md`, `policies.md`, customer notes). v1.1 refinement: centralize the
remaining tokens into `operations/business-profile.md` so a skill update is a drop-in
file replacement + a minutes-long personalization check.

**Flow-back verdict: core to the model.** Every client-built skill generalized into
the kit raises setup value at zero marginal delivery cost, feeds retained clients
("your workspace gained a skill you never paid to build"), and is the moat vs. DIY
Cowork. Byproduct-only rule stands: skills enter the kit from paying client work,
never speculatively.

## What is advertised where

- **Public /setup page:** Working Sessions $125/hr, Audit+Roadmap $2,500 (credit
  mechanic stated), OS Setup $6,500 / founding $5K. Retainer appears as the
  "what happens after" continuity note — *existing clients only*, no purchase CTA.
- **Not on the page:** the free demo build (warm-intro only — publishing it invites
  cold strangers to claim free work) and per-skill pricing framing of any kind.
- Delivery language on the page: "installed in Claude's desktop app — no code, no
  terminal." Never CLI-facing vocabulary.

## Open items

1. **Cowork port test** (gating): install kit template in Cowork, verify 6 skills +
   memory conventions behave. Sister session = test + first delivery rep.
2. /setup page update — queued as pipeline story 2026-07-27 (sitemaster). If the
   Cowork port test surfaces issues, the delivery-language line is the only copy at risk.
3. Kit v1.1: centralize tokens into `business-profile.md` (small, do during or right
   after sister session).
4. Prospect #1 (Airbnb friend, ~100 doors): route to Audit at founding rate; website
   is a separate one-off or referral, never blended into the OS offer.
