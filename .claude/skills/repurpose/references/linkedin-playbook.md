# LinkedIn Playbook — The Meta Architect (mid-2026)

> Reference for the `/repurpose` skill: converting blog posts and STATE teardowns into LinkedIn posts.
> Researched 2026-07-05 from 2025–2026 sources. Every trend claim carries a source note.
> **Re-verify by 2027-01**: algorithm claims rot; re-run the research sweep and update this file (or mark sections stale) — don't let a 6-month-old "mid-2026" snapshot masquerade as current.
> Audience: LLM platform/reliability leads in data-sensitive enterprises. Voice: confident, diagnostic, concrete.

---

## Algorithm reality (mid-2026)

- **Interest graph beat social graph.** Distribution is driven by topic-matching the actual post text against reader interests, not by who you're connected to. LinkedIn's "360Brew" ranking model also scans your profile headline/experience to verify you have authority on the topic — post inside your stated lane. (Forbes / Jodie Cook, Jan 2026; meet-lea.com algorithm guide, 2026)
- **Dwell time is the primary quality signal.** Posts holding readers 61+ seconds see ~13x the engagement of posts skimmed in 0–3 seconds. Write for the slow read, not the scroll-by. (Stackmatix data breakdown, 2026)
- **Saves are the heaviest engagement signal** — roughly 5x a like and ~2x a comment. Referenceable content (frameworks, checklists, taxonomies) wins. Comments weigh ~15x a like. Reactions are near-noise. (Forbes, Jan 2026; SocialPilot algorithm guide, Jun 2026)
- **Early test window still exists.** A post is shown to a small follower slice first; strong engagement in the first ~2 hours expands distribution. Author replies to comments boost engagement ~30%. One prominent source (Forbes, Jan 2026) argues "there has never been a golden hour" — position taken here: the test window is real per multiple guides, but consistency matters more than clock-watching. (Postiv AI frequency guide, 2026; Buffer w/ LinkedIn team input, Dec 2025)
- **External links: mild penalty, not death.** Aggregate data shows link posts reach ~30–50% fewer people, but LinkedIn's own guidance (via Buffer, Dec 2025) is that links are fine if the post itself delivers standalone value. Link-in-first-comment is obsolete advice — links can sit in the body. (Dataslayer, Feb 2026; Buffer, Dec 2025; Forbes, Jan 2026) *House rule (Simon, 2026-07-07): this wins — body links allowed, max one bare URL, never in the hook; mechanics in `linkedin-gate.md`.*
- **Hashtags are functionally dead for distribution.** The algorithm classifies posts by their text via interest graphs; hashtags are at best cosmetic. 0–3 maximum, or none. (Forbes, Jan 2026; Buffer, Dec 2025 — "nice to have, not a need to have")
- **AI-slop suppression is official policy.** LinkedIn (VP Laura Lorenzetti, May 2026) announced reach limits on content that looks AI-generated without genuine perspective, suppression of AI/bot comments, and verified-profile filters. Claimed 94% detection accuracy in early tests; flagged posts aren't removed, they're quietly excluded from recommendations. The named tell: "it's not X, it's Y" phrasing. (Social Media Today, May 2026; TheNextWeb, 2026; Engadget, 2026)
- **Engagement bait is detected and penalized.** "Comment YES if you agree," reaction polls, tag-a-friend — classifier-suppressed. Engagement pods draw reach penalties up to ~45% via reciprocal-pattern detection. (DigitalApplied engagement guide, 2026; ExpertLinked, Feb 2026)
- **Video is no longer a reach hack.** Feed video reach dropped ~36% YoY (0.86x average reach across 3M+ posts, Mar 2025–Feb 2026). It converts well but underperforms documents and images for reach. Some B2B strategy shops still push video hard — the large-dataset numbers say otherwise for text-first technical audiences. Position: video is optional, not required. (AuthoredUp 3M-post study, updated Jun 2026)
- **Format monotony is penalized** (~20% for repeating the same format continually). Rotate text / document / image. (Grow with Ghost format ranking, 2026)
- **Median organic reach is down ~65% from peak**, while the top slice of posts compounds. Fewer, denser posts beat volume. (LaGrowthMachine B2B guide, 2026)

---

