---
name: linkedin-publish
description: Use when Simon asks to schedule, reschedule, edit, cancel, or check LinkedIn posts in Postiz — "schedule the Ramp posts", "queue it", "push to Postiz", "set it live Tuesday", "move Thursday's post", "fix the hook on the scheduled post", "what's queued", "publish this draft". Also trigger when a session that just produced posts is asked to get them onto LinkedIn — never hand-roll a scheduling script (postiz.mjs is the only path). Do NOT trigger for creating post content (repurpose / write-post) or for publishing blog posts to simonparis.ca.
---

# /linkedin-publish — schedule, edit, cancel via Postiz

## Purpose

The ONE sanctioned path between `pipeline.posts` and Postiz. Both 2026-07 publishing incidents (test content nearly going live; the invisible delete+recreate false alarm) came from ad-hoc scheduling scripts — this skill + `tools/postiz.mjs` replace them permanently. **Never write a one-off `.tmp/*.mjs` scheduling script again.**

**Risk tier: medium (S+T+E).** The tool carries the state/log/notify obligations; this skill's job is gating and correct invocation.

## Ground rules (each one is a scar)

1. **`pipeline.posts` is canonical; Postiz is delivery-only.** `draft_content` + `first_comment` on the row are the source of truth. Postiz shows what will ship; the row says what should.
2. **Row IDs only.** Every operation takes a `pipeline.posts` uuid. If you only have a description ("the Ramp receipts post"), run `node tools/postiz.mjs list`, confirm the row with Simon if ambiguous, then act on the id. Never select rows for mutation by `source_angle_name`, content match, or status query (2026-07-06: an attribute query grabbed a stale test draft).
3. **Edits are delete+recreate+row-update+log+ntfy in ONE tool call** (`edit`). Never edit only the Postiz side or only the row (2026-07-07: a silent fix caused a false alarm 15 min before publish).
4. **Content changes re-pass the gate.** Any new/edited post text runs the gate first: write it to a temp file and run `bash scripts/linkedin-gate.sh <file>` (exit 1 = do not ship). `postiz.mjs edit --content` runs it too and refuses a failing edit, so this is belt-and-braces, not optional. Judgment checks (claim provenance) still come from `.claude/skills/repurpose/references/linkedin-gate.md`. No exceptions for "one-word fixes" — the Ramp misattribution WAS a one-line fix.
5. **Scheduling slots**: default Tue/Thu 10:30 ET (14:30 UTC in summer). Never double-book a slot — `list` first. Cadence cap: 2/week unless Simon says otherwise (operating-rhythm.md).
6. **Media before schedule** (2026-07-21 near-miss): a teardown/announcement row ships its FULL planned media — the 7-slide carousel per the fan-out media plan, not just the scorecard card — and no post with a media plan gets scheduled with an empty or partial `image` set. Check the row's `media` jsonb against the plan for its post class before the schedule call; "ASAP" changes the slot, never this check.
7. **First comments**: Postiz cannot post LinkedIn comments. `first_comment` lives on the row; `tools/postiz-comment-nudge.mjs` ntfy-pings Simon at publish time to post it manually. Confirm the nudger's cron/schedule is alive when scheduling (`systemctl --user list-timers` or the Command Center /schedules page) — a scheduled post with a first comment and no nudge is a silent drop.
8. **Test runs end clean**: any smoke/test row this skill creates or schedules is cancelled and marked `rejected` before the session moves on.
9. **The live LinkedIn share is the only ground truth for published content.** Row + Postiz record agreeing proves nothing about what is actually on LinkedIn (2026-07-07: pipeline.posts, Postiz, and the blog all held the corrected Ramp text while the live share carried a stale version — most likely a delete-the-wrong-share mix-up during a same-day fix). Any publish-day fix ends with Simon opening the release URL and confirming (a) the live text's first line matches the row's `draft_content` hook, and (b) his profile shows exactly ONE live share for the topic. Agents cannot read LinkedIn — never report a live share as verified without Simon's eyes on it; report "pending Simon's live check" instead. **The check handed to Simon must include literal discriminator strings** — "the CORRECT version contains 'Inside Ramp … more than 65%'; the WRONG one says 'approves 65% of expense reports'" — never "confirm it matches." (2026-07-07: Simon deleted the corrected post twice because "the 65% was wrong" made *contains 65%* his wrongness test, while the correct text legitimately still contains 65%.)

## Operations

Run from `projects/Content-Engine/`. The tool prints JSON; read it, don't assume.

```bash
node tools/postiz.mjs list                                  # what's queued (pipeline view, incl. sync_state)
node tools/postiz.mjs schedule <rowId> 2026-07-21T14:30:00.000Z [images.json]
node tools/postiz.mjs edit <rowId> --content new.txt --comment comment.txt   # delete+recreate+update+log+ntfy
node tools/postiz.mjs edit <rowId> --date 2026-07-23T14:30:00.000Z          # reschedule only
node tools/postiz.mjs cancel <rowId> [rejected]             # unschedule; row → drafted (or rejected)
node tools/postiz.mjs upload path/to/slide.png              # → {id, path} for images arrays
```

Images: upload each PNG first, collect the `{id, path}` objects into a JSON array file, pass it to `schedule`/`edit`. Carousel PNGs come from `/repurpose carousel` output in `.tmp/carousel-<slug>/`.

## Flow for "schedule the approved posts"

1. `list` — see what's already queued (slots, sync states).
2. Read the candidate rows **by id** (from the /repurpose report or Simon's message). Verify each: `status` is `drafted`/`approved`, gate-passed content, `first_comment` present if intended.
3. Propose the slot plan to Simon (which post → which date) and **stop for confirmation** if he didn't already specify.
4. `schedule` each row. The tool sets `status: 'scheduled'` exactly (Command Center `/content` keys off it), logs, and pings ntfy.
5. Report: each row id → postiz id → slot, plus the first-comment nudge status.

## Failure paths

- Tool errors are loud and name the failed step. An `edit` that deletes but fails to recreate marks the row `sync_state: 'missing'` and ntfy-pings — **fix it immediately** (re-`schedule` the row); never leave a deleted-not-recreated post overnight.
- Postiz unreachable → check the stack: `docker ps | grep postiz` (7 containers incl. temporal), then `~/projects/postiz/SETUP.md` ops notes. Remember the LinkedIn scope patch must be re-run after every image pull.
- LinkedIn channel disconnected (standard apps get no refresh token — re-auth ~every 60 days): tell Simon to reconnect in Postiz UI; posts already queued survive re-auth.
- **Post stuck in QUEUE past its slot, everything green** (lessons.md 2026-07-14): after a host reboot, `restart: always` ignores `depends_on` ordering — the postiz orchestrator races Temporal, fails its one connection attempt, never retries, and reports healthy with ZERO workers polling. Diagnose: `docker exec temporal tctl --address temporal:7233 taskqueue describe --taskqueue linkedin` — no pollers = this failure. Fix: `docker restart postiz` (NOT `pm2 restart orchestrator` alone — that orphans the old Nest child on port 3002 and the new one crashloops on EADDRINUSE; if you already did, kill the orphan pid holding 3002 first). The pending publish fires immediately on worker reconnect — warn Simon before restarting if a stale post going live late matters.

## Error format

```
❌ linkedin-publish failed at [operation] — [tool error] — [what state the row/Postiz is in now]
```
