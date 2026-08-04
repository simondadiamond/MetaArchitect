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
- 2026-07-15: When queueing pipeline stories that contain narrative/example content (log traces, sample scenarios, demo copy), write the EXACT final copy into the story description — never a sketch. PR #61's homepage trace band shipped an incoherent example ("same incident" panels showing two different incidents, literal "stage 6" pasted from my spec against named stages) because I described the scenario instead of writing it. Simon caught it in production. Fix story: 4fe511e5.
- 2026-07-31: Homepage rebuild (PR #102). Two reusable mechanics: (1) `text-wrap: balance` PREFERS breaking at explicit hyphens — a headline containing "re-explaining" split mid-word until the EN message used a non-breaking hyphen U+2011 (renders fine in Merriweather); shrinking the font never fixed it. (2) Worktrees under projects/simonparis-website/.claude/worktrees/ resolve node_modules from the primary checkout (no npm install needed), and Playwright is borrowable via `import { chromium } from "file:///home/diamond/projects/MetaArchitect/projects/command-center/node_modules/playwright/index.mjs"` with browsers already in ~/.cache/ms-playwright.