## Format ranking for B2B technical content

Data: AuthoredUp 3M+ post study (Mar 2025–Feb 2026) for multipliers; Buffer (Dec 2025) for carousel engagement.

| Rank | Format | Reach | Engagement | Verdict for The Meta Architect |
|------|--------|-------|------------|-------------------------------|
| 1 | **Document / PDF carousel** | 1.39x | 1.30x (best; ~6.6% avg ER) | Best format for STATE teardowns: score tables, failure taxonomies, before/after architecture. 8–10 slides max — abandoned carousels get distribution cut. Caption short (0–100 chars). Only ~5% of creators use them. |
| 2 | **Image + text** (single diagram/screenshot) | 1.20x | 1.33x | Architecture diagram, log excerpt, STATE scorecard screenshot + diagnostic text. Cheap to produce from blog assets. |
| 3 | **Text-only** (1,000+ chars) | 1.07x | 0.78x | The authority workhorse. Best for contrarian takes and failure post-mortems. Under ~400 chars underperforms badly — don't post short. |
| 4 | **Newsletter** | n/a (notification delivery) | subscriber-gated | Guaranteed delivery to subscribers' inboxes/notifications. Good home for monthly teardown digests once cadence is stable. Open rates 25–35%. |
| 5 | **Video** (native) | 0.86x | 0.93x | Optional. If used: 45–90s talking-head diagnostic, or 3min+ deep dive (3min+ outperforms sub-30s clips). Not required for this brand. |
| 6 | **Article** | 0.69x | 0.44x | Weak feed reach but ranks in LinkedIn + Google search and gets cited by AI assistants. Use only for evergreen reference pieces; the blog already fills this role. |
| 7 | **Poll** | 1.78x | 0.37x | Reach trap: impressions without profile visits or discussion; multiple 2026 sources call polls deprioritized/"terrible." Skip. |
| 8 | **Reshare** | 0.29x | 0.22x | Worst format. Never reshare the blog post link bare; always write a native post. |

**Repurposing default:** one blog post → 1 document carousel (the framework/scores) + 1–2 text posts (the sharpest single failure mode, the contrarian claim) + optionally 1 image post (the diagram).

---

## Hook library

Rules: the hook must survive the mobile fold (~140 characters; desktop ~210). Under 10 words outperforms longer by ~40% (Kleo template analysis, 2026). Sound like a thought, not a headline (Medium/Viral Boris hook study, 2026). Contrarian and curiosity-gap hooks outperform others ~2.3x; specific-failure openers are this brand's native register.

All examples below are in The Meta Architect voice. Never fabricate an anecdote — pull the specifics from the actual blog post or teardown being repurposed.

1. **Specific failure opener**
   Template: `[System] did [specific wrong thing] in production. [Blunt consequence].`
   Example: "The agent retried a payment call it had already made. Twice. Nobody had logged the first attempt."

2. **Contrarian claim**
   Template: `Everyone [common belief]. [Flat contradiction].`
   Example: "Everyone's waiting for a smarter model to fix their agent. The model was never the problem."

3. **Diagnostic question (assumes shared pain)**
   Template: `Can you [thing a reliable system must do]? No? [Reframe].`
   Example: "Can you reproduce your last LLM bug? No? Then you don't have a bug. You have a mystery."

4. **The receipts / scored-teardown hook**
   Template: `We scored [system] on [criteria]. [Uncomfortable number].`
   Example: "We tore down a production support agent against STATE. It scored 1 out of 5. The 1 was generous."

5. **Numbered failure taxonomy**
   Template: `[N] [failure modes / patterns] I keep seeing in [context]. All [N] are [reframe].`
   Example: "5 LLM failure modes from this quarter's incident reviews. All 5 are state failures wearing a model costume."

6. **Cost-of-the-gap number**
   Template: `[Tiny missing thing] cost [concrete price]. The fix was [absurdly small].`
   Example: "One missing idempotency key: 40 hours of incident review. The fix was six lines."

7. **The compliance question your system can't answer**
   Template: `[Regulation] asks one question: [question]. [System] can't answer it.`
   Example: "Law 25 asks one question of every automated decision: why did it do that? Most agents I audit can't answer for a single one."

