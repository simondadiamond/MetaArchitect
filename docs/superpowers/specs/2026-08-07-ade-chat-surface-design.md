# ADE Chat Surface — Design Spec

**Date:** 2026-08-07
**Status:** Locked, ready to build
**Repo to build in:** `~/projects/MetaArchitect/projects/command-center` (own git repo) — **in a git worktree**, never the primary checkout
**Plan:** `docs/superpowers/plans/2026-08-07-ade-chat-surface.md` (this repo, MetaArchitect)

> **This document is self-contained.** It assumes no knowledge of the conversation that produced it. Every claim marked **[VERIFIED]** was checked empirically on this machine on 2026-08-07; the exact re-verification command is given so a builder can confirm nothing has drifted.

---

## 1. Goal

**Outcome sentence:** *I can run any of my agents from a browser on my phone, paste a screenshot, copy the answer, and pick plan or auto mode — without touching a terminal.*

Replace the terminal-rendering agent surface in Command Center with a real web chat UI driven by Claude Code running headless, while keeping a per-session escape hatch back to the terminal.

## 2. Why — the problem being solved

Command Center's agents section (the "ADE") renders Claude Code's actual TUI in the browser: `node-pty` in a standalone `term-daemon` service on :3738, streamed over WebSocket to `@xterm/xterm` in the Next.js app on :3737.

That architecture causes three user-facing defects, all from the same root:

1. **Text can't be selected or copied normally.** Claude Code enables terminal mouse tracking, so a drag inside the terminal is delivered to the *app*, not the browser. The user must hold Shift to force local selection, and `components/terminal/CopyModeOverlay.tsx` exists purely to work around this.
2. **Clipboard images don't paste reliably.** A capture-phase paste handler exists (`components/terminal/TerminalPane.tsx:88-113` → `POST /api/terminal/paste-image` → injects the saved file path as terminal input), but it is fragile and browser-dependent. **This is a bug in an existing path, not an architecture limit** — the paperclip attach button uses the same route and works.
3. **Touch scrolling needs a hand-written hack.** `TerminalPane.tsx:137-186` intercepts touch drags and replays them as synthetic `WheelEvent`s because xterm's canvas sits above its own scroll viewport.

Every one of these is the cost of fighting a browser to host a TUI. Running the agent headless and rendering a real chat UI makes all three disappear rather than get patched.

### What is NOT lost

This is the same `claude` binary, same `CLAUDE.md`, same skills, subagents, MCP servers, hooks, permission system, and same subscription login. **Only the renderer changes.** This is explicitly *not* a move to a weaker harness.

### What IS lost (accepted trade-offs)

- **Shell adjacency.** In a terminal the user is one keystroke from a shell (`!command`, Ctrl-C then poke around, answer an interactive prompt like `gcloud auth login`). A chat UI has none of that. **Mitigated** by the per-session terminal escape hatch (§6.6).
- **Maintenance tax.** The TUI ships with the CLI and improves every release; this renderer does not. Every Claude Code update is a potential gap to close by hand. This is the real recurring cost and is accepted.
- **Small input affordances** not rebuilt at v1: `@file` autocomplete, `#` to write a memory, Esc-Esc rewind, up-arrow history, vim mode, the `/resume` picker.
- **Display fidelity.** Anthropic iterated a lot on how diffs, todos, and nested subagent output render. v1 will be cruder. v1's bar is **"renders correctly and legibly," not "matches the TUI."**

---

## 3. Locked decisions

These were decided by the product owner (Simon) and are **not open for re-litigation by the builder.**

