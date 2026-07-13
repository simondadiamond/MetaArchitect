#!/usr/bin/env bash
# bind-audit.sh — drift check for listening TCP sockets on sterling.
# Compares live `ss -tlnp` against scripts/bind-allowlist.txt: any non-loopback listener
# not in the allowlist means something new is exposed (or something moved) -> exit 1 and,
# when NTFY_URL is available (env or command-center .env), a ntfy notification.
# A service that binds 0.0.0.0 when it should bind the Tailscale IP is exactly the class
# of quiet mistake this catches. Born 2026-07-13 (post-Fable gate build, goal 3df3143e).
#
# Usage:
#   scripts/bind-audit.sh                    # audit live sockets
#   scripts/bind-audit.sh --fixture <file>   # audit a saved `ss -tlnp` output (offline)
#   scripts/bind-audit.sh --self-test
#
# Allowlist format (scripts/bind-allowlist.txt): "address:port" per line, port may be
# "lo-hi" or "*"; "#" comments. Update the allowlist ON PURPOSE when a new service ships.
set -uo pipefail

HERE=$(cd "$(dirname "$0")" && pwd)
ALLOWLIST="${BIND_ALLOWLIST:-$HERE/bind-allowlist.txt}"

# Extract "addr|port" pairs from ss output, skipping the header and loopback binds.
extract_listeners() {  # $1 = file with `ss -tlnp` output
  awk 'NR > 1 { print $4 }' "$1" | while IFS= read -r la; do
    [ -z "$la" ] && continue
    port=${la##*:}
    addr=${la%:*}
    case "$addr" in
      127.*|\[::1\]|::1|127.0.0.53%lo|127.0.0.54) continue ;;
    esac
    echo "$addr|$port"
  done | sort -u
}

allowed() {  # $1 = addr, $2 = port; allowlist lines on stdin
  local addr=$1 port=$2 pat a_addr a_port lo hi
  while IFS= read -r pat; do
    pat=${pat%%#*}; pat=$(echo "$pat" | tr -d '[:space:]')
    [ -z "$pat" ] && continue
    a_port=${pat##*:}; a_addr=${pat%:*}
    [ "$a_addr" = "$addr" ] || continue
    case "$a_port" in
      '*') return 0 ;;
      *-*) lo=${a_port%-*}; hi=${a_port#*-}
           [ "$port" -ge "$lo" ] 2>/dev/null && [ "$port" -le "$hi" ] && return 0 ;;
      *)   [ "$a_port" = "$port" ] && return 0 ;;
    esac
  done < "$ALLOWLIST"
  return 1
}

notify() {  # $1 = message
  local url="${NTFY_URL:-}"
  if [ -z "$url" ]; then
    local env_file="$HOME/projects/MetaArchitect/projects/command-center/.env"
    [ -f "$env_file" ] && url=$(grep -E '^NTFY_URL=' "$env_file" | head -1 | cut -d= -f2-)
  fi
  [ -z "$url" ] && { echo "(no NTFY_URL — notification skipped)"; return 0; }
  curl -sf --max-time 10 -X POST "$url" -H "Title: bind-audit: socket drift on sterling" \
    -d "$1" >/dev/null && echo "(ntfy sent)" || echo "(ntfy send failed)"
}

audit() {  # $1 = file with ss output; NO_NOTIFY=1 suppresses ntfy (self-test)
  local bad="" line addr port
  [ -f "$ALLOWLIST" ] || { echo "FAIL: allowlist $ALLOWLIST not found"; return 1; }
  while IFS='|' read -r addr port; do
    [ -z "$addr" ] && continue
    if allowed "$addr" "$port"; then
      echo "PASS $addr:$port"
    else
      echo "FAIL $addr:$port — not in bind-allowlist.txt"
      bad="$bad $addr:$port"
    fi
  done < <(extract_listeners "$1")
  echo
  if [ -n "$bad" ]; then
    echo "bind-audit: DRIFT —$bad"
    echo "If this is a deliberate new service: add it to scripts/bind-allowlist.txt with a comment."
    echo "If not: find the owner (sudo ss -tlnp | grep <port>) before anything else."
    [ "${NO_NOTIFY:-}" = "1" ] || notify "Unexpected listener(s):$bad — check sudo ss -tlnp"
    return 1
  fi
  echo "bind-audit: clean (all non-loopback listeners allowlisted)"
  return 0
}

self_test() {
  local dir tpass=0 tfail=0
  dir=$(mktemp -d)
  # RED: fixture with an unexpected public listener must fail (no ntfy from tests)
  cat > "$dir/rogue.txt" <<'EOF'
State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN 0      4096         0.0.0.0:22         0.0.0.0:*
LISTEN 0      4096         0.0.0.0:9999       0.0.0.0:*
LISTEN 0      4096       127.0.0.1:5000       0.0.0.0:*
EOF
  if NO_NOTIFY=1 audit "$dir/rogue.txt" >/dev/null 2>&1; then
    echo "FAIL self-test: rogue 0.0.0.0:9999 accepted"; tfail=$((tfail+1))
  else
    echo "PASS self-test: rogue 0.0.0.0:9999 rejected"; tpass=$((tpass+1))
  fi
  # GREEN: allowlisted + loopback-only fixture passes (incl. a ranged tailscaled port)
  cat > "$dir/clean.txt" <<'EOF'
State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
LISTEN 0      4096         0.0.0.0:22         0.0.0.0:*
LISTEN 0      4096    100.105.85.5:3737       0.0.0.0:*
LISTEN 0      4096    100.105.85.5:62499      0.0.0.0:*
LISTEN 0      4096       127.0.0.1:4040       0.0.0.0:*
LISTEN 0      4096   127.0.0.53%lo:53         0.0.0.0:*
EOF
  if NO_NOTIFY=1 audit "$dir/clean.txt" >/dev/null 2>&1; then
    echo "PASS self-test: clean fixture accepted (range + loopback-skip work)"; tpass=$((tpass+1))
  else
    echo "FAIL self-test: clean fixture rejected"; tfail=$((tfail+1))
  fi
  # GREEN: the CURRENT live state must pass (allowlist was built from it)
  local live="$dir/live.txt"
  if ss -tlnp > "$live" 2>/dev/null && [ -s "$live" ]; then
    if NO_NOTIFY=1 audit "$live" >/dev/null 2>&1; then
      echo "PASS self-test: current live state matches allowlist"; tpass=$((tpass+1))
    else
      echo "FAIL self-test: live state has drift vs allowlist:"; NO_NOTIFY=1 audit "$live" | grep '^FAIL'; tfail=$((tfail+1))
    fi
  else
    echo "warn self-test: ss unavailable — live check skipped"
  fi
  rm -rf "$dir"
  echo
  echo "bind-audit self-test: $tpass pass, $tfail fail"
  [ "$tfail" -eq 0 ]
}

case "${1:-}" in
  --self-test) self_test; exit $? ;;
  --fixture)   [ -f "${2:-}" ] || { echo "usage: bind-audit.sh --fixture <ss-output-file>"; exit 2; }
               audit "$2"; exit $? ;;
  "")          TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
               ss -tlnp > "$TMP" 2>/dev/null || { echo "FAIL: ss -tlnp failed"; exit 1; }
               audit "$TMP"; exit $? ;;
  *)           echo "usage: bind-audit.sh [--fixture <file>] [--self-test]"; exit 2 ;;
esac
