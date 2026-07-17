# Handoff — Ghostwriter Venture ("ghost Writer" session, 2026-07-17)

**Read this to continue the conversation in any future session.** Everything below was decided or researched on 2026-07-17. Status: **decided GO, pre-build.** Nothing has been built yet.

## What we want to build

A white-label LinkedIn ghostwriting service for AI/dev-tool founders, powered by Simon's existing Content-Engine pipeline (research → draft → editorial gates → carousel → Postiz scheduling), sold as monthly retainers. Simon is the operator/QC layer (~2–4h/week/client at steady state); the system does the writing.

**The offer (mid-tier, ~$3K USD/month per client):** LinkedIn only. 12–16 posts/month (3–4/week), text-first, plus 2–4 carousels/month, plus a monthly strategy call. No video, no multi-platform — those are premium tiers for later. No separate setup fee (not market standard for LinkedIn retainers); month one is the same price with voice-seeding baked in.

## Why

- Simon's stated goal (brain note, 2026-07-02): **freedom over income** — a couple-few $100K/yr at fewer hours than his 37.5h/wk W-2. **Exit trigger: $8K CAD MRR sustained 3 months → quit the day job.** This session amended it: $8K MRR **plus ≥4 clients** (no client >35% of revenue), or $10K from 3 — because 3-client MRR is too fragile to quit on.
- Meta Architect is the destination, not the fast path: MA to $8K recurring is realistically 18–24 months (authority/enterprise sales from a 200-follower start). Ghostwriting to $8K MRR is ~6–9 months with a proven mechanic. **Ghostwriting is the bridge that funds MA** — that was the founding framing and it held up under audit.
- MA must be kept warm during the sprint (minimum cadence: commenting + posting rhythm) — Phase 3.7's compounding resets if the account goes dark, and the account is also the sales credential for this venture.

## Key decisions (all argued and settled — don't re-litigate)

1. **Segment: AI/dev-tool/tech founders only** (incl. Quebec bilingual tech scene). Reason: Simon's Meta Architect LinkedIn profile reads as a *demo* to AI founders ("I built this system for my brand, I'll run it for you") and as incoherent to non-tech niches. Also solves the judgment-risk problem (Simon can evaluate AI-niche content quality; can't in fitness/construction).
2. **Architecture: own the machine, sell the output.** Everything on Simon's infra (own Supabase, per-client schema or client_id column, per-client voice file playing brand-summary.md's role). Client owns delivered posts contractually; Simon owns the engine. **No per-client Command Center clones** (unpaid DevOps + trains clients to leave) — only as a $10K+ build engagement if someone asks.
3. **Delivery: start with hand-off** (client or their VA posts), offer Postiz OAuth scheduling as trust upgrade. Native posting also hedges LinkedIn-automation risk.
4. **Claude costs: separate API key, pay-per-token, NOT the Claude Code/Max seat.** Estimated $10–15/month at 10 prospects/day (Sonnet 5 intro pricing). Negligible; skip cache engineering unless 50+ prospects/day.
5. **Acquisition: value-first cold DMs** — find AI founders posting inconsistently (1K–10K followers, posting ≤1x/month), send 2–3 free sample posts in their voice, no pitch. Documented playbook; LinkedIn DMs ~10% reply rate (2x cold email); expect ~15–20 targeted DMs per client landed. **Automation stops at list-building and drafting — sending stays human, volume modest** (LinkedIn account-restriction risk; the MA brand lives on the same account).
6. **Pricing posture:** top of mid-tier from day one ($2.5–3.5K USD anglo; $1.5–2.5K CAD Quebec francophone; bilingual FR+EN delivery for Quebec companies = anglo-tier rates, near-zero competition, genuine moat).
7. **Timebox rule:** the build sprint gets an explicit scope + end condition; MA cadence drops but never to zero. Re-decide allocation after client #1 lands and real weekly hours are known.

## Market research findings (verified 2026-07-17, web search)

