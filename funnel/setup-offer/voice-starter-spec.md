# "Sound Like You" — Low-Ticket Distribution Product Spec

> CMO seat, scoped live with Simon 2026-08-10. Companion to `offer-v4-spec.md` (locked
> 2026-07-27) — does NOT reopen or amend the locked ladder. This is a new, separate
> artifact whose job is distribution, not a ladder rung. Full reasoning trail:
> `docs/ladder-tripwire-and-channel-audit-2026-08-10.md` §3 correction, §10.

## Outcome sentence

**A business owner spends about fifteen minutes answering questions about how they
write, and walks away with a Claude skill that actually sounds like them — cheap enough
to hand to another owner without a second thought.**

No technology named in that sentence on purpose (outcome-sentence gate). If this can't
stay true through implementation, that's the signal something drifted.

## Why this shape, not the three SKUs from the 2026-08-04 research

Those (State-Proof Starter Kit, Follow-Up Machine, Groundhog Day Starter Kit) were
static downloadable templates — the same shape as Anthropic's free Claude-for-Small-
Business toggle, which is the thing `operator.md` explicitly says not to resemble
("you don't run a generic business"). This product avoids that by generating a
genuinely different output per buyer from a short guided interview — same self-serve
economics, no generic-template contradiction.

## What it is

1. Buyer gives their email (free — see Pricing) on a simonparis.ca page, not a
   third-party marketplace. Staying on-domain keeps the experience consistent with the
   rest of the operator funnel; a random Gumroad page would itself feel generic.
2. Immediately after signup: a short guided form (5–8 questions) covering **both** voice
   and a sliver of real business context — not voice alone (see 2026-08-10 refinement
   below): how they write, what they never say, 2–3 real writing samples, PLUS one or
   two business-context questions (who their clients are, one thing they always have to
   re-explain to a new hire or a chat window). The output should read as "this already
   knows a little about my business," not just "this sounds like me."
3. Their answers get compiled into a ready-to-paste custom-instructions snippet, sized
   for Claude's project/custom-instructions field, delivered by email within minutes.
4. The form ends with the standard delegation-proven-operator qualifier already used
   elsewhere in the funnel — "do you already pay someone for help with this (a VA,
   bookkeeper, OBM)?" — logged with the signup. A "yes" answer routes to more direct
   free-demo messaging in the delivery email; a "no" answer stays soft. This is what
   makes the lead magnet a filter instead of a generic freebie.
   Delivery is automated (LLM pass to synthesize the samples into instructions, not a
   templated mail-merge) — flag for whoever builds this: this writes data and makes an
   LLM call, so it's STATE **medium risk (S+T+E)** per `brand/state-framework.md`, not
   the low-risk tier a static download would be.
4. The delivery includes one explicit, low-friction share prompt ("know another owner
   drowning in generic drafts? forward this.") — this is the product's actual job.
5. The delivery ends with one soft, non-pushy line pointing at the real ladder: "if you
   want this wired into your actual documents, rates, and client history — not just your
   writing voice — that's what a Working Session or the Audit does." No hard CTA, no
   urgency — just the door left open.

## Refinement — 2026-08-10, same session: representativeness check

Simon asked directly whether this is something people actually want and whether it
finds OS-Setup buyers specifically, not just freebie-seekers. Answer: as originally
scoped (voice only), weakly — pure voice-matching is the single most commoditized thing
in this whole comp set (every cheap prompt pack found in the 2026-08-04 research sells
some version of it), so it's satisfiable by a $7 competitor and doesn't touch the
business-context/memory mechanism that actually justifies $6,500. It also risks fully
resolving the one frustration it touches for free, removing rather than creating pull
toward the ladder. Fix applied above: widen the interview to include a sliver of real
business context (not just voice) so the output previews the actual Setup mechanism, and
add the standing ICP qualifier so the magnet self-selects rather than just satisfies.
Still unvalidated with real operators — cheapest check before building is trying the
question set informally in the next few free demos.

## Explicit scope boundary (what this is NOT)

- Not a rung on the locked ladder. Doesn't touch pricing logic in
  `funnel/setup-offer/offer-v4-spec.md`.
- Not wired to their documents, rates, or client history — voice only. That boundary is
  what keeps it from competing with Working Sessions or Setup.
- Not sold as a path to the flagship in the copy — it's a standalone useful thing that
  happens to open a door, not a funnel step dressed up as a gift.
- No `/score`, no STATE-framework language anywhere in the product or its copy — plain
  "sounds like you" register throughout, same as the rest of the operator lane.

## Pricing — corrected 2026-08-10 (same session, validated live)

**Free, email-gated. Not a paid product.** Original scope priced this at $27–37,
pattern-matched against the wrong comp set (the 2026-08-04 research's $97–299 "Business
OS template" band — a heavier, broader product category). Live market check for the
actual peer group — single-workflow, custom-GPT-style personalized outputs — found no
direct precedent for this exact interactive shape, but consistent, explicit advice from
sellers in that adjacent category: price single-workflow custom-GPT products free or
~$7, because the job is lead-gen, not revenue — the same job this product already had
(§ "distribution magnet"). Simon's instinct on this was right and the market confirms it
independently. Making it free also gives the operator lane its own lead magnet, which it
currently lacks (`/score` is practitioner-lane only) — captures email instead of a small
payment, at zero cost to the "gets shared without hesitation" goal (arguably improves
it — free removes the last friction point). Gate on email, not payment.

## Success / kill criteria (fill in before building, same discipline as Agent Factory
Kit's checkpoint gates)

Proposed: 60 days post-launch, keep it if it produced **at least 3 demo bookings or
discovery calls directly attributable to it** (track via a distinct referral/UTM path),
OR built a meaningfully-sized email list where none existed before (the owned-channel
gap named in the channel audit). Fewer than that on both counts and the mechanism isn't
earning its keep — park it, don't iterate blind.

## Build note

This includes a **new customer-facing page** (the purchase/interview flow). Per root
CLAUDE.md, that stays in-session with `ui-ux-pro-max` + `frontend-design` loaded (or an
explicit `sitemaster` dispatch with this doc as the layout brief) — it should not be
queued blind as a story; the `/setup` page itself took five in-session passes when that
rule was skipped once already.

## Naming

"Sound Like You" is a placeholder, chosen because it's the exact phrase already proven
on the live homepage ("It sounds like AI wrote it"). Cheap to change later — naming is
last in the offer-anatomy checklist for a reason.
