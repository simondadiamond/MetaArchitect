# Handoff — Business OS: Command Center reorg + Convert pipeline (2026-07-19)

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

- [ ] Migration applied + verified on live DB before code merge.
- [ ] CC build passes; spare-port render of /convert and collapsed/expanded sidebar states.
- [ ] Round-trip: POST conversion → claim → PATCH done with fake result → renders in list → test row
      deleted.
- [ ] Skill-lint 0 fails; one manual `/convert-dispatch` run in-session against a real test
      conversion (mark its pipeline.posts rows `rejected` after — test-hygiene rule).
- [ ] Schedule created and visible on /schedules; one fire observed in /runs (or run-now used).
- [ ] Goals updated: mark this build's goal in_progress→done; append one-liners to `2116b881`
      (Business OS) describing Convert; update auto-memory `project_setup_venture.md`.

## Context pointers

- Offer/venture state: goal `2116b881` + auto-memory `project_setup_venture.md` + brain
  (`tags: pricing setup-offer`). Strategy lock: crawl-first (see `operating-strategy` memory) —
  Business OS now, ghostwriter after traction.
- Playbook: `funnel/setup-offer/acquisition-playbook.md`. Outreach board: CC `/outreach`
  (templates duplicated there — keep in sync if templates change).
- Existing dispatcher to mimic: `.claude/skills/blog-pipeline-dispatch/SKILL.md`.
- pipeline.posts write mechanics: `.claude/skills/repurpose/SKILL.md` ("Save" section — captured
  ids, non-atomic loop, test hygiene).

## Parked ideas (reduce-Simon's-hours candidates — discuss before building)

1. **Booking link on /setup** — biggest calls-funnel friction: CTA is email-only today. A Cal.com
   (self-hostable) or Calendly link for the free discovery call removes the back-and-forth entirely.
2. **Stale-lead nudge** — daily schedule: leads with status new/conversation and last_touch > 5 days
   → ntfy with the next_action. Turns /outreach into a system that pokes back.
3. **X channel in Postiz** — X variants currently die in `result` jsonb; wiring X into Postiz makes
   the converter truly multi-channel.
4. **Session-note voice capture** — Simon records a 2-min voice memo after each session; a schedule
   transcribes → queues a conversion automatically. Zero-typing flywheel.
5. **Auto follow-up drafts** — same session notes → the follow-up email draft (playbook template)
   ready in his inbox. Pairs with #4.
