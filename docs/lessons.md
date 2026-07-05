# Lessons Log — The Meta Architect

> Lightweight anti-recurrence file. When something breaks, add a row.
> Rule: one entry per failure class. Fix the SOP in the relevant command/tool. Log the pattern here.

---

## 2026-03-17 — Fabricated Airtable writes on context resumption

**What happened:** /harvest resumed from a compacted context and wrote 5 records to Airtable using data that was in memory from a prior session — not from live Perplexity calls.

**Root cause:** No gate checking whether pipeline outputs were produced in the current session vs. recalled from context.

**Fix applied:** `session_verified` flag in harvest.md — each slot initializes as `false`, only set `true` after a live Perplexity call succeeds. Write gate aborts if `false`.

**Where documented:** `session_verified` pattern in `.claude/commands/harvest.md` (Session Integrity Rule section).

---

## 2026-03-17 — Generic harvest queries produce generic ideas

**What happened:** Harvest run #1 queries had no named entities (tools, surveys, orgs). Perplexity returned generic overviews. Ideas were vague and below production quality.

**Root cause:** Query generator prompt had no specificity constraint.

**Fix applied:** Named Entity Requirement added to harvest.md Step 5 — every query must name a specific tool, org, survey, or regulation. Self-check rule added: "Would the first 3 Google results contain a specific number or named org?" If no → rewrite.

**Where documented:** `harvest.md` Step 5, "Named Entity Requirement" and "Self-Check" sections.

---

## 2026-03-19 — Airtable `typecast` must be in JSON body, not query param

**What happened:** `typecast=true` passed as a URL query param was silently ignored by Airtable. Returned "Insufficient permissions to create new select option."

**Root cause:** Airtable API docs are ambiguous. `typecast` only works in the JSON body of POST/PATCH requests.

**Fix applied:** All MCP Airtable calls now pass `typecast: true` as a field in the request body. Pattern documented.

**Where documented:** `projects/Content-Engine/CLAUDE.md` (Airtable section), `harvest.md` Step 10.

---

## 2026-03-19 — Airtable PAT "all permissions" ≠ `schema.bases:write` scope

**What happened:** Account was base owner with "all permissions" on the table — still got "Insufficient permissions." Two separate auth dimensions conflated.

**Root cause:** Airtable has two independent permission axes: (1) access grants (which tables the token can touch) and (2) operational scopes (what actions the token can perform, e.g., `schema.bases:write`). Owning the base doesn't automatically grant all scopes to a PAT.

**Fix applied:** Regenerate PAT with explicit `schema.bases:write` scope when typecast is needed.

**Where documented:** This file. Reminder: when a PAT fails on permissions, check scopes before checking access.

---

## 2026-03-23 — Snippet tag overlap always zero — `String()` on Airtable multipleSelects objects

**What happened:** `/draft` set `needs_snippet = true` for a Law 25 post despite a matching snippet existing in the bank with tags `traceable / observability / logs / authority`.

**Root cause:** `improver.md` computed tag overlap with `String(s.fields.tags ?? "").split(",")`. Airtable MCP returns `multipleSelects` as an array of `{id, name, color}` objects — `String([{...},...])` produces `"[object Object],[object Object]"`, making `tagOverlap` always 0 for every snippet. Only `textOverlap` remained, which was insufficient to pass the `tagOverlap > 0 || textOverlap > 0` filter.

**Fix applied:** `improver.md` line 186 — extract `.name` from each tag object before lowercasing. Array.isArray guard added for safety.

**Where documented:** `.claude/skills/improver.md` — Humanity Snippet Query for /draft section.

---

## 2026-03-31 — Shallow research query in /capture defaulted to 2025 anchor

**What happened:** `/capture` shallow research step constructed `overviewQuery` from `topic + core_angle` with no year. The Perplexity query included "2025" as a general reference, returning year-old data when we're in Q2 2026.

**Root cause:** The `overviewQuery` construction in step 6.5 of `capture.md` has no year-anchor requirement. The year-anchor rule lives in `feedback_harvest_query_quality.md` for `/harvest` but was never applied to `/capture`.

**Fix applied:** Step 6.5 overviewQuery now appends the current year: `` `${strategistOutput.topic} — ${strategistOutput.core_angle} — ${new Date().getFullYear()}` ``

**Where documented:** `.claude/commands/capture.md` Step 6.5.

---

## 2026-04-05 — NLM `research_start`/`research_status` returns source metadata, not synthesized text

**What happened:** `/harvest` Step 6 (`callNLMResearch`) called `research_start` → polled `research_status` until `status === "completed"` → tried to extract content from `statusResult?.result ?? statusResult?.content ?? statusResult?.answer`. All three fields are absent — `research_status` returns `sources` (list of URLs) and an empty `report` field. The message literally reads: "Use research_import to add sources to notebook." Content was empty for all 5 slots → `session_verified = false` → all 5 slots write-blocked → 0 ideas written.

