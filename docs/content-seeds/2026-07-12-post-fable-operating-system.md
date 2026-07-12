# Content seeds — Post-Fable Operating System

> Raw material for a flagship post. Working title: **"I spent the frontier model's last week making sure I never need it."**
> Do NOT write the post here — that's the write-post skill's job. Log facts, failures, before/afters, and good lines as they happen.
> Goal: `3df3143e-95b9-4000-81dd-89c18cb827e5` · Handoff: `docs/handoffs/2026-07-12-post-fable-operating-system.md`

## The premise (thesis applied to ourselves)

- Simon loses Claude Fable 5 (frontier model) access ~2026-07-19. The estate must then run on mid-tier models.
- Brand thesis eaten as dogfood: **State Beats Intelligence** — a mid-tier model with proper state and gates beats a frontier model running on vibes.
- The move: use the frontier model's last week to convert the estate's prose rules (lessons.md, CLAUDE.md paragraphs, memory bullets, skill instructions) into mechanical gates (hooks that block, APIs that reject, lints that fail, tests that go red). A gate cannot be forgotten by a weaker model. Prose can.
- Nice framing found in the handoff itself: "A gate that has never been seen to block anything is a prose rule with extra steps."

## Process log

- 2026-07-12: Phase 1 discovery sweep dispatched — 6 parallel agents over lessons.md, memory feedback files, skills+skill-lint, session transcripts (hunting corrections that never made it into lessons.md), git history of CLAUDE.md/agent profiles (prose-drift evidence), and existing enforcement + stories-API gaps.

## Findings worth keeping

### Headline stats (from the Phase 1 inventory, docs/gate-inventory-2026-07-12.md)
- 6 parallel sweep agents, ~130 rules inventoried across lessons.md (60 entries), memory files (28 rules), skills (50+ invariants), transcripts (129 sessions mined), git history, and two API surfaces.
- **Zero hooks existed anywhere.** The repo's own docs advertised "hooks" since March. One commit deleted a 130-line rule claiming "handled by PreToolUse hook" — the hook was never written. Four months on an enforcement ghost.
- **`agent_target` was theater**: accepted by the API, stored, displayed on the board — and hardcoded to null where it mattered (`worker/pipeline.ts:218`). Every "sitemaster" story ran persona-less. The rule said "mandatory"; the code said `agentText: null`.
- The estate discovered "prose decays" once already (2026-07-07 audit → skill-lint) and the fix itself decayed: the lint's trigger is prose, its scope misses the most-drifted file, and a divergence created 3 days after the lint was born was invisible to it.
- The UI agent was born with the wrong brand orange (#F97316 instead of #E04500) and wore it in production for 11 days.

### Funniest failures (verbatim from transcripts)
- "the 2pm post still has the fucking 65% stat ... thats 4 times you fix it... can you at least verify your work?"
- "i really wished you didint use the repo facts as law... i told you to analyse this business plan to stress test it... come on!!!"
- "still completelyt illegible i dont even know what you said"
- "stop asking me if you can merge the PR I want you to start merging PRS this is a personal project."
- "Read docs/handoffs/…-brain-approvals-ui.md and build it is this done yet???" (the handoff was 3 minutes old)
- "is this the version that was fixed?" — a yes/no question that got a forensic report instead of "yes", so Simon deleted the correct post. Twice.
- "wait... just found this on linkedin" — Simon finding, in 30 seconds of scrolling, the primary source four provenance passes missed.
- "snippet kinda sucks lol the rest is fine"

### Failure classes nobody wrote down (transcript mining, never reached lessons.md)
1. Credentials pasted into chat → now sitting in plaintext session transcripts (a service-role JWT, a PAT, an SSH password). The correction loop caught individual incidents; the CLASS was never named.
2. "Stress-test my plan" answered by quoting the plan back approvingly — sycophancy has no rule anywhere in the estate.
3. Handoffs with no queryable status — "is this done yet???" four times in three days.
4. Simon manually polishes a post; the pipeline rerun erases it. Complained about in three separate sessions. No store distinguishes hand-edited from generated.

### Before/after (downgrade red-team — Phase 3, pending)

## Candidate lines / angles

- "Prose rules depend on a model reading, recalling, and choosing to obey them. A 422 doesn't."
- The inventory itself is the save-worthy element: rule → class (already-mechanized / mechanizable / inherently-judgment) → gate. Readers can run the same audit on their own stack.
- Angle: everyone asks "what will you do when the good model goes away?" — answer: the same thing you should do anyway, because every model is the dumb model on a bad day.