| # | Decision | Chosen |
|---|---|---|
| D1 | Relationship to the terminal | **Chat replaces the terminal as the default surface in the agents section. Each session keeps a "drop to terminal" toggle that attaches the PTY to the same session ID. `term-daemon` stays running.** |
| D2 | v1 feature floor | **All four:** slash-command palette; image paste + drag-drop; permission + plan approve cards; rich rendering (diffs, todos, thinking). |
| D3 | Existing sessions | **Chat must resume existing `terminal_sessions` rows** via the SDK's `resume` option. Currently-running agents stay reachable. |
| D4 | Polish bar | **Functional now, polish pass later.** Correct and plain, on brand tokens, no design investment. A `sitemaster` pass comes after a week of real use. |
| D5 | Session-create flow | **Everything carries over unchanged:** agent picker, cwd, worktree toggle, permission mode, backend picker (anthropic/minimax). Same `terminal_sessions` row shape — this is what makes D1's escape hatch work. |
| D6 | Voice | **Speak-the-response TTS only**, reusing `components/chat/useSpeech.ts`. No voice input at v1. |
| D7 | Notifications | **ntfy push when a session goes idle or is awaiting approval.** |
| D8 | Mobile | **Phone is a first-class target**, not a retrofit. Layout is designed mobile-first. |
| D9 | Delivery | Spec + plan written first (this document). Build executed in a **fresh session** from the plan. |

---

## 4. Verified facts

Everything in this section was confirmed by running commands on this machine (`sterling`) on 2026-08-07 with `claude` v2.1.224.

### 4.1 Headless runs on the subscription login **[VERIFIED]**

```bash
cd /tmp && claude -p "reply with just: ok" --output-format stream-json --verbose | head -1
```

The first line is a `system`/`init` JSON object containing `"apiKeySource": "none"` — confirming the session authenticated via the **OAuth subscription login**, not an `ANTHROPIC_API_KEY`. Headless is the same binary with the same credential store (`~/.claude`).

> **Multi-tenant caveat (out of scope for v1, but do not design against it):** credentials are per-OS-user in `~/.claude`. Selling this to other people means each customer needs their own `claude /login` in their own OS user or container. Headless neither helps nor hurts this compared to the PTY version.
>
> **Gotcha:** a set `ANTHROPIC_API_KEY` in the environment *shadows* the subscription login. The spawn env must not leak one in. See §7.3.

### 4.2 The init message is a full capability inventory **[VERIFIED]**

The same command above returns, on line 1, all of:

| Field | Observed value on this box |
|---|---|
| `session_id` | the session UUID |
| `slash_commands` | **55 entries** |
| `skills` | 24 entries |
| `agents` | 11 entries |
| `tools` | 29 entries |
| `mcp_servers` | `[]` |
| `model` | `claude-sonnet-5` |
| `permissionMode` | `auto` |
| `apiKeySource` | `none` |
| `claude_code_version` | `2.1.224` |
| `cwd`, `output_style`, `capabilities`, `memory_paths` | present |

**This is the source of truth for the slash-command palette (D2).** No filesystem parsing of `.claude/commands/*.md` is needed.

The 55 commands observed included `goal`, `compact`, `context`, `effort`, `model`, `agents`, `mcp`, `loop`, `clear`, `init`, `usage`, plus every custom repo skill (`session-close`, `code-review`, `deep-research`, `write-post`, `teardown-research`, …).

> **Not verified:** that *every* advertised built-in behaves identically without a TUI. Agent-directed ones (`/goal`, `/compact`, `/effort`, `/model`, `/context`) are expected to work. Config surfaces (`/config`, `/color`, `/doctor`) will likely return something useless headless, and `/clear`, `/rename` are session management this UI owns anyway. **Task 9 includes an explicit smoke test.**

### 4.3 Permission modes **[VERIFIED]**

```bash
claude --help 2>&1 | grep -A4 -- "--permission-mode"
```

Returns exactly: `"acceptEdits"`, `"auto"`, `"bypassPermissions"`, `"manual"`, `"dontAsk"`, `"plan"`.

> ⚠️ **The published Agent SDK docs page lists a shorter set** (`'default' | 'plan' | 'dontAsk' | 'bypassPermissions'`). The **installed CLI is the source of truth.** Task 6 re-runs the command above at build time and drives the mode selector off the observed list.