**Root cause:** `callNLMResearch` in `harvest.md` Step 6 was written without the `research_import` step. NLM's research flow is: `research_start` (find sources) → `research_status` (wait) → **`research_import`** (add to notebook) → **`notebook_query`** (synthesize). The SOP only does the first two steps.

**Fix required:** Update `callNLMResearch` in `harvest.md` Step 6 to:
1. After `research_status` completes: call `mcp__notebooklm_mcp__research_import` to add sources to the notebook
2. Then call `mcp__notebooklm_mcp__notebook_query` with the original query to get synthesized content
3. Return `{ content: queryResult.answer, citations: sources }`

**Side effect on `session_verified`:** The flag should be set `true` only after `notebook_query` returns non-empty `answer`. The `callNLMResearch` implementation in Step 6 needs this update — also update the Session Integrity Rule section to reference NLM (not Perplexity) as the live call.

**Where to fix:** `.claude/commands/harvest.md` — Step 6 `callNLMResearch` function + Session Integrity Rule section preamble (still references Perplexity).

---

## 2026-04-13 — NLM `research_start`: pass real title string, not null

Schema says `title` defaults to null. Server rejects it. Always pass a real descriptive string. Error message is ground truth — schema defaults are hints.

**Fix:** Memory entry `feedback_nlm_research_start.md`. `/capture` command already correct.

---

## 2026-04-26 — Suppressing a security warning ≠ fixing the underlying exposure

**What happened:** After fronting n8n with Tailscale Serve, n8n still showed a "secure cookie" warning. I set `N8N_PROXY_HOPS=1` so n8n would trust `X-Forwarded-Proto` from the proxy. The warning went away. Simon then asked: "wasn't the warning supposed to be there if I hit the tailscale IP directly?" He tested `http://100.x.x.x:5678/` directly — it loaded with no warning. **The warning had been suppressed even for the path I never wanted to allow.**

**Root cause:** I conflated "warning gone" with "request path closed." `N8N_PROXY_HOPS=1` only changes how n8n parses requests once they arrive; it doesn't restrict who can connect. n8n was still listening on `0.0.0.0:5678`, so any tailnet device could reach it directly, bypass Tailscale Serve, and get an insecure cookie quietly. The fix wasn't about cookies at all — it was about the bind address.

**Fix applied:** Set `N8N_LISTEN_ADDRESS=127.0.0.1` so n8n binds only to localhost. Tailscale Serve continues to work (it proxies from localhost). Direct tailscale-IP access on port 5678 returns connection refused. Verified empirically with three requests: tailscale-IP → refused, localhost → 200, Tailscale Serve HTTPS → 200.

**Pattern (anti-recurrence):** Before claiming "secure," verify the unsafe path is actually closed. "Warning is gone" is necessary, not sufficient. Run the three-way smoke test (intended path works, unintended path refused, alternate intended path works). Don't equate suppressed warning with closed exposure.

**Where documented:** `infra/local-bootstrap.md` "Required user env" + "Verifying the bind" sections.

---

## 2026-04-28 — Post-migration data: UIF JSON contained invalid `\_` escape sequences

**What happened:** 30 idea records in `pipeline.ideas` had UIFs with `\_` (invalid JSON escape) in JSON keys — primarily in `state_connection` and `pillar_connection` field names. `JSON.parse` threw for all of them, making the top-scored ideas invisible to `/week` candidate selection.

**Root cause:** LLMs generating JSON sometimes escape underscores unnecessarily (`\_` instead of `_`). The old Airtable-era pipeline stored these strings verbatim because the validation gate wasn't enforced consistently before the Supabase migration. The `validateUIF` gate was added later — these records pre-date it.

**Fix applied:** One-time repair script: `fixRawJSON()` replaced `\_` → `_`, normalized `state_connection` → `pillar_connection` in angle objects, and stripped extra description text from `pillar_connection` values (e.g., `"Defensive Architecture — identifies..."` → `"Defensive Architecture"`). Also marked 2 stuck `Processing...` ideas as `processing_failed`.

**Forward prevention:** `validateEditorialPlan` now accepts `post_count` 2–4 (was 3–4). `validateBrief` field list now matches the `capture.md` Step 5 prompt output schema. Both fixes in `.claude/skills/state-checker.md`.

**Where documented:** This file + `state-checker.md` validators.

---

## 2026-04-26 — Don't disable a security default to fix a UX issue when an HTTPS proxy is one command away

**What happened:** n8n's secure-cookie guard rejected Tailscale URLs (`100.x.x.x:5678` is HTTP, not localhost). My first move was `N8N_SECURE_COOKIE=false`. Functional, but it dropped the `Secure` cookie flag on a service running on Simon's main dev box. Simon pushed back: "is there no safer solution?"

