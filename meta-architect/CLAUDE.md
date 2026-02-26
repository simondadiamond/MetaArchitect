# Meta Architect — Workspace Root

This workspace contains Simon Paris's solo content brand: **The Meta Architect** (simonparis.ca).
Focus: AI reliability engineering content for practitioners.

## Active Project
The content pipeline lives in `content-engine/`. Open that directory to run slash commands.

## Brand Reference
Brand files live in `brand/`:
- `brand-guidelines.md` — voice rules, post anatomy, content pillars, platform specs
- `state-framework.md` — STATE risk framework (governs all pipeline operations)
- `icp.md` — ideal customer profile (used for voice calibration)

## n8n
Local instance at `localhost:5678`. Workflow `idea-capture` (ID: `nnGXgwrcp7rUh9N3`) is the pipeline entry point.
All Claude Code operations start from `content-engine/`.
