# Operator Playbook — The Meta Architect (2026-08)

> Voice, hooks, CTA, and cross-post mechanics for the OPERATOR lane (the /setup buyer).
> Layered on top of `linkedin-playbook.md`, which stays authoritative for platform physics
> (algorithm, formats, timing, anti-slop) and for practitioner-lane voice. Where this file
> is silent, that file rules. Audience definition and voice test: `brand/audiences/operator.md`.
> Research base: `docs/research/operator-channel-research-2026-08-03.md`.

---

## Who this is for (one breath)

Owner-operators of service/expertise businesses who already pay for Claude and use 10% of it.
Business pain in business words: invoices, follow-ups, evenings, sounding like yourself.
**Never tool language** on operator surfaces: no "agents", "context windows", "orchestration",
"MCP", "state management". Voice test: the Busy Owner Test (operator.md).

## Strategic position (from the 2026-08-03 field research)

The field sells courses about automation to people who want to sell automation. Nobody shows
a real business running on these systems, and nobody builds it FOR the owner. The two moves
that exploit this:

1. **Receipts are the hook, not the appendix — and they must be operator-legible** (Simon's
   correction, 2026-08-03). An operator does not care about a logfile. The receipt is the
   OUTCOME artifact: the sent follow-up, the finished proposal, the before/after week, the
   evening reclaimed. Logs, PRs, and uptime are the internal source of truth that makes the
   number honest — they never appear in operator content; raw-system receipts belong to the
   practitioner lane. Rules for quantified claims: showcase sub-pillar in operator.md (real,
   verifiable numbers only; the claim carries the punch, never the adjective).
2. **Sell the install, not the lesson.** Every CTA path leads to done-for-you (/setup), never
   to "learn how". Teaching content is fine; it demonstrates competence, and the CTA still
   points at "I set this up for you."

## Capability education register (Simon-approved 2026-08-03)

Second register alongside receipts, calibrated from the Acuña analysis (research doc §4-5:
his audience is LESS technical than ours; what works is capability-level content that names
the tool and stays spec-free). Purpose: raise what operators EXPECT from the AI they
already pay for.

- **Name the tool plainly** (Claude, Claude Cowork) when it's the thing the reader already
  pays for. The jargon ban stays fully in force: no "agents", "context windows",
  "orchestration", "MCP", "state management".
- **Teach what's possible and why it pays, never the implementation steps.** The reader
  finishes thinking "I should expect more from this thing," not holding a tutorial.
  Implementation lives in the ladder: sessions are the honest DIY rung, the setup is the
  DFY rung; both reader reactions are monetized, so "learn this" framing is allowed and
  encouraged as demand generation. Trying it and hitting the wall is the fastest path to
  the audit.
- **Close on expectation, not instruction**: what good looks like, what staying at 10%
  usage costs. Example close: "You don't need another tool. The one you already pay for
  can do this. Most people never set it up."

## Hook library (operator register)

Same physics as the practitioner library (mobile fold ~140 chars, under 10 words wins,
thought not headline). Different register: Tuesday-night pain, not 2am pager pain.
Never fabricate. Numbers come from logs or don't appear. Zero em dashes in posts.

1. **The receipt**
   Template: `[Real count/artifact] this [period]. [What it replaced].`
   Example: "31 client follow-ups sent this month. I wrote none of them and every one sounds like me."

2. **The Tuesday mirror**
   Template: `It's [time]. You're doing [owner chore] again.`
   Example: "It's Sunday, 9pm. You're doing invoices again."

3. **The re-explain**
   Template: `You've told [tool/person] about your business [absurd count] times.`
   Example: "You've explained your pricing to ChatGPT forty times. It still quotes the wrong rate."

4. **Before/after week**
   Template: `[Chore] used to take [real time]. Last week: [real time].`
   Example: "Proposals used to eat my Thursday morning. Last week: eleven minutes, and I only read and hit send."

5. **The 10% confession**
   Template: `You pay [real price] for [tool]. You use it like [cheap thing].`
   Example: "You pay $100 a month for Claude and use it like a $0 thesaurus."

6. **The bottleneck name**
   Template: `Your business doesn't have a [assumed problem]. It has a [real one]: you.`
   Example: "Your business doesn't have a software problem. Everything waits on your evenings."

7. **What ran without me**
   Template: `While I [human thing], [specific work] happened. [Outcome proof].`
   Example: "While I was at my kid's swim practice, the workshop reminders went out. On time, in my voice, nobody chased me."

