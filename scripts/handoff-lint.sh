#!/usr/bin/env bash
# handoff-lint.sh — every handoff in docs/handoffs/ must carry a status header.
# Rationale: handoffs without state get re-executed (or silently rot) once nobody
# remembers which ones landed. Template: docs/handoffs/TEMPLATE.md. Valid values:
#   status: queued | in-progress | done | abandoned
# Exit 0 = clean; exit 1 = offenders listed. Born 2026-07-13 (post-Fable gate build,
# goal 3df3143e). Run it from anywhere; weekly-review is a natural home.
#
# Usage:
#   scripts/handoff-lint.sh [dir]     # default: <repo>/docs/handoffs
#   scripts/handoff-lint.sh --self-test
set -uo pipefail

lint_dir() {
  local dir=$1 bad=0 found=0
  for f in "$dir"/*.md; do
    [ -e "$f" ] || continue
    [ "$(basename "$f")" = "TEMPLATE.md" ] && continue
    found=1
    if grep -qE '^status: (queued|in-progress|done|abandoned)[[:space:]]*$' "$f"; then
      echo "PASS $(basename "$f") ($(grep -m1 -oE '^status: [a-z-]+' "$f" | cut -d' ' -f2))"
    else
      echo "FAIL $(basename "$f") — no valid 'status:' line (need: status: queued|in-progress|done|abandoned)"
      bad=$((bad+1))
    fi
  done
  [ "$found" -eq 0 ] && echo "warn: no handoff files in $dir"
  return $([ "$bad" -eq 0 ] && echo 0 || echo 1)
}

self_test() {
  local dir tpass=0 tfail=0
  dir=$(mktemp -d)
  # RED: a handoff without a status line must fail
  printf '# Handoff — orphan\n\nNo header here.\n' > "$dir/orphan.md"
  if lint_dir "$dir" >/dev/null 2>&1; then
    echo "FAIL self-test: missing status accepted"; tfail=$((tfail+1))
  else
    echo "PASS self-test: missing status rejected"; tpass=$((tpass+1))
  fi
  # RED: an invalid status value must fail
  printf '# Handoff — bad\n\nstatus: maybe-later\n' > "$dir/bad.md"; rm "$dir/orphan.md"
  if lint_dir "$dir" >/dev/null 2>&1; then
    echo "FAIL self-test: invalid status value accepted"; tfail=$((tfail+1))
  else
    echo "PASS self-test: invalid status value rejected"; tpass=$((tpass+1))
  fi
  # GREEN: a valid header passes; TEMPLATE.md is exempt
  printf '# Handoff — good\n\nstatus: in-progress\ngoal_id: none\n' > "$dir/good.md"; rm "$dir/bad.md"
  printf '# template without meaning\n' > "$dir/TEMPLATE.md"
  if lint_dir "$dir" >/dev/null 2>&1; then
    echo "PASS self-test: valid status accepted (TEMPLATE.md exempt)"; tpass=$((tpass+1))
  else
    echo "FAIL self-test: valid status rejected"; tfail=$((tfail+1))
  fi
  rm -rf "$dir"
  echo
  echo "handoff-lint self-test: $tpass pass, $tfail fail"
  [ "$tfail" -eq 0 ]
}

case "${1:-}" in
  --self-test) self_test; exit $? ;;
  "")          DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/handoffs" ;;
  *)           DIR=$1 ;;
esac

[ -d "$DIR" ] || { echo "FAIL: $DIR not found"; exit 1; }
if lint_dir "$DIR"; then
  echo; echo "handoff-lint: clean"
else
  echo; echo "handoff-lint: offenders above — add the TEMPLATE.md header block"; exit 1
fi
