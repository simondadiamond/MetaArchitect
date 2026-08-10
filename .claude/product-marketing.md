# Product Marketing Context

**Document version:** v3
**Last updated:** 2026-08-10

> Foundation doc for the marketing-skills plugin (all 49 skills read this first).
> Compiled from: `brand/audiences/operator.md`, `funnel/setup-offer/icp.md` (v1, evidence-tiered),
> `funnel/setup-offer/offer-v4-spec.md` (v5, revised 2026-08-10 — supersedes the v4 "no custom
> dashboard" call), `brand/brand-summary.md`, brain note
> `notes/10-19-business/command-center-productization.md`, and live market research
> `docs/research/operator-icp-live-validation-2026-08-10.md`.
> Scope: the **/setup venture** for the operator ICP — the primary active lane. The enterprise
> practitioner lane (`brand/audiences/practitioner.md`) is pull-only and NOT covered here.
> Honesty flag: willingness-to-pay for this framing is UNPROVEN — the 3 founding slots are the
> experiment. Every web claim about "segments that pay" failed adversarial verification (icp.md);
> field notes from real sessions outrank everything in this doc. New in v3: real buyer-side
> demand signal DOES now exist (a matching Upwork posting, 2026-05-15) — the strongest evidence
> found to date, still short of a paying customer.

## Product Overview
**One-liner:** I build you your own Command Center — a working business operating system, customized to you, that runs on the AI you already pay for — and I teach you to actually drive it.
**What it does:** A hands-on service that gives a business owner their own instance of a real software platform (a productized, generic version of Simon's own internal Command Center) — customized to their business, wired to their real documents and workflows, running Claude underneath but presented as a dedicated surface, not raw chat. Simon personally builds and hardens each client's instance and trains the owner to independence. **Changed in v3**: this is not "configuration of the client's existing Claude app" (that was v4's model, superseded 2026-08-10) — it's a real, owned piece of software, which is why the differentiators below now include engineering, not just personalization.
**Product category:** Hands-on AI operations platform for small business, delivered as a personal software build (the "AI consultant" shelf, deliberately productized, one step further than pure services now that there's a real platform underneath).
**Product type:** Productized service ladder wrapped around a real software product (not pure service, not self-serve SaaS — a hybrid, and that hybrid IS the moat: self-serve SaaS can't personalize, pure consulting can't compound).
**Business model (all prices USD):**
| Rung | Price | Boundary |
|---|---|---|
| Demo build | Free, warm-intro only, never advertised | Delivered from Simon's machine; nothing installed until paid work |
| Working Sessions | $125/hr | "You know what you want built" |
| Audit + Roadmap | $2,500, credited to Setup | "You don't know what to build first" — Setup is only quoted from an audit |
| Command Center Setup | $6,500 (founding 3× $5,000) | Their own Command Center instance, customized + trained; fixed scope, ~30 days, workflow cap explicit |
| Retainer | ~$600/mo, post-setup only | Never sold before setup |

## Target Audience
**Target companies:** Owner-operated service/expertise businesses — consultants, coaches, trainers, fractional executives, boutique agency principals. Solo to ~5 people as shorthand; the real boundary is **who operates the workspace** (an 8-person firm whose owner does the proposals/invoices personally still fits). Revenue ~$100K–$1M; bills $100–250/hr.
**Decision-makers:** The owner IS the buyer, user, and budget holder. Single machine, single Claude account.
**Qualifying refinement:** The **delegation-proven operator** — already pays a VA, OBM, or bookkeeper $500–1,500/mo. They've demonstrated willingness to spend on ops relief; the workspace displaces spend they already make. Discovery qualifier: "Do you already pay for help with this?"
**Primary use case:** Making the AI subscription they already pay for (and use ~10% of) actually know their business.
**Jobs to be done:**
- Get invoices, proposals, follow-ups, onboarding off the owner's evenings
- Produce drafts that sound like the owner, not a press release
- Keep business decisions and context in one place that persists ("where did we land on that?")

## Personas
Single-stakeholder sale. The owner wears every hat:
| Persona | Cares about | Challenge | Value we promise |
|---------|-------------|-----------|------------------|
| Owner-operator | Evenings back, sounding like themselves, not being the bottleneck | Every AI chat starts from zero; editing generic drafts takes longer than writing | A workspace that already knows the business, in the app they already pay for |

## Problems & Pain Points
**Core problem:** Paying for AI that should be saving hours, but every chat starts from zero — re-explaining the business, re-pasting the same three documents, and the draft still doesn't sound like them.
**The 5 core frustrations:**
1. **Groundhog-day context** — every session starts from zero; re-explaining the business for the hundredth time
2. **Generic output** — drafts read like a press release from a company they've never met; editing takes longer than writing would have
3. **Owner-as-bottleneck** — invoices, proposals, follow-ups, onboarding all wait on the owner's evenings
4. **Paying for 10%** — real money going to AI subscriptions that don't compound; quiet guilt about underuse
5. **No memory** — decisions get re-litigated because nothing persists
**What it costs them:** Evenings and weekends on admin; billable hours (at $100–250/hr) spent on $20/hr work.
**Emotional tension:** Quiet guilt about underusing what they pay for; fear of being left behind on AI; exhaustion at being the bottleneck for everything.

## Competitive Landscape
**Direct:** Local hands-on AI consultants/trainers — FloatAI (Montreal; has since pivoted toward vertical automation for home-service trades, re-verify before citing its $150/hr figure again), DigiSmart (audits now published at $4,500), and **Wellforce** — re-verified 2026-08-10, now sells "Claude Implementation" ($2,500–$9,500 flat: design, connectors, skills, two training sessions, plus a "Managed Claude" retainer add-on). Closer to Simon's ladder shape than the old comp was, but still a configuration-and-training wrap around stock Cowork — not an owned software platform with a credential vault, a human-gated build pipeline, or a benchmarked memory system underneath. Still true of all three: none offer audit-credit risk reversal; none flow improvements back to past clients as a real version bump.
**Secondary (the big one, now from both major platforms):** **Claude for Small Business** (launched 2026-05-13, 15 ready-to-run workflows + connectors now including Slack/Square/Stripe/Webflow) and **OpenAI's equivalent, "ChatGPT Work"** (launched 2026-07-21, bundled free, partner integrations with Dropbox/Shopify/Intuit/Slack) — both free with a plan the buyer already has. Falls short the same way regardless of platform: generic workflows for a generic business — a toggle can't hold your voice, your rates, your onboarding checklist, or what you decided about fall pricing, and neither ships a dedicated owned surface. Never argue against either by name alone; build on top: "Claude and ChatGPT now ship ready-made workflows for a generic small business. You don't run a generic small business."
**Secondary (Canada, $1M+):** BDC LIFT — half-price subsidized AI advisory for $1M+ revenue SMEs. Below $1M it doesn't reach the buyer at all; above, it finances tools and reports but no hands-on operator enablement.
**Indirect:** Hiring (another) VA/OBM — solves the same "get it off my plate" job with a human at $500–1,500/mo forever. DIY ChatGPT tinkering — the default; free, but it's what produced the frustrations above.

## Differentiation
**Key differentiators:**
- **Built around work you already do** — personalized to the owner's real documents, voice, rates, and workflows (vs. ready-to-run generic)
- **A real platform, not a config job** (new in v3) — a credential vault that never displays a secret back and keeps Simon out of the credential loop entirely; a human-gated build pipeline (autonomous work ships overnight, nothing customer-facing goes live without approval); a benchmarked memory system with a live, rerunnable demo (measurably faster and more accurate than a stock AI session — this is provable in front of a prospect, not asserted)
- **One place, not eleven** — consolidates the tools an owner already juggles (a lightweight CRM view, memory, schedules) instead of adding another login to remember; reaches the owner (digests, an approvals view) instead of requiring them to go check it
- **Audit credit** — $2,500 audit fully credited to setup; no surveyed vendor offers it (risk reversal)
- **Flow-back rule** — every client inherits every platform improvement, forever, as it genuinely ships (a real version bump now, not a manual copy-paste)
- **Training to independence** — owner passes a driving test at handover; recorded walkthroughs of THEIR workflows on THEIR data
- **You own it, always** — the Claude subscription and the Command Center instance are the owner's from day one; Simon works inside it during sessions and never independently holds the credentials, so there's no handoff moment where he could lock them out
**Pricing logic (own this sentence):** the Command Center is the operating system; workflows built inside it are the apps; the setup buys the platform plus a trained driver. Never price or defend per skill.

## Objections
| Objection | Response |
|-----------|----------|
| "Isn't Claude (or ChatGPT) doing this for free now?" | The free tier proves the demand. Ready-made workflows fit a generic business — this is what comes after the toggle disappoints. |
| "Can't I just DIY this? I read it's a 20-minute task." | That 20 minutes gets you a generic prompt. Getting it to actually know your clients, your rates, and your exceptions — and building you a real place to run it from — is the part that doesn't fit in 20 minutes. And Working Sessions at $125/hr are the honest entry if you'd rather learn than hand it off. |
| "Isn't this just another dashboard I have to remember to check?" (new, v3) | It replaces things you're already juggling — a CRM tab, a task list, your own memory of what you decided — it doesn't add to them. And it comes to you: digests and an approvals view, not one more login you have to remember. |
| "$6,500 is a lot" | At your billable rate, the admin it removes pays it back in weeks. And the audit is $2,500, fully credited — you're never betting $6.5K blind. |
| "What about my client data / can you lock me out?" | You own the Claude account and your Command Center instance from day one — I work inside it, I never independently hold the credentials. Nothing to hand back because I never had exclusive control. |
**Anti-personas:** AI consultants/coaches ("I help X with AI" — peers, not buyers), engineers/data scientists (DIY crowd), students/open-to-work, "set up my whole team" multi-seat requests (pull-only, pilots a variant), indie creators as flagship targets (they enter via sessions).

## Switching Dynamics
**Push:** Groundhog-day re-explaining; generic drafts; evenings lost to admin; guilt about paying for 10%.
**Pull:** "Sit with me for two hours and leave with a working setup on your machine"; output that sounds like them; a business that runs without them hovering.
**Habit:** The copy-paste ChatGPT workflow they know; "I'll figure it out someday"; DIY-default psychology.
**Anxiety:** "Another tool that won't stick" (now the single sharpest anxiety in v3 — the offer genuinely IS new software, so this must be answered directly with the consolidation + push-not-pull argument, never minimized); looking stupid in front of a consultant; client data in AI; being upsold consulting forever. (The audit-credit + fixed scope + own-it-from-day-one + one-place-not-eleven answers live here.)

## Customer Language
**How they describe the problem (verbatim bank):**
- "I re-explain my business every single time"
- "It sounds like AI wrote it"
- "I'm the bottleneck"
- "Admin eats my evenings"
- "I'm using maybe 10% of what I pay for"
- "Where did we land on that?"
**Words to use:** invoices, proposals, follow-ups, evenings, "sounds like you," "your voice," "on your machine," "no code, no terminal."
**Words to avoid (hard rule — operator-facing surfaces):** agents, context windows, orchestration, MCP, state management, LLM, prompt engineering — ALL tool language. (The AI-curious crowd that likes tool language is the DIY crowd that doesn't buy.) Also: internal business mechanics ("built once, delivered every time", margins), per-skill pricing framing, and every hype word in brand-summary prohibitions ("excited to share", "game-changing", etc.).
**Glossary:**
| Term | Meaning |
|------|---------|
| Command Center Setup | The $6,500 flagship build — a client's own Command Center instance, customized + trained (page language: "your own Command Center," never "dashboard" as the lead noun — that word undersells it and feeds the "another tool" anxiety) |
| Working Session | $125/hr hands-on hour |
| Command Center | Simon's own internal platform, productized into a generic, client-customizable version — internal shorthand only; page language describes what it does ("your own place to run this from"), not the internal name |
| Kit | Simon's internal skill/workflow library (never client-facing vocabulary) |
| Cowork | Claude's desktop app — the AI/agent layer beneath the Command Center; still relevant internally, no longer the top-line delivery description |

## Brand Voice
**Tone:** Confident, diagnostic, concrete over abstract. Dry wit allowed. Never guru, never hype.
**Style:** Short sentences for emphasis, longer for explanation. Business pain in business words.
**Personality:** Systems thinker who builds in the real world; contrarian on AI hype; shows receipts.
**Voice test (operator lane):** the **Busy Owner Test** — would an owner who spent last Sunday night doing invoices read this and think "that's my Tuesday"?

## Proof Points
**Status: founding phase — proof inventory is thin and that's the current bottleneck.**
- Client #0 (Simon's sister) — first delivery rep + Cowork port test, in progress
- Simon's own machine — the showcase sub-pillar: real screenshots/receipts of a business that runs itself; quantified claims ONLY when verifiable from logs at draft time
- Market brackets: priced mid-band vs. verified comps (Wellforce $2.5–9.5K, SMB AI consulting $100–300/hr)
- No testimonials or case studies yet; case-study-capture skill fires as clients land

## Goals
**Business goal:** 3 founding clients at $5,000 (Gate B — first paying signal — unlocks the full homepage rebuild and skills rework). Kill-switch: 60 days of discoverable /setup with zero discovery calls forces a segment revisit.
**Conversion action:** Book a discovery call from simonparis.ca/setup.
**Current metrics:** 0 paying setup clients; sister = client #0 in progress; Prospect #1 (Airbnb friend, ~100 doors) routed to Audit at founding rate.

## Changelog
*Newest first. One line per revision: what changed and why.*
- v3 (2026-08-10) — Flagship redefined: the Command Center (Simon's own platform, productized) replaces "Claude Cowork configuration" as the actual offer — a real decision from `notes/10-19-business/command-center-productization.md` (updated through 2026-08-06/07) that postdated and was never backported into the v4 funnel docs. Added platform differentiators (credential vault, human-gated build pipeline, benchmarked memory), the "one place not eleven" / consolidation-and-push-not-pull adoption principle, a new "another dashboard" objection, refreshed competitive landscape (Wellforce now sells a comparable Claude-implementation offer; OpenAI shipped its own free small-business tier 2026-07-21). Companion doc: `funnel/setup-offer/offer-v4-spec.md` bumped to v5 same session. Source: live CMO-seat session 2026-08-10, `docs/research/operator-icp-live-validation-2026-08-10.md`.
- v2 (2026-08-09) — Added data-handling/account-ownership objection + differentiator (client owns the Claude account from day one, Simon never independently holds credentials) after independent trust-criteria research flagged data privacy as underweighted; policy confirmed live with Simon. Source: `docs/research/operator-trust-criteria-independent-2026-08-09.md`.
- v1 (2026-08-09) — Initial context, compiled from operator.md, icp.md v1, offer-v4-spec, brand-summary for the marketing-skills plugin install.