### 4.4 Session capabilities **[VERIFIED]**

The init message reported `capabilities: ['interrupt_receipt_v1', 'interrupt_cancel_queued_v1', 'msg_lifecycle_v1']` — interrupt is supported, so the Stop button is real.

### 4.5 Agent SDK availability **[VERIFIED]**

`npm view @anthropic-ai/claude-agent-sdk version` → `0.3.224`. **Not currently installed** in command-center.

---

## 5. Architecture

### 5.1 Chosen approach: Agent SDK, in a persistent server-side session process

```
Browser (Next.js :3737)                Server                        Child process
┌────────────────────┐   WebSocket   ┌──────────────────┐  SDK    ┌────────────────┐
│  ChatPane          │◄─────────────►│ chat-daemon      │────────►│ claude (CLI)    │
│  - MessageList     │   NDJSON      │  (:3739)         │ stdio   │ headless        │
│  - Composer        │               │  - session map   │         │ subscription    │
│  - SlashPalette    │               │  - canUseTool    │         │ login           │
│  - PermissionCard  │               │  - scrollback    │         └────────────────┘
└────────────────────┘               └──────────────────┘
                                              │
                                     Supabase terminal_sessions
                                     (id == Claude session UUID)
```

**Why a separate long-lived daemon rather than a Next.js route:** identical to the reasoning that produced `term-daemon` — the Next.js app restarts frequently (the `deploy-sync` timer fires every ~3 min and rebuilds/restarts after merges). Agent sessions must survive that. The existing `term-daemon` is the proven pattern to copy: standalone `tsx` process, token-authenticated HTTP + WebSocket, binds the Tailscale IP only.

**Why the Agent SDK rather than raw CLI subprocess** (the repo already has raw-CLI plumbing in `lib/claude/spawn.ts`):

1. `canUseTool` is a first-class callback — this is what makes D2's permission and plan approve cards possible without hand-rolling an MCP permission-prompt tool.
2. `Query.supportedCommands()` gives the slash palette (D2) as a typed call.
3. `Query.setPermissionMode()` switches modes mid-session — the mode selector works without restarting the agent.
4. `Query.interrupt()` gives a real Stop button.
5. It spawns the same CLI underneath, so §4.1's subscription auth is preserved.
6. `sessionId` and `resume` options let the session UUID stay identical to `terminal_sessions.id`, which is what keeps D1's terminal escape hatch working.

**Decision:** add `@anthropic-ai/claude-agent-sdk` pinned to `0.3.224`, and set `pathToClaudeCodeExecutable` from the existing `CLAUDE_BIN` env var so the daemon uses the same binary `term-daemon` does.

### 5.2 The session ID is the load-bearing invariant

`terminal_sessions.id` **is** the Claude Code session UUID. This is already true (see the migration comment: *"id equals the Claude Code session UUID so any row can be revived with `claude --resume <id>`"*).

Preserving it means:
- Chat can resume any existing row (D3) via SDK `resume: <id>`.
- The terminal escape hatch (D1) attaches the PTY to the same conversation.
- Nothing about the existing archive views breaks.

> ⛔ **Hard constraint: only one attachment at a time.** A session may be live in the chat daemon *or* in `term-daemon`, never both. Handing off must fully close one before opening the other. See §6.6.

---

## 6. Surface specification

### 6.1 Route and layout

Replaces the terminal pane inside the existing agents section (D1). Same agent sidebar, same tab strip, same session list — only the pane contents change.

**Mobile-first (D8):** single column, composer pinned to the bottom with safe-area inset, agent sidebar collapses to a drawer. No horizontal page scroll ever; wide content (code blocks, diffs, tables) scrolls inside its own `overflow-x: auto` container.

### 6.2 Message rendering (D2 — rich rendering)

