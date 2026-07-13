#!/usr/bin/env bash
# UserPromptSubmit guard — detects credentials pasted into chat and injects
# handling instructions into context. Never blocks; inject-only.
# Wired in ~/.claude/settings.json (global). Test harness: scripts/hooks/test-hooks.sh
# Source: transcript-mining finding F2 (gate inventory 2026-07-12) — JWTs, a PAT,
# and an SSH password were found sitting in plaintext session transcripts.
set -euo pipefail

input=$(cat)
prompt=$(jq -r '.prompt // empty' <<<"$input")
[ -z "$prompt" ] && exit 0

PATTERNS='sbp_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+|(password|passwd)[[:space:]]*[=:][[:space:]]*[^[:space:]]+|BEGIN[[:space:]](RSA|OPENSSH|EC)[[:space:]]PRIVATE[[:space:]]KEY'

if grep -qE "$PATTERNS" <<<"$prompt"; then
  jq -n '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:"SECURITY (secrets-guard hook): this message appears to contain a credential. Rules: (1) NEVER repeat or echo any part of it in your output. (2) It is now stored in the plaintext session transcript under ~/.claude/projects/ — treat it as exposed and recommend rotation. (3) If it needs storing, write it to the exact file Simon names without displaying the value, and suggest that next time he writes it to a file himself and just tells you the path."}}'
fi

exit 0
