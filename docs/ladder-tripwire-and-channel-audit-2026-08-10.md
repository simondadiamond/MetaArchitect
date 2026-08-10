# Ladder, Tripwire & Channel Audit — 2026-08-10 (v2, skills-applied)

> CMO seat. Supersedes the first pass at this file, which mostly restated conclusions
> already sitting in `docs/research/*` and existing goal rows. This version runs the
> actual marketing-skills toolkit against the same factual base — `offers`,
> `marketing-psychology`, `customer-research`, `cro`, `copywriting`, `pricing`,
> `lead-magnets`, `referrals`, `social`, `prospecting`, `launch`, `marketing-loops` —
> and treats prior COO/brain conclusions as inputs to re-derive, not as settled answers.
> Where a framework confirms a prior conclusion, I say so and say why independently.
> Where it doesn't, I say that too.

## Verdict

**The ladder's actual weak point isn't "no tripwire" — it's a 10x price jump with no
guarantee at the exact spot Regret Aversion bites hardest, and a channel strategy that's
structurally mismatched to the buyer's psychology.** Two independent frameworks
(anti-persona conflict, and the Zero-Price Effect) converge on the same answer: don't
build a paid low-ticket SKU. But neither prior pass named the sharper, fixable problem —
the gap between Working Sessions and the Audit — or the concrete referral-loop and
borrowed-channel fixes below. Those are new in this pass.

---

## 1. Running the Value Equation on the actual ladder

`offers` skill: **Value = (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort)**

| Rung | Dream outcome | Perceived likelihood | Time delay | Effort/sacrifice | Read |
|---|---|---|---|---|---|
| Free Demo | "see if this could work for me" | Medium-high (live, in person) | Zero | Very low (just show up) | Strong. Price=$0 makes this near-optimal already — see §3. |
| Sessions $125/hr | "get this one thing built" | High (built live, with you) | Immediate | **Medium-high — requires the buyer to already know what to build**, which is their #1 named frustration | **The denominator is inflated by a prerequisite most of the ICP can't clear.** This rung structurally excludes the least-sophisticated (probably largest) slice of the audience. |
| Audit $2,500 | "know what to build, with a plan" | Medium (no track record yet, no guarantee if they don't proceed) | ~2 weeks | Medium ($2,500 cash commitment, first real dollar-risk) | **Perceived likelihood is the weak lever here — see §2 guarantee gap.** |
| OS Setup $6,500 | "the business runs itself" | Medium (0 case studies) | ~30 days | Low relative to price (credited, fixed scope) | Reasonable — credit structure already reduces effective jump from Audit. |
| Retainer ~$600/mo | "stays running without me" | High (post-delivery, trust established) | Ongoing | Low | Fine — least risky ask, correctly sequenced last. |

**The finding the prior pass missed:** the weakest link by the value equation isn't a
missing cheap rung — it's the **Sessions→Audit jump**. $125/hr (often bought as a
$250 two-hour block) to $2,500 is a **10x jump in a single step**, and it's the FIRST
real-money commitment in the funnel. That's the moment Loss Aversion, Regret Aversion,
and price-relativity psychology all fire hardest — and it's also the one step in the
whole ladder with no documented guarantee (§2).

---

## 2. Offer Anatomy audit — the real gap is guarantee, not price rung

`offers` skill's six-part anatomy (deliverable / bonus stack / guarantee / scarcity /
name / price+structure), scored against each rung:

- **Scarcity**: real (3 founding slots, hard cap) — correctly not-fake, matches the
  skill's warning against manufactured urgency. No change needed.