8. **The binary test**
   Template: `If [failure event] happened right now, would your system [correct behavior] — or [actual behavior]?`
   Example: "If your pipeline crashed at step 6 right now, would it resume at step 6 — or start over from step 1 and double-charge someone?"

9. **Name the unnamed failure mode**
   Template: `There's a name for [precisely described bad behavior]: [name].`
   Example: "There's a name for an agent that continues after a failed validation and writes anyway: a liar with commit access."

10. **The post-mortem quote**
    Template: `"[Verbatim thing people actually say]" is not [what they think it is].`
    Example: "'The model did something weird' is not a root cause. It's a confession that you have no traces."

11. **Hype deflation**
    Template: `Another [hyped thing]. Still no one [unglamorous fundamental].`
    Example: "Another week, another agent framework launch. Still nobody shipping retry logic with idempotency."

12. **Before/after architecture**
    Template: `Same model. Same prompt. [One structural change]. [Result delta].`
    Example: "Same model, same prompts. We added a typed state object and a validation gate. Reproducible failures went from zero to all of them."

---

## Post anatomy

The brand's existing anatomy (hook / setup / turn / lesson / close) **survives 2026 intact** — it maps directly onto what dwell-time ranking rewards. Four parameters change; changes are flagged below.

```
Line 1:    Hook — must fully land within ~140 chars (mobile fold).
           (blank line)
Line 2-3:  Setup — what most people think or do. Short.
           (blank line)
Line 4-6:  The turn — what's actually happening. The mechanism. Name the
           component, the number, the failure mode. This is the dwell-time payload.
           (blank line)
Line 7-9:  Lesson — architectural, actionable, save-worthy. If it can be a
           2-4 line mini-checklist, make it one (saves > likes, 5x).
           (blank line)
Line 10:   Close — ONE specific question a practitioner would actually answer,
           OR a one-line STATE tie-in. Never both, never generic.
```

**What changed vs. the pre-2026 brand anatomy, and why:**

