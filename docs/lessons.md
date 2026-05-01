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

## Template for new entries

```
## YYYY-MM-DD — [Short failure description]
**What happened:** ...
**Root cause:** ...
**Fix applied:** ...
**Where documented:** ...
```
