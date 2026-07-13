# Post-Fable Gate Inventory — 2026-07-12

> Phase 1 output of `docs/handoffs/2026-07-12-post-fable-operating-system.md` (goal `3df3143e`).
> Method: six parallel sweep agents over lessons.md (every entry), memory feedback files, skills + skill-audit + skill-lint, session transcripts (2026-06-30 → 2026-07-12; earlier transcripts don't survive on this box), git history of CLAUDE.md/agent profiles, and existing enforcement + API surfaces.
> Classes: **(a)** already mechanized — verify it fires · **(b)** mechanizable — build list · **(c)** inherently judgment — put on an always-loaded surface.
> Full per-rule tables are in the appendices below. This header is the synthesis and the ranked build list.

## Headline findings

1. **Zero hooks exist anywhere.** Confirmed independently by three sweeps: no `hooks` key in repo, local, or global settings; no hooks directory; never has been one in git history. Root CLAUDE.md has advertised "hooks" in the repo layout since March. Worse: commit `dafbc7b` (2026-03-19) deleted a 130-line prose rule with the message "handled by PreToolUse hook" — **the hook was never written**. The estate ran four months on an enforcement ghost. Every "non-negotiable" (worktree rule, no broad pkill, Next Action, session-close) is prose-only today.
2. **`agent_target` is theater.** The API accepts it, the DB stores it, the board displays it — and `worker/pipeline.ts:218` hardcodes `agentText: null`. No story has ever run with a persona. The "UI stories carry sitemaster" rule (CLAUDE.md: "mandatory") buys nothing at execution time. Same class at fire time for schedules: a missing agent file silently runs persona-less.
3. **The estate discovered the thesis once already and it still decayed.** The 2026-07-07 audit named "copies rot independently" and built skill-lint — but the lint's own trigger is prose ("run after skill edits"), its scope misses CLAUDE.md (the most-drifted file), and a divergence created three days after the lint was born is invisible to it (coo.md still instructs the old `/pattern`+goals session close — live divergence today).
4. **Four failure classes were never written down** (transcript mining): credentials pasted into chat and now sitting in plaintext transcripts (security flag below); stress-test requests answered with repo-doc echo instead of critique; handoffs with no queryable status ("is this done yet???" ×4 in 3 days); pipeline reruns clobbering Simon's manual post edits (complained about in three sessions).
5. **Where prose DID become gates, it worked.** Twelve lessons are fully mechanized in command-center `worker/` with tests; the safe-DDL gate has a proven live firing plus a fix-forward. The pattern to replicate: rule lands in script/schema/API, prose stays as explanation.
6. **The downgrade has an unflagged hard dependency:** pipeline model config (`MODEL_PLAN=opus` etc.) breaks or silently degrades when frontier access ends ~2026-07-19. Nothing tracks this.

## Immediate flags (not gates — Simon decisions)

- **SECURITY: plaintext credentials in `~/.claude/projects/-home-diamond-projects-MetaArchitect/` transcripts** — a Supabase service-role JWT + anon JWT (`79ae32b8…jsonl`), the `sbp_599e…` PAT (`92d2dace…jsonl`, flagged for rotation 07-02 — rotation NOT verified), and an SSH password for `diamond@192.168.69.40` (`46159d73…jsonl`). Rotate all three and consider scrubbing the transcript files; they persist after rotation.
- `skipDangerousModePermissionPrompt: true` in global `~/.claude/settings.json` weakens gating estate-wide — deliberate?
- Pipeline model env re-pointing before 2026-07-19 (finding 6) needs a goals row.
- Manual-edit clobber (F3) needs a design decision: proposed `pipeline.posts.edited_by_simon_at` column that regenerate paths refuse to overwrite.

## Ranked build list — tranches for Phase 2 approval

Ranked by (likelihood a mid-tier model violates) × (blast radius), with false-positive risk noted. Invasive items marked ⚠.

### Tranche 1 — Hooks + estate fixes (MetaArchitect session work, no API changes)
| # | gate | source | risk | FP risk |
|---|---|---|---|---|
| 1.1 | PreToolUse Bash deny: broad `pkill -f` / `killall node|next` (allow kill-by-pid, `fuser -k PORT`) | L31, PK-1 | H×H | none — pattern is always wrong here |
| 1.2 | PreToolUse Bash deny: `git checkout/switch/stash` + `git push` in primary command-center checkout; `permissions.deny` for `git push --force*` and `--no-verify` everywhere | L26, WT-1/2, R7 | H×H | low |
| 1.3 | PostToolUse on Edit/Write under `.claude/`, `brand/` → run `skill-lint.sh`, surface FAILs | SL-1, L42, R10 | H×L | none (report-only) |
| 1.4 | ⚠ UserPromptSubmit secrets detector (`sbp_|ghp_|eyJ…|password[=:]`) → inject "flag rotation, never echo, use file drop" | F2 | H×H | low (inject-only, doesn't block) |
| 1.5 | skill-lint extensions: hex-palette check, `$NNN` price check, `[INSERT` placeholders, divergent-duplicate (`/pattern` w/o session-close), `POSTIZ_API` outside postiz.mjs, CLAUDE.md into SCOPE | R3, R5, L35, R2, P6 | M×M | low |
| 1.6 | Fix live prose drift now: coo.md session-close line (R2); restore scope-capture sentence (R9) — **propose-only diff for agent profiles** | R2, R9 | live bug | — |

### Tranche 2 — Server-side validation (command-center: worktree + PR)
| # | gate | source | risk | FP risk |
|---|---|---|---|---|
| 2.1 | **Wire `agent_target` → agent markdown in worker** (park at planning if agent file missing) + default `sitemaster` for website stories at POST | B1a/b, L54, UI-1 | H×M | low (additive) |
| 2.2 | Stories POST: success-criteria floor (length + verification-signal) | B2, seed 1 | M×M | ⚠ medium — bounced stories need rewording |
| 2.3 | Stories POST: reject pipeline-internal scope (`worker/`, `.env`, deploy) with escape hatch | B3, seed 1 | M×H | ⚠ medium — mention ≠ target |
| 2.4 | Stories POST: goal_id uuid+existence, attachments/title/auto_merge types, dedupe 409, 10k ceiling | B4–B8 | M×M | low |
| 2.5 | Goals: status/priority enums; PATCH re-runs hierarchy + cycle check | G1–G3 | M×M | low |
| 2.6 | Schedules: agent-file existence at POST/PATCH; duplicate-name 409; min-interval guard | S1, S4, S5 | M×M | low |
| 2.7 | Supabase trigger: re-queued ever-published `pipeline.posts` row nulls `post_url`/`published_at` | L41 | M×L | none |
| 2.8 | deploy-sync: `npm rebuild` native deps before restart | L50 | M×M | none |
| 2.9 | verify.md criteria: every interactive control named in a story must be exercised (click → state change) | F11 | M×M | low |

### Tranche 3 — Script promotions (MetaArchitect: gates that exist only as prose the model must transcribe)
| # | gate | source | risk |
|---|---|---|---|
| 3.1 | `scripts/linkedin-gate.sh` — the 8 mechanical checks as one script; all 5 producers (repurpose, write-post, teardown-generate, linkedin-publish, engage-replies) call it; `--blog`/`--comment`/`--cadence` modes | G1/G2/E1/EN3, P4 | H×H |
| 3.2 | `tools/teardown-gate.py` — Gates 1–11 promoted from ~100 lines of code-as-spec inside the skill to a callable file (incl. idempotent upsert) | T1/T2/T4 | H×H |
| 3.3 | `tools/insert-blog-post.mjs` — validated blog insert (enums, slug, tags, GEO boxes) | W1 | H×H |
| 3.4 | `tools/validate-manifest.mjs` — carousel manifest gate (OG routes silently render wrong data) | C1 | H×M |
| 3.5 | postiz.mjs: slot-clash/cadence check; `edit --content` refuses ungated text; `first_comment` nudger-alive check | P4/P5/P7 | M×M |
| 3.6 | `postiz-update.sh` — pull+patch-scopes+restart as the only documented update path | L36 | H×M |
| 3.7 | `validate-brief.mjs` or server-side `POST /api/briefs` validation | WB1 | M×M |
| 3.8 | Handoff status header template + skill-lint grep for headerless handoffs | F5 | H×M |
| 3.9 | Bind-audit script (scheduled): `ss -tlnp` vs allowlist, ntfy on drift — **propose schedule, don't create** | L09/L47 | M×H |

### Tranche 4 — Judgment consolidation (class c → always-loaded surfaces; agent-profile changes propose-only)
- Critique contract for stress-test requests (F1) → COO profile + CLAUDE.md.
- Yes/no-first answers + discriminator strings (L45) → root CLAUDE.md (currently only linkedin-publish).
- "Report pending Simon's live/on-device check, never verified" (L43/L55/L59) → root CLAUDE.md.
- Plain-short-answers (ANS-1), exact-filename (ENV-1), merge-own-PRs (F4/F10) → promote from auto-memory to CLAUDE.md if the post-Fable setup drops auto-memory.
- Session-close goals/snippet lanes get the brain-lane recall/shape gates (F6).
- Trigger-description fixes: weekly-review "Do NOT" clause, linkedin-publish colloquial phrasings, session-close closers, teardown router rule, repurpose "carousel", engage-replies phrasings.

### Already mechanized — live-fire verification list (class a, per handoff turf rule)
Port guard (E15), pgid teardown (E16), verify-evidence byte-identical rejection (E17), merge-drift (E18 — conflict path already proven on PR #82), per-stage timeouts (E19), planner out-of-target block (L29 — proven), safe-DDL gate (E20 — proven live), deploy-sync stamp (L30), postiz.mjs guards (P1–P3), drift badge (L38), source snapshots (L44).

### Phase 3 also includes
The downgrade red-team (seed 5): run ~5 representative estate tasks with `model: "haiku"`/`"sonnet"`, build gates for observed failures, re-run to show they catch. This doubles as before/after evidence for the flagship post.

---

# Appendix A — lessons.md sweep (every entry)
| id | source | rule (one sentence) | class | proposed gate or surface | viol-likelihood | blast-radius | notes |
|----|----|----|----|----|----|----|----|
| L01 | 2026-03-17 fabricated Airtable writes | Never write pipeline outputs recalled from compacted context — only from live calls this session | b | write scripts require same-run log row / fetched artifact before insert (pattern realized in `teardown_source_snapshots`) | L (WAT archived) | M | snapshot-before-model is the mechanized descendant |
| L02 | 2026-03-17 generic harvest queries | Every research query names a specific tool/org/survey/regulation | c | prompt-authoring rule in research skills | M | L | |
| L03–L05, L07–L08 | Airtable/NLM-era | (moot — WAT archived; skill-lint #5 blocks live Airtable refs) | a/moot | — | L | L | |
| L06 | 2026-03-31 stale year anchor | Search templates anchor to current year | a | skill-lint check #4; lint trigger itself is prose (see obs 2) | M | L | |
| L09 | 2026-04-26 suppressed warning ≠ closed exposure | Verify the unsafe path is actually refused before claiming "secure" | c→partial b | scheduled bind-audit script diffing `ss -tlnp` binds vs allowlist, ntfy on drift | M | H | recurred live 2026-07-07 (L47) |
| L10 | 2026-04-28 invalid JSON escapes | LLM JSON passes a validator before DB write | a (path-dependent) | mechanized in command-center (`lib/teardowns/validate.ts`); new write paths must put validation in the script | M | M | E pillar of STATE |
| L11–L13, L15 | strategy/ops heuristics | (TLS-first, docker yak-shave pivot, distribution workstream, build-ahead-of-demand) | c | agent profiles / goals-table unblock criteria | L–M | M–H | judgment by definition |
| L14 | 2026-05-09 /readiness CTA | Public surfaces link /score only | a (estate) / b (website) | website repo test failing on `href="/readiness"` outside admin routes — rides pipeline test stage | M | M | |
| L16a | 2026-05-10 duplicate PRs | `gh pr list` before opening chore PRs | b | cheapest: prose + pipeline one-story-per-repo serialization (mechanized cousin) | M | M | |
| L16b | 2026-05-10 no Vercel preview | Agent commits use Vercel-recognized author email | b | git config in worktree bootstrap — pure config | L | L | verify worker sets identity |
| L17 | 2026-05-11 SYSTEM.md | Universal guardrails live on auto-loaded surface | a (structural) | load-path IS the mechanism | L | H | |
| L18 | 2026-06-12 narrativized JSONB | Structured outputs validated non-empty before insert | a (panel) / b (skill path) | DB CHECK (`jsonb_array_length(gaps)>=2`) or insert-script validation | M | M | classic mid-tier failure mode |
| L19 | 2026-06-27 empty PR | Harness rejects 0-file-changed PRs | b (historic, pope-agent) | CI check if pope background jobs return | L | M | |
| L20 | 2026-06-28 static review missed overflow | Live walk is the closing gate on UI PRs | a (pipeline) / c (in-session) | pipeline verify stage; judgment for in-session | M | M | |
| L21 | 2026-07-02 Supabase UA/token | Management API: access-token + CLI User-Agent | a | executable snippet in canonical skill | L | L | popebot copies unpatched (open) |
| L22 | 2026-07-02 pkill self-match | Prompts over stdin never argv; kill by PID | a | spawn.ts stdin + regression test; pgid teardown backstop | L | M | fully mechanized |
| L23 | 2026-07-04 migration dead-end | Worker auto-applies only additive/idempotent DDL | a | worker/migrations.ts whitelist; fired + refined PR #77 | L | H | fails closed |
| L24 | 2026-07-04 cancelled-story | Cancellation is a terminal state | a | cancel API + reconcileNeedsReview; fired (story #56) | L | L | |
| L25 | 2026-07-04 blind-guarantee leak | Confidentiality invariants apply to EVERY persisting surface | a (instance) / c (class) | runner.ts redaction; class stays review-checklist judgment | M | H | can't enumerate future surfaces |
| L26 | 2026-07-04 checkout collisions | Never `git checkout <branch>` in a primary/shared checkout | b | **PreToolUse Bash hook**: block branch-changing git checkout/switch when cwd is a primary checkout | H | H | TOP hook candidate |
| L27 | 2026-07-04 instrumentation.ts | Positive nested-if form for dynamic import guards | c | fixed in code w/ comment | L | L | |
| L28 | 2026-07-05 bad pillar enum | Enum fields show literal allowed values in prompt; validators canonicalize case | a (instance) / c (class) | enum in prompt + normalizePillarCase; validator fired | M | M | |
| L29 | 2026-07-05 out-of-target story | MetaArchitect files are never stories | a | planner stage blocks with precise reason (this incident WAS the gate firing) | M | L | fails closed, cost = one queue cycle |
| L30 | 2026-07-06 manual pull starved deploy-sync | deploy-sync compares HEAD to `.deployed-sha` | a | verified in deploy-sync.sh | L | M | |
| L31 | 2026-07-06 pkill killed prod | Never broad `pkill -f`/`killall` on a prod box; kill by port/PID; check is-active after | b | **PreToolUse Bash hook** rejecting broad kills (allowlist fuser -k, kill <pid>) | H | H | 2nd-strongest hook candidate; one outage + one self-kill already |
| L32 | 2026-07-06 truncated slide URLs | Slide URLs machine-facing; malformed params 400 | a | og route validates + 400s (verified) | L | L | |
| L33 | 2026-07-06 Postiz Temporal | Self-host from canonical compose; trim only provably-optional | c | SETUP.md; compose-diff could be scripted pre-pull | M | M | |
| L34 | 2026-07-06 PSL cookie domain | cookiefix shim must stay in compose | a (instance) / c (diagnostic) | infra-mechanical; diagnostic knowledge → tech-support | L | M | |
| L35 | 2026-07-06 logo spec placeholder | Paste-ready docs ship real values, no bracket placeholders | b (cheap) | skill-lint: grep `\[INSERT` shapes in brand/ | M | L | one-line lint |
| L36 | 2026-07-06 LinkedIn scope patch | patch-linkedin-scopes.sh re-runs after every Postiz pull | b | wrap pull+patch+restart in one `postiz-update.sh` = only documented path | H | M | silent failure weeks later |
| L37 | 2026-07-06 stale test draft scheduled | Act on captured row IDs; test rows end rejected/deleted | b | postiz.mjs accepts explicit IDs only (done); test-row hygiene lint in weekly-review | M | H | nearly published test content |
| L38 | 2026-07-07 silent delete+recreate | posts canonical, Postiz delivery-only; edits = one atomic script call | a (detection) / b (mutation) | drift badge + ntfy built; atomicity folded into postiz.mjs edit (done) | M | M | |
| L39 | 2026-07-07 65% stat provenance | Every external number traces to fetched verbatim sentence w/ scope qualifiers | a (teardown) / c (writing) | sources.ts snapshots pre-model (PR #40); writing paths = prose gates; b if writes go through a script | H | H | COSTLIEST failure class; mid-tier will fabricate MORE |
| L40 | 2026-07-07 full-claim audit | Provenance covers narrative claims/attributions; silence-conclusions are ours; multi-store purges verified per store | c (+a snapshots) | checklist template; snapshot table = mechanical leverage | H | H | flattering fabrications unchallenged by design |
| L41 | 2026-07-07 franken-row | Re-queue of ever-published row nulls post_url+published_at | b | **Supabase trigger** BEFORE UPDATE on pipeline.posts | M | L | cleanest schema-constraint candidate |
| L42 | 2026-07-07 fixes don't propagate | Fix lands in canonical file; grep siblings; drift classes get a lint | a (partial) | skill-lint covers 6 classes; TRIGGER is prose — mechanize via cron schedule + edit hook | H | H | meta-lesson |
| L43 | 2026-07-07 LinkedIn write-only | Live share is only ground truth; report "pending Simon's check" never "verified" | c | linkedin-publish rule 8 | M | H | no API read = no gate possible |
| L44 | 2026-07-07 shadow-mode origin | Sources snapshot before model runs; zero sources = fail | a | PR #40 verified in code | L | H | best prose→gate conversion in estate |
| L45 | 2026-07-07 deleted correct post twice | Content fixes include literal discriminator strings; yes/no questions answered yes/no first | c | root CLAUDE.md (universal, currently only linkedin-publish) | H | M | mid-tier worse at answering the question asked |
| L46 | 2026-07-07 deleted a true claim | Before deleting a claim as unsourced, search beyond listed sources; prefer flag/ask over silent delete | c | provenance-gate checklists | M | M | |
| L47 | 2026-07-07 stale security posture | Posture notes cite verifying command + date | c→b | note template + scheduled bind-audit (pairs with L09) | M | H | doc said localhost-only while 0.0.0.0 live |
| L48 | 2026-07-10 RLS PII | Never using(true) anon SELECT on PII; column-scoped grants; live round-trip proof | c→partial b | repo lint on `for select to anon using (true)` | M | H | original root cause UNRESOLVED — recurrence flagged |
| L49 | 2026-07-11 env inheritance | Spawners of `claude` strip CLAUDECODE/CLAUDE_* env | a (term-daemon) / b (future) | shared `sanitizeClaudeEnv()` helper + unit test | M | M | |
| L50 | 2026-07-11 stale native binary | npm rebuild native deps in deploy-sync before restart | b | add rebuild step to deploy-sync.sh (verified absent) | M | M | will recur on next node-pty bump |
| L51 | 2026-07-11 artifacts in watched tree | Test artifacts to /tmp, copied after — never into dev-served tree | c (cheap b) | verify.md rule line (semi-mechanical for pipeline) | M | L | |
| L52 | 2026-07-11 orphan dev servers | pgid teardown + port asserted free | a | PR #58 port-guard + PR #80 regression test; demonstrated | L | M | |
| L53 | 2026-07-11 same-component stories | Same-file stories are dependent; queue second after first merges | a (partial) / c | resolveMergeDrift proven live (PR #82); optional API warn on same-component in-flight | M | L | |
| L54 | 2026-07-11 agent_target unset | UI stories carry agent_target sitemaster + brand criteria — "mandatory" | b | **GAP: API verifiably accepts null** — reject or default server-side; cheapest fix in list | H | M | prose says mandatory; gate doesn't exist |
| L55 | 2026-07-12 WebGL false pass | Verify asserts WHICH code path ran; renderer changes need real-GPU check | a (partial) / c | byte-identical-evidence gate + verify.md (PR #80); on-device half human | M | H | |
| L56 | 2026-07-12 verify timeout | Verify gets own 45-min budget | a | migration 0016 + worker | L | L | |
| L57 | 2026-07-12 DIRTY PR drift | Merge origin/main into story branch after verify | a | resolveMergeDrift, proven live | L | M | |
| L58 | 2026-07-12 SQL splitter | Tokenizing splitter, mis-parses classify stricter only | a | PR #77 + 5 tests | L | L | |
| L59 | 2026-07-12 touch-scroll false pass | Touch verify asserts page does NOT pan; rejects identical screenshots; ends with on-device check | a (partial) / c | verify-evidence.ts (PR #80, verified) | M | M | |
| L60 | 2026-07-11 stale engage drafts | Briefings show inventory age, fresher-first, respect skip state | c (+b queued) | push age arithmetic into SQL/script, not model math | M | L | |

## Cross-cutting (lessons agent)
1. ZERO hooks anywhere — L26 (checkout) + L31 (pkill) are the two highest-value PreToolUse Bash hooks: exact regexable bad inputs, H blast, already fired multiple times.
2. skill-lint is real but its TRIGGER is prose — mechanize via cron schedule + ntfy fail, and/or PostToolUse hook on `.claude/` edits. New one-line checks: L35 bracket placeholders, L48 using(true).
3. Story pipeline = where prose successfully became gates (12 class-a rows in worker/, most with tests, several with live firings). Pattern: rule lands in script/schema, prose stays as explanation.
4. L54 agent_target: declared mandatory, API accepts null — one-line validation closes it.
5. Claim/stat provenance = largest judgment cluster (L39/40/43/44/45/46 — one incident, six lessons, four failed fix rounds). Pattern: pair every judgment rule with a deterministic artifact (snapshot table, grep command, literal string).
6. Two-store consistency recurs (L38, L41, L47): "one canonical store, mechanical drift detection, single-script mutations." Unbuilt: pipeline.posts re-queue trigger (L41), bind-audit script (L09/L47).
7. False-pass verifies = own family (L55, L59, L20): mechanical fixes are detection-side; residue is Simon's on-device check; "report pending, never verified" language belongs in root CLAUDE.md.
8. WAT-era lessons mostly moot; patterns re-emerged mechanized in command-center.

# Appendix B — memory feedback files
| id | source (memory filename) | rule (one sentence) | class | proposed gate or surface | viol | blast | notes |
|---|---|---|---|---|---|---|---|
| WT-1 | feedback_always_worktree_for_code_work | Code edits in shared checkouts (esp. command-center primary) only inside a git worktree | b | PreToolUse hook on Edit/Write: deny file_path under primary command-center checkout unless under a worktrees path; message points to EnterWorktree | H | H | no hooks exist anywhere today |
| WT-2 | feedback_always_worktree_for_code_work | Primary command-center checkout stays on main — never checkout/switch/stash in it | b | PreToolUse Bash hook deny; live :3737 service serves that checkout via ~/command-center symlink | M | H | highest-blast rule in the estate |
| PP-1 | feedback_command_center_git_pull_before_push | Fetch/rebase before pushing command-center main | b | pre-push hook in repo (fails if behind); deny `git push --force*` to main via Bash hook | M | M | remote already rejects non-FF; force-push is the real hole |
| ENV-1 | feedback_env_exact_filename | Secret writes go to the literal filename Simon names | c | CLAUDE.md one-liner + "if ambiguous, ask" | M | L | can't mechanize — gate would need to know what Simon said |
| ENV-2 | feedback_env_exact_filename | Never print secret values | c (thin b) | CLAUDE.md; optional warn-hook on `cat .env` without redirect | M | M | |
| PR-1 | feedback_merge_own_prs | `gh pr merge` BY NUMBER — bare merge from a worktree resolves wrong branch | b | PreToolUse Bash hook: deny `gh pr merge` not followed by digit/URL | M | L | cheap precise regex |
| PR-2 | feedback_merge_own_prs | Never delete PR head branch before merge lands (PR #20 closed unmerged once) | b | deny remote branch deletion push forms; legit path is `--delete-branch` | L | M | |
| PR-3 | feedback_merge_own_prs | Squash-merge own PRs without asking once checks pass | c | profile/CLAUDE.md; mid-tier failure is over-asking | L | L | |
| PK-1 | feedback_no_broad_pkill | Never `pkill -f`/`killall node` with generic patterns on sterling | b | PreToolUse Bash deny; message: kill by port owner | M | H | killed production command-center once; systemd didn't restart it |
| PK-2 | feedback_no_broad_pkill | After any kill, verify `systemctl --user is-active command-center` | b | PostToolUse hook on kill-matching commands → inject warning if inactive | M | H | catches collateral kills |
| ANS-1 | feedback_plain_short_answers | Answers = few short plain paragraphs, answer first | c | promote to root CLAUDE.md + every profile; mid-tier defaults to heavy structure | H | L | highest-likelihood judgment rule post-downgrade |
| RLS-1 | feedback_rls_column_scoping | No `using (true)` anon SELECT on PII without column-scoped grants | b (partial a) | lint/CI grep over migrations; permission classifier caught one instance | L | H | |
| RLS-2 | feedback_rls_column_scoping | RLS changes proven by live round-trip test before claiming fixed | c | checklist template (3 curl commands verbatim) | M | H | a "correct" policy was silently not honored once — root cause unresolved |
| TOK-1 | feedback_token_efficient_execution_modes | Scale ceremony to task size | c | already in CLAUDE.md routing | M | M | |
| UI-1 | feedback_ui_stories_sitemaster | UI stories carry agent_target sitemaster + brand acceptance criteria | b | stories API validates ONLY description + target_repo today; add UI-keyword default/400 | H | M | prime gate candidate |
| DT-1 | project_command_center_deploy_topology | Never restart :3737 to verify unpushed work — next start on another port | b (warn) | warn-hook on `systemctl --user restart command-center` (restarts legit during deploys) | M | M | |
| DT-2 | project_command_center_deploy_topology | Tailscale-IP-only binding — 100.105.85.5:3737 never localhost | c | reference note; self-correcting failure | M | L | |
| CC-1 | project_command_center | command-center repo must never contain a CLAUDE.md | b | CI assertion / pre-commit: file absent at repo root | L | M | a helpful mid-tier session would "fix" this |
| CC-2 | project_command_center | Model config uses family aliases, never dated ids | a / b (extend) | skill-lint check 3; propose same grep as CC test over worker/ | L | M | |
| CC-3 | project_command_center | npm/tsc from projects/command-center/, not root | c | self-correcting | L | L | |
| PZ-1 | skills-audit / postiz memories | All Postiz ops through tools/postiz.mjs — never ad-hoc .tmp scripts | b (partial a) | postiz.mjs guards exist (dup/empty/past-date throw); add lint for POSTIZ_API usage outside it | M | M | |
| PZ-2 | skills-audit + brand | Public CTAs /score never /readiness | a (files) + b (live content) | skill-lint covers files; add content check in postiz.mjs create() — single choke point to LinkedIn | M | M | |
| SL-1 | project_skills_estate_audit | Run skill-lint.sh after any skill/agent/brand edit | b | PostToolUse hook on matching paths → run lint, surface FAILs | H | L | converts lint from "remember" to "cannot forget" |
| BR-1 | project_second_brain | Never hand-edit brain INDEX.md | b | PreToolUse deny Edit/Write to that path | L | L | |
| BR-2 | project_second_brain | `brain find` before manual Simon-fact grepping | c | already on global CLAUDE.md | M | L | |
| GO-1 | reference_goals_table_access | goals has no notes column — append to description | a | schema itself errors | L | L | |
| GO-2 | reference_goals_table_access | Don't change goal status unasked — propose | a (partial) + c | permission classifier caught once; judgment stays in profile | M | M | classifier availability post-downgrade unconfirmed |
| GO-3 | reference_goals_table_access | Prefer CC GET /api/goals for reads | c | reference | L | L | |

## Cross-cutting
- ZERO hook infrastructure — every hook gate starts from scratch. Sterling-wide rules (PK-1) → global settings; repo rules → MetaArchitect settings.
- Existing mechanical layers: skill-lint.sh, postiz.mjs throws, story API (description+target_repo only), Postgres schema/RLS, auto-mode permission classifier.

## Stale memories (verify before building on)
- deploy-sync.timer is ACTIVE (~3 min) — CLAUDE.md "once PR #14 lands" phrase is stale.
- MODEL_PLAN=opus etc. break/degrade at downgrade ~07-19 — nothing flags this (important).
- engage-queue "not yet exercised live" and postiz "pending Simon" checklists are day-one statuses, stale.
- RLS silently-not-honored root cause never found — lint must still require round-trip proof.
- goals schema evolving — re-verify columns before encoding into gates.

# Appendix C — skills + skill-lint invariants
| id | source | invariant | class | proposed gate or surface | viol | blast | notes |
|----|----|----|----|----|----|----|----|
| L1–L4 | scripts/skill-lint.sh | 8 existing checks (container paths, /readiness in files, model ids, year anchors, Airtable, roadmap.md, ages, re-verify dates) | a | skill-lint, runs weekly-review Step 1b | L | L–M | static; lint trigger itself is prose |
| P1 | linkedin-publish + postiz.mjs | Every Postiz op takes a pipeline.posts row id, never attribute query | a | loadRow() requires uuid | L | H | mechanized ONLY if model uses the tool — see P6 |
| P2 | linkedin-publish + postiz.mjs | Edit = delete+recreate+row-update+log+ntfy in ONE atomic call | a | edit() in postiz.mjs | L | H | 2026-07-07 incident encoded in code |
| P3 | linkedin-publish + postiz.mjs | schedule() refuses double-schedule/empty/past-date; nulls post_url/published_at on requeue | a | schedule() guards | L | H | |
| P4 | linkedin-publish rule 4 | New/edited post text re-passes the shared LinkedIn gate before `edit --content` | b | postiz.mjs edit shells out to scripts/linkedin-gate.sh, refuses on failure | H | H | pure prose; "one-word fixes" are what mid-tier skips |
| P5 | linkedin-publish rule 5 | Never double-book Tue/Thu slot; cadence cap 2/week | b | schedule() ±2h clash error, cadence warn | M | M | trivial addition |
| P6 | linkedin-publish / CE CLAUDE.md | Never ad-hoc .tmp scheduling scripts — postiz.mjs is THE path | b | hook/lint: flag POSTIZ_API_KEY/URL outside tools/postiz.mjs | H | H | both July near-misses came from this |
| P7 | linkedin-publish rule 6 | Scheduled post w/ first_comment needs the nudger alive | b | schedule() post-check: verify nudger timer active, warn | M | M | silent-drop failure |
| P8 | linkedin-publish rule 8 | Publish-day fixes end with Simon's live check using literal discriminator strings | c | always-read checklist | M | H | 2026-07-07 double-delete scar |
| G1 | linkedin-gate.md | 8 mechanical greps (em dashes, AI-tells, banned phrases, 180–300w, hook ≤140, ≤1 URL, no md links, no /readiness) on every candidate | b | **promote to scripts/linkedin-gate.sh**; all 5 producers call it | H | H | HIGHEST-VALUE single mechanization |
| G2 | linkedin-gate.md | /score cadence: neither of last 2 rows mentions it → this post carries it | b | --cadence mode querying pipeline.posts | M | M | deterministic DB check stated as prose |
| G3 | linkedin-gate.md | Claim provenance: every number/narrative traces to verbatim sentence + primary URL | c (partial b) | require per-claim claim→sentence→URL table artifact | H | H | Ramp class; weaker model MORE likely to sharpen claims |
| G4 | linkedin-gate.md | /score never /readiness in generated copy | b | in linkedin-gate.sh | L | M | |
| R1 | repurpose Step 5 | No ≥6-word sentence reused verbatim from shipped derivatives | b | sentence-overlap script; --dedupe mode | M | M | "check mechanically" unscripted |
| R2 | repurpose | STOP for Simon's pick before any pipeline.posts write | c | checklist | M | H | mid-tier "helpfully" saves all candidates |
| R3 | repurpose Step 7 | Act on captured row ids; resumable partial-failure inserts | c (partial b) | optional draft-save.mjs | M | H | |
| R4 | repurpose Data Rule 6 | Test rows end session rejected/deleted | b | hygiene sweep flags test-like drafted rows; session-close lane 10 + weekly-review | M | H | "live ammunition" 2026-07-06 |
| C1 | repurpose Carousel C3 | Manifest gate: 7 slides, pillars/scores match, char/line limits, 0 em dashes | b | tools/validate-manifest.mjs — OG routes render wrong data silently | H | M | |
| C2 | repurpose C5 | Never preview via raw slide URLs; inspect PNGs | c | checklist | M | L | |
| W1 | write-post Step 7 | Insert validation: enums, kebab tags, slug ≤60, status draft, GEO boxes | b | tools/insert-blog-post.mjs validates before insert | H | H | model self-certifies prose checklist today |
| W2 | write-post Step 4 | Stat provenance: verbatim sentence fetched this session + URL | c (partial b) | research T1 table = only permitted number source | H | H | origin layer of Ramp incident |
| W3 | write-post | Outline approval STOP + editorial loop never skipped | c | checklist | M | M | |
| E1 | editorial Pass 2 | Prohibition greps on blog prose | b | linkedin-gate.sh --blog mode | M | M | |
| E2 | editorial | Never add content/change argument; 3 passes in order | c | score-block output contract | M | L | |
| T1 | teardown-generate Step 4 | Gates 1–11 pass before INSERT (~100 lines python-as-spec inside the skill) | b | **promote to tools/teardown-gate.py** w/ JSON payload | H | H | largest prose-embedded gate in the estate |
| T2/T4 | teardown-generate | Idempotent upsert; JSONB fields non-empty | b | same promoted script | M | M–H | |
| T3 | teardown-generate 4b | Never paste card_url in chat; download PNG | c | checklist | M | L | |
| TR1 | teardown-research 5–6 | Disqualify filters; unscored pillar = NULL never default | b | tools/teardown-candidates-insert.mjs | M | M | |
| TR2 | teardown-research 4 | Sources array complete; numbers carry inline URL | c (partial b) | insert script rejects uncited numbers | H | H | entry point of both Ramp fabrications |
| RS1 | research Phase 1 | NLM flow = start→status→import→QUERY; no query output = no findings | c | tripwire line | M | M | |
| RS2 | research Phase 1 | T1 = verbatim sentence + URL fetched this session | c (partial b) | grep over summary artifact | H | H | |
| SC1 | session-close scripts | Content-seed schema validated; model via --model | a | in-script | L | M | |
| SC2 | session-close 7 | Session appended to brain reconciler processed.json | b | scripts/mark-session-closed.sh (hand-edited JSON today) | M | M | |
| SC3 | session-close | Board approval before writes; anti-recurrence trio all-or-nothing; never fabricate | c | Invariants section + board template | M | H | |
| EN1 | engage-replies | Never mark engaged/skipped without Simon's confirmation; captured ids | c (partial b) | optional engage-close.mjs helper | M | M | |
| EN2 | engage-replies | Never post programmatically to LinkedIn | c | bolded rule | L | H | account-level penalty |
| EN3 | engage-replies | Age shown from posted_at; replies pass gates | b/c | linkedin-gate.sh --comment mode | M | M | 48h lesson 2026-07-11 |
| WB1 | weekly-brief Step 4 | Payload gate: 3–5 tasks, ranks 1..N, payoffs, goal_ids exist | b | validate-brief.mjs or server-side POST /api/briefs | M | M | server-side survives any model |
| WB2/3 | weekly-brief | Never write goals; abort on failed core reads; trigger-conditions rule | c | invariant list ("shell is not negotiable") | M | M | leans hardest on model quality — flag for mid-tier era |
| WR1/2 | weekly-review | gather.sh + insert-review.sh gates; skill-lint every Friday | a | scripts | L | M | best-mechanized skill; Friday lint = recurrence engine |
| SH1 | _shared/ | Single canonical copies — never fork skill-local variants | b | skill-lint: grep for re-derived anchors outside _shared/ | L | M | drift disease #1 |
| SW1 | session-sweep | Sweep NEVER executes writes — proposals only | c | restate in schedule prompt text | M | H | unattended on mid-tier — highest-exposure surface after story-worker |

## Prior-audit findings fixed as PROSE ONLY
G3/W2/TR2/RS2 (claim provenance), G1 (gate greps), R4 (test-row hygiene), R3/EN1 (captured-id), T1 (Gates 1–11 code-as-spec). Fixed mechanically: skill-lint, postiz.mjs, push_pattern, gather/insert-review, carousel.mjs.

## Trigger-reliability risks (description fixes)
1. weekly-review lacks "Do NOT trigger" vs weekly-brief. 2. linkedin-publish NON-trigger risk ("queue it", "push to Postiz"). 3. session-close colloquial closers. 4. teardown router rule (not-a-candidate → research first). 5. repurpose missing "carousel"/"slides". 6. engage-replies missing phrasings. 7. Cross-skill "read the full gate" reads depend on obedience — G1/T1 script promotions are the mitigation.

## Ranked highest-leverage
G1 > T1 > W1 > P4+P6 > C1 > WB1.

# Appendix D — transcript mining
Method: custom read-only miners over 129 transcripts in ~/.claude/projects/-home-diamond-projects-MetaArchitect (+ command-center dirs). CAVEAT: transcripts only cover 2026-06-30 → 2026-07-12; March–June era has no surviving transcripts.

| id | evidence (quoted, date) | failure class | in lessons.md? | class | proposed gate or surface | viol | blast |
|---|---|---|---|---|---|---|---|
| F1 | "i really wished you didint use the repo facts as law... i told you to analyse this business plan to stress test it... come on!!!" (07-02) | Stress-test requests get repo-doc echo + approval instead of attack (sycophancy) | NO — nowhere in estate | c | COO profile + CLAUDE.md "critique contract": on stress-test/audit requests, treat docs as claims under test, ≥3 attackable weaknesses w/ evidence, verdict before restating framing | H | M–H |
| F2 | Supabase anon+service-role JWTs pasted in chat (06-30); "sbp_599e4a..." (07-02); SSH password in plaintext (07-08); Simon pre-empting "(WITHOUT SHOWING THE KEY IN CHAT)" | Credentials repeatedly flow through chat into plaintext transcripts | PARTIAL (one rotation flag) | b | UserPromptSubmit hook regex `ghp_|sbp_|eyJ[A-Za-z0-9_-]{30,}|password\s*[=:]` → inject "flag for rotation, never echo, use file drop next time"; CLAUDE.md: name a file path for credentials | H | H |
| F3 | "I'm manually polishing the first post... but if I rerun it'll probably erase that" (07-05, complaint in THREE sessions) | Pipeline reruns clobber Simon's manual polish; no store distinguishes hand-edited from generated | NO | b | `pipeline.posts.edited_by_simon_at` column + API validation: regenerate/fix refuses to overwrite unless overridden; skills rule "hand-edited rows are canonical; diff, don't regenerate" | M | M |
| F4 | "stop asking me if you can merge the PR..." (07-05); "you do not need to overthink this" (07-08) | Ceremony scaled wrong on trivial requests | memory-covered | c | already on MEMORY.md; promote to CLAUDE.md only if migration drops auto-memory | M | L |
| F5 | "is this done yet???" (07-10, handoff was 3 min old); "1 should be done already!" (07-12) — recurred 4x in 3 days | Handoffs have no queryable status | PARTIAL (poll-story.sh covers pipeline only) | b | handoff files require status header block (`status:`, `goal_id`, `picked_up_by`) — skill-lint grep for headerless handoffs; each handoff also gets a goals row | H | M |
| F6 | "what are those mailerlite dashboard email fixes???" (07-10); "snippet kinda sucks lol" (07-11) | Session-close lanes write unrecognizable/low-quality items | PARTIAL (brain lane only has recall gates) | c | extend recall/shape gate pattern to goals + snippet lanes: every item names source evidence | M | L |
| F7 | em-dash complaints (07-05) | AI-tell punctuation shipped | fixed in skills (gates exist) | b (done) | optionally backfill lessons.md entry | L | L |
| F8 | "the roadmap is outdated" (07-02 x2) | stale roadmap.md consulted | covered in CLAUDE.md | — | none | L | L |
| F9 | Ramp saga quotes (07-07) | covered by five lessons entries | covered | — | none | — | — |
| F10 | "i never said .env.local"; "still completelyt illegible"; goals-access confusion | memory-covered trio | memory | c | promote to CLAUDE.md if auto-memory dropped | L | L–M |
| F11 | "I decided to do the edit button which doesn't do anything it seems to be just text" (07-10) | Dead/decorative UI controls pass verify | family covered, this shape not explicit | b | verify.md criteria: every interactive control named in story must be exercised (click → observable state change) | M | M |

## SECURITY SIDE-FINDING (action needed)
Plaintext in ~/.claude/projects/-home-diamond-projects-MetaArchitect/ transcripts:
- Supabase anon + service-role JWTs (79ae32b8...jsonl)
- Supabase PAT sbp_599e... (92d2dace...jsonl — flagged for rotation 07-02; VERIFY it happened)
- SSH password for diamond@192.168.69.40 (46159d73...jsonl)
Even if rotated, files persist — consider transcript scrub + confirm rotation of all three.

## Ranked uncovered classes
F2 (secrets hook, H/H) > F1 (critique contract, H/M-H) > F5 (handoff status header, H/M) > F3 (manual-edit clobber flag, M/M).

## Funniest failures (verbatim — blog raw material)
- "the 2pm post still has the fucking 65% stat ... thats 4 times you fix it... can you at least verify your work?"
- "i really wished you didint use the repo facts as law... come on!!!"
- "still completelyt illegible i dont even know what you said"
- "i never said .env.local"
- "stop asking me if you can merge the PR I want you to start merging PRS this is a personal project."
- "Read docs/handoffs/...-brain-approvals-ui.md and build it is this done yet???" (handoff was 3 minutes old)
- "um... why dont you have access to the goals table? you definitely can and should be able to"
- "is this the version that was fixed?" — yes/no question, got a forensic report; Simon deleted the correct post. Twice.
- "if only I could take a screenshot you would see..."
- "snippet kinda sucks lol the rest is fine"
- Assistant: "My mistake — deleting the branch closed PR #20 unmerged."
- "wait... just found this on linkedin" — Simon finding in 30 seconds the primary source four provenance passes missed.

# Appendix E — git-history drift
Repo born 2026-02-26; agent profiles born 2026-06-24. Most drift already caught by the 2026-07-07 estate audit → skill-lint. But several regressions live now; biggest structural finding: **zero hooks have ever existed in this repo despite CLAUDE.md claiming them**.

| id | file | rule | added | drifted | still in file? | class | proposed gate | viol-likelihood | blast-radius |
|---|---|---|---|---|---|---|---|---|---|
| R1 | CLAUDE.md (root + Content-Engine) | "Always prefix commands with `rtk`" (130-line block) | 5388130 / 2026-03-19 | dafbc7b same day — removed claiming "handled by PreToolUse hook"; **no hook exists anywhere**; /usr/bin/rtk installed, unused | No — rule AND claimed enforcement gone | b | If rtk wanted: PreToolUse nudge hook; else delete the binary. Lint idea: commit message says "hook" → require hook diff in same commit | H (violated every Bash call since March) | L (token cost) |
| R2 | .claude/agents/coo.md | Standalone behaviors #5 still says session close = `/pattern` + goals | c576344 / 2026-06-24 | 20ebad6 / 2026-07-10 rewired CLAUDE.md to 10-lane session-close, updated coo.md Skills line, **missed behaviors #5** | **YES — live divergent duplicate today** (line ~28) | c+b | Fix the line; extend skill-lint: divergent-duplicate check (grep agents for `/pattern` not adjacent to "session-close") | M | M (harvest lanes silently skipped) |
| R3 | .claude/agents/sitemaster.md | Brand accent — shipped WRONG hex `#F97316` at birth (brand is #E04500) | c576344 / 2026-06-24 | fixed 50fecd7 / 2026-07-05 — 11 days wrong | fixed + "brand-summary wins" clause | b | skill-lint has NO color check — add: extract hex from .claude/agents/* fail any not in brand palette | M | H (wrong brand color to production UI) |
| R4 | blog-writer.md, family.md | /app/data/ paths wrong at birth; fix 50fecd7 caught 2 siblings, missed these 2 (caught 2d later 4bbdeee) | 2026-06-24 | — | fixed + linted (check #1) | b (gated) | exemplar of "fix one copy, miss the sibling" | L | M |
| R5 | sitemaster.md | Hardcoded "$750 USD founder rate" | 2026-06-24 | de-hardcoded 4bbdeee / 2026-07-07 to "read live /audit page" | fixed via pointer | b | skill-lint: fail `\$[0-9]+ (USD|CAD)` inside .claude/ | M | M (public price misquote) |
| R6 | CLAUDE.md + settings.json | CLAUDE.md says ".claude/ — settings, **hooks**, skills" since 2026-03-01; COO behaviors "non-negotiable" | never enforced: hooks never existed at ANY point in settings history | prose claims in file; enforcement nonexistent | b | HEADLINE: Stop-hook grepping final response for `**Next Action →`; PreToolUse deny force-push/--no-verify; session-end processed.json check | H (weaker models drop Next Action + skip session-close first) | H (whole OS is behavioral) |
| R7 | coo.md + sitemaster.md vs root CLAUDE.md | "Never --no-verify. Never force-push." in profiles only — never copied to root CLAUDE.md Git section | 2026-06-24 | coverage divergence: agent-less sessions carry only "use gh CLI" | profiles yes; CLAUDE.md no | b | `permissions.deny`: Bash(git push --force*), Bash(git push -f*), Bash(git * --no-verify*) — survives any prose edit | M | H |
| R8 | coo.md | Cadence "2x weekly, 150–250 words" diverged from playbook (3–4x, 180–300) | 2026-06-24 | patched 527ebe1, then REMOVED in 4bbdeee → pointer to playbook | resolved via canonical-home | c (consolidated) | candidate lint: flag `[0-9]+–[0-9]+ words` outside playbook + brand-summary | L | M |
| R9 | coo.md | "Mid-chat scope capture: discovered scope → goals row, never inlined into deliverable" | 2026-06-24 | 4bbdeee restructure kept mechanics, DROPPED the behavioral trigger | No — lost | c | restore one sentence in always-loaded COO block | M | M (scope creep) |
| R10 | scripts/skill-lint.sh | The gate itself | born 5572256 / 2026-07-07 | scope gap: `SCOPE=".claude brand"` — CLAUDE.md (most-drifted file!) and docs/ unlinted; no divergent-duplicate, color, or price checks | exists; Friday + honor-system trigger | b | add CLAUDE.md to SCOPE; add dup-divergence/hex/price checks; wire pre-commit or PostToolUse-on-Edit | M | M |
| R11 | CLAUDE.md @-imports | full brand files → condensed brand-summary only (2026-04-04, deliberate) | no sync mechanism summary ↔ full files | current | c | skill-lint check: key anchors (hex palette, key phrases, word counts) match between brand-summary and brand-guidelines | M | M |
| R12 | docs/lessons.md | append-only in substance; healthiest file in the sweep | — | — | — | — | no action | L | L |

## Cross-cutting (git-history agent)
1. Estate already discovered the thesis once (2026-07-07 audit, "copies rot independently") — but the lint's triggers are prose, scope misses CLAUDE.md, and R2's divergence was created 3 days AFTER the lint was born and is invisible to it.
2. Zero hooks anywhere (repo, local, global — verified). R6/R7 cheapest wins: permissions.deny + Stop hook survive downgrade by construction.
3. One live uncorrected divergence today: R2 (coo.md standalone close says /pattern+goals).

Key files: CLAUDE.md, .claude/agents/coo.md (~line 28), .claude/settings.json (no hooks key), scripts/skill-lint.sh (SCOPE line 11), docs/skill-audit-2026-07-07.md.

## Content-seed nuggets
- R1 is a gift: a commit in MARCH removed a 130-line prose rule claiming "handled by PreToolUse hook" — the hook was never written. The estate ran four months on an enforcement ghost. ("The commit message said the hook would handle it. There was no hook.")
- R3: the UI agent was born with the wrong brand orange and wore it for 11 days.
- R6: CLAUDE.md has advertised "hooks" in the repo layout since March. Zero hooks ever existed.

# Appendix F — existing enforcement + API gaps
## Hooks finding
ZERO hooks anywhere. MetaArchitect .claude/settings.json = enabledPlugins + 3 MCP allows. settings.local.json = permissions allowlist. Global ~/.claude/settings.json has no hooks key AND contains `"skipDangerousModePermissionPrompt": true` (weakens gating globally — flag for review). No hooks/ dir in either repo. Every CLAUDE.md behavioral rule is prose-only.

## PART 1 — existing enforcement (E1–E23)
| id | surface | blocks | firing proven? |
|---|---|---|---|
| E1 | scripts/skill-lint.sh | 6 FAILs (/app/data/, /readiness, model ids, year anchors, Airtable, roadmap.md) + 2 warns; scope .claude+brand | partly — audit-born; weekly via weekly-review; no tests |
| E2 | worker/targets.ts | only 2 registered targets, correct branches | 1 unit test |
| E3 | POST /api/stories | missing description; unregistered target_repo — ENTIRE validation surface | NO tests |
| E4 | createStory defaults | auto_merge from settings; title from line 1; agent_target/goal_id default null; NO rejections | no tests |
| E5–E7 | retry/delete/cancel routes | stage-based rejections; cancel 409 while locked | no tests; cancel born from live incident |
| E8 | DB constraints 0002 | stage CHECK; goal_id FK; NOT NULLs | implicit |
| E9–E11 | goals routes | POST: title, kind enum, parent hierarchy; PATCH: 16-field allowlist, kind enum, RICE 1..10, rice recompute; GET: kind enum, limit clamp | NO tests |
| E12–E14 | schedules routes | validateSchedule (croner cron, kind, script_path absolute+executable); PATCH re-validates merged row; run 409 overlap | validate.ts unit-tested |
| E15 | port-guard (PR #58) | kills squatter pgid only if cwd under ~/.story-worktrees; else fails loud | 15 unit tests; no live firing yet |
| E16 | pgid teardown (PR #58) | kills process group on timeout + exit | unit tests |
| E17 | verify-evidence (PR #80) | rejects passing verify w/ byte-identical screenshots | unit tests |
| E18 | merge-drift (PR #80) | merge origin/main, retest, park on conflict, disable auto_merge | ~10 unit tests |
| E19 | per-stage timeouts (0016) | verify 45min separate budget | unit tests + migration passed safe-DDL gate |
| E20 | safe-DDL migration gate | additive+idempotent only, parks rest w/ exact SQL | tests + LIVE FIRING (splitter fixed forward PR #77) |
| E21 | post-merge deploy sync + .story scrub | clears scratch, pull/build/restart | tests + live firings visible in git log |
| E22/E23 | claim/lock, result contract | race-safe claim; invalid result.json parks | unit tests |

Test-proof summary: worker gates (E15–E23) well unit-tested; API validation layer (E3–E11, E13–E14) has NO tests. E20 is the only gate with proven live firing + fix-forward.

## PART 2 — gaps (all command-center code = worktree + PR)

### /api/stories
| id | gap | proposed validation | FP risk | viol | blast |
|---|---|---|---|---|---|
| B1a | **agent_target IGNORED by worker** — pipeline.ts:218 hardcodes agentText:null; nothing wires story.agent_target → agent markdown; every website story runs persona-less | runContract: resolve agent_target ?? defaultAgent, read repo agent .md, pass as agentText; park at planning if agent file missing | L | H | M |
| B1b | agent_target not defaulted for website stories | POST: default to TARGETS[repo].defaultAgent ("sitemaster") — default, never block | L | H | M |
| B1c | UI stories lack brand acceptance criteria | POST: sitemaster stories w/o `#hex|hover|state|render|px|font` → 400 or warnings[] | M | M | M |
| B2 | no success-criteria requirement (one-word descriptions accepted) | POST: reject <~80 chars or no verification signal regex | M | M | M |
| B3 | pipeline-internal paths accepted (worker/, .env, deploy) | POST: description regex → 400 "session-work-only"; escape hatch flag; hard backstop = plan-stage path denylist | M | M | H |
| B4 | goal_id not validated (500 on bad uuid) | uuid regex + existence check → 400/404 | L | M | L |
| B5 | attachments type unvalidated (crashes worker setup) | Array.isArray + all strings → 400 | L | L | M |
| B6 | title/auto_merge type coercion ("false" is truthy) | typeof checks → 400 | L | L | L–M |
| B7 | no dedupe (retried curl = double PRs) | non-terminal same repo+description → 409 | L | M | M |
| B8 | no description ceiling | 400 above ~10k chars → use attachments | L | L | L |

### /api/goals
| G1 | status never enum-validated (typo corrupts roadmap state) | enum check both routes (confirm live value set first) | L | M | M |
| G2 | priority unvalidated | enum | L | M | L |
| G3 | PATCH bypasses parent/hierarchy/cycle checks (goal can become own ancestor) | re-run isValidParent + ancestor walk on PATCH | L | M | M |
| G4–G5 | due_date/source/agent_target free text | ISO regex etc. | L–M | L | L |
| G6 | no status-transition rules | recommend NOT building (H false-positive) | H | L | L |

### /api/schedules
| S1 | agent name unvalidated; missing agent file = silently persona-less at fire time (run-task.ts:19-23 `?? undefined`) | route: readAgentSystemPrompt check → 400; fire time: log warning | L | M | M |
| S2 | working_dir not checked | stat isDirectory → 400 | L | L | L |
| S3 | script executability at create only | optional pre-fire check; low priority | L | L | L |
| S4 | no min-interval guard (`* * * * *` accepted) | reject fires <5 min apart unless allow_high_frequency | L | L | M |
| S5 | no duplicate-name guard | unique name → 409 | L | M | M |

## Cross-cutting
- The one MetaArchitect-side gate surface is hooks in .claude/settings.json — currently empty.
- Flag: `skipDangerousModePermissionPrompt: true` in global settings.
- E15–E19 mark "already mechanized — needs live-fire verification" per handoff turf rule.
