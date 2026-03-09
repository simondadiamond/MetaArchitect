@brand/state-framework.md
@brand/brand-guidelines.md
@brand/icp.md

# The Meta Architect — Brand OS

This is the command-driven workspace for Simon Paris's solo content brand: **The Meta Architect** (simonparis.ca).
Focus: AI reliability engineering content for practitioners.

## Repository Layout

```
.claude/commands/              — slash commands for the content pipeline (/capture, /research, /draft, etc.)
.claude/skills/                — reusable skill definitions (airtable, fetcher, researcher, writer, etc.)
brand/                         — brand reference files (state-framework.md, brand-guidelines.md, icp.md)
funnel/                        — landing pages, lead magnets, workshop assets
projects/
  Content-Engine/              — the content engine (WAT framework — see CLAUDE.md inside)
    tools/                     — Node.js execution scripts (airtable.mjs, research-*.mjs)
    workflows/                 — pipeline index (README.md → .claude/commands/)
    docs/                      — session logs and design plans
    .tmp/                      — runtime state files (gitignored, regeneratable)
  cohort-beta/                 — cohort delivery assets
  readiness-audit/             — readiness audit project
  auto-root-eval/              — auto root eval project
```

Run all slash commands from the **repo root**. All tools and `.env` resolution assume the repo root as the working directory.

For full content engine details (pipeline, data model, STATE requirements): see [projects/Content-Engine/CLAUDE.md](projects/Content-Engine/CLAUDE.md).

