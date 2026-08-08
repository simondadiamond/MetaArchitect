# Handoff — ADE Chat Surface (PR #150): 2 residual defects + blank-transcript fix

**Date:** 2026-08-08
**From:** COO session that executed the 13-task plan via subagent-driven-development
**Status:** PR #150 open, 35 commits, 1177 tests passing, `tsc --noEmit` clean, **not merged**
**Repo:** `~/projects/MetaArchitect/projects/command-center`
**Branch:** `ade/chat-surface-v1`
**Worktree:** `~/projects/MetaArchitect/projects/command-center/.claude/worktrees/ade-chat-surface-v1`

---

## Read these first

| What | Where |
|---|---|
| Design spec (locked decisions D1-D9, 17 acceptance criteria, §7 gotchas) | `~/projects/MetaArchitect/docs/superpowers/specs/2026-08-07-ade-chat-surface-design.md` |
| Implementation plan (13 tasks, Global Constraints) | `~/projects/MetaArchitect/docs/superpowers/plans/2026-08-07-ade-chat-surface.md` |
| **Full execution ledger — every controller ruling, every deferred item, every review verdict** | `<worktree>/.superpowers/sdd/2026-08-07-ade-chat-surface/progress.md` |
| Per-task reports (13 of them, incl. live transcripts) | `<worktree>/.superpowers/sdd/2026-08-07-ade-chat-surface/task-N-report.md` |
| Anti-recurrence lesson from this build | `~/projects/MetaArchitect/docs/lessons.md` (2026-08-08 entry) |

`.superpowers/` is gitignored — it lives on disk in the worktree, not in the PR diff.

---

## What this branch does

Replaces Command Center's browser-hosted terminal agent renderer (node-pty → xterm.js) with a real web chat UI driven by Claude Code running **headless** via `@anthropic-ai/claude-agent-sdk@0.3.224`, in a new standalone `chat-daemon` on **:3739**, keeping a per-session escape hatch to the existing `term-daemon` on :3738.

**The load-bearing invariant:** `terminal_sessions.id` **is** the Claude Code session UUID, so chat and terminal are two renderers over one conversation — and a session may be live in the chat daemon **or** term-daemon, **never both**. Two live `claude` processes on one UUID corrupt the conversation. Three separate fix rounds in this build hardened this and each one initially opened a new window of the same class. Treat any change near it with suspicion.

---

## Already done for you — do not redo

`CHAT_DAEMON_PORT`, `CHAT_DAEMON_URL`, `CHAT_DAEMON_TOKEN` **are now in `~/projects/MetaArchitect/projects/command-center/.env`** (written 2026-08-08). `CHAT_DAEMON_URL=http://100.105.85.5:3739` — the Tailscale interface IP, matching `TERM_DAEMON_URL`'s pattern, so it is tailnet-reachable from Simon's phone exactly like term-daemon. The token is a fresh 48-char random value. **Never print its value into chat, a commit, a report, or a command line** — this project has had a real credential-in-transcript incident and a `secrets-guard` hook watches for it.

`deploy/chat-daemon.service` is tracked in the repo and wired into `deploy/setup.sh`. The systemd **user** unit (`systemctl --user`, no sudo) is installed but `inactive` — it cannot reach `active` until the PR merges, because `chat-daemon/` doesn't exist in the primary checkout yet.

---

## WORK ITEM 1 — false "session exited" on any brief Next outage (Important)

**File:** `components/chat-session/useChatSocket.ts:282-289`, with the offending call sites at `:299` and `:307`.

`scheduleRetry()` is called both from `ws.onclose` **and** from the two `/api/chat-session/token` fetch-failure paths, and every call increments the same `attempts` counter against `MAX_CONNECT_ATTEMPTS = 6`. Six consecutive failures (~44s: 2+4+8+15+15) trigger `giveUp()` → `onClosed` → `markExitedLocally` → the pane swaps to "Session exited — Resume".

