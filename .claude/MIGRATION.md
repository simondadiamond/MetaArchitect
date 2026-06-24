# .claude/ — Migration from popebot

This directory holds Claude Code native subagents and skills migrated from the popebot harness on 2026-06-24. They run with local Claude (latest model) when this repo is opened directly.

## What was ported

### Agents → `.claude/agents/*.md`

| Agent | Purpose |
|---|---|
| `coo.md` | Chief Operating Officer for The Meta Architect — roadmap, brand enforcement, content pipeline coordination, lessons loop. |
| `sitemaster.md` | Web atelier for simonparis.ca — brand-obsessed frontend engineer, Next.js 14 + Tailwind + next-intl, MailerLite, Vercel deploys. |
| `blog-writer.md` | Long-form blog post writer for simonparis.ca. Coordinates the `research` → `write-post` → `editorial` pipeline. |
| `health.md` | Personal health & performance coach — Tactical Barbell Capacity phase, Zone 2 protocol, kettlebell conditioning, daily mobility. |
| `family.md` | Family coach (fatherhood + partnership) — evening reflections, weekend activity suggestions, Charlotte/Flo/Valerie context. |

### Skills → `.claude/skills/<name>/SKILL.md`

| Skill | Purpose |
|---|---|
| `teardown-research` | Finds and scores real production AI systems as teardown candidates; writes to `pipeline.teardown_candidates`. |
| `teardown-generate` | Generates a full STATE teardown for a candidate (blog + scores + gaps + remediation + LinkedIn post). Writes to `pipeline.teardown_drafts`. |
| `editorial` | Three-pass editorial loop (Humanizer, Fidelity Check, Repair) on a blog draft. |
| `research` | NotebookLM-backed research for a planned blog post. |
| `write-post` | Full 8-step blog post writing pipeline. |

Plus the pre-existing `pattern-guardian` skill, untouched.

## What was deliberately NOT ported

These popebot-specific skills are **not portable** — they wrap the popebot Docker/cron/Telegram harness and have no equivalent in local Claude:

- `agent-job-background` — spawns a new Docker agent container with auto-PR
- `agent-job-dm` — sends Telegram DMs to subscribed admins
- `agent-job-secrets` — auto-refreshing secrets vault
- `notebooklm`, `playwright-cli`, `pr-review-toolkit`, `supabase-cli` — already plugins / globally available in local Claude
- `CRONS.json` — popebot cron scheduling (popebot stays as-is for scheduled work)

The popebot install at the Sterling workspace remains intact for scheduled jobs (heartbeats, weekly briefs, etc.). Local interactive sessions in MetaArchitect use these `.claude/` definitions instead.

## What changed during migration (popebot strip)

Where popebot-specific behaviour appeared in the source files, it was replaced with portable equivalents:

| Source pattern | Replacement |
|---|---|
| `agent-job-background` / "spawn a background job" | "execute inline in the current session" |
| `agent-job-dm` / Telegram routing | "report back in this conversation" (Step 8 in `write-post` renamed `DM Simon` → `Report Back`) |
| `agent-job-secrets get X` | "read `X` from `.env` or your local secret store" |
| `cat /app/data/workspaces/workspace-01d00b46/.supabase/access-token` | `${SUPABASE_ACCESS_TOKEN:-$(cat ~/.supabase/access-token 2>/dev/null)}` |
| `/home/coding-agent/workspace` working dir | dropped; local Claude operates wherever Simon launches it |
| `CRONS.json` references | dropped (popebot-only) |
| `docs/roadmap.md` as the roadmap source | Supabase `goals` table at `simonparis.ca/admin/goals` (the markdown file is deprecated) |

The Sterling workspace agents (`agents/<name>/SYSTEM.md` + `CLAUDE.md`) are the authoritative source for popebot scheduled work. These `.claude/` copies are the local-Claude surface for interactive work.

## How to use locally

1. Open this repo in Claude Code (the Claude CLI / IDE extension auto-discovers `.claude/agents/` and `.claude/skills/`).
2. Invoke a subagent by name (`@coo`, `@sitemaster`, etc.) or let Claude select based on the descriptions in each agent's frontmatter.
3. Skills are auto-discovered too — Claude will offer them when relevant (or you can `/skill-name` if user-invocable).
4. Credentials (Supabase service role key, MailerLite API key, `AGENT_INGEST_KEY`, etc.) come from your local `.env` / secret store. See each skill for the specific env vars it expects.

## When to use popebot instead

- Anything on a cron (`coo-weekly-review`, `health` daily brief, `family` evening reflection, `bug-bounty` daily recon)
- Anything that needs to DM admins via Telegram
- Anything that needs the auto-PR Docker harness for an isolated branch

For all interactive work, prefer this local surface — it's running the latest Claude model.
