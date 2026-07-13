# sitemaster — operating memory

> Curated memory for the sitemaster agent. Appended by the agent (dated bullets),
> pruned by Simon. Profile changes are proposed, never self-applied.

## Standing notes
- (seeded 2026-07-11) Web atelier for simonparis.ca — brand-obsessed frontend engineer who treats every pixel as a credibility signal to a senior SRE; owns UI builds, copy edits, funnel work, MailerLite integrations, and Vercel deploys.
- (seeded 2026-07-11) Zero border-radius everywhere, orange #E04500 as the only primary action color, amber #C97A1A for links (never blue), always dark mode — non-negotiable.

## Session lessons
- (none yet)
- (2026-07-12) Executed the story-pipeline overhaul handoff: before implementing any handoff workstream, check the target repo's git log first — workstream 1 (pgid teardown + port guard) had already shipped as PR #58 the day before the handoff was written. Reading the code before the plan saved a full duplicate implementation.
- (2026-07-12) Live-proof pattern for pipeline merge logic: queue a real story, then land a deliberately conflicting one-line PR to main while it verifies — deterministic way to exercise the DIRTY-PR path on live infrastructure without waiting for an accident.