Reuse, do not rewrite: `components/chat/Markdown.tsx` (309 lines), `MessageBubble.tsx` (93), `ToolUseCard.tsx` (93), `useSpeech.ts` (70). These already render the `ChatMessageRecord` shape defined in `lib/claude/types.ts`.

v1 bar is **legible, not TUI-identical**:
- Text → markdown with syntax-highlighted code blocks, each with a copy button.
- Tool calls → `ToolUseCard`, collapsed by default, with the existing `FRIENDLY` label map (`Edit` → "Edited <path>", `Bash` → "Ran `<cmd>`", …).
- `Edit`/`Write` tool calls → rendered as a unified diff inside the card.
- `TodoWrite` → a checklist, not raw JSON.
- Thinking blocks → collapsed, expandable.
- Streaming text renders token-by-token (`includePartialMessages: true`).

### 6.3 Composer

- Multi-line textarea. Enter sends; Shift+Enter and Ctrl+Enter insert a newline.
  > **Environment note:** Simon's SSH terminal cannot send Shift+Enter — Ctrl+Enter arrives as Ctrl+J. That constraint is about the *terminal*; in a browser both work. Bind both anyway.
- **Image paste + drag-drop (D2).** Clipboard paste and drag-drop of images/PDFs. Unlike the terminal version, these are sent as **real content blocks** on the user message, not as an injected file path string. Reuse `POST /api/terminal/paste-image`'s validation constants (`50MB` cap, allowed MIME map: png/jpeg/gif/webp/pdf) — see `app/api/terminal/paste-image/route.ts`.
- **Slash palette (D2).** Typing `/` at position 0 opens a filtered dropdown built from `Query.supportedCommands()`, falling back to the init message's `slash_commands` array. Shows command name + description. Arrow keys navigate, Enter selects.
- Stop button while the agent is running → `Query.interrupt()`.

### 6.4 Mode selector (D2)

A labeled control (not blind Shift+Tab cycling) showing the current permission mode, driven by the modes the installed CLI actually reports (§4.3). Changing it calls `Query.setPermissionMode()` mid-session.

### 6.5 Permission and plan cards (D2)

- **Tool approval:** when `canUseTool` fires, render a card showing the tool name and its arguments with Approve / Deny buttons. The callback's promise resolves on click. Deny sends a reason back to the agent.
- **Plan approval:** in `plan` mode the agent finishes by calling `ExitPlanMode` with the plan as tool input. Render the plan as markdown in a card with Approve / Reject. Approving switches the session to `acceptEdits` (or whichever mode the user picks in the card) and continues.
- Both must survive a page reload: a pending approval is server-side state in the daemon, re-sent to any client that reconnects.

### 6.6 Terminal escape hatch (D1)

A per-session control that hands the session to `term-daemon`.

