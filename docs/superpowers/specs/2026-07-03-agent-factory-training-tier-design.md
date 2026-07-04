# Design — Agent Factory Productization + Team Training Tier

> Date: 2026-07-03 · Approved by Simon in session ("sounds about right" / "just move forward with it")
> Inputs: Simon's Agent Factory strategy brief (2026-07-03), `projects/Productize-Offer/offer-ladder.md` (locked same day), `docs/roadmap.md`
> Status: APPROVED — amendments applied to offer-ladder.md and roadmap.md as part of this session

## What this adds

Two additions to the business, decided together because they are one funnel:

1. **Agent Factory kit** — the kanban-driven, STATE-compliant auto-coding pipeline (explicit gates between plan → code → test → verify), genericized and sold as a $149 product. Top-of-funnel proof asset.
2. **Team Training tier** — "Agentic Development for Teams" workshops, inserted as tier 3 of the (now four-tier) offer ladder.

The chain that connects them: **kit (dev) → team adoption → workshop (eng manager) → retainer (org)**. Kit → Diagnostic conversion is NOT assumed — the kit buyer (indie dev) and the ladder buyer (enterprise reliability lead) are different people. Training is the only credible bridge.

## Decision 1 — Sequencing: services lead, factory is the content spine

- The needle-mover stack in `docs/roadmap.md` stays primary and unchanged. Commenting cadence is still item #1.
- The Agent Factory becomes the **content spine**: build-in-public posts about state-compliant auto-coding are Meta Layer pillar material that feed BOTH funnels (enterprise authority on LinkedIn, kit interest on dev channels).
- Kit extraction/genericization is **agent work, run in the background** — it does not draw from Simon's 10 hr/week beyond review. Launch is opportunistic, not schedule-critical.
- The brief's 90-day plan checkpoints survive as honesty gates: day-30 waitlist ≥50 or honest no-demand signal; day-90 compound-or-pivot.

## Decision 2 — Training tier: tier 3 on the page, sibling of the retainer in the sales motion

Ladder becomes: **Diagnostic → Audit → Team Training → Fractional LLMOps Engineer.**

Structural insight (why it's not a pure price step): the audit ends with a remediation plan; the client's next question is "who implements this?" Two answers — Simon (retainer) or their team (training). So training and the retainer are **pitched at the same moment** (audit delivery), and training additionally serves as:

- the **retainer's downsell** (org can't budget monthly → one-day capability transfer),
- the **retainer's exit ramp** (offboarding pitch: one workshop to transition the team off Simon),
- the **kit's landing pad** (kit-inbound managers enter directly at training, skipping the diagnostic).

Rules:
- Never cold-pitched (same rule as the retainer). Inbound or pitched at readout/delivery.
- **Not the parked Phase 4 workshop.** That was an audience-funnel practitioner workshop needing ~1K followers to fill seats. This is a B2B engagement sold 1:1 — it needs one buyer, not an audience. The roadmap parking-lot entry stays valid; roadmap now says so explicitly to avoid a future session flagging a sequencing-rule violation.
- **Capacity accounting:** workshops draw from the Amendment 1 budget — a workshop's delivery day counts against the max-2-committed-days/week cap while the W-2 exists.
- Delivery: remote-first; on-site travel billed to client. EN/FR (francophone Quebec delivery is a near-empty niche and a moat).

Pricing (market-checked 2026-07-03 in-session; sources in offer-ladder §2 notes):
- Half-day: **$3,000 founding / $4,500 full** (USD) — raised from an initial $2,500 hypothesis: market prices half-days at 75–85% of full-day, and $2,500 fell below the $3k AI-workshop floor
- Full-day: **$4,500 founding / $6,500 full** (USD) — confirmed lower-middle of the $3k–$12k AI-workshop band; honest no-track-record founding rate
- Founding rates deliberately below the audit so the downsell works. Founding exchange (diagnostic-style, per Amendment 3 logic): approval-required testimonial + 30-min recorded debrief + anonymized case-study rights.
- Slots: 3 founding workshops — closes when 3 delivered with testimonials OR 2027-06-30.
- CAD equivalents per Amendment 5 mechanics: half-day $4,000/$6,000 · full-day $6,000/$9,000 CAD.
- Proposal framing: quote per-head math ($4,500 / 15 engineers = $300/head, inside the $200–$1,000/head norm).

## Decision 3 — Kit: brand-accretive by construction (the brand firewall)

Simon's fear: marketing a $149 product on socials diminishes the enterprise brand. The fear is directionally right about *promotion style*, so the firewall:

1. **LinkedIn never sells the kit.** The factory appears there as content only (Meta Layer pillar). Kit link lives on the site; mentioned in comments only if asked.
2. **Sales motions live where product launches are native:** Gumroad/Lemon Squeezy page, one r/ClaudeAI launch post, one Show HN, one X thread. No campaign, no cadence.
3. **Kit copy obeys brand voice rules:** no urgency timers, no discounts ever, flat $149, practitioner framing ("the pipeline I run daily, gates and all, with the reasoning") — sold like documentation.
4. **On simonparis.ca it sits on the proof-of-work shelf** (same weight as teardowns / STATE Field Guide), never adjacent to the Diagnostic CTA.
5. Litmus for every public mention: does the burned-practitioner ICP read it as "expert" or "seller"?

Accepted trade-off: limited promotion = limited kit revenue. The kit's job is proof asset + training lead-gen + covering the Claude subscription (~$100–200/mo), not a revenue pillar. $1–2k lifetime + two workshop inquiries = success.

Standing doc: `projects/Productize-Offer/agent-factory-kit.md`.

## Decision 4 — Site changes (via story pipeline, not in-session)

- The /audit redesign story scope grows from three tiers to **four tiers** (training block included).
- **Route rename recommended:** the nav label is already "Work with me" and the page now hosts a full ladder — `/audit` is misnamed. Rename to `/work-with-me` with a 301 from `/audit`. Fold into the same sitemaster story.
- Training gets a line/block on the page now; a dedicated workshop page only when the first inquiry arrives (YAGNI).
- Kit gets a site surface only when the kit exists — never invent download/buy links (sitemaster rule).

## Out of scope (explicit)

- Tier 2 of the brief (video course / install-with-you session) — build only after Tier 1 sells.
- Any outbound sales motion for training — inbound + readout-pitched only.
- Building the workshop curriculum — first inquiry triggers that work, not before.

## Files changed by this decision

- `projects/Productize-Offer/offer-ladder.md` — §2 table (4 tiers), sales-motion notes, Amendment 6, §9 kit section, §7 story brief updated
- `projects/Productize-Offer/agent-factory-kit.md` — NEW, kit standing doc
- `docs/roadmap.md` — quick-reference ladder line, Phase 9 (Agent Factory, background/agent-driven), parking-lot clarification on Phase 4