**Root cause:** I optimized for "smallest setup change" over "smallest security tradeoff." Tailscale ships a built-in HTTPS reverse proxy (`tailscale serve --bg 5678`) with auto-issued Let's Encrypt certs scoped to the tailnet. One command, no security regression. I knew about it but didn't surface it as the default.

**Fix applied:** `tailscale serve --bg 5678` → `https://simon-pc.tailad7ebc.ts.net/` with a real cert. Removed the `N8N_SECURE_COOKIE` env var, restarted n8n with defaults restored. Updated `infra/local-bootstrap.md` Decisions section.

**Pattern (anti-recurrence):** When picking between (a) disable a security default and (b) front the service with TLS, default to (b) unless TLS would actually take significantly longer. "Tailscale Serve / Caddy with self-signed / nginx" are all 1–2 commands. Surface the safer option first; let the user choose to downgrade only if they understand what they're trading. Don't quietly pick the easier-but-less-safe path.

**Where documented:** `infra/local-bootstrap.md` Decisions section (n8n + Tailscale Serve).

---

## 2026-04-26 — Docker Desktop on Windows: stale logon-session credential blob blocks all CLI ops

**What happened:** Plan 0 setup. `docker pull`, `docker run`, even `docker logout` all returned `error getting credentials - err: exit status 1, out: 'A specified logon session does not exist. It may already have been terminated.'` Probing the credential helpers (`docker-credential-wincred.exe`, `docker-credential-desktop.exe`) directly returned a clean "credentials not found" — so the helpers themselves worked, but Docker CLI was hitting a corrupted credential blob somewhere upstream.

**Root cause:** Docker Desktop on Windows binds a credential record to the user's Windows logon session at install/sign-in. After install + reboot the original session is gone, but Docker's wrapper layer still tries to read the dead reference. Removing `credsStore` from `~/.docker/config.json`, isolating with `--config /tmp/clean`, restarting the Docker helper service, and quitting + relaunching Docker Desktop all failed to clear it. The "Reset to factory defaults" GUI option was not exposed in this Docker Desktop build.

**Fix applied:** Pivoted to `npm install -g n8n` for Plan 0. Same functional outcome (`localhost:5678`, persistent SQLite at `~/.n8n/`), no Docker layer needed. Auto-start replaced by Windows Scheduled Task `n8n` registered via `Register-ScheduledTask`.

**Pattern (anti-recurrence):** Docker is a means, not the goal. When Plan specs say "Docker", read it as "container or process — pick whichever runs locally on this PC." Burn no more than 20 min on Docker yak-shaving before pivoting if the target is just "service on localhost."

**Where documented:** `infra/local-bootstrap.md` Decisions section. Plan 0 in `~/.claude/plans/soi-want-you-to-shimmering-sky.md` should be re-read with the "container or process" lens going forward.

---

## 2026-05-09 — 8 weeks of LinkedIn-only posting → 250 followers

**What happened:** Pipeline shipped 2x/week for 8 weeks. Follower count plateaued at ~250. Posts had near-zero discovery. Treated content quality as the variable; distribution was actually the bottleneck.

**Root cause:** Solo posting on LinkedIn doesn't compound without an audience seed. The algorithm rewards initial engagement; with no followers, posts die in the feed. The roadmap implicitly assumed cadence + quality → growth. It does not — those are necessary but not sufficient.

**Fix applied:** Distribution split into its own phase (3.7 Audience Growth System) with three explicit mechanics: (1) ICP commenting to borrow audiences, (2) bi-weekly teardowns as proof-of-work artifacts, (3) blog + LinkedIn newsletter as owned distribution. Cadence on its own is no longer treated as a growth lever — only as a habit asset.

**Where documented:** Phases 3.6 and 3.7, formerly in `docs/roadmap.md` (deprecated 2026-07-04) — now tracked in the Supabase `goals` table.

---

## 2026-05-09 — Public blog CTA pointed at `/readiness` (paid intake form)

**What happened:** Blog post "audit" CTA in `PostCTA.tsx` linked to `/readiness` — the 15-20 minute paid consulting intake. Strangers landing from blog posts were dropped into operational tooling meant for paying clients.

**Root cause:** The `/readiness` page was built as a back-office tool but rendered as a public route with no documented convention separating it from public-facing pages. No naming or routing convention enforced the distinction.

**Fix applied:** Changed `PostCTA.tsx:44` from `/readiness` → `/score`. Added comment block at top of `PostCTA.tsx` documenting the rule: public surfaces link to `/score` only; `/readiness` is operational tooling and is never linked from anywhere a stranger could land.

**Where documented:** `components/blog/PostCTA.tsx` (header comment); LESSONS LOG formerly in `docs/roadmap.md` (deprecated 2026-07-04), now the Supabase `goals` table.

---

## 2026-05-09 — Workshop / cohort built on roadmap before audience could support them

