# Handoff: Brain Approvals tab in Command Center

status: done
goal_id: none
picked_up_by: build session 2026-07-10 (shipped as Command Center Approvals tab)
updated: 2026-07-13

**Goal:** a phone-friendly approvals surface so Simon can approve/reject second-brain proposals visually instead of running "apply brain proposals" in a chat session. Speed matters — this is a small feature; build it inline (worktree + implement + verify + PR + one `/code-review` at medium), no SDD ceremony.

## Context you need (verified 2026-07-10)

- **Second brain**: repo `~/projects/brain`, `brain` CLI on PATH (`find/save/doctor/sync/inbox/describe/import`). Notes are canonical; `brain sync` projects to Supabase `public.brain_entries` (RLS, **service-role reads only**). System overview: run `brain find "how does my second brain work"`.
- **Proposals** come from the weekly reconciler (schedule "Brain reconciler (weekly)", SOP `~/projects/brain/RECONCILER.md`): contradiction findings + harvested facts, written to `~/projects/brain/.reconciler/proposals.md`, human-gated — nothing writes notes without Simon's confirm. That gate must survive this feature: approving IS the confirm.
- **Command Center**: `~/projects/MetaArchitect/projects/command-center` (Next.js App Router, Supabase). The live service on :3737 serves the PRIMARY checkout — **mandatory worktree** for this work (`git fetch origin && git worktree add ~/projects/cc-worktrees/brain-approvals -b feat/brain-approvals origin/main`), verify on a side port (3838), kill dev servers by port PID only. Push via `gh`-wired HTTPS; rebase on origin/main before push; squash-merge own PR once checks pass (standing rule); deploy-sync timer redeploys after merge.
- **Existing brain surface** (merged PR #41): `app/(app)/brain/` page + `app/api/brain/{search,entry/[slug],capture}/route.ts`. The capture route is the pattern to copy for CLI execution: `execFile('/home/diamond/.local/bin/brain', argv, {timeout: 30000})`, absolute path, never shell strings, validate BEFORE invoking. Domains enum lives in `lib/brain/constants.ts`. CC runs on sterling as user diamond, so API routes may read/write `~/projects/brain/.reconciler/` directly with `node:fs`.

## Build spec (decisions made — don't re-litigate, just build)

### 1. Structured proposals file (replaces freeform proposals.md as canonical)

`~/projects/brain/.reconciler/proposals.json`:
```json
{ "proposals": [ {
  "id": "<uuid>",
  "created": "<ISO>",
  "kind": "save" | "edit",
  "summary": "<one line shown in the UI>",
  "detail": "<why: contradiction found / harvested from transcript X>",
  "argv": ["save", "<fact>", "--domain", "family", "--tags", "a,b"],   // kind=save only
  "edit": { "target_slug": "<slug>", "instruction": "<what to change and why>" }  // kind=edit only
} ] }
```
Update `~/projects/brain/RECONCILER.md` step 2/3/4 to emit this JSON (keep a human-readable summary block appended to proposals.md if cheap, but JSON is canonical) — commit + push the brain repo change.

### 2. API routes (command-center)

- `GET /api/brain/proposals` → read + return proposals.json (`{proposals: [...]}`; empty file/missing dir → `{proposals: []}`).
- `POST /api/brain/proposals/[id]` body `{action: "approve" | "reject"}`:
  - **approve + kind=save**: validate argv (first element exactly `save`; `--domain` value ∈ the 7-domain enum; no `--file` allowed from this path) then `execFile(BRAIN_BIN, argv)`; on success remove the proposal from the JSON, fire-and-forget `execFile(BRAIN_BIN, ['sync'])`, return `{slug}`.
  - **approve + kind=edit**: v1 does NOT auto-apply edits (an arbitrary note edit needs judgment). Mark it `"approved_pending_apply": true` in the file and return that state — the next chat session or reconciler run applies approved edits via the existing "apply brain proposals" flow. UI copy must say "queued for next session".
  - **reject**: remove from JSON, append one JSONL line to `~/projects/brain/.log/brain.jsonl` (`{"cmd":"proposal-reject","id":...,"summary":...}`) so rejections are traceable.
  - CLI failure → 502 with first stderr line, proposal stays in the file.

### 3. UI

- `app/(app)/brain/` gets two tabs at the top of the existing page: **Search** (current content, default) and **Approvals** with a pending-count badge (count from `GET /api/brain/proposals`, also fetched on page load so the badge shows without opening the tab).
- Approvals tab: card per proposal — summary, detail (collapsible), kind badge, created date; big touch-friendly **Approve** / **Reject** buttons (this is a phone surface). Optimistic removal on action, error toast + restore on failure. Empty state: "No pending proposals — the reconciler runs Sundays 06:00."
- Match the existing page's idiom exactly (dark, zero border-radius, orange #E04500 primary, amber links, mono labels — reuse the primitives `brain/` already imports). No new dependencies.

### 4. Verify (all before PR)

- Seed a fake proposals.json with one save-kind + one edit-kind. On :3838: badge shows 2; approve the save → note exists (`brain find` it), row appears in brain_entries after sync, proposal gone; reject the edit → gone + logged; approve-save with a tampered argv (`["doctor","--fix"]` or bad domain) → 400, nothing executed. `npx tsc --noEmit` + `npm run build` clean. Clean up the smoke note (git rm in brain repo + `brain doctor --fix` + delete Supabase row) — Data Rule 6 applies to brains too.
- PR body includes the curl matrix; squash-merge; verify live badge on :3737 after deploy-sync; remove the worktree.

## House rules that bite
- Never `git checkout` in the primary command-center checkout; never broad `pkill`; commits only in the worktree; `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` trailer (or current model) on commits; PR footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The approvals route executes writes to Simon's knowledge base — the argv allowlist validation is the security boundary; treat it like the capture route's MIME/size gates (Explicit pillar: validate before any write).
- When done: update the `goals` row `2b969a6a` (brain-as-a-product) description is NOT this — this is personal-brain tooling; no goal linkage needed unless Simon says so. Add a `docs/lessons.md` entry only if something breaks.
