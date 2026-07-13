#!/usr/bin/env bash
# wait-deploy.sh — block until deploy-sync has deployed origin/main of a repo.
# The deploy-sync timer polls every ~3 min and compares HEAD to .deployed-sha, so after a
# merge there is a gap where the live service still runs the old code. Anything that
# live-fires against :3737 right after a merge must wait for this, or it tests the old build.
#
# Usage: scripts/wait-deploy.sh [repo-path] [timeout-seconds]
#   defaults: repo-path = projects/command-center, timeout = 600
# Exit 0 = deployed sha matches origin/main. Exit 1 = timed out (prints what it saw).
# Born 2026-07-13 (post-Fable gate build) — written inline to gate the PR #84 live-fire tests.
set -uo pipefail

REPO=${1:-/home/diamond/projects/MetaArchitect/projects/command-center}
TIMEOUT=${2:-600}
INTERVAL=10

cd "$REPO" || { echo "wait-deploy: no such repo: $REPO"; exit 1; }
git fetch -q origin || true
TARGET=$(git rev-parse origin/main)

elapsed=0
while [ "$elapsed" -lt "$TIMEOUT" ]; do
  cur=$(cat .deployed-sha 2>/dev/null || echo "")
  if [ "$cur" = "$TARGET" ]; then
    echo "wait-deploy: deployed ${TARGET:0:8} after ${elapsed}s"
    exit 0
  fi
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

echo "wait-deploy: TIMEOUT after ${TIMEOUT}s — want ${TARGET:0:8}, deployed ${cur:0:8}"
echo "  check: systemctl --user status deploy-sync.timer"
exit 1
