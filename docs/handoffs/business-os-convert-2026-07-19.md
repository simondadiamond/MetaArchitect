# Handoff — Business OS: Command Center reorg + Convert pipeline (2026-07-19)

status: done

> **Completed 2026-07-19** by the follow-up COO session: all phases A through G shipped
> (CC #113; site #89; MetaArchitect #37, #38, #39, #40). Verification checklist below is
> ticked with evidence; the four human steps at the bottom remain Simon's.

**For a fresh session. Build ALL of this; there is no v2.** Written by the COO session that shipped
/setup offer v3, the /outreach board (CC PR #112), and the /build-story skill (MetaArchitect PR #34).
Read this whole file before touching anything. Decisions here are settled with Simon — do not re-open.

## Goal

Two ventures, one Command Center. **Meta Architect** (teardown flywheel → social + blog; rides for a
year growing SEO) gets its own collapsible sidebar section. **Business OS** (the new venture: working
sessions / workspace setups for business owners — offer live at simonparis.ca/setup) gets its own
section containing Outreach (exists) and a new **Convert** tab: drop in a call log, session notes, or
a spec sheet (an n8n pipeline, a Claude Code skill), and a scheduled dispatcher turns it into
LinkedIn drafts in `pipeline.posts` (+ X variants, + a `blog_ideas` row when the source is meaty).
Ultimate goal: minimize Simon's hours per unit of content, and route readers into discovery calls.

## Locked decisions (Simon, 2026-07-19)

1. New venture sidebar section name: **Business OS**.
2. Converter execution: **scheduled dispatcher** (blog-pipeline pattern — a CC schedule fires a
   prompt every ~30 min; router skill processes ONE oldest queued conversion per fire).
3. **Engagements ("Intake Prep Kits") goes in the Meta Architect section**, not Business OS.
4. Long-enough sources also create a **`blog_ideas` row** (staged pipeline with its gates), never a
   direct blog draft.
5. Sidebar groups (replaces current workspace/data/system flat groups):
   - Workspace: Home, Agents
   - Meta Architect: Content, Teardowns, Engage, Engagements
   - Business OS: Outreach, Convert
   - Data: Pipeline, Roadmap, Brain
   - System: Runs, Schedules, Settings
   Sections collapsible (persist collapsed state in localStorage; default all expanded).

## Phase A — Command Center: sidebar reorg (worktree on command-center)

- `components/shell/sidebar-config.ts` — groups are currently `"workspace" | "data" | "system"`;
  extend the union and NAV entries per the mapping above. `components/shell/Sidebar.tsx` renders
  groups from config; add collapse/expand (it's already `"use client"`).
- Keep `/leads` page untouched (legacy, unlinked). Outreach page already exists at `/outreach`.

## Phase B — Command Center: conversions infra (same worktree/PR as A is fine)

**Migration `supabase/migrations/0020_conversions.sql`** (public schema, owner-scoped, NO RLS —
same convention as leads/goals; see 0008_leads.sql header comment):

```sql
create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null,
  title text not null,
  source_type text not null check (source_type in ('call_log','session_notes','spec','other')),
  raw_content text not null,
  targets text[] not null default '{linkedin}',
  status text not null default 'queued' check (status in ('queued','processing','done','error')),
  result jsonb,
  last_error text,
  processed_at timestamptz
);
create index if not exists conversions_status_created_idx on public.conversions (status, created_at);

-- Phase F needs these two markers on leads (call-prep + case-study triggers):
alter table public.leads
  add column if not exists prep_at timestamptz,
  add column if not exists case_study_at timestamptz;
```

- **Apply the migration to the LIVE DB before merging the code** (new selects fail otherwise):
  `python3 ~/projects/MetaArchitect/scripts/supabase-sql.py "$(cat <migration file>)"` — token
  auto-discovered, command-center project is the default ref. Verify with an information_schema query.
- `lib/db/conversions.ts` — copy the shape of `lib/db/leads.ts` exactly (COLS const, owner_id scoping
  via `getOwnerId()`, `createSupabaseServiceClient`, list/create/update helpers). Include
  `claimOldestQueued()` (oldest `queued` → set `processing`, return row or null) for the dispatcher.
- API: `app/api/conversions/route.ts` (GET list, POST create — copy validation style from
  `app/api/leads/route.ts`) and `app/api/conversions/[id]/route.ts` (PATCH status/result/last_error).
  Also `POST /api/conversions/claim` (calls claimOldestQueued) so the dispatcher skill never touches
  Supabase directly.
- Page `app/(app)/convert/page.tsx` + `_components/`: form (title, source_type select, targets
  checkboxes linkedin/x/blog — default linkedin+x, big textarea for raw content) and a list of
  conversions with status, relative time, and result links (post ids, blog idea id) when done.
  UI kit: `components/ui/` (Input, Select, Button, CopyButton), `label-mono` class, `relativeTime`
  from `lib/utils`. Look at `app/(app)/outreach/` (built yesterday) as the closest sibling.

## Phase C — MetaArchitect: dispatcher skill + schedule

- New skill `.claude/skills/convert-dispatch/SKILL.md`, modeled on `blog-pipeline-dispatch`
  (read it first — router-only, one row per fire, stop). Flow per fire:
  1. `POST http://100.105.85.5:3737/api/conversions/claim` — none → report "queue empty", stop.
  2. Run the conversion using the **`/build-story` skill's drafting gates**
     (`.claude/skills/build-story/SKILL.md` — provenance, stories-not-tutorials, CTA routing,
     zero em dashes) with ONE exception: this is the scheduled path, so **no interactive approval**;
     drafts save as `status: 'drafted'` in `pipeline.posts` for review in CC /content
     (same contract as `/repurpose --auto` Scheduled Mode — mirror its wording).
  3. Targets: `linkedin` → 1–2 drafts in pipeline.posts (repurpose Save mechanics, captured ids);
     `x` → variants stored in the conversion's `result` jsonb (no X channel exists yet);
     `blog` (only if source ≥ ~600 words of substance) → create a `blog_ideas` row the way the
     write-post/blog pipeline expects (inspect `lib/db/blog-ideas.ts` in command-center and the
     blog-pipeline-dispatch skill for the exact insert shape/stage).
  4. PATCH the conversion: `done` + result (`{post_ids: [], x_variants: [], blog_idea_id}`) or
     `error` + last_error. Log to `pipeline.logs` (STATE: workflow_id, entity_id=conversion id).
- Schedule (Simon asked for this — creating it is in scope):
  `POST http://100.105.85.5:3737/api/schedules` `{name: "Convert dispatcher", kind: "prompt",
  cron: "*/30 * * * *", working_dir: "~/projects/MetaArchitect", agent: "coo",
  prompt: "/convert-dispatch"}`. Failures land in /runs + ntfy automatically.
- Run `bash scripts/skill-lint.sh` after skill edits (must be 0 fails).

## House rules the builder MUST follow (all bitten or verified this week)

- **Worktrees mandatory** for command-center and MetaArchitect code; primary checkouts are
  hook-guarded. `git worktree add ~/projects/worktrees/<name> -b <branch> origin/main` (command-center
  default branch = main; simonparis-website = master; MetaArchitect = main).
- **Pull/rebase before push** on command-center (story-worker merges to main continuously).
- `gh` CLI for all pushes/PRs; **merge by PR number only** (`gh pr merge <N> --squash`) — a hook
  blocks bare/branch-name merges. No `--delete-branch` (conflicts with primary worktree). Never
  force-push, never `--no-verify`.
- Next 15 gotcha: dynamic API routes type params as `{ params: Promise<{ id: string }> }` and
  `await params` (see `app/api/goals/[id]/route.ts`).
- **Never restart the live :3737 service** to test. Verify on a spare port
  (`npx next start -p 399x`), then a **live API round-trip** (create → mutate → render → DELETE the
  test row via supabase-sql.py). deploy-sync deploys main within ~3 min of merge; confirm live after.
- Sterling has ~8GB free: one `next build` at a time, no parallel builds.
- Copy anywhere near brand surfaces: zero em dashes, no AI-tell shapes (brand-summary.md).
- Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`; PR bodies end with the
  Claude Code attribution line.

## Verification checklist (do all before reporting done)

- [x] Migration applied + verified on live DB before code merge.
- [x] CC build passes; spare-port render of /convert and collapsed/expanded sidebar states.
- [x] Round-trip: POST conversion → claim → PATCH done with fake result → renders in list → test row
      deleted.
- [x] Skill-lint 0 fails; one manual `/convert-dispatch` run in-session against a real test
      conversion (mark its pipeline.posts rows `rejected` after — test-hygiene rule).
- [x] Schedule created and visible on /schedules; one fire observed in /runs (or run-now used).
- [x] Phase D: /setup renders unchanged with `NEXT_PUBLIC_BOOKING_URL` unset AND with it set (local
      env test); form submit still succeeds when the lead-insert path is forced to fail; a real test
      submit creates a lead row + ntfy (then delete the test row + MailerLite test entry).
- [x] Phase E: a session_notes test conversion yields follow-up email in result + [FR] twin drafts;
      all test pipeline.posts rows marked `rejected` after.
- [x] Phase F: each schedule fired once (run-now ok) against a fixture lead; fixture cleaned. Never
      name a production row as a test target — create disposable fixtures (lessons.md 2026-07-16).
- [x] Phase G: postiz channel query degrades gracefully with no X connected; voice-intake processes
      a sample audio file end to end (queued conversion visible), file moved to processed/.
- [x] Goals updated: mark this build's goal in_progress→done (or note which phases remain); append
      one-liners to `2116b881` (Business OS) describing what shipped; update auto-memory
      `project_setup_venture.md`; scripts/INDEX.md lines for any new toolbox scripts.

## Context pointers

- Offer/venture state: goal `2116b881` + auto-memory `project_setup_venture.md` + brain
  (`tags: pricing setup-offer`). Strategy lock: crawl-first (see `operating-strategy` memory) —
  Business OS now, ghostwriter after traction.
- Playbook: `funnel/setup-offer/acquisition-playbook.md`. Outreach board: CC `/outreach`
  (templates duplicated there — keep in sync if templates change).
- Existing dispatcher to mimic: `.claude/skills/blog-pipeline-dispatch/SKILL.md`.
- pipeline.posts write mechanics: `.claude/skills/repurpose/SKILL.md` ("Save" section — captured
  ids, non-atomic loop, test hygiene).

## Phases D–G — the full automation slate (Simon: "I'm going to want to do everything")

ALL nine ideas are in scope. Build in this order — it's ranked by value, and each phase ships
independently, so if the session runs out of context the most important things are already live.
Hand unfinished phases to the next session by updating THIS file's checklist.

### Phase D — calls-funnel leaks (do first, they lose real prospects today)

**D1. Booking link on /setup** (simonparis-website worktree):
- Page reads `NEXT_PUBLIC_BOOKING_URL`; when set, the hero primary CTA and the #book section gain a
  "Book the discovery call" `btn-primary` linking to it (email form stays as fallback below). When
  unset, page renders exactly as today — ship the code without waiting on the account.
- Both locales; new i18n keys in `messages/{en,fr}/setup.json`; zero em dashes.
- **Human step (Simon):** create a Cal.com cloud (or Calendly) free account, one 30-min "Discovery
  call" event, then set `NEXT_PUBLIC_BOOKING_URL` in Vercel. Do NOT self-host Cal.com on Sterling
  (~8GB free is not enough for another always-on stack).

**D2. Form-to-outreach auto-capture** (simonparis-website worktree):
- The /setup form posts to `/api/blog-subscribe` with `consentVersion: "setup-v2"`. Extend that
  route: when consentVersion starts with `setup`, ALSO (a) insert a row into the command-center
  Supabase `leads` table (cloud-hosted, reachable from Vercel; `status:'new'`, `channel:'inbound'`,
  `source_ref:'/setup form'`, `next_action:'Reply within a day'`, name = email local-part until
  known) and (b) fire an ntfy ping ("New /setup signup: <email>").
- Needs Vercel env vars: `CC_SUPABASE_URL`, `CC_SUPABASE_SERVICE_KEY`, `CC_OWNER_ID`, `NTFY_TOPIC`
  (server-side only, never exposed to client). Get owner_id via
  `supabase-sql.py "select distinct owner_id from public.leads limit 1"`. **Human step:** Simon sets
  the Vercel env values from local .env sources (never paste values in chat).
- Failure isolation: the MailerLite subscribe must still succeed even if the lead insert fails
  (wrap in try/catch, log, don't 500 the form).

### Phase E — dispatcher extensions (extend convert-dispatch while building it)

**E1. Auto follow-up drafts:** when `source_type='session_notes'`, also generate the follow-up email
(playbook template, three concrete session-specific items) and store it in the conversion `result`
jsonb (`follow_up_email`). Surface on /convert with a CopyButton. ntfy one-liner so Simon sends it
same-day.

**E2. FR auto-variants:** for every LinkedIn draft the dispatcher saves, also save a French twin row
in `pipeline.posts` (proper Québec French, same gates, title prefixed `[FR] `). Inspect
`lib/db/pipeline-posts.ts` first — if the table has a language/platform column use it, else the
title prefix is the marker. Simon approves EN and FR independently in /content.

### Phase F — scheduled nudges (small skills/scripts + schedules; all asked-for)

**F1. Stale-lead nudge** — script, no LLM: `scripts/outreach-stale-nudge.mjs` (MetaArchitect
toolbox; grep scripts/INDEX.md first, add an INDEX line after). Queries leads where status in
(new,conversation) and coalesce(last_touch_at,created_at) < now()-'5 days', sends ONE ntfy digest
(names + next_actions). Schedule: kind `script`, cron `0 8 * * *`, absolute path, executable bit.

**F2. Discovery-call prep brief** — skill `call-prep` + hourly schedule (`30 * * * *`, prompt
`/call-prep`): leads with `status='call_booked'` and `prep_at is null` → best-effort research (web
search on name/company/notes), write a one-page brief (business model, likely automatable workflows,
suggested first skill, questions to ask) APPENDED to the lead's `notes` (marker line `--- PREP ---`),
set `prep_at`, ntfy "Prep ready: <name>". One lead per fire, router pattern.

**F3. Case-study capture** — skill `case-study-capture` + weekly schedule (`0 9 * * 1`, prompt
`/case-study-capture`): leads with `status='won'` and `case_study_at is null` → gather that client's
conversions/session notes, draft an anonymized case study to
`funnel/setup-offer/case-studies/<slug>.md` (named only if notes contain explicit permission), set
`case_study_at`, ntfy. One per fire.

### Phase G — heavier infra (last; both have human steps)

**G1. X channel via Postiz:** extend `linkedin-publish`'s `postiz.mjs` to support an X integration
id, and let convert-dispatch schedule x_variants through it once available. Feature-flag on the
integration's existence (query Postiz API for connected channels). **Human step:** Simon connects X
in the Postiz UI (OAuth). Until then variants keep landing in `result` jsonb — that path stays.
Note LinkedIn-automation-risk posture applies to X too: modest volume only.

**G2. Voice-memo intake:** watched folder `~/projects/MetaArchitect/intake/voice-memos/` (gitignore
contents). Script `scripts/voice-intake.mjs` on a 15-min script schedule: new audio file →
transcribe with local whisper.cpp (install + small model on first run; CPU is fine for 2-min memos;
NEVER run transcription in parallel with a next build — Sterling memory) → POST a conversion
(`source_type: 'session_notes'`, title from filename+date) → move file to `processed/`. **Human
step:** Simon picks his phone→Sterling transport (same mechanism he uses for the brain inbox works).

## Human-steps summary (the builder cannot do these — list them in the final report)

1. Cal.com/Calendly account + event + `NEXT_PUBLIC_BOOKING_URL` in Vercel (D1).
2. Vercel env vars for lead capture: CC_SUPABASE_URL / CC_SUPABASE_SERVICE_KEY / CC_OWNER_ID /
   NTFY_TOPIC (D2) — values from local .env, file-path handoff, never chat.
3. Postiz X OAuth connect (G1).
4. Phone→folder transport choice for voice memos (G2).
