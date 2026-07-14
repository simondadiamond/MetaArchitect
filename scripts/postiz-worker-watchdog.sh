#!/usr/bin/env bash
# postiz-worker-watchdog.sh — detect and heal the silent no-worker state after host reboot
#
# Failure it guards (lessons.md 2026-07-14): on daemon boot, restart:always ignores
# depends_on, the postiz orchestrator races Temporal, fails its single connection
# attempt, never retries, and reports healthy with ZERO workers polling — scheduled
# posts then sit in QUEUE forever while every health surface stays green.
#
# Logic: if temporal is healthy AND postiz has been up past its warmup window AND
# no pollers exist on BOTH the linkedin and main task queues → docker restart postiz
# (a clean container restart; pm2-restart-in-place orphans the old Nest child on
# :3002 — see lessons entry), ntfy ping, re-check, exit 1 if still dead.
#
# Usage: postiz-worker-watchdog.sh [--dry-run] [--self-test]
#   --dry-run    report what would happen, never restart
#   --self-test  prove detection fires: check a nonexistent queue in dry-run mode
#
# Scheduled every 10 min via Command Center (/schedules). Exit 1 = ntfy via runs log.
set -euo pipefail

NTFY_ENV_FILE="/home/diamond/command-center/.env"
WARMUP_SECONDS=240   # workers take ~90s to connect after container start
QUEUES=(linkedin main)
DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --self-test) DRY_RUN=1; QUEUES=(watchdog-selftest-nonexistent-queue) ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

log() { echo "[postiz-watchdog $(date -u +%H:%M:%SZ)] $*"; }

ntfy() {
  local url
  url=$(grep -E '^NTFY_URL=' "$NTFY_ENV_FILE" 2>/dev/null | cut -d= -f2-)
  [ -n "${url:-}" ] && curl -s --max-time 10 -X POST -d "$1" "$url" >/dev/null || log "ntfy ping failed"
}

# 1. Temporal must be healthy — if it isn't, restarting postiz can't help; stand down.
temporal_health=$(docker inspect -f '{{.State.Health.Status}}' temporal 2>/dev/null || echo missing)
if [ "$temporal_health" != "healthy" ]; then
  log "temporal is '$temporal_health' — nothing to do"
  exit 0
fi

# 2. Postiz must be running and past warmup (don't restart a container mid-boot).
postiz_started=$(docker inspect -f '{{.State.StartedAt}}' postiz 2>/dev/null || echo "")
if [ -z "$postiz_started" ]; then
  log "postiz container not found"
  exit 1
fi
age=$(( $(date +%s) - $(date -d "$postiz_started" +%s) ))
if [ "$age" -lt "$WARMUP_SECONDS" ]; then
  log "postiz up ${age}s (< ${WARMUP_SECONDS}s warmup) — waiting"
  exit 0
fi

# 3. Count pollers per queue; ANY poller anywhere = healthy.
pollers=0
for q in "${QUEUES[@]}"; do
  out=$(docker exec temporal tctl --address temporal:7233 taskqueue describe --taskqueue "$q" 2>&1) \
    || { log "tctl failed for queue $q: $out"; exit 1; }
  n=$(grep -c '@' <<<"$out" || true)
  log "queue $q: $n poller(s)"
  pollers=$(( pollers + n ))
done

if [ "$pollers" -gt 0 ]; then
  log "workers polling — OK"
  exit 0
fi

# 4. No workers: heal.
if [ "$DRY_RUN" -eq 1 ]; then
  log "DRY RUN: would docker restart postiz + ntfy ping"
  exit 0
fi
log "no Temporal workers polling — restarting postiz"
ntfy "Postiz watchdog: no Temporal workers polling (silent reboot-race, lessons.md 2026-07-14) — restarting postiz container"
docker restart postiz >/dev/null

# 5. Verify workers came back before declaring success.
sleep 150
recheck=0
for q in "${QUEUES[@]}"; do
  n=$(docker exec temporal tctl --address temporal:7233 taskqueue describe --taskqueue "$q" 2>/dev/null | grep -c '@' || true)
  recheck=$(( recheck + n ))
done
if [ "$recheck" -eq 0 ]; then
  log "restart did NOT bring workers back — manual intervention needed"
  ntfy "Postiz watchdog: restart did NOT restore Temporal workers — scheduled posts will not publish. Check docker logs postiz."
  exit 1
fi
log "recovered: $recheck poller(s) after restart"
ntfy "Postiz watchdog: recovered — $recheck worker poller(s) back after restart. Queued posts will fire on schedule."
exit 0