Handoff sequence (order matters — §5.2's one-attachment rule):
1. Chat daemon closes its SDK `Query` for that session (`query.close()`).
2. Chat daemon confirms closed.
3. `term-daemon` spawns `claude --resume <session-id>` in a PTY with the row's recorded `cwd`, `permission_mode`, and `backend`.
4. UI swaps to the existing `TerminalPane`.

Coming back reverses it. Attempting to attach while the other holds the session must fail loudly with a clear message, never silently double-attach.

### 6.7 Notifications (D7)

Push via ntfy when a session transitions to idle (turn complete) or blocks on an approval. Only for sessions not currently focused in an open tab.

---

## 7. Constraints and gotchas

### 7.1 Repo and process constraints (non-negotiable)

- **Work in a git worktree** of `projects/command-center`. The primary checkout stays on `main` — the live service on :3737 serves it via the `~/command-center` symlink, and PreToolUse hooks actively deny mutations there.
- Push with `git push origin <branch>` (the `gh` credential helper is wired). **Never** raw SSH push, `--no-verify`, or force-push.
- **Always `git fetch && git rebase origin/main` before pushing** — the story-worker merges PRs to `origin/main` continuously.
- Never restart the live service to test unpushed changes. Verify with a local `next start` on a spare port; the `deploy-sync` timer handles pull/build/restart after merge.
- New daemon and all listeners **bind the Tailscale interface IP only** (copy the guard in `bin/start-cc.js`); `ALLOW_NON_TAILSCALE=1` falls back to `127.0.0.1` for dev.
- Node >= 22. New API routes: `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
- Tests: vitest, colocated `__tests__/*.test.ts`. Run `npx vitest run <path>`; full suite `npm run test:unit`. **Commit after every green task.**

### 7.2 Brand (non-negotiable)

Dark-only. **Zero border-radius.** Accent `#E04500` (hover `#FF5A1A`). Links `#C97A1A`, never blue. Background `#0F0F0F`, surface `#1A1A1A`, border `#333333`. Text `#EAEAEA` / `#B4B4B4` / `#777777`. Mono font for labels and metadata (the `label-mono` utility exists in `app/globals.css`). **No emojis in UI copy.** Icons from `lucide-react`. Interactive elements need explicit default / hover / active / selected states.

### 7.3 Technical gotchas — read before writing code

1. **`settingSources` is the big one.** The Agent SDK does **not** load filesystem settings by default. Without `settingSources: ['user', 'project', 'local']`, the session gets **no `CLAUDE.md`, no custom slash commands, no skills**. This would silently gut everything that makes these agents useful and would look like "the GUI is less powerful." **This must be set, and Task 9's smoke test must confirm a repo skill is present in the init inventory.**
2. **Do not leak `ANTHROPIC_API_KEY`** into the child env — it shadows the subscription login (§4.1). Reuse `buildSpawnEnv` from `lib/claude/backend-env.ts`, which already handles the anthropic/minimax split.
3. **Permission-mode names:** trust the installed CLI (§4.3), not the docs page.
4. **SDK message shapes:** the published docs summarize some `SDKMessage` members loosely. Task 2 pins the real shapes by logging one live session's raw stream to a fixture file and typing against that fixture — not against memory or prose docs.
5. **One attachment at a time** (§5.2, §6.6).
6. **Detached process group.** `lib/claude/spawn.ts` uses `detached: true` and kills by `-pgid` deliberately: the agent's Bash tool can background long-lived children (dev servers, builds) that survive a plain pid kill. Preserve this behavior in the daemon.
7. **Never broad `pkill -f`** on this machine — it has killed the live Command Center before. Kill by port-derived pid, then check `systemctl is-active`.

### 7.4 Existing assets inventory (reuse, don't rewrite)

| Path | Lines | What it gives you |
|---|---|---|
| `lib/claude/types.ts` | ~90 | `ClaudeStreamEvent`, `ChatMessageRecord` (the render shape) |
| `lib/claude/parse-stream-json.ts` | ~150 | NDJSON → `ChatMessageRecord` normalizer |
| `lib/claude/spawn.ts` | 152 | `spawnClaude`, `readStreamJson`, process-group handling |
| `lib/claude/backend-env.ts` | ~40 | `buildSpawnEnv(env, backend, key)`, `Backend` type |
| `lib/claude/agents.ts` | ~110 | repo agent discovery / frontmatter |
| `lib/db/terminal-sessions.ts` | — | `TerminalSessionRow`, `list/get/create/update/deleteTerminalSession`, `defaultSessionTitle` |
| `components/chat/Markdown.tsx` | 309 | markdown + code rendering |
| `components/chat/MessageBubble.tsx` | 93 | message bubble + TTS button |
| `components/chat/ToolUseCard.tsx` | 93 | `ToolPart` type, collapsible tool card, `FRIENDLY` labels |
| `components/chat/useSpeech.ts` | 70 | `useSpeech()` → `{ speak, stop, speakingKey }` |
| `components/terminal/useTerminalSocket.ts` | 133 | WebSocket attach/reconnect pattern to copy |
| `term-daemon/server.ts` | 205 | daemon shape: token auth, session registry, WS protocol |
| `term-daemon/{registry,scrollback,db,claude-args,worktree}.ts` | — | patterns for session map, scrollback buffer, row updates, worktree creation |
| `app/api/terminal/paste-image/route.ts` | — | upload validation, size cap, MIME map |

---

## 8. Data model

`terminal_sessions` keeps its current shape (D5). Confirmed columns: `id uuid pk`, `user_id`, `agent`, `title`, `cwd`, `worktree_path`, `permission_mode` (check: `normal`|`skip`), `status` (check: `running`|`exited`), `archived_at`, `created_at`, `updated_at`, `last_attached_at`, `backend` (check: `anthropic`|`minimax`, default `anthropic`). RLS enabled, **no policies — service-role only**, deliberately.

**Two migrations needed:**

1. **Widen `permission_mode`.** The current check constraint allows only `normal`/`skip`, but the mode selector (§6.4) needs the CLI's six values (§4.3). Migrate to a check accepting `manual`, `auto`, `acceptEdits`, `dontAsk`, `bypassPermissions`, `plan`, mapping existing `normal`→`auto` and `skip`→`bypassPermissions`. **Keep the old values accepted during the transition** so a rollback doesn't strand rows.
2. **Add `surface text not null default 'terminal' check (surface in ('terminal','chat'))`** — records which renderer currently holds the session, enforcing §5.2's one-attachment rule and letting the UI show where a session lives.

> Migrations are applied via the Supabase management API token at `~/.supabase/access-token`. There is no psql/CLI on this box. Never hand a migration to Simon to run.

---

## 9. Acceptance criteria

The build is done when all of these are demonstrably true:

1. A new session can be created from the agents section with agent, cwd, worktree toggle, permission mode, and backend picker — the same options as today (D5) — and it appears in `terminal_sessions` with `surface = 'chat'`.
2. Sending a message streams a response token-by-token into a chat bubble, with markdown and syntax-highlighted code.
3. Selecting response text and copying it works with a normal mouse drag — **no Shift, no copy mode.**
4. Pasting a screenshot from the clipboard into the composer attaches it and the agent can see it. Drag-drop does the same.
5. Typing `/` opens a palette listing the session's real slash commands with descriptions; selecting one inserts it; running `/goal` works.
6. The mode selector shows the current permission mode and switching it mid-session takes effect without restarting the agent.
7. In `manual` mode, a tool call raises an Approve/Deny card; Deny with a reason is visible to the agent. In `plan` mode, `ExitPlanMode` raises a plan card with Approve/Reject.
8. A pending approval survives a page reload.
9. The Stop button interrupts a running turn.
10. An existing `terminal_sessions` row created before this build can be opened in chat and continues its conversation (D3).
11. "Drop to terminal" hands the session to `term-daemon` and the same conversation continues in the PTY; coming back works. Double-attach fails loudly.
12. `Edit`/`Write` show a diff; `TodoWrite` shows a checklist; thinking is collapsible.
13. A repo skill (e.g. `session-close`) and the project `CLAUDE.md` are confirmed present in the session's inventory — proving `settingSources` is correct (§7.3.1).
14. ntfy fires when a session goes idle or blocks on approval and isn't focused.
15. The whole flow is usable one-handed on a phone; no horizontal page scroll at 390px wide.
16. Brand rules hold (§7.2): zero border-radius, correct accent/link colors, no emojis, all interactive states defined.
17. `npm run test:unit` passes.

## 10. Non-goals for v1

- Multi-tenant auth, per-customer credential isolation, sandboxing. (This is what would make the ADE *sellable*, and it is a separate product-scale project — not polish.)
- Voice input (D6).
- `@file` autocomplete, `#` memory shortcut, Esc-Esc rewind, up-arrow history, vim mode.
- Matching TUI display fidelity (D4).
- Retiring `term-daemon` (D1 keeps it).
- A design pass (D4 — comes after a week of real use).
