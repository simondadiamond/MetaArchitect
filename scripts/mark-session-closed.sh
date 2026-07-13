#!/usr/bin/env bash
# mark-session-closed.sh — record a harvested transcript in the brain reconciler's ledger.
# Appends {path, lastLineTimestamp} to ~/projects/brain/.reconciler/processed.json (the
# file session-close and the daily sweep write; the weekly reconciler reads it to skip
# already-harvested transcripts). Idempotent: an existing entry for the same path gets its
# timestamp updated, never duplicated. Atomic: temp file + mv, validated with jq before
# the swap — a truncated ledger would silently re-queue every session ever harvested.
# Born 2026-07-13 (post-Fable gate build, goal 3df3143e).
#
# Usage:
#   scripts/mark-session-closed.sh <transcript.jsonl>
#   scripts/mark-session-closed.sh --self-test
# Env: PROCESSED_FILE overrides the ledger path (tests MUST set it — never the real file).
set -euo pipefail

PROCESSED="${PROCESSED_FILE:-$HOME/projects/brain/.reconciler/processed.json}"

mark() {
  local transcript=$1
  [ -f "$transcript" ] || { echo "FAIL: transcript not found: $transcript"; return 1; }
  command -v jq >/dev/null || { echo "FAIL: jq required"; return 1; }

  # Last-line timestamp = the newest .timestamp in the transcript (trailer lines
  # like summary/permission records carry none, so take the last line that has one).
  local ts
  ts=$(jq -r 'select(type == "object") | .timestamp // empty' "$transcript" 2>/dev/null | tail -1)
  [ -n "$ts" ] || { echo "FAIL: no .timestamp found in any line of $transcript"; return 1; }

  # Resolve to the absolute path (the ledger stores absolute transcript paths).
  local abs
  abs=$(readlink -f "$transcript")

  [ -f "$PROCESSED" ] || { echo "FAIL: ledger not found: $PROCESSED (refusing to create one — wrong path?)"; return 1; }
  jq -e 'type == "array"' "$PROCESSED" >/dev/null || { echo "FAIL: $PROCESSED is not a JSON array — fix it before writing"; return 1; }

  # Atomic: write temp in the SAME directory (mv must not cross filesystems), validate, swap.
  local tmp
  tmp=$(mktemp "$(dirname "$PROCESSED")/.processed.XXXXXX.json")
  trap 'rm -f "$tmp"' RETURN
  jq --arg path "$abs" --arg ts "$ts" '
    if any(.[]; .path == $path)
    then map(if .path == $path then .lastLineTimestamp = $ts else . end)
    else . + [{path: $path, lastLineTimestamp: $ts}]
    end
  ' "$PROCESSED" > "$tmp"
  jq -e 'type == "array" and all(.[]; .path and .lastLineTimestamp)' "$tmp" >/dev/null \
    || { echo "FAIL: post-write validation failed — ledger untouched"; return 1; }
  mv "$tmp" "$PROCESSED"
  # Validate the swapped-in file too (the whole point is never leaving a broken ledger).
  jq -e 'type == "array"' "$PROCESSED" >/dev/null || { echo "FAIL: ledger corrupt AFTER mv — investigate now"; return 1; }
  echo "OK: marked $abs (lastLineTimestamp $ts) — ledger has $(jq length "$PROCESSED") entries"
}

self_test() {
  local dir tpass=0 tfail=0
  dir=$(mktemp -d)
  # Fixture ledger + fixture transcripts — NEVER the real processed.json.
  printf '[{"path": "/existing/one.jsonl", "lastLineTimestamp": "2026-07-01T00:00:00.000Z"}]\n' > "$dir/processed.json"
  printf '{"type":"user","timestamp":"2026-07-13T01:00:00.000Z"}\n{"type":"assistant","timestamp":"2026-07-13T01:02:03.456Z"}\n{"type":"summary"}\n' > "$dir/session.jsonl"
  printf '{"type":"summary"}\n{"permissionMode":"default"}\n' > "$dir/no-ts.jsonl"

  # GREEN: append a new entry, timestamp from the last stamped line, JSON stays valid
  if out=$(PROCESSED_FILE="$dir/processed.json" "$0" "$dir/session.jsonl" 2>&1) \
     && jq -e 'length == 2 and .[1].lastLineTimestamp == "2026-07-13T01:02:03.456Z" and (.[1].path | endswith("session.jsonl"))' "$dir/processed.json" >/dev/null; then
    echo "PASS self-test: new entry appended with last-line timestamp"; tpass=$((tpass+1))
  else
    echo "FAIL self-test: append — $out"; tfail=$((tfail+1))
  fi
  # GREEN: idempotent — same transcript again updates in place, no duplicate
  printf '{"type":"assistant","timestamp":"2026-07-13T02:00:00.000Z"}\n' >> "$dir/session.jsonl"
  if PROCESSED_FILE="$dir/processed.json" "$0" "$dir/session.jsonl" >/dev/null 2>&1 \
     && jq -e 'length == 2 and .[1].lastLineTimestamp == "2026-07-13T02:00:00.000Z"' "$dir/processed.json" >/dev/null; then
    echo "PASS self-test: re-mark updates in place (no duplicate)"; tpass=$((tpass+1))
  else
    echo "FAIL self-test: re-mark duplicated or missed the update"; tfail=$((tfail+1))
  fi
  # RED: transcript with no timestamps must fail and leave the ledger untouched
  local before; before=$(cat "$dir/processed.json")
  if PROCESSED_FILE="$dir/processed.json" "$0" "$dir/no-ts.jsonl" >/dev/null 2>&1; then
    echo "FAIL self-test: timestamp-less transcript accepted"; tfail=$((tfail+1))
  elif [ "$(cat "$dir/processed.json")" = "$before" ]; then
    echo "PASS self-test: timestamp-less transcript rejected, ledger untouched"; tpass=$((tpass+1))
  else
    echo "FAIL self-test: rejected but ledger CHANGED"; tfail=$((tfail+1))
  fi
  # RED: corrupt ledger must refuse the write
  printf 'not json' > "$dir/broken.json"
  if PROCESSED_FILE="$dir/broken.json" "$0" "$dir/session.jsonl" >/dev/null 2>&1; then
    echo "FAIL self-test: corrupt ledger accepted"; tfail=$((tfail+1))
  else
    echo "PASS self-test: corrupt ledger refused"; tpass=$((tpass+1))
  fi
  # RED: missing transcript
  if PROCESSED_FILE="$dir/processed.json" "$0" "$dir/nope.jsonl" >/dev/null 2>&1; then
    echo "FAIL self-test: missing transcript accepted"; tfail=$((tfail+1))
  else
    echo "PASS self-test: missing transcript refused"; tpass=$((tpass+1))
  fi

  rm -rf "$dir"
  echo
  echo "mark-session-closed self-test: $tpass pass, $tfail fail"
  [ "$tfail" -eq 0 ]
}

case "${1:-}" in
  --self-test) self_test; exit $? ;;
  "")          echo "usage: mark-session-closed.sh <transcript.jsonl> | --self-test"; exit 2 ;;
  *)           mark "$1"; exit $? ;;
esac
