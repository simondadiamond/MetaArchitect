# scripts/ — promoted toolbox

One line per tool. **Grep this file before writing a new script** — if a session already
built it, reuse it (session-close lane 4 promotes session one-offs here; keep entries current).

- skill-lint.sh — greps the skill/agent estate for known drift classes (dead paths, stale CTAs, hardcoded model ids); run after any skill edit and every Friday via /weekly-review (born 2026-07-07)
- session-digest.mjs — reduces a Claude Code transcript .jsonl to a harvestable markdown digest (text turns + bash commands + files written, tool results stripped); shared by session-close and the daily session sweep; `--max-bytes` caps output (born 2026-07-10)