8. **The generic-draft allergy**
   Template: `[Tool] wrote you a [artifact] that sounds like [wrong company].`
   Example: "Claude wrote you a follow-up that sounds like a bank sent it. That's a setup problem, not an AI problem."

9. **Cost of the owner-hour**
   Template: `You bill [real rate]. You spent [hours] on [admin chore].`
   Example: "You bill $150 an hour. You spent four of them chasing overdue invoices."

10. **The toggle deflation** (Claude for Small Business wedge, operator.md)
    Template: `[Big vendor thing] ships [generic solution]. You don't run a generic [business].`
    Example: "Claude now ships ready-made workflows for a generic small business. You don't run a generic small business."

## Comment-gated lead magnets — the rule (2026-08-03, supersedes the blanket ban for this lane)

The old "never comment-gate" reading over-extended its sources; they ban low-effort bait only.
Full ruling and evidence: research doc §2.

- **Allowed**: "Comment [WORD] and I'll send it" when the gated thing is a REAL artifact
  aligned with the post. Gate receipts, not PDFs: a working walkthrough, a checklist that came
  from an actual build, an audit sample.
- **Cap**: at most 1 in 5 posts. Vary the keyword every time. Track against `pipeline.posts`
  like the CTA cadence check.
- **Fulfillment is manual, always.** No auto-DM tools on LinkedIn, ever; LinkedIn's 2026
  enforcement targets the automation layer (vendor takedowns, shadow bans, ID lockouts).
  Budget the reply time before posting or don't gate.
- **Still banned everywhere**: "Comment YES", "Agree?", tag-a-friend, polls-as-bait, "Repost if".
- Every gated DM conversation is a lead: log it (CRM person or note) before it scrolls away.

## CTA routing

- Soft CTA to `/setup` roughly every 3rd operator post (mechanical check against the last 2
  operator rows in `pipeline.posts`; same mechanism as the practitioner `/score` rule).
- `/score` belongs to the practitioner lane; `/readiness` is never public. A comment-gate
  counts as that post's CTA; don't stack gate + /setup in one post.

## Cadence across lanes (Simon, 2026-08-03)

- **Operator is the optimization target.** Default mix ~60% operator / 40% practitioner
  (pending revisit after first founding client).
- **Practitioner lane runs in the background**: one teardown every 2 weeks, fanned to ~4
  LinkedIn posts by the existing repurpose pipeline (auto-carousel included). No new
  automation: teardown generation stays Simon-triggered; this is an editorial policy line.
- Weekly volume, timing, format rotation: unchanged from `linkedin-playbook.md`.

## Instagram cross-post spec (secondary surface, not a lead channel)

Presence, not pipeline: cross-post buys social proof and a discovery trickle; it will not
build pipeline without native engagement (research doc §1). Expectations set accordingly.

- **Format**: existing 1080x1350 carousels are 4:5 and upload unchanged. Meta's API accepts
  4:5 to 1.91:1 only; true 3:4 (1080x1440) gets force-cropped. Keep text inside the vertical
  center ~1012x1350 (the grid shows a 3:4 center crop).
- **Files**: JPEG only for the IG path (the API rejects the PNG mimetype route we use for
  LinkedIn). No watermarks (suppressed).
- **Caption**: short (0–100 chars), no links (distribution penalty); link lives in bio.
  Cross-post the carousel, not the LinkedIn essay.
- **Ghost-account honesty**: no reply duty is assumed. If signal appears (saves, profile
  visits, inbound DMs), the upgrade path is ManyChat keyword-to-DM (~$15–29/mo, Meta Business
  Partner, requires Professional account) plus real reply time. That is a separate, explicit
  decision; don't drift into it.
- Delivery: Postiz once the Instagram channel is connected (goal `51373480`; unblock runbook:
  `docs/runbooks/instagram-postiz-unblock.md`).

## Anti-slop

The full checklist in `linkedin-playbook.md` applies to operator posts unchanged, plus:
- No tool language (the operator-lane version of jargon slop).
- No internal business mechanics in customer-facing copy (margins, "built once", automation
  degree) per brand-summary prohibitions.
- Receipts must survive the screenshot test: if the artifact in the post can't be shown
  (privacy, client data), show the mechanism and keep contents hidden (operator.md showcase
  rules). Never mock up a fake surface.
