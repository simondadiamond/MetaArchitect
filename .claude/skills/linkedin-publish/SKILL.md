---
name: linkedin-publish
description: Use when Simon asks to schedule, reschedule, edit, cancel, or check LinkedIn posts in Postiz — "schedule the Ramp posts", "move Thursday's post", "fix the hook on the scheduled post", "what's queued", "publish this draft". Do NOT trigger for creating post content (repurpose / write-post) or for publishing blog posts to simonparis.ca.
---

# /linkedin-publish — schedule, edit, cancel via Postiz

## Purpose

The ONE sanctioned path between `pipeline.posts` and Postiz. Both 2026-07 publishing incidents (test content nearly going live; the invisible delete+recreate false alarm) came from ad-hoc scheduling scripts — this skill + `tools/postiz.mjs` replace them permanently. **Never write a one-off `.tmp/*.mjs` scheduling script again.**

**Risk tier: medium (S+T+E).** The tool carries the state/log/notify obligations; this skill's job is gating and correct invocation.

## Ground rules (each one is a scar)

1. **`pipeline.posts` is canonical; Postiz is delivery-only.** `draft_content` + `first_comment` on the row are the source of truth. Postiz shows what will ship; the row says what should.
2. **Row IDs only.** Every operation takes a `pipeline.posts` uuid. If you only have a description ("the Ramp receipts post"), run `node tools/postiz.mjs list`, confirm the row with Simon if ambiguous, then act on the id. Never select rows for mutation by `source_angle_name`, content match, or status query (2026-07-06: an attribute query grabbed a stale test draft).
3. **Edits are delete+recreate+row-update+log+ntfy in ONE tool call** (`edit`). Never edit only the Postiz side or only the row (2026-07-07: a silent fix caused a false alarm 15 min before publish).
4. **Content changes re-pass the gate.** Any new/edited post text runs the full shared gate first: `.claude/skills/repurpose/references/linkedin-gate.md`. No exceptions for "one-word fixes" — the Ramp misattribution WAS a one-line fix.
5. **Scheduling slots**: default Tue/Thu 10:30 ET (14:30 UTC in summer). Never double-book a slot — `list` first. Cadence cap: 2/week unless Simon says otherwise (operating-rhythm.md).
6. **First comments**: Postiz cannot post LinkedIn comments. `first_comment` lives on the row; `tools/postiz-comment-nudge.mjs` ntfy-pings Simon at publish time to post it manually. Confirm the nudger's cron/schedule is alive when scheduling (`systemctl --user list-timers` or the Command Center /schedules page) — a scheduled post with a first comment and no nudge is a silent drop.
7. **Test runs end clean**: any smoke/test row this skill creates or schedules is cancelled and marked `rejected` before the session moves on.

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

## Error format

```
❌ linkedin-publish failed at [operation] — [tool error] — [what state the row/Postiz is in now]
```