- LinkedIn ghostwriting retainers 2026: entry $500–2K, **mid-tier specialists $1.5–3.5K, experienced $2–5K/month** (validated the original claim), agencies $6–15K. Niche specialists charge 20–40% more.
- Setup fees are NOT standard for LinkedIn retainers (only for book ghostwriting) — dropped from the offer.
- **Formats:** document/carousel posts get ~125% more engagement, 39% more reach vs text; saves (carousels' strength) are the heaviest 2026 ranking signal; winning mix ≈ 60% text / 40% carousel. Text wins comments. → carousel capability is the highest-leverage build.
- Acquisition: cold DM + free samples is the documented playbook (Nicolas Cole et al.); portfolio not needed — samples are the portfolio.

## Economics / viability audit summary

- 2–3 clients hits the $8K CAD trigger (2 anglo × $3K USD ≈ $8.2K CAD).
- Steady state: 3 clients ≈ 13–17h/wk all-in (3–4h/client + 3–5h permanent sales pipeline; churn averages 6–12 months → need ~1 new client/quarter to hold).
- Solo ceiling: 6–8 clients (~$20–30K CAD/month) — beyond the freedom-over-income goal, don't chase it.
- Timeline given a real shot: first client month 1–2, $8K MRR month 6–9, trigger satisfied month 9–12.
- **Danger zone = the ramp** (months 1–4: build + outreach + onboarding on top of the 37.5h W-2), not the steady state.

## Build scope (not started)

1. **Carousel genericization** — Carousel Mode in `.claude/skills/repurpose/SKILL.md` works but is hardcoded to teardown structure (`state_scores`/`gaps`/`remediation`) and simonparis.ca OG routes. Needs a client-agnostic manifest builder + client-brandable slide routes. ~1 focused day. Highest leverage (see format research).
2. **Per-client voice-profile skill** — ingest ~5 of the client's best posts → structured voice file (the client's brand-summary.md equivalent). New build.
3. **Per-client ideation skill** — idea generation currently assumes MA pillars/ICP; clients need niche-specific + intent-mix-aware (most will want virality/reach, ≠ Simon's authority mix — different hooks, different gates). New build, bigger than it looks.
4. **Prospect-discovery tooling** — find AI founders matching the "posts inconsistently" filter; output a list + drafted DMs. Human sends. New build.
5. **Multi-tenant data isolation** — per-client schema or client_id in pipeline tables; one client's content must never leak into another's generation context. Fable-tier build work (Simon's call: use Fable for the build, Sonnet fine for content runs).
6. **Feedback loop (later):** check whether Postiz API exposes per-post analytics — unverified, was an open question.

## Open items

- **Simon's strengths/weaknesses profile — asked 3x, never delivered.** Get the 5-minute voice dump, structure it, `brain save --domain personal`. It decides anglo-first vs Quebec-first attack order.
- Postiz analytics API check (feeds the feedback-loop decision).
- First-prospect shortlist (candidates likely already in engage_targets — the superstar list in command-center Supabase).
- Contract template (ownership split: client owns posts, Simon owns engine/prompts/pipeline).

## Context pointers

- Roadmap/phase: Supabase `goals` via `http://100.105.85.5:3737/api/goals` — currently Phase 3.6 (blog infra) + 3.7 (audience growth), both in_progress.
- Exit-trigger brain note: `brain find "freedom over income"` → notes/simon-s-business-goal-stated-2026-07-02-optimize-for-freedom.md
- Pipeline skills: `.claude/skills/` (repurpose incl. Carousel Mode, write-post, editorial, linkedin-publish/postiz.mjs — the ONLY scheduling path).
- Engage queue / superstar targets: `engage_targets` table, command-center Supabase (memory: project_engage_queue).
- Session name: "ghost Writer". Origin: Simon asked to analyze a YouTube guru transcript (7 AI business ideas); ghostwriting was the one idea that survived brand-fit + infra-fit analysis; AI-SEO/GEO audits noted as a maybe-later second offer.
