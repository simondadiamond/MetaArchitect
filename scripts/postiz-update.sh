#!/usr/bin/env bash
# postiz-update.sh — the ONLY sanctioned Postiz update path.
# Wraps the steps from ~/projects/postiz/SETUP.md ("Ops"/"Known limits") in one idempotent
# script, because the LinkedIn scope patch lives in the container IMAGE layer: every
# `docker compose pull` silently reverts it, and the next LinkedIn reconnect then fails
# with "Bummer, something went wrong". NEVER pull Postiz images by hand — run this.
# Born 2026-07-13 (post-Fable gate build, goal 3df3143e).
#
# Usage:
#   scripts/postiz-update.sh            # pull new images, up -d, re-patch scopes, restart, verify
#   scripts/postiz-update.sh --dry-run  # echo the steps without running anything
set -euo pipefail

POSTIZ_DIR="$HOME/projects/postiz"
PATCH="$POSTIZ_DIR/patch-linkedin-scopes.sh"

if [ "${1:-}" = "--dry-run" ]; then
  cat <<EOF
postiz-update.sh would run, in order:
  1. cd $POSTIZ_DIR
  2. docker compose pull                      # fetch new images
  3. docker compose up -d                     # recreate changed containers
  4. wait for the 'postiz' container to be running
  5. $PATCH
     (trims LinkedIn OAuth scopes to personal posting; restarts postiz itself)
  6. wait up to 180s for the backend to answer on http://127.0.0.1:5000
  7. print container status
Notes: patch MUST re-run after every pull (it edits the image layer). Standard LinkedIn
apps get no refresh token — reconnect the channel in the UI when the 60-day token expires.
EOF
  exit 0
fi

[ -d "$POSTIZ_DIR" ] || { echo "FAIL: $POSTIZ_DIR not found"; exit 1; }
[ -x "$PATCH" ] || { echo "FAIL: $PATCH missing or not executable — do not update without the scope patch"; exit 1; }

cd "$POSTIZ_DIR"

echo "==> [1/5] docker compose pull"
docker compose pull
echo "OK: images pulled"

echo "==> [2/5] docker compose up -d"
docker compose up -d
echo "OK: stack up"

echo "==> [3/5] waiting for the postiz container to be running"
for i in $(seq 1 30); do
  state=$(docker inspect -f '{{.State.Status}}' postiz 2>/dev/null || echo "absent")
  [ "$state" = "running" ] && break
  sleep 2
done
[ "$state" = "running" ] || { echo "FAIL: postiz container not running after 60s (state: $state)"; exit 1; }
echo "OK: postiz container running"

echo "==> [4/5] re-applying LinkedIn scope patch (reverted by every image pull)"
"$PATCH"
echo "OK: scope patch applied (patch script restarted postiz)"

echo "==> [5/5] waiting for the backend (takes ~90s after restart)"
ok=""
for i in $(seq 1 36); do
  if curl -sf -o /dev/null --max-time 5 "http://127.0.0.1:5000"; then ok=1; break; fi
  sleep 5
done
if [ -n "$ok" ]; then
  echo "OK: backend answering on :5000"
else
  echo "WARN: backend not answering on :5000 after 180s — check: docker logs postiz | grep -i backend"
fi

echo
docker compose ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null || docker compose ps
echo
echo "postiz-update: done. If LinkedIn posting fails after this, reconnect the channel in the UI (60-day token, no refresh)."
