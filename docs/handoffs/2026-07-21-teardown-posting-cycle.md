# Handoff — Morgan Stanley teardown posting cycle (2026-07-21)

## State
- Blog LIVE: simonparis.ca/blog/morgan-stanley-ai-assistant-state-teardown (hero attached, no inline CTA — site PostCTA renders the founding-program block).
- Announcement PUBLISHED on LinkedIn 17:38 UTC as 7-slide carousel (postiz cmruxo7uy…, urn:li:ugcPost:7485387822959439872). First comment posted by Simon.
- Scheduled (all 14:30 UTC, booked via linkedin-publish/postiz.mjs, nudger active):
  - Thu 7/23 dc776ed6 MS tolerance-gap (slide 5)
  - Tue 7/28 ed75a667 compounding-math (text)
  - Thu 7/30 1836905b MS auditability + /score CTA (slide 4)
  - Tue 8/04 a4d082c7 "That's shit" client story (text)
  - Thu 8/06 2cb856f7 MS free-control (slide 2)
- Drafts drawer (9, all gate-clean after 2026-07-21 triage; 7 rejected with reasons in pipeline.logs): EU AI Act Article 12 (652db942 — **standing pick for Tue 8/11**, Article 12 obligations land Aug 2026), manager-agent theater (689af2d4), state-as-stack-trace (cdf4e6d5), pydantic strict (fdced594), TOCTOU race (e6cf89bf), generation-vs-question (4f3ac4c0), Cline npm (1a2a71b3), verifier-write-access (928ccdf7), readiness test (aba78169).

## Pending Simon
- Ramp published post still ends with an inline /score closer stacked above the template CTA ("3 CTAs" issue) — strip on his word only.

## Stories in flight (command-center)
- ae1cd30f — stage-aware retry for failed_inserting (stale factcheck → fact_check)
- 60fff23a — panel hook-length ≤140 gate
- b39e814f — panel announcement body-link rule
- fbbecd0c — /blog index OG-card images (sitemaster)

## Rules changed this session (already committed)
- Body link is DEFAULT placement (linkedin-gate.md canonical; repurpose + teardown-generate updated).
- Teardown derivatives capped at 3 (announcement = post 1 of 4); auto-carousel in Scheduled Mode.
- linkedin-publish: media-before-schedule rule (2026-07-21 near-miss).
- blog-optimize: post-factcheck edits reset to fact_check + carry full meta forward.