**Why it matters:** any ~45s outage of the Next app or the tailnet (a `deploy-sync` restart, a mobile network roam) declares every open chat pane dead at once while the sessions are still perfectly alive in chat-daemon. Surviving Next restarts is the daemon's entire reason for existing, and `deploy-sync` restarts Next routinely.

**Worse, recovery is a dead end in the obvious direction:** clicking Resume hits `app/api/terminal/sessions/[id]/resume/route.ts:42`, `checkLiveOnChat` correctly returns `"live"`, and the user gets **409 "session already running"**. Only a full page reload recovers.

**Fix shape (reviewer's, small and local):** only count `ws.onclose`-without-a-preceding-`onopen` toward `attempts`, or re-check liveness server-side before `giveUp()`. Token-fetch failures should retry without consuming the give-up budget.

**This is the mirror image of the defect the previous round closed** — read that history in the ledger before touching it, so you don't reopen the forever-reconnect-loop it fixed.

---

## WORK ITEM 2 — `registry.remove()` fires before confirmed process death (Important)

**File:** `chat-daemon/server.ts:188-190`.

The `session.once("closed", …)` listener removes the registry entry when `teardownOnce`/`consume`'s `finally` emits `closed` — which is **before** `close()` awaits `whenExited()` at `chat-daemon/session.ts:816`.

The handoff path is safe: `performHandoff` awaits the DELETE, which awaits `close()`. The reachable hole is a **concurrent actor**: tab B receives the `closed` frame at the early point, renders "Session exited — Resume", and a click within the ≤5s SIGTERM grace window passes `checkLiveOnChat === "not-live"` and spawns `claude --resume <id>` while the original process group is still being killed. Two live processes on one UUID — the exact corruption the invariant exists to prevent. The prior round narrowed this; it did not eliminate it.

**Fix shape:** defer `registry.remove` until after `whenExited()`, **or** gate what `isLiveOnChat` reads on the spawner's liveness rather than on the registry entry.

**Watch for:** `chat-daemon/shutdown.ts:35` uses `Promise.all`, so closes are concurrent, not sequential — worst case ~15s total against systemd's 90s default `TimeoutStopSec`. Don't accidentally serialize them; that would reintroduce a restart hang.

---

## WORK ITEM 3 — blank transcript on resume (goal `13aacb8c`)

Reopening an existing chat session shows an **empty** message pane. Model memory is intact and live-proven (the agent remembers everything) — only the visible history is empty, because the daemon's `Scrollback` is in-memory and starts fresh on every resume.

**This is a genuine regression against the surface being replaced:** `claude --resume` re-renders the conversation in the TUI, so the terminal user sees history and the chat user does not.

**The raw material exists.** Claude Code writes session transcripts to `~/.claude/projects/<encoded-cwd>/<session-id>.jsonl` — 5698 present on sterling. The daemon could hydrate `Scrollback` from that file on resume.

**Known risk, verify before designing:** a controller spot-check found coverage inconsistent — one chat-created session had a transcript on disk, another did not. Establish *when* the file exists and *what* its format is before building against it. `lib/chat/normalize.ts` already maps SDK message shapes to `ChatMessageRecord`; the on-disk JSONL may or may not be the same shape. `lib/chat/__fixtures__/sdk-stream.jsonl` is the captured ground truth for the wire format.

Do not fabricate the format from memory. Task 2 of this plan exists entirely because the published docs and the installed package disagreed.

---

## Constraints — these are hard-won, several from real incidents

- **Work in the existing worktree.** Never touch the primary checkout at `projects/command-center` — PreToolUse hooks deny mutations there.
- **Never run a broad `pkill -f`.** It has killed the live Command Center. Kill by port-derived pid, then confirm `systemctl --user is-active`.
- **Never touch :3737 (live Command Center) or :3738 (live term-daemon).** chat-daemon uses :3739. **Do not start a second term-daemon** — doing so during this build fired its boot sweep and falsely marked 10 real sessions exited. Use the mocked-client pattern in `chat-daemon/__tests__/handoff.test.ts` and the real-in-process-server pattern in `two-tab-race.test.ts`.
- **Never restart the live service to test unpushed changes.** `~/command-center` is a symlink to the primary checkout; `deploy-sync` handles pull/build/restart after merge. Verify with `npm run build && npx next start -p 4123`.
- Live test sessions use a `cwd` under `/tmp` and get cleaned up. Sterling has 16GB and parallel Claude sessions have caused memory incidents.
- `npm ls zod` must show one top-level `zod@3.25.76` deduped, no `invalid`/`UNMET PEER` — there's an `overrides` block an install can silently break. **Never `--legacy-peer-deps`** (that caused a real breakage here).
- Every `.test.tsx` needs a `// @vitest-environment jsdom` docblock — `environmentMatchGlobs` was deliberately deleted as deprecated.
- Test output must be pristine; a warning is a finding. TDD, with a RED produced by reverting the source.
- `git push origin ade/chat-surface-v1` via the `gh` credential helper. Never `--no-verify`, never force-push. **Rebase before pushing** — story-worker merges to origin/main continuously.
- **Verify in a real browser, not by inspection.** Task 13's live pass found two regressions that twelve tasks of review had missed. This is the single highest-yield instruction in this document.

---

## Do NOT fix — deliberately deferred, triaged, and recorded

Chat rows having no stale-status sweep (nothing gates on `status`); the session-list route's fail-open `live:false` (deliberate polarity, and the resume route no longer trusts it); the `{id}`-only `DaemonSession` placeholder; `useChatSocket`'s un-memoized command closures (traced inert); `DiffView` truncating by line count not per-line length; `SessionListPanel`'s `#777777` metadata tier; ntfy Title/Click deep-link; `streamingId` picking arbitrarily among concurrent blocks; sequential fetches in `resolveLiveSessionIds`; the missing chat-daemon health banner.

Separate goals already filed, not part of this handoff: `b280f085` (DB-level conditional `surface` write to close the residual TOCTOU), `9057cd7f` (`SlashCommand.argumentHint`), `01a81994` (retrofit the scoped-token pattern onto the terminal token route).

---

## Known limitations that are real and must stay stated honestly in the PR body

- `TodoWrite` does not exist in this CLI build (80 tools; it exposes `TaskCreate`/`TaskUpdate`/`TaskList`), so AC12's checklist path is built but not exercisable here.
- Thinking blocks come back content-redacted on this machine (`thinking: ""` with a real signature) across every sample taken, so the collapsible-thinking UI has never rendered real content.
- AC11's terminal→chat leg is unverifiable in-branch because the only reachable term-daemon is the off-limits live one on :3738.
- Spec §6.5 says approving a plan switches the session to `acceptEdits`. **Verified false as a problem:** on CLI 2.1.224 the CLI leaves plan mode itself. But `inventory.permissionMode` stays stale at `"plan"`, and because `ModeSelector.handleSelect` early-returns on `mode === currentMode`, the Plan button is a dead control for the rest of the session. Worth a follow-up; not a blocker.

---

## Definition of done

1. Work items 1 and 2 fixed, each with a covering test whose RED you produced by reverting the source.
2. Work item 3 either implemented, or the investigation written up with a concrete recommendation if the on-disk format turns out unworkable.
3. `npm run test:unit` green and pristine; `tsc --noEmit` clean; `npm run build` clean.
4. Real-browser verification at 390px of the resume path and a simulated Next outage.
5. PR #150 body updated to match reality.
6. **Then merge** — Simon's standing rule is to squash-merge your own PRs in his repos once checks pass. After merge, confirm `systemctl --user is-active chat-daemon` reaches `active` and that `deploy-sync` picked the branch up.
7. Add a `docs/lessons.md` entry if anything here reveals a new failure class.
