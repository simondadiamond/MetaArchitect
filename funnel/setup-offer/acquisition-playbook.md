# Setup Venture — Acquisition Playbook (rung-zero, least-work)

> **SUPERSEDED 2026-08-18 — HISTORICAL CONTEXT, NOT THE CURRENT PLAN.**
> Current direction: `funnel/setup-offer/positioning-brief-2026-08.md` and
> `funnel/setup-offer/offer-v5-ladder.md`. Kept for the research and language in it;
> do not optimize for the ICP, ladder or segment described below.

> Owner: Simon. Written 2026-07-19 (Fable session). The operating SOP for getting clients into the
> setup pipeline with minimum effort. Pairs with the `/build-story` skill (the content half of the
> flywheel). Offer context: goal `2116b881`; pricing evidence in brain (`tags: pricing setup-offer`).

## The flywheel (one loop, four steps)

1. **Do the work** — a paid working session, the sister setup, or your own infra build.

2. **Capture notes** — 5 minutes, bullet points, immediately after: what you built, what broke,
   what the owner said, one number if you have one.

3. **`/build-story`** — the pipeline turns notes into LinkedIn drafts (+ X variants). Approve,
   schedule via `/linkedin-publish`. Owner-facing stories soft-route to `/setup`.

4. **End every session with the referral ask** (below). Inbound + referrals book more sessions
   → step 1.

Manual work per loop: the session itself, ~5 min of notes, ~5 min of approvals, one ask said
out loud.

## The offer (rung zero)

**Price:** Working sessions, **$125 USD/hr**. Sold in 2-hour blocks ($250) by preference.

**Source of truth:** `projects/simonparis-website/lib/pricing.ts` is the single source of
truth for every offer price — read it at point of use before quoting anything.

**CAD quoting:** for Canadian buyers, quote the day's CAD equivalent as a courtesy line
(≈$170–175 CAD as of 2026-07), never a rounded CAD price. "≈$150 CAD" was a hidden 13%
discount that reached an outreach draft (lessons.md 2026-07-29).

**Format:** one-on-one, screen-share or in person. We set up THEIR workspace together —
their CLAUDE.md, their first skills, their data connections. They drive; you navigate.

**Rate logic** (if it ever feels low):

- The $2,500 diagnostic ≈ $100–150/hr effective. <!-- price-ok: derived math -->
- The $6,500 flagship ≈ $160–215/hr effective. <!-- price-ok: derived math -->
- $125 is the same curve's entry rung, and the flagship on the page anchors it.

The hour's real payoff is paid discovery + switching costs: after 3 sessions you know their
business better than any competitor, and you are the default for the project that follows.
Never pitch the project; let it emerge ("could you just build this for me?") or recommend it
once you've seen a workflow worth it.

## Disco / demo call (first touch — free, ~20–30 min, SIMON'S machine only)

The first call is a demo and a conversation, never a setup (Simon, 2026-07-31). Rules:

- **Simon's machine, Simon's screen-share.** Nothing gets installed or configured on their
  computer at this stage — their machine is a paid surface (Working Sessions and up).

- **Show the live OS.** Pick one thing from their world (an invoice chase, a follow-up they
  keep rewriting, a proposal) and run it through Simon's own setup so they watch a real
  system do a real task. This doubles as the v4 "Demo build" rung: one LIBRARY skill
  personalized on their real task, in the sitting, hard-capped — anything needing new base
  building is named as a Working Session, out loud.

- **Close by placing them on the ladder:** "here's what I'd do for you, and here's the rung
  it starts at." The demo sells the first paid session; the paid session starts their
  machine.

- **Warm-intro only** — the free demo is never published on the page (v4 spec: publishing
  it invites cold strangers to claim free work).

## Session flow (the PAID hour itself — their machine, they drive)

- **Open:** "what's the most annoying recurring thing you did this week?" Build toward that.

- **Your job is managing overwhelm, not demonstrating expertise.** Slow down when they lose
  the thread.

- **"Honestly, I don't know — let's figure it out" is allowed** and builds trust. Research
  it, open the next session with the answer.

- **Break at a natural point around the hour.** Book the next session before you hang up.

- **Same day: follow-up email** (template below). This is non-optional; it is half the
  retention.

## Templates

**Warm outreach text (EN):**
> Hey [name] — I've been building AI operating systems for businesses (mine runs on one, it's a bit
> ridiculous). Want a 20-minute look? Bring one real task — an invoice chase, a follow-up you
> keep rewriting — and I'll run it through my setup live so you see what yours would do. If it
> clicks, I do working sessions at $125/hr where we build yours, on your machine.

**Warm outreach text (FR):**
> Salut [name] — je monte des « systèmes d'exploitation IA » pour les entreprises (la mienne roule
> là-dessus). Ça te dirait, 20 minutes en démo ? Amène une vraie tâche — une facture à relancer,
> un suivi que tu réécris tout le temps — et je te montre en direct ce que mon système en fait.
> Si ça clique, j'offre des sessions de travail à 125 $ US de l'heure (≈ 170 $ CA) où on bâtit
> le tien, sur ta machine.

**Follow-up email (same day, adapt):**
> Good working with you today. Three things to try before next time:
> 1. [specific thing from the session]
> 2. [specific thing from the session]
> 3. [one small new thing they can do alone]
> We stopped at [where]. Next session we pick up with [next thing]. [Proposed date/time].

**Referral ask (say it, every session):**
> "If you've got a friend who runs a business and keeps saying they should figure out AI — send them
> my way. This works best with people who are curious and slightly overwhelmed."

## Channel priorities (research-verified, effort-ranked)

1. **Warm texts + referrals** — highest conversion, near-zero effort. First move, always.

2. **Build-in-public posts** (`/build-story`) — compounds unattended; feeds `/setup`.

3. **Reddit r/ClaudeAI + business subs** — ~1h/week answering real questions; pointer only
   when asked.

4. **Quebec local / francophone** — activate when the cohort exists, not before.

5. **YouTube** — parked until after the ghostwriting ramp; highest ceiling, highest cost.

No countdowns, no fake scarcity, ever: the verified conversion mechanics for this buyer are
risk reversal and published prices; the only honest urgency is real capacity ("two setups a
month").

## First 10 clients — the ladder, adapted

1. Sister setup weekend (goal `321e1fb5`) = practice + template + testimonial + first
   stories.

2. Three warm texts this week (template above). Sister's network counts as warm.

3. Referral ask at the end of every session, no exceptions.

4. Every session's notes → `/build-story` within 24h while it's fresh.

5. After ~5 sessions: one "what I learned setting up N businesses" post (owner-facing,
   /setup CTA).

6. After the first upsell emerges: case study (with permission) → the page's founding-rate
   slot fills.

7. Only then: local meetups / walk-ins, with proof in hand.
