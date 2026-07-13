# scripts/ — promoted toolbox

One line per tool. **Grep this file before writing a new script** — if a session already
built it, reuse it (session-close lane 4 promotes session one-offs here; keep entries current).

- skill-lint.sh — greps the skill/agent estate for known drift classes (dead paths, stale CTAs, hardcoded model ids); run after any skill edit and every Friday via /weekly-review (born 2026-07-07)
- session-digest.mjs — reduces a Claude Code transcript .jsonl to a harvestable markdown digest (text turns + bash commands + files written, tool results stripped); shared by session-close and the daily session sweep; `--max-bytes` caps output (born 2026-07-10)
- session-grep.mjs — keyword-search past session transcripts ("which session discussed X"); ALL-keywords match over user turns, prints path + date + first hit; `--any` relaxes, `--dir` overrides (born 2026-07-10)
- poll-story.sh — poll a Command Center story until verifying/terminal stage (curl+jq against the stories API, 20s cadence); use when babysitting a pipeline story from a session (born 2026-07-12)
- memory-janitor.sh — daily RAM hygiene after the 2026-07-12 thrash-hang: reaps headless browsers >12h old (PID-by-PID, never pattern pkill), cycles swap back to RAM when headroom allows, ntfy-alerts with top consumers at ≥85% RAM / ≥75% swap; scheduled daily 05:30 UTC via Command Center (born 2026-07-13)
