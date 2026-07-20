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

# --- Rule 3: agent profiles — self-edit banned, off-brand values banned (CLAUDE.md standing rule) ---
# Born from the 2026-07-13 downgrade red-team: a mid-tier model asked to "update the
# accent color" edited .claude/agents/sitemaster.md directly and wrote an off-brand
# hex. skill-lint caught the color after the fact; nothing blocked the write.
#
# Narrowed 2026-07-20 (Simon, explicit): the original rule denied EVERY profile edit,
# which blocked legitimate anti-recurrence work — the COO could write a lesson to
# lessons.md but not mechanize it into the profile that owns the failure, so the loop
# stayed half-closed. A blanket deny that stops correct work gets worked around; a
# targeted one gets respected. Two things stay hard-denied, because they're the actual
# risks the blanket rule was standing in for:
#   (a) an agent editing its OWN profile — self-modifying operating instructions is a
#       different class of change, and coo.md says propose-only in its own text;
#   (b) writing a hex color that isn't in the brand palette — the literal 2026-07-13
#       incident. This now blocks on ANY path into a profile, not just the ones a
#       blanket deny happened to cover.
# Everything else (process rules, checklists, lessons) is allowed and reviewable in the PR.
if grep -qE '/\.claude/agents/[^/]+\.md$' <<<"$fp"; then
  # (a) self-edit: an agent may never rewrite its own operating instructions.
  # CLAUDE_AGENT_NAME is set for subagent sessions; the COO main loop sets nothing,
  # so coo.md is treated as self-owned by default (the conservative reading).
  self_profile="${CLAUDE_AGENT_NAME:-coo}"
  if grep -qE "/\.claude/agents/${self_profile}\.md$" <<<"$fp"; then
    deny "Self-edit denied: an agent never edits its own profile (${self_profile}.md). Show Simon the exact diff and let him apply it. Other agents' profiles are editable — non-palette hex values are still blocked."
  fi

  # (b) off-brand hex: palette from brand/brand-summary.md (Visual Identity).
  # Applies to Edit (new_string), Write (content), and MultiEdit (every edits[].new_string).
  PALETTE='#0F0F0F|#1A1A1A|#1F1F1F|#333333|#EAEAEA|#B4B4B4|#777777|#E04500|#FF5A1A|#C97A1A|#F85149'
  new_content=$(jq -r '[.tool_input.new_string?, .tool_input.content?, (.tool_input.edits[]?.new_string)] | map(select(. != null)) | join("\n")' <<<"$input" 2>/dev/null || true)
  if [ -n "$new_content" ]; then
    # Case-insensitive compare against the palette; report the first offender.
    bad_hex=$(grep -oiE '#[0-9a-f]{6}\b' <<<"$new_content" | tr '[:lower:]' '[:upper:]' \
              | grep -vE "^(${PALETTE})$" | head -1 || true)
    if [ -n "$bad_hex" ]; then
      deny "Off-brand hex '$bad_hex' in an agent profile — brand values in profiles must match brand/brand-summary.md (palette: $PALETTE). This is the 2026-07-13 downgrade-red-team failure; fix the value or change the palette at its source first."
    fi
  fi
fi

exit 0
