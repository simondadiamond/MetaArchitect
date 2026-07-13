#!/usr/bin/env bash
# gate-selftest.sh — run every mechanical gate in the estate and report.
# One command, so "are the gates still working?" is never a judgment call.
#
# Born 2026-07-13 from the post-Fable gate build (goal 3df3143e). The estate's
# rules used to be prose; they are now hooks, lints, and validation scripts. This
# is the check that the checks still fire — a gate nobody runs is a prose rule
# with extra steps, and a gate whose self-test has silently broken is worse.
#
# Usage: bash scripts/gate-selftest.sh [--quiet]
# Exit 0 = every gate green. Exit 1 = at least one gate failing or missing.
# Run by: weekly-review (Friday), and safe to schedule daily.
set -uo pipefail
cd "$(dirname "$0")/.."

QUIET=false; [ "${1:-}" = "--quiet" ] && QUIET=true
FAILED=(); MISSING=()

# name | command
GATES=(
  "hook-guards|bash scripts/hooks/test-hooks.sh"
  "skill-lint|bash scripts/skill-lint.sh"
  "handoff-lint|bash scripts/handoff-lint.sh"
  "bind-audit|bash scripts/bind-audit.sh"
  "linkedin-gate|bash scripts/linkedin-gate.sh --self-test"
  "validate-brief|node scripts/validate-brief.mjs --self-test"
  "mark-session-closed|bash scripts/mark-session-closed.sh --self-test"
  "teardown-gate|python3 projects/Content-Engine/tools/teardown-gate.py --self-test"
  "insert-blog-post|node projects/Content-Engine/tools/insert-blog-post.mjs --self-test"
  "validate-manifest|node projects/Content-Engine/tools/validate-manifest.mjs --self-test"
  "postiz-guards|node projects/Content-Engine/tools/postiz-guards.mjs --self-test"
)

for entry in "${GATES[@]}"; do
  name=${entry%%|*}; cmd=${entry#*|}
  script=$(awk '{print $2}' <<<"$cmd")
  if [ ! -f "$script" ]; then
    MISSING+=("$name ($script)")
    $QUIET || printf "%-22s MISSING — %s\n" "$name" "$script"
    continue
  fi
  if out=$(eval "$cmd" 2>&1); then
    $QUIET || printf "%-22s ok    %s\n" "$name" "$(tail -1 <<<"$out")"
  else
    FAILED+=("$name")
    printf "%-22s FAIL  %s\n" "$name" "$(grep -E '^(FAIL|✗)' <<<"$out" | head -3 | tr '\n' ' ')"
  fi
done

echo
if [ ${#FAILED[@]} -eq 0 ] && [ ${#MISSING[@]} -eq 0 ]; then
  echo "gate-selftest: all ${#GATES[@]} gates green"
  exit 0
fi
[ ${#FAILED[@]} -gt 0 ] && echo "gate-selftest: FAILING — ${FAILED[*]}"
[ ${#MISSING[@]} -gt 0 ] && echo "gate-selftest: MISSING — ${MISSING[*]}"
echo "A failing gate is not a nuisance to silence: either the estate drifted, or the gate did."
exit 1
