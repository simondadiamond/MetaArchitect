#!/usr/bin/env bash
# pr-merge-when-green.sh — wait for a PR's checks, squash-merge it BY NUMBER,
# optionally verify a string appears on a production URL afterward.
#
# Usage: pr-merge-when-green.sh <repo-dir> <pr-number> [prod-url] [grep-string]
#
# Why: the inline wait/merge/verify loop was hand-rolled ~8 times on 2026-07-19,
# and hook rules require merging by PR number (lessons.md 2026-07-19 — never
# pack `gh pr merge` into a compound chain; this script runs it standalone).
set -euo pipefail

REPO_DIR="${1:?repo dir required}"
PR="${2:?PR number required}"
PROD_URL="${3:-}"
NEEDLE="${4:-}"

cd "$REPO_DIR"

for _ in $(seq 1 20); do
  pending=$(gh pr checks "$PR" 2>/dev/null | grep -c pending || true)
  [ "$pending" = "0" ] && break
  sleep 15
done

failing=$(gh pr checks "$PR" 2>/dev/null | grep -cE '\bfail' || true)
if [ "$failing" != "0" ]; then
  echo "❌ PR #$PR has failing checks — not merging:" >&2
  gh pr checks "$PR" >&2
  exit 1
fi

gh pr merge "$PR" --squash

state=$(gh pr view "$PR" --json state -q .state)
if [ "$state" != "MERGED" ]; then
  echo "❌ PR #$PR state is $state after merge attempt" >&2
  exit 1
fi
echo "✅ PR #$PR merged"

if [ -n "$PROD_URL" ] && [ -n "$NEEDLE" ]; then
  for _ in $(seq 1 30); do
    if curl -s "$PROD_URL" | grep -q "$NEEDLE"; then
      echo "✅ prod verified: '$NEEDLE' live at $PROD_URL"
      exit 0
    fi
    sleep 10
  done
  echo "❌ prod verify timed out: '$NEEDLE' not found at $PROD_URL" >&2
  exit 1
fi
