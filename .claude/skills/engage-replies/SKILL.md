---
name: engage-replies
description: Use when Simon says "engage queue", "/engage", "what should I reply to", "draft my comments", or wants his daily ICP superstar-list commenting pass done. Do NOT trigger for writing posts (repurpose/write-post) or for adding/removing superstar targets (that's a data edit).
---

# /engage-replies — gated consumer of the engage queue

## Purpose

Turn the engage-queue's mined opportunities into **postable, in-voice replies** for Simon's daily 15-minute commenting pass (operating-rhythm.md: ICP superstar-list commenting is Phase 3.7 mechanic #1 — the audience-borrowing lever). The sweeps mine and pre-draft; this skill is the quality gate and presentation layer.

**Simon posts every reply by hand.** LinkedIn suppresses AI/bot comments and penalizes accounts that draw that flag (playbook, May 2026 policy) — nothing here ever posts programmatically. The output is a ready-to-paste briefing.

## Data

Tables live in the **command-center Supabase project** (public schema — REST via `projects/command-center/.env`, no Accept-Profile header). Spec: command-center `docs/superpowers/specs/2026-07-05-linkedin-engage-queue-design.md`.

- `engage_comments` — the queue: reply-worthy comments with pre-drafted replies (`drafts` jsonb), `status` ∈ `new | engaged | skipped | error`, `score`, ordered by `(status, score desc, created_at desc)`
- `engage_posts` — swept superstar posts; `toplevel_draft` holds a drafted top-level comment when the post itself is worth commenting on; `status` ∈ `new | triaged | mined | stale | error`
- `engage_targets` — the living superstar list (`active`, `priority`, `notes` feed drafting context)

## Flow

### 1. Pull the queue

`engage_comments` where `status = 'new'`, score desc, limit ~10; plus `engage_posts` where `status = 'mined'` and `toplevel_draft is not null` and not yet engaged. Join target names for context. Empty queue → report "queue dry — next sweep at <schedule>" and stop; never pad with weak opportunities.

**Freshness gate (2026-07-11 lesson): engagement is perishable.** LinkedIn reply reach decays within a day or two; the sweep runs early UTC, so opportunities are often ~16h old at first sight and a missed day kills them. Before presenting anything, check the underlying post's `posted_at`:
- Post older than **48h** → do NOT present it. Mark the `engage_posts` row `status = 'stale'` (the vocabulary exists for exactly this; it's queue hygiene, not a judgment call) and drop its comment opportunities from the briefing.
- 24–48h old → present only if the thread is still visibly active; say the age in the briefing line so Simon can judge.
Stale-marking is the one status write this skill makes without Simon's confirmation — it removes dead inventory so no downstream consumer (weekly-brief, weekly-review) ever counts it as backlog.

### 2. Re-gate every draft (the sweeps draft blind; you draft with judgment)

For each opportunity, read the ORIGINAL post/comment text, then either bless the best pre-draft or rewrite. Every reply must pass:

- **Diagnostic one-liner register** (operating rhythm): 1–3 sentences, adds a mechanism, names a failure mode, or asks the scar-tissue question. A reply is a tiny authority artifact, not applause.
- **Zero em dashes** (Simon's rule — applies to comments, same as posts).
- **No AI-tells**: no "it's not X, it's Y" shape, no "Great post!"/"So true"/"Love this" openers, no restating the post back at it, none of the brand prohibitions (`brand/brand-summary.md`).
- **Adds something the thread doesn't have** — if the best available reply just agrees, skip the opportunity (mark it, don't force it).
- **Claim discipline**: any number or incident cited must be one Simon can stand behind (from a teardown, the blog, or verified sources) — never improvise stats in a comment.
- **Stay in lane**: AI reliability / state / production failure. A great comment on an off-lane post is off-lane marketing.

### 3. Present the briefing (STOP)

```
━━━ ENGAGE QUEUE — <date> ━━━
1. <target name> — <post hook, one line>
   ↳ replying to: <author, headline> — "<their comment, trimmed>"
   Reply: <the gated reply>
   Link: <comment_url>
2. …
━━━━━━━━━━━━━━━━━━━━━━━━━
Paste order is priority order. Say "done 1,3" / "skip 2" when posted.
```

Cap at what fits 15 minutes (~3–5 replies). Simon posts manually from the links.

### 4. Close the loop

On Simon's confirmation, update each row **by captured id**: `status = 'engaged'` + `used_draft` index (or `skipped`). Unconfirmed rows stay `new`. If a reply sparked a real two-way exchange, remind Simon: that's a **lead** (a lead = a two-way exchange started) — log it where weekly-review counts leads, because ICP conversations ≥ 2/week is THE headline metric.

## Rules

- Never mark rows `engaged` without Simon's confirmation — the queue's integrity is the weekly review's commenting metric.
- Never touch `engage_targets` from this skill (adding/retiring superstars is a deliberate list decision, not a queue side-effect).
- Risk tier: low-medium (reads + status writes, no LLM output written to content tables) — log one `pipeline.logs` entry per run (`step_name: 'engage_briefing'`, counts in summary).

## Error format

```
❌ engage-replies failed at [stage] — [error] — queue rows untouched
```
