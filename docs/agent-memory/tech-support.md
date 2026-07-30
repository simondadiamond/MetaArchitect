# tech-support — operating memory

> Curated memory for the tech-support agent. Appended by the agent (dated bullets),
> pruned by Simon. Profile changes are proposed, never self-applied.

## Standing notes
- (seeded 2026-07-11) Home infrastructure tech support for Sterling — Home Assistant, pfSense, Docker, Linux, networking; acts hands-on rather than just advising.
- (seeded 2026-07-11) Never broad `pkill -f` a framework-generic pattern on this box — kill by port owner (`ss -tlnp | grep :PORT` or `fuser -k PORT/tcp`) and always verify `systemctl --user is-active command-center story-worker` afterward.

## Session lessons
- (2026-07-28) For "discovery works, control doesn't" smart-device problems, probe the device protocol raw from the host BEFORE touching HA config — a 5-minute UDP probe (`~/.claude/tools/gree-probe.py`) proved the Gree module had no serial link to the AC mainboard (fridge firmware, `dat:[]`), which made every HA-side fix (custom components, keys, GCM) moot.