1. **Hashtags: 3–5 → 0–3, and 0 is fine.** OLD RULE OBSOLETE. The interest graph classifies posts from body text; hashtags no longer drive distribution (Forbes, Jan 2026; Buffer, Dec 2025). If used at all, max 3 niche ones (#AIReliability-tier, not #AI). Never let a hashtag row be the visual close of a post.
2. **Length: 150–250 words → 180–300 words (≈1,300–1,900 characters).** UPDATED. Short posts are now the weakest length band (<200 chars: 1.53% ER vs 2.56% for long; sub-400-char posts take a ~27% engagement hit). The sweet spot across 1M+ post datasets is 1,300–1,900 chars ≈ 200–300 words (ConnectSafely length guide, 2026; AuthoredUp, Jun 2026). The old 250-word ceiling was cutting posts off below the dwell-time payoff.
3. **Close-question quality bar raised.** The anatomy's "question inviting response" survives, but generic invitation ("Agree?", "Thoughts?", "Comment YES") is now classifier-detected engagement bait and suppressed (DigitalApplied, 2026). The question must be answerable only by someone with production scar tissue: "What's the failure mode your traces still can't explain?"
4. **New requirement — author presence in the first 2 hours.** Reply substantively to early comments (adds ~30% engagement, Buffer, Dec 2025). A reply is a second chance to add mechanism, not "Thanks!". Budget 20 minutes post-publish. Seeding: it's fine to drop the first comment yourself with the blog link or a supporting detail — but the post must stand alone without it.

**Other structural norms (confirmed current):**
- Line break every 1–2 sentences. White space is structural. No decorative-symbol bullets (screen readers, feed clutter).
- Blog link: allowed in the body if the post delivers the core insight by itself. The post is the product; the link is the appendix.
- Rotate formats across the week (text → carousel → image); same-format streaks cost ~20% reach.

---

## Anti-slop checklist

Run every draft against this. LinkedIn's classifiers AND the burned-practitioner audience are both filtering for the same tells. One hit = rewrite the offending line.

**Classifier-flagged patterns (LinkedIn has named these):**
- [ ] No "it's not X, it's Y" constructions — LinkedIn's publicly cited AI-tell (Engadget/TheNextWeb, 2026). Note: the brand phrase "It's not about the model — it's about the plumbing" matches this shape; keep it out of hooks and vary its phrasing ("The model was fine. The plumbing wasn't.").
- [ ] No engagement bait: "Comment YES", "Agree?", "Tag someone who", "Repost if".
- [ ] No pods, no reciprocal-engagement circles, no AI-generated comments on others' posts — reach penalties up to ~45%, shadowbans without warning.

**Audience-flagged slop tells (2026 reader allergies):**
- [ ] No "Let that sink in." / "Read that again." / "Big news 🚀" / emoji rows.
- [ ] No symmetrical tricolons ("No fluff. No hype. Just results.").
- [ ] No fake vulnerability arcs ("3 years ago I almost quit...") — this brand never fabricates anecdotes; use verified teardown facts instead.
- [ ] Em dashes: not an actual detector signal (the 2026 "em dash discourse" was noise — Entrepreneur, 2026), but the audience side-eyes heavy use. *Superseded by Simon's zero-em-dash rule (2026-07-05) for all posts and comments — the max-2 budget here is history, not guidance.*
- [ ] Every claim has a mechanism. "Testing matters" is slop; "the validation gate rejected 3 of 40 outputs that would have written garbage to Supabase" is content.
- [ ] Specificity test: if the company/number/failure mode could be swapped for a placeholder, it's too vague to post.
- [ ] Brand prohibitions (always in force): "excited to share", "thrilled to announce", "game-changing", "revolutionary", "groundbreaking", "cutting-edge", "in today's fast-paced world", "in the age of AI", hedging the thesis.
- [ ] Would a reader **save** this? If there's nothing referenceable (a checklist, a taxonomy, a score, a test), add one or don't post.

---

## Timing & cadence

- **Cadence: 3–4 posts/week** for a solo B2B brand. 2–5/week gains ~1,182 impressions/post over 1/week; daily posting is now counterproductive — a good post lives 48–72 hours and same-account posts cannibalize each other. Never >1 post/day. (Postiv AI, 2026; LinkBoost frequency guide, 2026)
- **Timing: Tue–Thu, 10:00–12:00 audience-local** is the strongest window across four studies / 8M+ posts; 2026 data also shows a mid-afternoon rise (Wed ~4pm the single best slot). (SuperGrow, May 2026; Buffer 4.8M-post study, 2026)
- **Conflict, resolved:** Forbes (Jan 2026) claims posting time doesn't matter, only consistency. Position: consistency is the first-order variable; timing is second-order. Pick 3 fixed slots (e.g., Tue/Wed/Thu ~10:30 ET), keep them, stop optimizing.
- **Post-publish protocol:** stay 20 minutes; reply to every substantive comment with added mechanism within the first 2 hours.
- **Weekly mix** (matches brand intent ratios — authority 50 / education 30 / community 15 / virality 5): 2 text posts (authority: teardown finding, contrarian claim) + 1 document carousel (education: framework/checklist) + 1 optional image or community post. ≥2 posts/week land on State Beats Intelligence.
- **Soft /score CTA every ~3rd post** (Phase 3.5 lead-capture rule): roughly every third LinkedIn post carries a soft CTA to `simonparis.ca/score` — phrased as a practitioner sharing a tool ("I scored this system with the STATE self-assessment on my site — takes 5 minutes, no email to see your score"), never as a marketer pushing a download. Check mechanically before drafting: query the last 2 rows in `pipeline.posts` (platform `linkedin`, shipped/drafted); if neither mentions `/score`, this post carries the CTA (body close or seeded first comment both fine). The `/score` URL is the canonical public lead-capture link — never point public CTAs at `/readiness`.

---

*Sources consulted (2025–2026): Buffer (LinkedIn-team-sourced algorithm guide, Dec 2025), AuthoredUp 3M-post format study (updated Jun 2026), Forbes/Jodie Cook (Jan 2026), Social Media Today (May 2026), TheNextWeb, Engadget, Entrepreneur (2026 AI-slop coverage), SuperGrow & Buffer timing studies (2026), ConnectSafely length/hook guides (2026), Stackmatix, SocialPilot, DigitalApplied, Dataslayer, LinkBoost, Postiv AI (2026). Where sources conflicted (links, video, golden hour, timing), the position taken is stated inline.*
