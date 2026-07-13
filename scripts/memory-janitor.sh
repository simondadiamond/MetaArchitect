#!/usr/bin/env bash
# memory-janitor.sh — daily RAM hygiene for Sterling (born 2026-07-13, after the
# 2026-07-12 thrash-hang: swap sat 100% full for days, then evening load tipped
# the box into an unrecoverable thrash. earlyoom handles the emergency; this
# script handles the slow accumulation that creates it.
#
# What it does (in order):
#   1. Reaps leaked headless Chromium — browsers older than MAX_BROWSER_AGE_HOURS
#      left behind by engage sweeps / story-pipeline visual-verify. PID-by-PID
#      cmdline verification, never pattern pkill (lessons: killed a live service once).
#   2. Swap hygiene — if swap is heavily used but RAM has comfortable headroom,
#      cycle swapoff/swapon so parked pages return to RAM and swap is again a
#      shock absorber instead of a full tank.
#   3. Pressure alert — if RAM or swap usage is still high after 1+2, ping ntfy
#      with the top consumers so Simon sees it before the box does.
#
# Safe to run any time; every action is logged to stdout (scheduler /runs log).

set -uo pipefail

MAX_BROWSER_AGE_HOURS="${MAX_BROWSER_AGE_HOURS:-12}"
SWAP_CYCLE_MIN_USED_KB=$((1 * 1024 * 1024))   # cycle swap only if >1GB parked
SWAP_CYCLE_HEADROOM_KB=$((2 * 1024 * 1024))   # ...and RAM can absorb it +2GB spare
ALERT_MEM_PCT=85
ALERT_SWAP_PCT=75
NTFY_ENV_FILE="/home/diamond/command-center/.env"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

# --- 1. Reap leaked headless browsers -------------------------------------
reaped=0
for pid in $(ps -eo pid= --sort=pid); do
  cmdfile="/proc/$pid/cmdline"
  [ -r "$cmdfile" ] || continue
  args=$(tr '\0' ' ' <"$cmdfile" 2>/dev/null) || continue
  case "$args" in
    *chrom*--headless*|*headless_shell*) ;;
    *) continue ;;
  esac
  etimes=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ') || continue
  [ -n "$etimes" ] || continue
  if [ "$etimes" -gt $((MAX_BROWSER_AGE_HOURS * 3600)) ]; then
    log "reap: headless browser pid=$pid age=$((etimes / 3600))h cmd=${args:0:120}"
    kill "$pid" 2>/dev/null
    reaped=$((reaped + 1))
  fi
done
if [ "$reaped" -gt 0 ]; then
  sleep 5
  # escalate to KILL for any that ignored TERM
  for pid in $(ps -eo pid= --sort=pid); do
    cmdfile="/proc/$pid/cmdline"
    [ -r "$cmdfile" ] || continue
    args=$(tr '\0' ' ' <"$cmdfile" 2>/dev/null) || continue
    case "$args" in
      *chrom*--headless*|*headless_shell*) ;;
      *) continue ;;
    esac
    etimes=$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ') || continue
    [ -n "$etimes" ] || continue
    if [ "$etimes" -gt $((MAX_BROWSER_AGE_HOURS * 3600)) ]; then
      log "reap: pid=$pid survived TERM, sending KILL"
      kill -9 "$pid" 2>/dev/null
    fi
  done
fi
log "browsers reaped: $reaped"

# --- 2. Swap hygiene --------------------------------------------------------
read_meminfo() { awk -v k="$1" '$1 == k":" {print $2}' /proc/meminfo; }
swap_total=$(read_meminfo SwapTotal)
swap_free=$(read_meminfo SwapFree)
mem_avail=$(read_meminfo MemAvailable)
mem_total=$(read_meminfo MemTotal)
swap_used=$((swap_total - swap_free))

if [ "$swap_used" -gt "$SWAP_CYCLE_MIN_USED_KB" ] && \
   [ "$mem_avail" -gt $((swap_used + SWAP_CYCLE_HEADROOM_KB)) ]; then
  log "swap cycle: $((swap_used / 1024))MB parked, $((mem_avail / 1024))MB available — cycling"
  if sudo -n swapoff -a && sudo -n swapon -a; then
    log "swap cycle: done"
  else
    log "swap cycle: FAILED (swapon state may need a look: swapon --show)"
  fi
else
  log "swap: $((swap_used / 1024))MB used, $((mem_avail / 1024))MB RAM available — no cycle needed"
fi

# --- 3. Pressure alert -------------------------------------------------------
mem_avail=$(read_meminfo MemAvailable)
swap_free=$(read_meminfo SwapFree)
swap_used=$((swap_total - swap_free))
mem_pct=$(( (mem_total - mem_avail) * 100 / mem_total ))
swap_pct=$(( swap_total > 0 ? swap_used * 100 / swap_total : 0 ))
log "pressure: mem=${mem_pct}% swap=${swap_pct}%"

if [ "$mem_pct" -ge "$ALERT_MEM_PCT" ] || [ "$swap_pct" -ge "$ALERT_SWAP_PCT" ]; then
  top=$(ps -eo rss,comm --sort=-rss | head -6 | tail -5 | awk '{printf "%s %dMB; ", $2, $1/1024}')
  msg="Sterling memory pressure: RAM ${mem_pct}%, swap ${swap_pct}%. Top: ${top}"
  log "ALERT: $msg"
  ntfy_url=$(grep -E '^NTFY_URL=' "$NTFY_ENV_FILE" 2>/dev/null | cut -d= -f2-)
  if [ -n "${ntfy_url:-}" ]; then
    curl -s --max-time 10 -X POST -d "$msg" "$ntfy_url" >/dev/null || log "ntfy ping failed"
  fi
fi

exit 0
