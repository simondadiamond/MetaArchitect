# Operator-lane channel research — 2026-08-03

> Four-agent research workflow (session: COO, triggered by Simon's Instagram/carousel/playbook rethink after the Ash Harris "Claude + Carousels" video).
> Feeds: operator playbook rewrite, IG channel unblock (goal `51373480`), competitor-miner scoping.
> Full agent output with sources: workflow `wf_356ea0b0-121` (session transcript). Key sources cited inline.

## 1. Instagram as secondary channel — qualified YES (presence, not pipeline)

- **Verdict**: worth having as a passive cross-post surface at near-zero marginal cost — social proof when prospects check the brand + slow discovery trickle. NOT a lead channel without native engagement.
- Target demo is present: 62% of US adults 30–49 use IG (Pew 2025) — but in leisure mode; LinkedIn still drives 80%+ of B2B social leads.
- No cross-platform duplicate-content penalty exists. Ghost-posting forfeits roughly 20–40% of achievable engagement (replying to comments alone = ~21% engagement boost, Buffer Oct 2025) and most of the compounding loop (sends-per-reach is the top non-follower distribution signal) — but is not otherwise punished.
- New-account reach is recommendation-driven (follower-count-agnostic); carousels still get pushed to non-followers and have the highest save rates of any format.
- **Format correction (important)**: 1080×1350 is 4:5, not 3:4. Meta's publishing API accepts only 4:5–1.91:1; true 3:4 (1080×1440) gets force-cropped. The profile grid shows a 3:4 center crop (~1012×1350) — keep text in the vertical center safe zone. **Existing carousel pipeline output cross-posts unchanged.**
- Upgrade path if signal appears: ManyChat comment-to-DM automation (~$14–29/mo, official Meta Business Partner, ToS-compliant; free tier now useless at 25 contacts). Requires Professional account.

## 2. LinkedIn comment-gated lead magnets — playbook prohibition OVER-EXTENDED

- The playbook's two cited sources (DigitalApplied 2026, ExpertLinked Feb 2026) condemn only low-effort bait ("Comment YES", reaction polls, tag-a-friend). **Neither mentions comment-gated lead magnets.** Verified by direct fetch of both.
- Explicit carve-out found (EcomGhosts, "The Lead Magnet Exception"): comment-to-resource CTAs are legitimate when (a) real value exchange, (b) content–resource alignment, (c) ≤ ~1 in 5 posts.
- Practitioner numbers favor gating over link CTAs (the link baseline itself eats a ~60% reach penalty). Directional vendor-biased figure: gated distribution ~8x link posts; one case: 73 comments → 41 DM convos → 9 discovery calls in a week.
- **The real 2026 risk is the fulfillment layer, not the post format**: auto-DMing commenters via third-party tools violates LinkedIn's automation policy — enforcement is aggressive (vendor-level action against HeyReach ~30K users, Mar 2026; shadow bans; ID-verification lockouts). Manual/human-paced DM fulfillment is the compliant path.
- **New rule (pending Simon's approval)**: comment-gate sparingly (≤20% of posts), real resource, aligned topic, manual DM fulfillment, never "comment YES"/tag/poll bait, vary the CTA keyword.

## 3. Postiz → Instagram — supported, two blockers, ~60–75 Simon-minutes

- Self-hosted Postiz builds real Graph API carousels (up to 10 images). 1080×1350 (4:5) is in range. Slides must be **JPEG** (API rejects PNG-only mimetypes; postiz.mjs `upload()` hardcodes image/png — needs fix).
- **Blocker 1**: no Meta app configured; only LinkedIn connected (verified live via `postiz.mjs channels`).
- **Blocker 2 (the big one)**: IG publishing is fetch-by-URL — Meta cURLs each image from a public HTTPS URL. This install uses `STORAGE_PROVIDER=local` behind the tailnet-only domain → "Media fetch failed". Fix: Cloudflare R2 storage (`CLOUDFLARE_*` env vars, Postiz-supported).
- Simon-required (~60–75 min, two sittings): Meta developer Business-type app + Instagram product + permissions + redirect URI; IG account → Professional (Business route needs a linked Facebook Page; Standalone route avoids it but has a reported self-hosted bug — Business route safer); add own IG as app Tester (**no app review needed in Development mode**); R2 bucket + token; OAuth dance in Postiz UI.
- Agent-side (story-sized): compose env vars + recreate container (then re-run `patch-linkedin-scopes.sh` per SETUP.md), postiz.mjs `integrationFor()` instagram branch + `POSTIZ_INSTAGRAM_INTEGRATION_ID`, JPEG export + mime-by-extension.
- Ongoing: Meta long-lived tokens expire ~60 days → reconnect via OAuth (same pattern as LinkedIn).

## 4. Competitor/creator watchlist (initial 20) + gaps

Rough audience figures, 2024–2026 public sources. Mine mechanics, don't copy positioning.

| Creator | Where | Why notable / mechanics |
|---|---|---|
| Ash Harris | IG+YT @ashharrisprod ~16K; orgrowth.ai | Claude-generated carousels, keyword-DM gates, 5,500 leads/60d claim; DFY funnels for coaches. Closest DFY comp, niched to funnels |
| Nick Saraev | YT ~400K; Maker School ~$250K/mo; leftclick.ai | Most credible operator; real agency behind the teaching. Long-form Make/n8n builds → Skool |
| Liam Ottley | YT ~730K; AAA Hub 300K+ | Coined "AI Automation Agency"; sells the sell-automation path, not run-your-business |
| Nate Herk | YT ~850K; AI Automation Society | n8n educator; income-claim hooks + free templates. Exited his real agency Dec 2025 |
| Ruben Hassid | LI ~500K; EasyGen | AI-written LinkedIn growth proof; every post funnels to SaaS |
| Zain Kahn | LI ~800K; Superhuman 1.5M subs | Volume king; cheat-sheet carousels → newsletter sponsorships. Zero operational depth |
| Allie K. Miller | LI ~2M | Biggest "AI for business" brand; enterprise-skewed; Maven courses + keynotes |
| Rachel Woods | TikTok ~160K; AI Exchange | Anti-hype "AI ops" for small biz; closest philosophical neighbor; frameworks, no builds |
| Heather Murray | LI + nontechies.ai | Owns "no jargon" for non-technical owners — Simon's audience temperature. Education-only |
| Sabrina Ramonov | 3M+ claimed; Blotato | Face of AI content-machine automation; free templates → SaaS |
| Grace Leung | YT ~127K | "Claude handles ~80% of her marketing" — closest tool-stack story. Workflow tours, no DFY |
| Dan Martell | IG ~2M | "Buy back your time"; industrial keyword-DM machine; elite funnel mechanics, thin substance |
| Justin Fineberg | TikTok ~290K; Cassidy AI | Audience-first-then-SaaS template; demos not deployments |
| Jodie Cook | Forbes + LI; Coachvox | Prompt-pack listicles farming the coach audience; prompts without operations |
| Rick Mulready | Podcast 12M+ downloads; AI Playbook | Deepest trust with course-creator/coach segment; teaches delegation, doesn't build |
| Stephen G. Pope | YT + Skool | Systems-architecture content automation; worth mining for architecture ideas |
| Ole Lehmann | X ~130K | AI-solopreneur course wave archetype; hook/format mine |
| Christopher S. Penn | Newsletter ~294K | The rigor benchmark; proof substance has an audience; marketing/mid-market aim |
| Wes McDowell | YT ~400K | Actually serves local/service business owners; education-only |
| Julia McCoy | YT ~300K (AI clone) | Automation-as-spectacle extreme; the fake-demo tension made flesh |

**Gaps the field leaves open (all five favor The Meta Architect):**
1. **Receipts gap** — visible revenue IS the course everywhere; nobody publishes logs/PRs/uptime of a real operating business. "Boring evidence" has no competitor.
2. **Reliability gap** — demo-ware culture; no one discusses state, validation, retries, month-3 breakage. "State Beats Intelligence" has zero competing voice.
3. **DFY gap** — everyone sells learning or SaaS; the actual service-business owner is told to learn n8n. Only DFY comp (Harris) is niched to coach funnels. The $6.5K setup sits in open space.
4. **Audience mismatch** — the biggest channels sell shovels to shovel-sellers (aspiring agency owners), not to operators.
5. **Trust erosion** — inflated claims are the norm and buyers are burned (review-site cottage industry exists). Gate real artifacts (a log, a walkthrough, an audit), not another PDF prompt pack.