**What happened:** Roadmap had Workshop (Phase 4), Cohort Readiness (4.5), and Cohort Beta (5) as the next sequential phases. None of them are viable at 250 followers. Energy was being spent thinking about Phase 4.5 curriculum design while Phase 3 distribution was failing silently.

**Root cause:** Phase ordering treated "what comes next in the funnel" as "what to build next." But each phase requires the prior phase to actually be working — not just shipped. Workshop needs an audience large enough to register meaningful attendance. Cohort needs workshop validation. Building forward without demand signal = work without leverage.

**Fix applied:** Sequencing rule added to roadmap — don't build the next-tier offer until the current tier has actual demand signal. Phases 4 / 4.5 / 5 moved to Parking Lot with explicit unblock criteria (followers ≥ 1K OR proven teardown engagement). Phase 6 (Consulting) promoted to active because it can monetize current audience size with the right pricing.

**Where documented:** PARKING LOT (with unblock criteria) and Phase 6, formerly in `docs/roadmap.md` (deprecated 2026-07-04) — now tracked in the Supabase `goals` table.

---

## 2026-05-10 — Two agents opened parallel PRs for the same pivot cleanup

**What happened:** PR #9 (`chore/remove-workshop-cohort`) and PR #10 (`chore/remove-parked-offers`) on simonparis-website both removed `/workshop` and `/cohort` after the 2026-05-09 pivot. PR #10 was a strict superset (also cleaned `about.json` Work-with-me, dead `subscribe/route.ts` groupMap branches, `.env.local.example`). PR #9 also had no Vercel preview deployment because the commit author email wasn't associated with a GitHub account — so even reviewing the PR required reading code, no live preview to click. Wasted scope-comparison cycles. Both PRs also flagged `score.json` CTAs as out-of-scope, but those keys ship the broken `/workshop` and `/cohort` URLs into the diagnostic email and on-screen score result — highest-impact gap.

**Root cause:** (a) Two parallel agent jobs were kicked off for the same cleanup without one checking open PRs first. (b) Agent commits used a non-Vercel-recognized commit author email, breaking preview deploys for one branch. (c) "Out of scope per brief" was treated as a stopping condition even when the leftover code shipped user-visible broken URLs.

**Fix applied:** Closed #9 as superseded; merged #10; opened #11 to fix the user-visible gap (score CTAs) + the two items both PRs missed (`TODO.md`, `PageHero.tsx` comment). Lesson: before kicking off a chore PR, `gh pr list` first. When agent commits, set author email to one Vercel recognizes (Simon's GitHub noreply) so previews build. When an out-of-scope item ships user-visible broken copy, surface it loudly instead of silently parking it.

**Where documented:** This lessons entry; parking-lot items now tracked in the Supabase `goals` table (formerly the roadmap parking-lot lessons-table in the now-deprecated `docs/roadmap.md`).

---

## 2026-05-11 — Per-agent SYSTEM.md replaces base, leaving universal guardrails orphaned

