# Workflows — Content Engine Pipeline

The Workflow layer lives in `.claude/commands/` (Claude Code requirement for slash commands).
This file is the navigation index.

---

## Pipeline Stage Map

| Stage | Command | File | Gate |
|-------|---------|------|------|
| 1. Idea Capture | `/capture` | [`.claude/commands/capture.md`](../../../.claude/commands/capture.md) | None |
| 2. Idea Selection | `/ideas` | [`.claude/commands/ideas.md`](../../../.claude/commands/ideas.md) | `status = pending_selection` |
| 3. Research | `/research` | [`.claude/commands/research.md`](../../../.claude/commands/research.md) | `status = selected` + lock = null |
| 4. Draft | `/draft` | [`.claude/commands/draft.md`](../../../.claude/commands/draft.md) | `status = researched` + `research_completed_at ≠ null` |
| 5. Review | `/review` | [`.claude/commands/review.md`](../../../.claude/commands/review.md) | `status = drafted` |
| 6. Publish | `/publish` | [`.claude/commands/publish.md`](../../../.claude/commands/publish.md) | `status = approved` |
| 7. Score | `/score` | [`.claude/commands/score.md`](../../../.claude/commands/score.md) | `status = published` + `performance_score = null` |
| **2–5 (consolidated)** | **`/week`** | [`.claude/commands/week.md`](.claude/commands/week.md) | ≥3 ideas `Status = "New"`. Runs plan → research (parallel) → draft → review in one session. Resumes from current phase if stubs exist. |

## Reusable Skills

Skills define the reasoning patterns each command uses. They live in `.claude/skills/` and are loaded as context.

| Skill | File | Used By |
|-------|------|---------|
| Airtable | [`.claude/skills/airtable.md`](../../../.claude/skills/airtable.md) | All commands |
| State Checker | [`.claude/skills/state-checker.md`](../../../.claude/skills/state-checker.md) | `/research`, `/draft`, `/capture` |
| Researcher | [`.claude/skills/researcher.md`](../../../.claude/skills/researcher.md) | `/research` |
| Writer | [`.claude/skills/writer.md`](../../../.claude/skills/writer.md) | `/draft` |
| Strategist | [`.claude/skills/strategist.md`](../../../.claude/skills/strategist.md) | `/capture`, `/ideas` |
| Fetcher | [`.claude/skills/fetcher.md`](../../../.claude/skills/fetcher.md) | `/capture` |
| Improver | [`.claude/skills/improver.md`](../../../.claude/skills/improver.md) | `/score` |

---

## Why commands live in `.claude/commands/`

Claude Code resolves slash commands only from `.claude/commands/`. Moving these files would break `/capture`, `/research`, etc. The SOPs are authoritative there — this README maps to them without duplicating them.
