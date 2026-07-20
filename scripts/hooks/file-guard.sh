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

ask() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
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

# --- Rule 3: agent profiles require an approval pass (CLAUDE.md standing rule) ---
# The rule is about UNDOCUMENTED, UNAPPROVED changes to how agents operate — not about
# any particular value. Agent behaviour must never drift without Simon seeing the change.
# History: 2026-07-13 a downgraded model silently wrote an off-brand hex into
# sitemaster.md, so this became a hard deny. That over-corrected — it also blocked
# approved, legitimate edits (2026-07-20: mechanizing a lesson into the agent that owns
# the failure), and a gate that blocks correct work gets routed around. Corrected the
# same day to what the rule always meant: every profile edit prompts Simon for approval.
# Approve it and the edit proceeds in-session; decline and nothing is written.
if grep -qE '/\.claude/agents/[^/]+\.md$' <<<"$fp"; then
  ask "Agent profile edit — needs your approval pass. Agents never change how they (or other agents) operate without you seeing it. Review the diff above: approve to apply, decline to leave it as a proposal. (Brand values must match brand/brand-summary.md — skill-lint check 10 fails any non-palette hex.)"
fi

exit 0
