# Setup Offer v5 — Spec (revised 2026-08-10, supersedes v4)

> v4 (locked 2026-07-27) explicitly rejected a custom dashboard ("no priced market
> exists for one — verified negative"). That research was real, but Simon made a
> different call afterward that never got backported here: the flagship is the
> **Command Center**, productized — his own internal platform, sold to clients as
> their own instance, with paid training built into the price. Decision record:
> brain note `notes/10-19-business/command-center-productization.md` (created
> 2026-07-19, actively updated through 2026-08-07 — i.e. after this spec's v4 lock).
> Confirmed directly by Simon in the 2026-08-10 CMO session that produced this
> revision. v4's Cowork-only research isn't wrong, it's superseded — the underlying
> Claude/agent layer likely still runs beneath the Command Center; what changed is
> that the client now also gets a real, dedicated software surface, not raw chat.
>
> **Gating, unchanged in kind but now with a second, harder prerequisite**: the
> original Cowork port test (kit + skills verified on a real machine) still applies
> to whatever agent layer sits underneath. New, harder gate on top of it: the generic,
> multi-tenant Command Center build doesn't fully exist yet. Per the brain note, "the
> hard push on the generic build happens when a first client actually signs, not
> before" — and the vault (a named differentiator below) is explicitly flagged
> unauthenticated with no per-client owner scoping (goal `f496b448`), a prerequisite
> before it ships to anyone. Do not sell this as a mature, self-serve multi-tenant
> product until that gate clears — sell it honestly as Simon personally building and
> hardening a client's instance during the engagement, which is consistent with the
> hands-on, ~30-day delivery timeline already in this spec.

## The structural change (v5)

**Delivery surface is the Command Center — a real, dedicated software platform, not
raw Claude chat and not a generic template.** Client gets their own instance,
customized to their business, with paid training included in the price. This
directly answers the free-platform threat differently than v4 did: Claude for Small
Business and its OpenAI equivalent (ChatGPT Work, launched 2026-07-21) both ship
generic chat-based workflows — neither ships a dedicated, owned software surface with
engineered differentiators underneath it. Confirmed differentiators, all real and
already built in Simon's own instance (see Differentiators below): a credential vault
that never displays a secret back, a human-gated autonomous build pipeline, and a
benchmarked memory system with a live, rerunnable demo. Wellforce's comparable
($2,500–$9,500 for design + connectors + skills + training around stock Cowork) is
now a materially weaker product than this — a prompt library and two training
sessions is not a software platform.

**Adoption design principle (the thing this pivot lives or dies on):** the entire
positioning is "stop juggling ten tools." If the Command Center becomes an eleventh
tool a client has to remember to log into, it fights its own pitch. Two constraints,
non-negotiable for the generic build:
1. **Consolidation, not addition** — it has to visibly replace things a client already
   juggles (a lightweight CRM view, a task surface, memory) rather than sit beside
   their existing stack. Sell "one less subscription," never "one more dashboard."
2. **Push, not pull** — adoption depends on the Command Center reaching the client
   (digests, notifications, an approvals view — "here's what your AI did, here's what
   needs your eyes"), not on them remembering to visit a URL. This is already how
   Simon's own instance works (schedules, night-build gating, the approvals view) —
   it just hasn't been stated as a required design constraint for the client-facing
   version until now.

## The ladder

| Rung | Price | What it is | Boundary line |
|---|---|---|---|
| Demo build | Free | 1 library skill personalized on their real task, one sitting — **delivered from Simon's machine (demo/screen-share); nothing installed on theirs until paid work** (Simon, 2026-07-31) | Library-only, hard-capped. Needs new base building → it's a Working Session, say so |
| Working Sessions | $125/hr | Hands on whatever they point at | "You know what you want built" |
| Audit + Roadmap | $2,500, credited to Setup | Bounded verdict: system map + ROI-ranked automation roadmap | "You don't know what to build first." Setup is only quoted from an audit — always where we start |
| OS Setup | $6,500 (founding 3× $5K) | Your own Command Center instance, customized, plus training (below), fixed scope, ~30 days | Skill/workflow cap explicit; extras = sessions |
| Retainer | ~$600/mo, post-setup only | Keeps the platform current and compounding | Never sold before setup; sessions cover continuity for clients 1–3 |

Credit mechanic (audit → setup) is a differentiator: none of the six surveyed
vendors offer it. Market it as risk reversal.

## OS Setup $6,500 — inclusion list

- Discovery + business-type variant selection (kit runbook)
- Their own Command Center instance, deployed and wired to their actual stack —
  the AI/agent layer underneath still runs on Claude via Cowork or CLI as
  appropriate; the client's daily surface is the Command Center, not raw chat
- Consolidating features (must earn their place per the adoption design principle
  above — not everything Simon's own instance has ships to clients on day one):
  a lightweight CRM view, memory, schedules, an approvals view for anything
  AI-drafted before it's real
- Personalized business profile, folder map, memory conventions seeded (5 memory
  entries day one)
- **3 library workflows/skills personalized + up to 2 custom** built on their actual
  work (custom #3+ = Working Sessions — the cap is stated on the page)
- Owner training to independence: driving test at handover, on the Command Center
  itself, not a generic AI-literacy course
- Applied education modules: recorded walkthroughs of THEIR workflows on THEIR data
- EN/FR Owner's Manual + safety card
- 30 days of friction-clearing after go-live

**Pricing logic (the sentence Simon must own):** the Command Center is the operating
system; the workflows built inside it are the apps; the training is what makes the
owner an actual driver, not a passenger. A standalone workflow is $250–500 at the
hourly rate — the other ~$4K is the platform, the training, and the handover. Never
price or defend per skill, and never let the pitch collapse to "I configured your
Claude app" — that undersells what's actually being delivered.

## Retainer ~$600/mo — inclusion list

- Command Center feature updates ported from Simon's own instance as they harden,
  pushed to their workspace as the platform version advances (flow-back rule: every
  client inherits every improvement — say this, nobody else has it. This is a
  stronger claim now than it was under v4: real software can genuinely ship a
  version bump, this isn't a manual copy-paste of config files anymore)
- 1 monthly working session
- 1 workflow per month: a **library workflow installed/personalized, or an existing
  one revised** (20–40 min each — the generic core is pre-built). Net-new custom
  builds are Working Sessions at every tier, retainer included; retained clients get
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

## How Command Center updates reach clients

**Never unattended for anything customer-facing.** This is the same principle stated
two ways in two places now — v4's "no silent changes land in a live business's
workspace" and the brain note's "nothing ships unattended... nothing customer-facing
goes live without a human approving it" — and they should stay merged as one rule, not
drift into two. Simon applies and verifies updates during retainer sessions on the
client's real work before they land. This is a core part of what the retainer pays
for — if updates were auto, the retainer weakens. Sell it as the same answer to "will
an autonomous update break my business" that the approvals-view pattern already gives
internally: shipped fast, gated hard.

**Underlying agent/skill architecture (audited 2026-07-27, still applies beneath the
Command Center layer):** skill bodies are generic process + invariants; client
specifics live in (a) 1–4 `{{TOKENS}}` per skill and (b) workspace files read at
runtime (`operations/pricing.md`, `how-we-work.md`, `policies.md`, customer notes).
v1.1 refinement: centralize the remaining tokens into `operations/business-profile.md`
so an update is a drop-in file replacement + a minutes-long personalization check.
**Needs re-verification against the actual Command Center codebase** — this was
audited against a Cowork-only delivery model; confirm it still holds now that there's
a software layer above it before quoting it as current fact again.

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
- Delivery language on the page (v5): "your own Command Center — built for your
  business, no code, no terminal." Still never CLI-facing vocabulary; the underlying
  Claude/agent layer is real but never the buyer-facing description.

## Open items

1. **Cowork/agent-layer port test** (gating, carried over from v4): verify the
   underlying skills + memory conventions behave. Sister session = test + first
   delivery rep — still the plan, now one layer beneath the Command Center itself.
2. **Multi-tenant auth + owner scoping** (new, harder gate — goal `f496b448`): the
   vault and other client-facing features are currently single-tenant/unauthenticated
   on Simon's own instance. This is a prerequisite before the Command Center ships to
   any real client, not a polish item — do not commit a delivery date that assumes
   this is already solved.
3. **Generic build hardens after client #1 signs, not before** (per the brain note's
   explicit sequencing) — until then, sell and deliver this honestly as Simon
   personally building and hardening one client's instance, not a polished, ready-made
   multi-tenant product. The ~30-day hands-on timeline already in this spec is
   consistent with that reality; don't let sales copy imply more automation exists
   than does.
4. /setup page update — needs a fresh pass reflecting v5, not just the v4 language
   swap originally queued 2026-07-27.
5. Kit v1.1: centralize tokens into `business-profile.md` (small, do during or right
   after sister session) — still applies to the agent layer beneath the Command Center.
6. Prospect #1 (Airbnb friend, ~100 doors): route to Audit at founding rate; website
   is a separate one-off or referral, never blended into the OS offer.
