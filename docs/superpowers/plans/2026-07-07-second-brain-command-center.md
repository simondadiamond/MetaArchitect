# Second Brain — Command Center Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/brain` page in Command Center (search + domain filter + entry view with asset preview) and a `POST /api/brain/capture` endpoint so Simon can search the second brain and capture text/files from his phone browser.

**Architecture:** Read model = Supabase `public.brain_entries` (already created by the core plan; written only by `brain sync`). Search API queries it with ilike full-text; capture API shells out to the `brain` CLI on sterling (`execFile`, never shell strings) so phone capture uses the same atomic save path as everything else. UI follows existing Command Center pages (dark, sharp edges, mono labels).

**Tech Stack:** Next.js App Router (command-center repo), `@supabase/ssr` clients in `lib/supabase/`, TypeScript.

## Global Constraints

- Repo: `~/projects/MetaArchitect/projects/command-center` — **work in a git worktree** (Simon's rule): `git -C ~/projects/MetaArchitect/projects/command-center worktree add ~/projects/cc-worktrees/brain-surface -b feat/brain-surface` after `git fetch origin && git worktree add ... origin/main`. Primary checkout stays on `main`, untouched.
- **Pull/rebase before push** — story-worker merges PRs to origin/main from its own worktrees.
- The live service on :3737 serves the primary checkout; verify the branch with `npm run build && PORT=3838 npm start` (or `npm run dev -- -p 3838`) inside the worktree, bound only briefly, then kill by port PID (never broad `pkill`).
- Search/read paths use a SERVICE-ROLE server client (create `lib/supabase/admin.ts` if absent — check `lib/` for an existing one first): `brain_entries` has RLS enabled with NO anon policies, deliberately — it holds personal/family/health content and the anon key ships to browsers. Never query it with the anon client, and never expose `SUPABASE_SERVICE_ROLE_KEY` outside server routes. Capture route uses `execFile('/home/diamond/.local/bin/brain', [...])` — validate everything BEFORE invoking (Explicit gate): text ≤ 10 000 chars, file ≤ 25 MB, MIME allowlist `image/png image/jpeg image/webp image/gif application/pdf text/plain`, domain ∈ `business|content|infra|personal|family|health|finance`.
- Brand rules: dark only, zero border-radius, orange `#E04500` primary actions, amber `#C97A1A` links, Roboto Mono labels — match whatever the existing pages (`app/(app)/content`, `/ideas`) already do; reuse their components/utilities rather than inventing new ones.
- Asset preview: `brain_entries.asset_url`/`attachment` hold storage paths in bucket `brain` (private); generate signed URLs server-side with the service-role client (`SUPABASE_SERVICE_ROLE_KEY` is in CC's `.env`) — 1-hour expiry.
- PR at the end; after checks pass, squash-merge (standing rule for Simon's own repos).

---

### Task 1: Search API — `GET /api/brain/search`

**Files:**
- Create: `app/api/brain/search/route.ts`
- Reference first: `app/api/goals/route.ts` or `app/api/content/*` for the established route/response style — mirror it.

**Interfaces:**
- Produces: `GET /api/brain/search?q=<text>&domain=<domain|all>&limit=<n≤100>` → `{ entries: Array<{slug, title, domain, tags, description, created_at, updated_at, has_asset: boolean}> }`, newest-updated first. Empty `q` = browse mode (all entries, filtered by domain). Query: `q` terms AND-ed with `ilike` against `title`/`description`/`tags::text` (build `.or(...)` per term via the supabase client). No `body_md` in list responses (payload discipline).

- [ ] **Step 1:** Read one existing API route + `lib/supabase/server.ts`; write the route following that exact style.
- [ ] **Step 2:** Verify from the worktree dev server: `curl -s 'http://localhost:3838/api/brain/search?q=hydro&domain=all' | head` → JSON with the seeded hydro/backfill entries; `?domain=family` filters.
- [ ] **Step 3: Commit** `"feat(brain): search API over brain_entries"`

---

### Task 2: Entry detail + signed asset URL — `GET /api/brain/entry/[slug]`

**Files:**
- Create: `app/api/brain/entry/[slug]/route.ts`
- Create if absent: `lib/supabase/admin.ts` — service-role client (check `lib/` first; the stories/scheduler code likely already has a service-role client to reuse).

**Interfaces:**
- Produces: `GET /api/brain/entry/<slug>` → `{ entry: {slug, title, domain, tags, description, body_md, created_at, updated_at, asset: {url: <signed 1h>, name} | null} }`; 404 JSON `{error:"not found"}` for unknown slug. Signed URL via `storage.from('brain').createSignedUrl(path, 3600)` only when `asset_url` or `attachment` present.

- [ ] **Step 1:** Implement route (+ admin client if needed).
- [ ] **Step 2:** Verify: curl a slug that exists → `body_md` present; unknown slug → 404.
- [ ] **Step 3: Commit** `"feat(brain): entry detail API with signed asset URLs"`

---

### Task 3: Capture API — `POST /api/brain/capture`

**Files:**
- Create: `app/api/brain/capture/route.ts`

**Interfaces:**
- Consumes: `brain save` CLI (prints slug on stdout, exit 0; stage-named stderr on failure).
- Produces: `POST /api/brain/capture` accepting `multipart/form-data` (`text?`, `domain`, `tags?` comma string, `title?`, `file?`) or JSON (same minus file). At least one of `text`/`file` required. Flow: validate per Global Constraints → if file: write to `/home/diamond/projects/brain/.staging/upload-<crypto.randomUUID()>-<sanitized name>` → `execFile('/home/diamond/.local/bin/brain', ['save', text || 'Captured: <filename>', '--domain', domain, '--source', 'command-center', ...tagsArgs, ...fileArgs], {timeout: 30000})` → 200 `{slug}`; CLI failure → 502 `{error: <first stderr line>}`, staged file removed. Filename sanitization: basename only, `[^a-zA-Z0-9._-]` → `-`.

- [ ] **Step 1:** Implement route.
- [ ] **Step 2:** Verify: `curl -X POST -F 'text=capture smoke test from CC' -F 'domain=infra' http://localhost:3838/api/brain/capture` → `{slug}`; confirm `brain find "capture smoke test"` hits it; then remove the smoke note (`git -C ~/projects/brain rm notes/<slug>.md && brain doctor --fix`). Also verify a rejected MIME (e.g. `.sh` file) → 400, nothing written.
- [ ] **Step 3: Commit** `"feat(brain): capture endpoint — phone → brain save"`

---

### Task 4: `/brain` page UI

**Files:**
- Create: `app/(app)/brain/page.tsx` (+ colocated client components as the other pages do)
- Modify: the app nav (find it in `app/(app)/layout.tsx` or its nav component) — add `Brain` link.

**Interfaces:**
- Consumes: the three API routes above.
- Produces: `/brain` page with: search input (debounced 300 ms), domain filter chips (All + 7 domains), result list (title, domain badge, description, updated date, 📎 marker when `has_asset`), click → detail panel/drawer: rendered `body_md` (reuse the app's existing markdown renderer if one exists — check chat/teardowns components; else render as `<pre>` — do NOT add a new dependency without checking package.json first), image preview via signed URL (`<img>`) or download link for PDFs, and a **Capture** form (textarea + domain select + optional file input) posting to `/api/brain/capture`, showing the returned slug.

- [ ] **Step 1:** Read `app/(app)/content/page.tsx` (or `/ideas`) for layout/styling idiom; build the page in the same idiom.
- [ ] **Step 2:** Verify in the worktree dev server on :3838 — search returns seeded entries, domain chips filter, entry opens with markdown, capture round-trips (submit → slug → searchable). Screenshot-level check: dark, sharp corners, no blue links.
- [ ] **Step 3:** `npm run build` passes; `npx tsc --noEmit` (or the repo's lint/typecheck script) passes.
- [ ] **Step 4: Commit** `"feat(brain): /brain page — search, entry view, phone capture"`

---

### Task 5: PR + merge + deploy check

- [ ] **Step 1:** `git fetch origin && git rebase origin/main`; push branch; `gh pr create` — body: what/why, verification evidence, `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- [ ] **Step 2:** After checks pass: squash-merge (standing rule). Story-worker/deploy-sync handles pull-build-restart of the live service; if the live `/brain` 404s after ~5 min, check `systemctl --user status command-center` and the deploy-sync timer before touching anything.
- [ ] **Step 3:** Verify live: `curl -s http://100.105.85.5:3737/api/brain/search?q=test | head -3`. Remove the worktree: `git worktree remove ~/projects/cc-worktrees/brain-surface`.

---

## Self-review notes

- RLS: read policy created in core plan Task 9; capture never writes Supabase directly (CLI → repo → `brain sync` is the writer). If searching from CC returns nothing but the table has rows, check the anon-key read path first.
- The service restarts serve the PRIMARY checkout — nothing in this plan may check out branches there.
- `brain sync` cadence: after captures, entries appear in CC only after sync — capture route should therefore ALSO fire a background `execFile('brain', ['sync'])` (fire-and-forget, errors logged to console) so phone captures show up in the UI without waiting. Fold this into Task 3 Step 1.
