#!/usr/bin/env bash
# Agent Reach wrapper — runs the venv-installed CLI with its own bin dir on PATH
# so it can find its bundled helpers (yt-dlp etc.), which are NOT on the system PATH.
# Usage: scripts/agent-reach.sh doctor | install | configure ... (any agent-reach subcommand)
set -euo pipefail

VENV="${AGENT_REACH_VENV:-$HOME/.agent-reach-venv}"
BIN="$VENV/bin/agent-reach"

if [[ ! -x "$BIN" ]]; then
  echo "agent-reach not found at $BIN" >&2
  echo "Install: python3 -m venv $VENV && $VENV/bin/pip install https://github.com/Panniantong/agent-reach/archive/main.zip" >&2
  exit 1
fi

PATH="$VENV/bin:$PATH" exec "$BIN" "$@"
