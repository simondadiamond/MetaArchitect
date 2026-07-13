#!/usr/bin/env bash
# PostToolUse hook — runs scripts/skill-lint.sh automatically after any edit
# under .claude/skills, .claude/agents, brand/, or to CLAUDE.md, and injects
# FAIL lines back into context. Converts the lint's trigger from prose
# ("remember to run it") into a mechanical guarantee.
# Wired in MetaArchitect .claude/settings.json (project). Test: scripts/hooks/test-hooks.sh
# Source: SL-1 / L42 / R10 in docs/gate-inventory-2026-07-12.md.
set -euo pipefail

input=$(cat)
fp=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[ -z "$fp" ] && exit 0

case "$fp" in
  */.claude/skills/*|*/.claude/agents/*|*/brand/*|*/CLAUDE.md) ;;
  *) exit 0 ;;
esac

# Lint the repo (or worktree) that contains the edited file.
root=$(git -C "$(dirname "$fp")" rev-parse --show-toplevel 2>/dev/null) || exit 0
lint="$root/scripts/skill-lint.sh"
[ -x "$lint" ] || exit 0

if ! out=$(bash "$lint" 2>&1); then
  fails=$(grep -E '^(FAIL|WARN)' <<<"$out" | head -20 || true)
  jq -n --arg f "$fails" '{hookSpecificOutput:{hookEventName:"PostToolUse",additionalContext:("skill-lint FAILED after this edit — fix before moving on:\n" + $f)}}'
fi

exit 0