**What happened:** Investigating why sitemaster shipped duplicate PRs (#9 + #10) on 2026-05-10, found a deeper structural issue: per-agent `SYSTEM.md` files **replace** `agent-job/SYSTEM.md` rather than extend it. Initial fix only added gates to `agents/sitemaster/SYSTEM.md`. Simon flagged: "That's a terrible problem. That needs more than just a gate in one of the agents md file... Like for any agent?" Second issue: agents jumped into multi-surface tasks without a plan or checklist, missing surfaces and shipping half-done work.

**Root cause:** (a) No single source of truth for universal workflow discipline — each per-agent SYSTEM.md could silently drop the harness-auto-commit warning, the "what you cannot edit" guardrails, or the gates. (b) Agents treated multi-surface tasks as if they were hotfixes — no plan, no checklist, easy to miss surfaces.

**Fix applied:**
1. Universal workflow discipline (Rules 1-5: job-end gates, one-job-one-PR, recurrence check, brief audit-first, honest reporting) lives in `agents/CLAUDE.md` — auto-loaded by every scoped agent via the Claude Code cwd-walk.
2. Added Rule 6 (Plan-First for multi-surface tasks) to `agents/CLAUDE.md` — requires `/tmp/<task>-plan.md` + TodoWrite for anything touching >2 files or multiple surfaces.
3. Added Rule 7 (Universal safety rails) to `agents/CLAUDE.md` — lifts the harness-auto-commit warning, `/tmp` scratch directive, and "what you cannot edit" list from `agent-job/SYSTEM.md` into the auto-loaded CLAUDE.md.
4. Mirrored Plan-First into `agent-job/SYSTEM.md` for unscoped jobs (they don't traverse `agents/CLAUDE.md`).

**Where documented:** This lessons entry; `agents/CLAUDE.md` Rules 6 + 7; `agent-job/SYSTEM.md` Plan-First subsection.

---

## 2026-06-12 — Teardown agent narrativized structured fields instead of populating them

**What happened:** `/teardown-generate` ran on Intercom Fin AI Engine and produced an excellent 1,574-word blog post with 3 well-named gaps embedded in the prose, but wrote empty `{}` objects to the structured `gaps` and `remediation` JSONB columns. Same shape risk: blog used a series-description italic block instead of the canonical `/score` CTA. Two structured-output drift points in one run.

**Root cause:** The skill's Step 2 instructs the agent to "produce" gaps and remediation, but Step 4's INSERT block has placeholder `'...'` strings that read as boilerplate rather than required fields. An agent generating long-form prose tends to satisfy the "write the gaps" instruction in the narrative section and skip re-emitting them as JSON. Same for the closing CTA — the format spec was buried in the markdown template and didn't trigger a verification gate.

**Fix applied:**
1. Backfilled gaps (3) and remediation (4) on draft `625c6f9f` from the prose.
2. Swapped closing block for canonical `/score` CTA.
3. Hardened `agents/coo/skills/teardown-generate/SKILL.md`: added an explicit "Structured Output Contract" section listing required JSONB fields with non-empty validation, and added a pre-write checklist that fails if (a) `gaps` array has fewer than 2 entries, (b) any gap has empty `pillar`/`gap`/`consequence`, (c) `full_content` doesn't end with the `/score` CTA, or (d) `linkedin_post` exceeds 250 words.

**Where documented:** This entry; `agents/coo/skills/teardown-generate/SKILL.md` (Structured Output Contract + Pre-Write Checklist sections).

---

## 2026-06-27 — `agent-job-background` spawned sitemaster job no-op'd (empty PR #91 on Sterling) because `/app/data/projects/` is not mounted into background-spawned containers

**What happened:** COO spawned sitemaster via `agent-job-background` with a multi-surface RICE-redesign brief. Sitemaster booted, found that `/app/data/projects/simonparis-website/` did not exist in its container, correctly refused to ship code to the stale `agents/coo/deliverables/admin-panel/` handoff bundle, and ended the job with a plan file and no code. The harness auto-merged an empty PR (#91 on Sterling, 0 files changed).

**Root cause (two-layer):**
1. **Platform layer**: `agent-job-background`-spawned containers receive the workspace clone but NOT `/app/data/projects/` (which is host-mounted only into the chat-mode event-handler container). The sitemaster SYSTEM.md falsely claimed the path was "always available regardless of session."
2. **Agent layer**: when the path was missing, the SYSTEM.md told the agent to "instruct Simon to run the one-time setup on Sterling" — a Simon-blocking handoff rather than an autonomous remediation. The harness still merges the empty PR, masking the failure as success.

**Fix applied:**
1. New idempotent bootstrap script `agents/sitemaster/scripts/bootstrap-repos.sh` — fast-exits if the canonical path is populated (chat mode); else clones the repos to `/home/coding-agent/projects/` and symlinks them into `/app/data/projects/` so all existing path references resolve.
2. `agents/sitemaster/SYSTEM.md` now mandates running the bootstrap as **Step 0** of every job, before reading the brief. Failure → DM Simon, never silently no-op.
3. `agents/sitemaster/CLAUDE.md` Context section updated to point at the bootstrap.

**Where documented:** This entry; `agents/sitemaster/SYSTEM.md` (Step 0 — Bootstrap); `agents/sitemaster/scripts/bootstrap-repos.sh`; `agents/sitemaster/CLAUDE.md`.

**Open follow-up (apply same pattern to other agents when they next get spawned as background jobs):** blog-writer, task-forge, bug-bounty — each will hit the same missing-mount class of failure on its first `agent-job-background` invocation. Hoist the bootstrap pattern into `agents/CLAUDE.md` once a second agent needs it (don't pre-build; let demand pull the abstraction).

---

## 2026-06-28 — Static code review missed a `text-4xl` column overflow that was only visible in a live preview walk (PR #35, sitemaster)

**What happened:** COO read all three new admin components from sitemaster's PR #35 line-by-line and rated them elite/brand-compliant. Recommended merge. After Simon added `VERCEL_AUTOMATION_BYPASS_SECRET` to the vault, COO walked the actual preview and immediately saw the dashboard `TopPriorities` widget had `w-16` (64px) score columns that overflowed for decimal scores like `149.3` and `76.8` — the `.3` and `.8` were wrapping into the title column. Bug never surfaced in code review because the overflow only manifests at the intersection of `text-4xl` + tabular monospace + actual ≥4-char data.

**Root cause:** Static code review can verify logic, props, and brand tokens, but cannot predict CSS box-model conflicts under real data widths. COO treated "elite code review" as sufficient when the preview-walk gate was unavailable (no bypass token), instead of falling back to the documented localhost-dev path in `agents/sitemaster/CLAUDE.md`.

**Fix applied:**
1. Pushed `773bed7` to PR #35 widening the score column to `w-24` (96px), which fits up to `9999` / `999.9` cleanly. Re-walked the new preview, confirmed clean, then merged (94d52c8).
2. Lesson recorded here. Going forward: **a live walk is the closing gate on any UI-touching PR**, not a nice-to-have on top of code review. If the preferred preview-walk path is blocked (no bypass token, protection issues, Supabase allow-list), fall back to localhost-dev per `agents/sitemaster/CLAUDE.md` lines 71–76 — do NOT skip the walk and substitute deeper code review.

**Where documented:** This entry; `agents/coo/CLAUDE.md` already documents the COO ↔ sitemaster build loop with the walk as step 5 — this lesson promotes it from "review step" to "closing gate."

---

## 2026-07-02 — Supabase access on Sterling blocked twice: MCP connector dropped mid-session, then Cloudflare 1010 rejected python-urllib's default User-Agent

**What happened:** During teardown #1 regeneration, the claude.ai Supabase MCP connector disconnected mid-session and did not recover. The documented skill fallback (`/app/data/workspaces/*/.supabase/access-token`) is popebot-only and doesn't exist on Sterling; the auto-mode classifier correctly blocked a filesystem-wide credential hunt. After Simon provisioned a PAT at `~/.supabase/access-token`, the Management API still returned `403 error code: 1010` — Cloudflare bot-blocking python-urllib's default User-Agent, which looks like an auth failure but isn't.

**Root cause:** Two-layer: (1) the teardown skills documented only the popebot token path, so Sterling-local runs had no sanctioned credential location; (2) `urllib.request` sends `Python-urllib/3.x` as UA and Cloudflare's rules on api.supabase.com reject it — any skill following the documented snippet verbatim would fail on Sterling with a misleading 403.

**Fix applied:**
1. Simon generated a PAT stored at `~/.supabase/access-token` (chmod 600) — the canonical Sterling location.
2. Both `.claude/skills/teardown-{generate,research}/SKILL.md` patched: `_get_token()` now checks popebot glob first, then `~/.supabase/access-token`; `supabase_sql()` sends `User-Agent: supabase-cli/2.30.4`.
3. Note: the token was pasted in chat before storage — flagged for rotation (generate new PAT, replace file contents, revoke old).
4. Open follow-up: popebot copies of these skills (`agents/coo/skills/teardown-*`) still carry the unpatched snippet — sync when next touched.

**Where documented:** This entry; both skill files' Supabase Access sections.

---

## 2026-07-02 — First two story-pipeline stories parked at verify: session killed itself with its own `pkill`

**What happened:** Stories `3f6ec824` (fuse ideas/blog tabs) and `ef0613ef` (node upgrade) both failed at the `verifying` stage with "session exited 143" (SIGTERM), `timedOut: false`. Plan, build, and deterministic tests had all passed. Transcripts showed each verify session died at the exact moment it ran its dev-server cleanup: `pkill -f "next dev -p 4123"`.

**Root cause:** `lib/claude/spawn.ts` (command-center repo) passed the entire stage prompt as an argv argument (`claude -p "<prompt>"`). The verify prompt embeds the dev-server start command verbatim (`pipeline.ts` injects the literal `npx next dev -p 4123`), so the claude process's own command line contained that string. `pkill -f` matches full command lines — the session's cleanup pattern matched its parent claude process and SIGTERMed it. Worker saw exit 143 and parked the story. Systematic: *any* `pkill -f` pattern that happens to appear anywhere in a stage prompt would kill the session. Story 2 even killed by PID first and ran pkill only as belt-and-suspenders — still died.

**Fix applied:**
1. `lib/claude/spawn.ts`: prompt now delivered via stdin (`claude -p` with the prompt piped), never argv. Regression test in `worker/__tests__/session.test.ts` with a `fake-claude-echo.sh` fixture asserting stdin-not-argv delivery. Verified against the real CLI (`echo ... | claude -p --output-format stream-json` → correct result). Side benefits: no argv length limits, prompts no longer visible in `ps`.
2. `worker/skills/verify.md`: kill the dev server by captured PID, never `pkill -f`-style pattern matching (a broad pattern like `pkill -f node` would still kill the worker itself).
3. Restarted `story-worker`, retried both stories via `POST /api/stories/{id}/retry` — they resume at `verifying` with worktrees intact.
4. Note: the Next.js app on :3737 (chat + actions routes) also spawns claude through the same `spawn.ts` — it gets the fix on its next rebuild/redeploy; not urgent since chat prompts rarely contain pkill-able strings.

**Where documented:** This entry; comment above the args array in `spawn.ts`; regression test comment in `session.test.ts`.

---

## 2026-07-04 — Story with a new Supabase migration dead-ended at verify (no way to apply DDL)

**What happened:** Story `7544d841` (chat cwd/agent dropdown) implemented correctly — typecheck, build, and 4/7 verify criteria passed — but parked at `verifying` because its new `supabase/migrations/0003_chat_model.sql` was never applied to the live Supabase project. `POST /api/chats` 500'd with "column chats.model does not exist". No amount of fix-loop retries could code past it.

**Root cause:** Stage sessions only hold PostgREST keys (anon + service-role JWTs) — no `DATABASE_URL`, no management token — so nothing in the pipeline could execute DDL. The routing rule "migrations stay in-session" only covers migrations known *up front*; here the build agent legitimately *discovered* it needed a schema change mid-story. The gap was systemic: any story that emerges a migration was guaranteed to park.

**Fix applied:**
1. Immediate: applied the DDL via the Supabase Management API using the token at `~/.supabase/access-token`, then `POST /api/stories/7544d841/retry` — story resumed at verify, PR #6 merged.
2. Systemic (command-center PR #7): worker now diffs the story branch for added migration files before the verify session and auto-applies them via the Management API — but ONLY if every statement is additive and idempotent (whitelist in `worker/migrations.ts`). Anything destructive/transforming parks the story with the exact SQL for the human SQL-editor path. Token stays worker-side; never enters an agent session. All-or-nothing per batch. `skills/build.md` now instructs agents to write `if not exists` DDL and to return `blocked` when a plan needs destructive DDL.

**Where documented:** This entry; `worker/migrations.ts` header comment; `worker/skills/build.md` "Database migrations" section; Supabase `goals` table (formerly the roadmap lessons table in the now-deprecated `docs/roadmap.md`).

---

## 2026-07-04 — "Cancelled" story thrashed in needs_review forever (no cancel path in the pipeline)

**What happened:** Story `bad71799` (agent picker) was superseded when Simon had the same change implemented in-session. It was "cancelled" by writing a note into its `error` field — but its stage stayed `needs_review` with `auto_merge=true` and PR #10 still open. From then on, `reconcileNeedsReview` re-attempted the merge gate on every poll: push branch → gate says CONFLICTING (main already contains the in-session version) → park back to `needs_review`. The story's `updated_at` churned every few minutes for ~3 hours, and the board showed a dead story as pending review.

**Root cause:** The pipeline has no terminal "cancelled" state and no cancel operation. `StoryStage` (worker/types.ts) ends at `merged | failed | needs_review`, and `reconcileNeedsReview` (worker/pipeline.ts) assumes every open-PR `needs_review` story with `auto_merge` on still *wants* to merge — a closed-on-purpose or superseded PR loops indefinitely. Writing prose into `error` changes nothing the worker reads.

**Fix applied:**
1. Immediate: PATCHed the story to `stage=failed` with a "cancelled — superseded" error via Supabase REST (same call path as `worker/db.ts updateStory`), which removes it from the `findNeedsReviewWithPr` query. PR #10 closure + worktree/branch removal handed to Simon (permission-gated in-session).
2. Systemic (proposed, not yet built): `reconcileNeedsReview` should check PR state — if the PR is CLOSED (not merged), park the story as `failed`/cancelled instead of re-attempting the gate; plus a proper `POST /api/stories/:id/cancel` that closes the PR, removes the worktree, and sets a terminal stage. Pipeline-touching → in-session work, not a queued story.

**Where documented:** This entry; Supabase `goals` table note.

---

## 2026-07-04 — Blind-guarantee leak via a sibling surface (teardown panel /runs page)
**What happened:** The teardown training panel's core invariant — Claude's blind analysis stays hidden until Simon submits his answers — was correctly enforced in the session API (server-side stripping), but the analysis leaked anyway: the prepare run's raw output (the full blind analysis) was stored in `agent_runs.output` and rendered on the /runs page while Simon was still answering. Every per-task review passed; only the final whole-branch review caught it.
**Root cause:** The invariant was specified and tested against one surface (the teardown API) while a shared infrastructure component (`startRun`/`finishRun` → agent_runs → /runs) persisted the same secret on another. Confidentiality invariants must be enforced at every surface that persists or displays the data, not at the primary read path.
**Fix applied:** Run-1 output is redacted at write time in `defaultSpawn` (command-center `lib/teardowns/runner.ts`); the analysis lives only on the session row. Spec updated to state the guarantee extends to every persisting surface. Meta-fix: whole-branch reviews now explicitly walk "where else does this data land?" for any hidden/withheld data feature.
**Where documented:** This entry; command-center spec `docs/superpowers/specs/2026-07-04-teardown-training-panel-design.md`; SDD ledger.

---

## 2026-07-04 — Concurrent Claude sessions fighting over one command-center checkout
**What happened:** During the teardown-panel build (12 tasks, subagent-driven, on `main`), another live session repeatedly used the same `projects/command-center` checkout: switched branches under us twice (implementers found themselves on `feat/schedules`, then `feat/story-cancel-path`), ran a `git stash` that reverted an in-flight edit, and accidentally committed its own work onto `main` (later cherry-picked away by that session). Also: one task's verification server (port 4123) was left orphaned and collided with the next task's.
**Root cause:** Two interactive sessions treating the primary checkout as exclusively theirs. Worktrees existed (`~/.worktrees/command-center-schedules`) but branch switching still happened in the shared checkout. No convention says which session owns the primary checkout's HEAD.
**Fix applied:** In-session mitigations: every subagent dispatch now includes "verify `git branch --show-current` before starting and before committing; stage only your files"; verification servers get explicit kill steps and the controller sweeps orphans. Convention to adopt (proposed): the primary checkout stays on `main`; any branch work happens in a `git worktree` — never `git checkout <branch>` in the primary checkout while another session may be active.
**Where documented:** This entry; command-center SDD ledger `.superpowers/sdd/progress.md`.

---

## Template for new entries

```
## YYYY-MM-DD — [Short failure description]
**What happened:** ...
**Root cause:** ...
**Fix applied:** ...
**Where documented:** ...
```

## 2026-07-04 — Next.js instrumentation.ts: early-return env guards break `next dev`
Building the command-center Schedules ticker: `instrumentation.ts` with early-return guards (`if (process.env.NODE_ENV !== "production") return;`) before a dynamic import of Node-API code made webpack bundle the import anyway — `UnhandledSchemeError: node:child_process` and **every** dev page 500'd, while prod built fine. Only the documented nested-if shape (`if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production") { await import(...) }`) gets dead-code-eliminated in dev. Root cause fixed in commit `069ca94` (command-center); rule of thumb: in instrumentation.ts, always gate dynamic imports with the positive nested-if form, never early returns.

## 2026-07-05 — First live teardown (Ramp) failed at draft gate: "gaps[0] bad pillar"
**What happened:** The first real training-panel teardown ran prepare + Simon's answers fine, then died in run 2 with `draft: gaps[0] bad pillar`. The review run's output used capitalized pillar ids (`"Tol"`, `"S"`, `"T"`, `"A"`) while the validator whitelist is lowercase `["s","t","a","tol","e"]`.
**Root cause:** `buildReviewPrompt`'s JSON schema showed `"pillar": "..."` for gaps/remediation — unlike `buildPreparePrompt`, which spells out `"s"|"t"|"a"|"tol"|"e"`. With no enum in sight, the model fell back to the capitalized STATE letters used everywhere in the brand docs. General rule: every enum-constrained field in an LLM output schema must show its literal allowed values in the prompt; a validation gate downstream of a schema the model never saw is a trap, not a gate.
**Fix applied:** command-center PR #18 — enum spelled out in the review schema (root cause), plus `normalizePillarCase` in `lib/teardowns/validate.ts` applied before validation in both runs (lossless lowercase canonicalization of exact pillar ids; unknown values still fail loudly). Verified by replaying the actual failed Ramp output: validates clean. Session is retryable from the panel once the PR is merged and deploy-sync picks it up.
**Where documented:** This entry; command-center PR #18; one-liner pending on the "Build Teardown Engine" goal (write to Supabase was permission-blocked this session).

## 2026-07-05 — Story queued for a file that lives outside the pipeline's target repos
**What happened:** Story 7a984b5b ("upgrade the sitemaster profile") was queued with `target_repo: command-center`. Planning blocked: the sitemaster profile lives at `MetaArchitect/.claude/agents/sitemaster.md` (the `~/.claude/agents/sitemaster.md` copy is a symlink to it), and MetaArchitect is not a registered pipeline target (`worker/targets.ts`: command-center, simonparis-website only). Simon read the block as the agent getting confused; it wasn't — the planner traced the symlink correctly and had no valid move, since it can only PR registered repos. Blocking with a precise reason was the right behavior.
**Root cause:** Routing gap at story-creation time, not an agent-capability gap. Nothing in the SOP made explicit that agent profiles / brand files / skills are MetaArchitect files and therefore un-storyable. Secondary find while verifying: sitemaster.md and coo.md still carried pope-agent container paths (`/app/data/projects/...`) and a wrong accent color (`#F97316` vs brand `#E04500`) — stale-profile drift is its own recurring hazard.
**Fix applied:** Root CLAUDE.md routing rule 1 now spells out that agent profiles, brand files, skills, and CLAUDE.md are session work, never stories. sitemaster.md upgraded in-session (the story's actual intent): Sterling-correct paths, correct brand palette + non-negotiable design rules, and a "Two Execution Contexts" section telling it how to behave in interactive sessions vs pipeline worktrees. coo.md paths corrected the same way.
**Where documented:** This entry; root CLAUDE.md routing section; `.claude/agents/sitemaster.md`, `.claude/agents/coo.md`.