- **Guarantee**: **this is the actual anatomy gap.** The parked corporate ladder's
  Diagnostic had an explicit 14-day "better-than-risk-free" refund guarantee. The live
  operator Audit has only a *forward* guarantee (credited to Setup) — which pays off
  only if the buyer proceeds to the $6,500 tier. A buyer who takes the Audit and decides
  NOT to proceed has zero risk-reversal on that $2,500. That's precisely the buyer
  Regret Aversion talks them out of becoming, at precisely the step (§1) already
  carrying the biggest psychological jump. **Fix: give the Audit its own standalone
  guarantee** (e.g., "if the findings memo doesn't give you a clear next step, refund on
  request" — mirror the parked Diagnostic's proven structure, don't invent a new one).
  This is cheap (a policy line, not a product) and hits the actual constraint the
  low-ticket-SKU idea was trying to solve.
- **Bonus stack**: founding-client perks (quarterly architecture review, bilingual
  delivery, founding-cohort listing) exist but read as loyalty perks, not a stated value
  stack. Anchoring principle: naming them as "included, valued individually at $X" on
  the $6,500 page raises perceived value without changing price. Low-effort copy fix.
- **Name, price+structure**: no issues found.

---

## 3. Why the free demo is correct, and a paid tripwire would be a downgrade

`marketing-psychology`'s **Zero-Price Effect**: "free isn't just a low price — it's
psychologically different... the jump from $1 to $0 is bigger than $2 to $1." This is
independent evidence, not a restatement of the anti-persona argument from the last
pass: **converting the free demo into a cheap paid product (the classic "$27 tripwire")
would convert worse than keeping it free**, even before you get to the DIY-buyer-fit
problem. Two separate frameworks now say the same thing for different reasons — that's
a strong result, not a single-threaded opinion.

`lead-magnets` skill draws a distinction worth being precise about, since "tripwire" and
"lead magnet" get used interchangeably and they're not the same mechanism: a lead magnet
is free and captures an email; a tripwire is a small **paid** commitment that converts a
stranger into a buyer. Simon has a lead magnet already (`/score`, functioning as a
quiz/assessment-format lead magnet per the skill's own taxonomy) and a *de facto*, unpaid
tripwire (the free demo, which does the tripwire's actual job — converting attention into
a committed next step — better than a paid one would per the Zero-Price Effect). There is
no *missing* mechanism here — the demo's role just needs formalizing (§4) and the Audit
needs a real guarantee (§2).

**Correction (2026-08-10, same session):** the first draft of this section also argued a
paid low-ticket SKU would attract the DIY/tool-curious anti-persona
(`product-marketing.md`'s "engineers/data scientists — DIY crowd"). Simon caught this
live: that anti-persona is defined by **capability** — people who could build it free
themselves — not by price point or product format. It's a real anti-persona for the
practitioner ICP (engineers). It doesn't map onto the operator ICP the same way: a
time-poor, non-technical owner isn't repelled by a cheap product because they "could just
build it" — they structurally can't, at any price. That argument leg is retracted.

The sharper reason to still be cautious about a low-ticket digital SKU isn't persona
fit — it's **brand coherence**. `operator.md`'s required positioning line against
Anthropic's free Claude-for-Small-Business toggle is "you don't run a generic small
business." A static, generic downloadable kit at $97 is functionally that same toggle,
just sold instead of free. That's a self-contradiction risk independent of who buys it.

Net effect on the call: if a cheap entry product gets built, it should stay
interactive/personalized-feeling (closer to how `/score` works) rather than a static
template, and its job should be **distribution** (a cheap, shareable "try this" referral
object feeding the demo — directly attacking the actual constraint named in §4) rather
than a **revenue rung** — it doesn't fit as a rung anyway, since $97–199 overlaps with a
single Session's price rather than bridging the Session→Audit gap. This is now a real,
narrower green light for a *specific shape* of low-ticket offer, not a blanket no.

---

## 4. Theory of Constraints — you're optimizing a rung, the constraint is upstream

`marketing-psychology`'s Theory of Constraints: "every system has ONE bottleneck
limiting throughput. Find and fix that constraint before optimizing elsewhere." Same
skill's Local vs. Global Optima model, verbatim: "optimizing email subject lines (local)
won't help if email isn't the right channel (global)."

Apply it plainly: the constraint right now is **volume entering the funnel at all** —
near-zero discovery calls, a small LinkedIn following, zero paying clients. A new
low-ticket SKU is a **ladder-structure optimization**. It does nothing to the actual
constraint (distribution + proof). This reframes the original question ("what's my
low-ticket offer") as the wrong question — the right one is "what gets more of the right
people into the free demo," which is a channel/referral question, not a pricing
question. Section 6 answers that one.

---

## 5. Jobs to Be Done — why referral structurally beats content for this buyer

`customer-research`'s JTBD framework separates functional / emotional / social jobs.
The functional and emotional jobs are well captured in `operator.md` already (admin off
their plate; relief from guilt). The **social job** is the one nobody in this repo has
named explicitly: an owner-operator hiring outside help is also buying "I'm the kind of
operator who has this handled," and that job can only be satisfied by proof from a
peer — social proof is *inherently relational*, per `marketing-psychology`'s Bandwagon/
Social Proof and Liking/Similarity models ("people say yes to those they like and those
similar to themselves").

**A stranger's LinkedIn post cannot satisfy the social job, no matter how good the copy
is — a peer's warm word can, structurally, regardless of copy quality.** This is a
sharper, mechanism-level reason (not just an "effort allocation" observation) for why
`operator-channel-research-2026-08-03`'s finding — referral/case-study motion will
outperform feed content for this buyer — is correct, and it says the content pipeline is
being asked to do a job it structurally cannot do for this specific ICP, not that it's
merely under-optimized.

`marketing-psychology`'s **Barbell Strategy** ("80% proven channel, 20% experimental,
avoid the mediocre middle") sharpens the fix: warm referral is the safe 80%; one small
genuine experiment (§7) is the 20%; the automated content pipeline, as currently sized,
is the excluded middle — comfortable to build, medium-conviction, medium-return. Don't
kill it (it's real infrastructure and feeds SEO long-term, see §8), but stop treating it
as the primary growth lever it structurally can't be for this buyer.

---

## 6. Referral, redesigned as an actual loop, not an obligation

`referrals` skill's loop model: **Trigger Moment → Share Action → Convert → Reward →
Loop.** Run the current setup through it:

- **Trigger moment**: undefined today. Fix: anchor it to the Peak-End Rule
  (`marketing-psychology`) — ask right after Setup delivery or a clearly great Session,
  when relief/excitement peaks, not on a lag.
- **Share mechanism**: warm text/DM — correctly ranked as high-converting for a
  relationship-sale (analogous to the skill's "personalized link" tier), no change.
- **Incentive structure — the actual gap**: founding-client-program.md's "2 warm
  referral intros" is currently something the client **owes** Simon (contractual
  exchange), not something incentivized. The skill's finding: **double-sided rewards
  (both parties get something) convert meaningfully better than single-sided or
  obligation-only asks.** Concrete fix, cheap: give the referred friend a fast-tracked
  or extended free demo, and give the referrer something small and real (a session
  credit, or public credit if they want it) — converts an obligation into a loop.
- **State**: no tracking today beyond the contractual clause. Same STATE discipline
  already applied to `founding_clients` should extend to referral events specifically —
  who referred whom, when, reward status.

**Decided, 2026-08-10 (Simon):** the incentive is **3 hours of custom work
(~$375–400 value) per successful referral, granted on the referred person's first
payment** (not a booked call — ties the cost to real revenue). Made double-sided per
the finding above: the referred friend also gets something small (e.g. a free first
working-session hour) — costs little more, meaningfully improves conversion.
Mechanic: a simple ledger — accrue on conversion, deduct on redemption, convert to a
credit if the referrer buys a block of hours instead of using them 1:1. This is
**separate from and additional to** the founding-client program's existing
contractual "2 warm intros" obligation — that stays as-is; this applies to all
clients. **V1 should be tracked manually**, not automated — there's no referral
volume yet to justify build effort; automate once it's a real, recurring number.

---

## 7. The one experimental bet worth taking: borrowed channel via adjacent providers

`launch` skill's **ORB framework** (Owned / Rented / Borrowed) is the cleanest lens for
the "long-term leverage" question, and it surfaces something genuinely absent from every
prior document:

- **Owned** (email list, blog, website): blog exists and compounds correctly (SEO).
  Email list is the real gap — no systematic capture beyond `/score`. Fix in §8.
- **Rented** (LinkedIn): heavily built, algorithm-dependent, doesn't compound, correctly
  already de-prioritized per §5's Barbell logic.
- **Borrowed** (someone else's audience, "instant credibility... only works if you
  convert it into owned relationships"): **nobody has looked here at all.** Simon's own
  ICP qualifier is "do you already pay for help with this?" — meaning the
  delegation-proven operator he wants **already has a relationship with a VA, OBM, or
  bookkeeper.** Those providers see exactly his buyer, aren't competitors, and a warm
  intro from a trusted OBM carries the same social-proof weight as a client referral
  (§5). This is a concrete, cheap, entirely unexplored channel: a handful of
  relationships with local/Canadian VA and bookkeeping practices, framed as "I handle
  the part you don't" (complementary, not competitive). Low Simon-time to test (a few
  warm conversations), potentially high leverage because it's aimed at pre-qualified
  buyers by definition.

---

## 8. Prospecting-branch and engage-queue fixes

`prospecting` skill's branch table: Simon's operator ICP maps to **Local SMB /
Demand-signal**, not the SaaS/B2B branches. Worth naming because the only existing
prospecting asset in the repo (`prospect-map.md`, 30 named orgs) targets the **parked
corporate ladder**, not the operator ICP — there is currently no operator-specific
prospecting motion at all. Low urgency while referral-first is the strategy, but it's an
unbuilt fallback if the warm network runs dry, and it should stay named rather than
silently assumed to exist.

`social` skill's engagement routine + `icp.md`'s own 2026-07-20 field note together
point at the real fix for engage-queue: the field note already found "only 3/19 tier-A
[commenters] were genuine service-SMB owners... solopreneur-creator comment sections are
peers, not buyers." **The problem with engage-queue isn't cadence (3x/day is already
above the skill's 30-min/day baseline) — it's target selection.** Re-score the 10
superstar targets against the delegation-proven-operator qualifier before adding volume,
and add the missing last step from the skill's own routine: DMs to warm up a comment
exchange into an actual conversation. Comments alone don't book calls.

---

## 9. Automation and the "AI avatar" question — a loop-design answer, not a vibes answer

`marketing-loops` skill gives a precise reason to reject a synthetic-avatar channel,
beyond "it conflicts with the brand": the skill's own explicit anti-pattern list says
loops should **maintain and optimize, never set positioning, invent campaigns, or make
brand calls** — an AI avatar as the face of the brand IS a brand call, continuously
re-made on autopilot. Its own banned-vocabulary list — "fully autonomous marketing," "AI
does everything," "10x on autopilot" — names exactly the pitch an avatar-content vendor
would make. And its "vanity loop" test — "if nobody acts on the output, delete it" —
applies directly: per §4/§5, content volume isn't the constraint, so an avatar-driven
content loop would be optimizing a non-constraint with the added cost of directly
undercutting the brand's actual differentiator (receipts, not synthetic polish).

**Keep automating what the loop-anatomy calls the maintain-and-optimize layer**
(scheduling, drafting passes, research synthesis, prospect research — all already
correctly built), **never the layer that sets trust or brand** (the actual voice,
replies, claims of results). Same conclusion as the first pass, now backed by a named
framework instead of a judgment call.

---

## 10. Revised ladder and priority order

Ladder stays structurally v4 — the pricing is evidence-based and mid-band-verified, and
nothing in this pass found a pricing-level problem. What changes is guarantee coverage,
funnel framing, and where effort goes:

```
Free Demo (kept free — Zero-Price Effect; this IS the tripwire)
  → Working Sessions, $125/hr — add explicit low-risk framing for first-timers
  → Audit + Roadmap, $2,500 — ADD a standalone guarantee (fixes the sharpest gap found)
  → OS Setup, $6,500 (founding 3×$5,000) — name the bonus stack explicitly in copy
  → Retainer, ~$600/mo
```

**Priority order, highest leverage first:**
1. Give the Audit a standalone guarantee (§2) — cheapest fix, hits the sharpest gap.
2. Convert the referral obligation into a real double-sided loop (§6).
3. Test one borrowed-channel relationship with a local VA/bookkeeping practice (§7).
4. Fix engage-queue target quality, not volume (§8).
5. Formalize the free demo's qualifying step (still correct from the first pass).
6. **Revised (see §3 correction): no *generic downloadable* low-ticket SKU** — that
   specific shape conflicts with the anti-generic positioning that's central to the
   whole pitch. But an interactive, personalized-feeling cheap artifact, scoped
   explicitly as a referral/distribution tool rather than a ladder rung, is a real
   option worth scoping — not ruled out.

---

## Sources

Same factual base as the first pass (`funnel/setup-offer/*`, `projects/Productize-
Offer/*`, `docs/research/*`, `brand/audiences/operator.md`, goal `f1f9ac5d`), reanalyzed
through: `offers`, `marketing-psychology`, `customer-research`, `cro`, `copywriting`,
`pricing`, `lead-magnets`, `referrals`, `social`, `prospecting`, `launch`,
`marketing-loops` (marketing-skills plugin, `~/.claude/plugins/marketplaces/
marketingskills/skills/`).
