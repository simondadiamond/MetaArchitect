#!/usr/bin/env bash
# Credential guard, two surfaces:
#   UserPromptSubmit — Simon pastes a credential into chat  -> inject handling rules (never blocks)
#   PreToolUse/Bash  — the AGENT puts a credential literal in a command -> DENY
#
# Wired in ~/.claude/settings.json (global). Test harness: scripts/hooks/test-hooks.sh
# Source: transcript-mining finding F2 (gate inventory 2026-07-12) — JWTs, a PAT, and an SSH
# password were sitting in plaintext transcripts.
#
# The Bash arm exists because of lessons.md 2026-07-13: the script that SCRUBBED those secrets
# named them as inline literals, so every scrub command wrote the secret straight back into the
# live transcript. The original hook watched only the human. The actor most likely to handle
# credentials in bulk is the agent — and it was the one not being watched.
set -euo pipefail

input=$(cat)
event=$(jq -r '.hook_event_name // empty' <<<"$input")
prompt=$(jq -r '.prompt // empty' <<<"$input")
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")

# Credential shapes. Deliberately NOT matching bare "password" prose — only assignments and
# key-shaped literals, so "add a password reset flow" stays quiet. A gate that cries wolf
# gets turned off.
PATTERNS='sbp_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}|(password|passwd|secret|token)[[:space:]]*[=:][[:space:]]*[^[:space:]$({"'"'"'][^[:space:]]{5,}|BEGIN[[:space:]](RSA|OPENSSH|EC)[[:space:]]PRIVATE[[:space:]]KEY'

# --- Bash arm: the agent must never put a credential literal in a command line -------------
# Reading secrets from a file or env at point of use is the sanctioned path, and looks like
# $VAR / $(cat …) / source .env — none of which match the patterns above.
if [ -n "$cmd" ]; then
  if grep -qE "$PATTERNS" <<<"$cmd"; then
    jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"This command contains a credential-shaped literal. Anything in a command line is written verbatim to the session transcript — that is how the last leak happened, and how the CLEANUP for it leaked them again (lessons.md 2026-07-13). Read the secret at point of use instead: source the .env, use $VAR or $(cat <file>), and never echo, grep-print, or interpolate the value itself."}}'
  fi
  exit 0
fi

# --- Prompt arm: Simon pasted something that looks like a credential ----------------------
if [ -n "$prompt" ] && grep -qE "$PATTERNS" <<<"$prompt"; then
  jq -n '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:"SECURITY (secrets-guard hook): this message appears to contain a credential. Rules: (1) NEVER repeat or echo any part of it in your output, in a command line, or in a file you write. (2) It is now stored in the plaintext session transcript under ~/.claude/projects/ — treat it as exposed and recommend rotation. (3) If it needs storing, write it to the exact file Simon names without displaying the value, and suggest that next time he writes it to a file himself and just tells you the path."}}'
fi

exit 0
