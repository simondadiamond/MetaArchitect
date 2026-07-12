#!/usr/bin/env bash
# Poll a Command Center story until it reaches a target stage set.
# Usage: poll-story.sh <story-id> [terminal|verifying]  (default: terminal)
#   terminal  → merged | failed | needs_review
#   verifying → verifying | any terminal stage
# Prints "HH:MM:SS <stage> auto_merge=<bool> err=<first 80 chars>" every 20s; exits 0 on match.
set -euo pipefail
STORY_ID="${1:?usage: poll-story.sh <story-id> [terminal|verifying]}"
MODE="${2:-terminal}"
API="http://100.105.85.5:3737/api/stories"
while true; do
  ROW=$(curl -s "$API" | jq -r --arg id "$STORY_ID" \
    '.stories[] | select(.id == $id or (.id | startswith($id))) | .stage + " auto_merge=" + (.auto_merge|tostring) + " err=" + ((.error // "")[:80])' || true)
  echo "$(date +%H:%M:%S) ${ROW:-story-not-found}"
  STAGE="${ROW%% *}"
  case "$MODE:$STAGE" in
    *:merged|*:failed|*:needs_review) echo "REACHED: $STAGE"; exit 0;;
    verifying:verifying) echo "REACHED: $STAGE"; exit 0;;
  esac
  sleep 20
done
