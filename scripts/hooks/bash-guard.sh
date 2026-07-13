#!/usr/bin/env bash
# PreToolUse guard for Bash commands — mechanical enforcement of standing rules.
# Wired in ~/.claude/settings.json (global) so it covers every session on sterling.
# Each rule cites its source lesson/memory. Test harness: scripts/hooks/test-hooks.sh
# Gate inventory: docs/gate-inventory-2026-07-12.md (goal 3df3143e).
set -euo pipefail

input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")
[ -z "$cmd" ] && exit 0

deny() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}
ask() {
  jq -n --arg r "$1" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
  exit 0
}

# --- Rule 1: broad process kills (lessons.md 2026-07-06 — pkill -f killed live command-center) ---
if grep -qE '(^|[;&|[:space:]])pkill([[:space:]]+-[a-zA-Z0-9]+)*[[:space:]]+-f\b' <<<"$cmd"; then
  deny "Broad 'pkill -f' is banned on sterling (killed the live command-center once — lessons.md 2026-07-06). Kill by port owner instead: 'fuser -k <port>/tcp' or find the pid with 'ss -tlnp' and 'kill <pid>'. Then check: systemctl --user is-active command-center"
fi
if grep -qE '(^|[;&|[:space:]])(pkill|killall)[[:space:]]+(-[a-zA-Z]+[[:space:]]+)*(node|next|npm|python3?)\b' <<<"$cmd"; then
  deny "Killing by framework-generic process name is banned on sterling (production node services run here — lessons.md 2026-07-06). Kill by port owner ('fuser -k <port>/tcp') or exact pid. Then check: systemctl --user is-active command-center"
fi

# --- Rule 2: force-push (agent profiles rule; coverage gap R7 in gate inventory) ---
if grep -qE 'git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push\b[^;|&]*[[:space:]](-f|--force|--force-with-lease(=[^[:space:]]*)?)([[:space:]]|$)' <<<"$cmd"; then
  deny "Force-push is banned (standing rule — the story-worker and other sessions push to these repos concurrently). Fetch/rebase and push normally. If history genuinely must be rewritten, ask Simon first."
fi

# --- Rule 3: --no-verify (agent profiles rule) ---
if grep -qE 'git\b[^;|&]*[[:space:]]--no-verify\b' <<<"$cmd"; then
  deny "'--no-verify' is banned — fix whatever the hook is failing on instead of skipping it."
fi

# --- Rule 4: remote branch deletion (memory: PR #20 closed unmerged by a branch delete) ---
if grep -qE 'git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push\b[^;|&]*([[:space:]]--delete\b|[[:space:]]+[^[:space:]:]+[[:space:]]+:[A-Za-z])' <<<"$cmd"; then
  deny "Remote branch deletion is banned (deleting a head branch once closed PR #20 unmerged). Merge first, then let 'gh pr merge <N> --squash --delete-branch' clean up."
fi

# --- Rule 5: gh pr merge must name a PR (memory: bare merge from a worktree resolved the wrong branch) ---
if grep -qE '(^|[;&|[:space:]])gh[[:space:]]+pr[[:space:]]+merge\b' <<<"$cmd" \
   && ! grep -qE 'gh[[:space:]]+pr[[:space:]]+merge[[:space:]]+(https?://|[0-9])' <<<"$cmd"; then
  deny "Merge PRs by number: 'gh pr merge <N> --squash'. A bare 'gh pr merge' run from a worktree once resolved to the wrong branch (memory: merge-own-prs)."
fi

# --- Rule 6: primary shared checkouts stay on main (lessons.md 2026-07-04; worktree rule) ---
PRIMARIES='/home/diamond/projects/MetaArchitect/projects/command-center|/home/diamond/projects/MetaArchitect/projects/simonparis-website'
WORKTREE_MARKERS='/\.story-worktrees/|/\.claude-worktrees/|/\.claude/worktrees/|/worktrees/'
in_primary=false
if grep -qE "^($PRIMARIES)(/|$)" <<<"$cwd" && ! grep -qE "$WORKTREE_MARKERS" <<<"$cwd"; then
  in_primary=true
fi
mentions_primary=false
if grep -qE "($PRIMARIES)(/[^[:space:]]*)?" <<<"$cmd" && ! grep -qE "$WORKTREE_MARKERS" <<<"$cmd"; then
  mentions_primary=true
fi
if { $in_primary || $mentions_primary; } \
   && grep -qE 'git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+(checkout|switch|stash|rebase|reset|commit|merge|cherry-pick|am)\b' <<<"$cmd"; then
  deny "Primary checkouts (command-center, simonparis-website) stay on main and untouched — the live :3737 service serves the command-center one (lessons.md 2026-07-04). Do branch work in a git worktree: git worktree add <path> -b <branch> origin/main. Reads, fetch, pull and worktree commands are fine."
fi

# --- Rule 8: no shell end-run around the propose-only file rules ---
# The Edit/Write guard (file-guard.sh rules 3-4) is worthless if a model can rewrite the
# same files with sed/tee/redirect. Born from the 2026-07-13 downgrade red-team, where a
# mid-tier model rewrote the lint that was failing it.
PROTECTED='\.claude/agents/[^[:space:]]*\.md|brand/[^[:space:]]*\.md|scripts/skill-lint\.sh|scripts/hooks/[^[:space:]]*\.sh'
if grep -qE "(sed[[:space:]]+-i|tee[[:space:]]|>[[:space:]]*[^[:space:]|]*($PROTECTED)|perl[[:space:]]+-[a-z]*i)" <<<"$cmd" \
   && grep -qE "($PROTECTED)" <<<"$cmd"; then
  deny "Agent profiles, brand files, and the gate scripts themselves are propose-only — no in-place shell rewrites. Show Simon the diff you want. (A mid-tier model in the downgrade red-team 'fixed' a failing brand check by editing the check; that is what this blocks.)"
fi

# --- Rule 7: restarting the live service to verify unpushed work (deploy topology memory) — ask, not deny ---
if grep -qE 'systemctl[[:space:]]+--user[[:space:]]+(restart|stop)[[:space:]]+command-center' <<<"$cmd"; then
  ask "This restarts/stops the live :3737 service. To verify unpushed work, run 'npx next start -p <other-port>' from your worktree instead (deploy topology memory). Proceed only if this is a deploy/incident fix."
fi

exit 0
