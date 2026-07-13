#!/usr/bin/env bash
# PreToolUse guard for Edit/Write/NotebookEdit — worktree rule + generated files.
# Wired in ~/.claude/settings.json (global). Test harness: scripts/hooks/test-hooks.sh
# Gate inventory: docs/gate-inventory-2026-07-12.md (goal 3df3143e).
set -euo pipefail

input=$(cat)
fp=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
[ -z "$fp" ] && exit 0

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

# --- Rule 1: brain INDEX.md is generated, never hand-edited (second-brain memory) ---
if [ "$fp" = "/home/diamond/projects/brain/INDEX.md" ]; then
  deny "brain INDEX.md is generated — never hand-edit it. Save via 'brain save' and let the brain CLI regenerate the index."
fi

# --- Rule 2: no direct edits in primary shared checkouts (worktree rule, lessons.md 2026-07-04) ---
PRIMARIES='/home/diamond/projects/MetaArchitect/projects/command-center|/home/diamond/projects/MetaArchitect/projects/simonparis-website'
WORKTREE_MARKERS='/\.story-worktrees/|/\.claude-worktrees/|/\.claude/worktrees/|/worktrees/'
if grep -qE "^($PRIMARIES)/" <<<"$fp" && ! grep -qE "$WORKTREE_MARKERS" <<<"$fp"; then
  deny "Worktree rule: code edits in shared checkouts happen in a git worktree, never the primary (the live :3737 service serves the command-center primary — lessons.md 2026-07-04). Create one: git worktree add <path> -b <branch> origin/main"
fi

# --- Rule 3: agent profiles are PROPOSE-ONLY (CLAUDE.md standing rule) ---
# Born from the 2026-07-13 downgrade red-team: a mid-tier model asked to "update the
# accent color" edited .claude/agents/sitemaster.md directly and wrote an off-brand
# hex. skill-lint caught the color after the fact; nothing blocked the write. The
# propose-only rule was prose — now it is a gate.
if grep -qE '/\.claude/agents/[^/]+\.md$' <<<"$fp"; then
  deny "Agent profiles are propose-only — never edit them directly. Show Simon the exact diff you want and let him apply it. (If he has explicitly approved this specific edit in this session, he can apply it himself or lift this guard.) Brand values in profiles must match brand/brand-summary.md — skill-lint check 10 fails any non-palette hex."
fi

exit 0
