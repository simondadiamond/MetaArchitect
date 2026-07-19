# scripts/ — promoted toolbox

One line per tool. **Grep this file before writing a new script** — if a session already
built it, reuse it (session-close lane 4 promotes session one-offs here; keep entries current).

- wait-deploy.sh — block until deploy-sync has deployed origin/main of a repo; args: [repo-path] [timeout-sec]; use before any live-fire test that follows a merge (born 2026-07-13)
- scrub-transcripts.py — mask credential literals in ~/.claude/projects transcripts; secrets read from --secrets-file/--env/--env-file and NEVER from argv (naming them on a command line is what re-leaked them once); same-length masking only, since a live transcript is append-open; --dry-run, --self-test (born 2026-07-13)
- gate-selftest.sh — runs every mechanical gate in the estate (hooks harness, skill-lint, handoff-lint, bind-audit, and all 7 content/gate script self-tests) and reports one verdict; the check that the checks still fire; run by /weekly-review (born 2026-07-13)
- skill-lint.sh — greps the skill/agent estate for known drift classes (dead paths, stale CTAs, hardcoded model ids); run after any skill edit and every Friday via /weekly-review (born 2026-07-07)
- session-digest.mjs — reduces a Claude Code transcript .jsonl to a harvestable markdown digest (text turns + bash commands + files written, tool results stripped); shared by session-close and the daily session sweep; `--max-bytes` caps output (born 2026-07-10)
- session-grep.mjs — keyword-search past session transcripts ("which session discussed X"); ALL-keywords match over user turns, prints path + date + first hit; `--any` relaxes, `--dir` overrides (born 2026-07-10)
- poll-story.sh — poll a Command Center story until verifying/terminal stage (curl+jq against the stories API, 20s cadence); use when babysitting a pipeline story from a session (born 2026-07-12)
- memory-janitor.sh — daily RAM hygiene after the 2026-07-12 thrash-hang: reaps headless browsers >12h old (PID-by-PID, never pattern pkill), cycles swap back to RAM when headroom allows, ntfy-alerts with top consumers at ≥85% RAM / ≥75% swap; scheduled daily 05:30 UTC via Command Center (born 2026-07-13)
- linkedin-gate.sh — mechanical half of the shared LinkedIn copy gate as PASS/FAIL checks (`<file>` post mode, `--blog`, `--comment`, `--cadence` for the /score CTA decision, `--self-test`); canonical spec stays in repurpose/references/linkedin-gate.md (born 2026-07-13)
- postiz-update.sh — the ONLY sanctioned Postiz update path: compose pull + up, re-apply the LinkedIn scope patch (reverted by every pull), wait for the backend; `--dry-run` echoes steps (born 2026-07-13)
- validate-brief.mjs — weekly-brief Step 4 payload gate (`<payload.json> <goals.json>`): 3-5 tasks, ranks 1..N, payoff/est_minutes on all, ≥2 payoff kinds, goal_ids exist in snapshot; offline, `--self-test` (born 2026-07-13)
- handoff-lint.sh — every docs/handoffs/*.md (except TEMPLATE.md) must carry `status: queued|in-progress|done|abandoned`; exit 1 lists offenders; `--self-test` (born 2026-07-13)
- bind-audit.sh — compares live `ss -tlnp` against scripts/bind-allowlist.txt (sanctioned non-loopback listeners); drift → exit 1 + ntfy; `--fixture <file>` for offline runs, `--self-test` (born 2026-07-13)
- mark-session-closed.sh — appends {path, lastLineTimestamp} for a transcript to the brain reconciler ledger (~/projects/brain/.reconciler/processed.json); atomic + jq-validated + idempotent; PROCESSED_FILE overrides for tests; `--self-test` (born 2026-07-13)

Content-pipeline gates live next to their tools in `projects/Content-Engine/tools/` (all `--self-test`):

- ../projects/Content-Engine/tools/teardown-gate.py — teardown-generate Gates 1-11 (`<payload.json>`), plus the idempotent-upsert SQL helper (born 2026-07-13)
- ../projects/Content-Engine/tools/insert-blog-post.mjs — write-post Step 7 gate + public.blog_posts insert (`<payload.json> [--validate-only]`) (born 2026-07-13)
- ../projects/Content-Engine/tools/validate-manifest.mjs — carousel C3 manifest gate (`<manifest.json> <draftId|scores.json>`) (born 2026-07-13)
- ../projects/Content-Engine/tools/postiz-guards.mjs — pure guards for postiz.mjs: ±2h slot conflicts, ISO-week cadence, nudger liveness, edit-content linkedin-gate run (born 2026-07-13)
- postiz-worker-watchdog.sh — heals the silent reboot-race where the postiz orchestrator loses its Temporal workers but reports healthy (lessons.md 2026-07-14): temporal healthy + postiz past warmup + zero pollers on linkedin/main queues → docker restart postiz + ntfy, re-verify, exit 1 if still dead; `--dry-run`, `--self-test`; scheduled */10 min via Command Center (born 2026-07-14)
- blog-hero-figure/render.mjs — hero-figure SVG → 2:1 PNG @2x with brand fonts baked in (`<figure.svg> <out.png>`); the render half of the hero-figure skill loop (born 2026-07-16)
- blog-hero-figure/publish.mjs — upload hero PNG+SVG to public blog-assets bucket and set blog_posts.hero_image_url/alt (`<slug> <png> <svg> "<alt>"`); refuses unknown slugs (born 2026-07-16)
- supabase-sql.py — run raw SQL against a Supabase project via the Management API; token auto-discovered from ~/.supabase/access-token, --ref overrides the command-center default (born 2026-07-17)
- pr-merge-when-green.sh — wait for PR checks, squash-merge by number, optional prod grep verify (`<repo-dir> <pr#> [prod-url] [grep-string]`) (born 2026-07-19)
- outreach-stale-nudge.mjs — daily ntfy digest of outreach leads untouched >5 days (status new/conversation), no LLM; reads command-center .env at point of use; --dry-run; scheduled 08:00 via Command Center (born 2026-07-19)
- voice-intake.mjs — watched-folder voice-memo intake: transcribe with local whisper.cpp (auto-installs + small model on first run, defers while a next build runs) and queue a Convert conversion, file → processed/; --dry-run; scheduled */15 via Command Center (born 2026-07-19)
