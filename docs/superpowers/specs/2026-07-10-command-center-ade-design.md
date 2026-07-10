# Command Center ADE — Design Spec

**Date:** 2026-07-10
**Status:** Draft — pending Simon's review
**Session:** chatv2
**Research:** NotebookLM notebook "Multi-Agent Management & ADE Research" (`132857d3-cb31-44cc-a43c-952fe008e7fe`, 66 sources + synthesized report)

## 1. Context & Goal

Replace Command Center's `/chat` section with an **Agentic Development Environment (ADE)**: a sidebar of Simon's agents (defined by markdown files in the MetaArchitect repo), each hosting multiple named sessions that are **real interactive Claude Code terminals** running on the existing subscription login. Inspiration: damon-ade / Conductor / Superset; architecture validated against AWS CLI Agent Orchestrator (isolated persistent terminal per agent + thin orchestration layer).

Everything ships in one release (Simon: "no v2 — v1 all-inclusive").

## 2. Non-Goals

- **No multi-model / OpenRouter support.** Claude subscription only.
- **No programmatic orchestration layer.** The story pipeline already covers autonomous multi-stage work. The ADE is the interactive half; they stay separate.
- **No Hermes fork.** We adopt the per-agent-memory *pattern* only.
- **No mobile-optimized view.** Tailscale + desktop browser is the target. xterm.js degrades acceptably on a phone.
- **No auth system beyond what exists.** Tailscale-bind is the perimeter, plus a shared daemon token (§10).

## 3. Architecture Overview

```
Browser (Tailscale)
 ├── HTTP :3737  Next.js app (UI, session metadata, agents API, machine-session browser)
 └── WS   :3738  term-daemon (PTY ownership, scrollback, attach/resize/input)

term-daemon (new systemd unit, survives app deploys)
 ├── node-pty → claude --session-id <uuid> ... (one PTY per live session)
 ├── in-memory registry + scrollback ring buffers
 └── Supabase service client → terminal_sessions status updates

Supabase
 ├── terminal_sessions (new)        session metadata / archive
 └── chats, chat_messages (legacy)  read-only archive view

MetaArchitect repo (data plane for agents)
 ├── .claude/agents/*.md            agent profiles (frontmatter: category, reports_to, …)
 └── docs/agent-memory/<name>.md    per-agent curated memory (propose-don't-apply)
```

**Key decision — PTY sidecar (Approach B):** `deploy-sync` restarts `command-center.service` after every story-pipeline merge. If PTYs lived in the Next process, every auto-merge would kill live agent sessions. The daemon is a separate small service that only restarts manually/on boot. A daemon restart loses live processes but not conversations: every session is launched with a known UUID (`--session-id`), so anything can be revived with `claude --resume <uuid>`.

## 4. term-daemon (sidecar service)

Location: `term-daemon/` in the command-center repo. TypeScript, run with `tsx` (same pattern as `worker/`). Deps: `node-pty` (already in package.json), `ws`.

### Responsibilities

- **Spawn** interactive Claude Code sessions in a PTY:
  `claude --session-id <uuid> --append-system-prompt <agent body>` with `cwd` = chosen workspace. The agent body is read from the agent's `.md` (frontmatter stripped) — same mechanism the current chat uses, so agent behavior is consistent. No `--dangerously-skip-permissions` by default; permission mode is a per-session launch option (default: interactive/normal — the terminal is right there to answer prompts).
- **Resume**: `claude --resume <uuid>` in a PTY (used for exited ADE sessions and machine-session revival).
- **Registry**: in-memory map `sessionId → { pty, scrollback, meta, clients }`. Scrollback = ring buffer (default 512 KB per session) replayed to every new WS attach. Multiple simultaneous viewers broadcast-attach.
- **WS protocol** (`/sessions/:id/attach?token=…`): binary/utf8 frames for PTY output; JSON control frames for `input`, `resize {cols,rows}`, `exit {code}`. Heartbeat ping/pong.
- **HTTP API** (same port, token-gated):
  - `POST /sessions` — create + spawn (body: agent, cwd, title, worktree flag, resumeOf?)
  - `GET /sessions` — live registry (id, status, attached client count)
  - `POST /sessions/:id/kill` — SIGTERM process group, then SIGKILL after grace
  - `GET /healthz`
- **Lifecycle → Supabase**: on spawn/exit/kill, upsert `terminal_sessions.status` (`running` | `exited`) with timestamps. On daemon boot, mark any rows still `running` as `exited` (stale from crash/restart) — they remain resumable.
- **Bind guard**: reuse the Tailscale-IP resolution from `bin/start-cc.js` (extract into a shared helper). Refuses non-Tailscale bind unless `ALLOW_NON_TAILSCALE=1`.

### Worktree isolation (launch option)

When the launch dialog's **"isolate in worktree"** toggle is on and `cwd` is a git repo, the daemon runs `git worktree add <repo>/.claude/worktrees/<agent>-<shortid> -b ade/<agent>-<shortid>` (from origin's default branch) and uses that as the session `cwd`. Defaults: **ON** when cwd is `projects/command-center` or `projects/simonparis-website` (enforces Simon's standing worktree rule mechanically), **OFF** for MetaArchitect root. Worktree path stored on the session row and shown in the tab's info popover. No auto-deletion — cleanup stays manual (`git worktree remove`), listed in the session info.

## 5. Next.js ADE UI (replaces /chat)

### Layout

```
┌──────────┬──────────────────────────────────────────┐
│ SIDEBAR  │  TAB BAR: [Ramp teardown ×][hooks fix ×]+ │
│          ├──────────────────────────────────────────┤
│ BUSINESS │                                          │
│  ● COO   │            xterm.js terminal             │
│  ○ Blog  │         (fit addon, dark theme,          │
│  ○ Site  │          brand colors, 0 radius)         │
│ INFRA    │                                          │
│  ○ Tech  ├──────────────────────────────────────────┤
│ PERSONAL │  status: running · cwd · worktree · uuid  │
│  ○ Health│                                          │
│  ○ Family│                                          │
│ ──────── │                                          │
│ Machine  │                                          │
│ Archive  │                                          │
│ Org chart│                                          │
└──────────┴──────────────────────────────────────────┘
```

- **Sidebar**: agents grouped by frontmatter `category`, live-session count badge per agent. Below the fold: **Machine sessions**, **Archive** (legacy chats + archived terminal sessions), **Org chart**.
- **Agent view**: selecting an agent shows its session list (newest first: running first, then exited-resumable) + "New session" button. Opening a session adds a tab; tabs persist in `localStorage` so a browser reload restores the tab set and reattaches.
- **Tabs**: rename (double-click), close (detach only — process keeps running), kill (explicit, confirmed). Running sessions show a live indicator; exited show a resume affordance.
- **Terminal**: `@xterm/xterm` + `@xterm/addon-fit` (+ `addon-web-links`). Theme mapped to brand CSS vars (#0F0F0F bg, #EAEAEA fg, orange cursor). Copy/paste, scrollback in-widget; server ring buffer replays on attach.
- **New session dialog**: agent (preselected from sidebar), title, workspace dir (presets from `lib/chat/presets.ts`, default MetaArchitect root), worktree toggle (smart default per §4), permission mode (normal / `--dangerously-skip-permissions`).

### API routes (Next, `runtime = "nodejs"`)

- `GET /api/agents` — extended to return `category`, `reports_to` from frontmatter.
- `GET/POST /api/terminal/sessions`, `PATCH /api/terminal/sessions/:id` (title, archived), `POST .../kill`, `POST .../resume` — thin proxies: Supabase for metadata + daemon HTTP for process ops.
- `GET /api/terminal/token` — returns the daemon WS token to the (Tailscale-gated) client.
- `GET /api/machine-sessions` — scans `~/.claude/projects/*/` JSONL files: session id, project dir (decoded from folder name), mtime, first-user-message snippet as title. Excludes sessions already tracked in `terminal_sessions`.
- Legacy `/api/chat` (one-shot streaming) is removed; `/api/chats` GET stays for the archive view.

### Machine session browser (v1)

Read-only list of Claude Code sessions started outside the ADE (Simon's SSH sessions), grouped by project dir, sorted by recency. **Resume** opens it as a real ADE session: daemon spawns `claude --resume <id>` in the original project dir, a `terminal_sessions` row is created with `agent = null` (shown under Machine, not under an agent), and from then on it behaves like any ADE session.

### Org chart view (v1)

A page rendering the agent hierarchy as a tree from frontmatter: root node **Simon**, then agents by `reports_to` (missing/`simon` = top level). Node = agent card (name, description, category, live-session count, link to its ADE view). Pure render of repo data — no stored graph. Simple nested flex/CSS tree, no graph library.

### Legacy chat archive

Old `chats`/`chat_messages` remain readable at `Archive → <chat>` using the existing `MessageBubble`/`Markdown` components, stripped of the composer. No new writes. No data migration.

## 6. Data Model (Supabase migration `0006_terminal_sessions.sql` — or next free number at build time)

```sql
create table terminal_sessions (
  id uuid primary key,              -- equals the Claude Code session UUID
  user_id uuid not null,
  agent text,                       -- null = machine/unassigned session
  title text not null default 'Untitled',
  cwd text not null,
  worktree_path text,
  permission_mode text not null default 'normal',  -- 'normal' | 'skip'
  status text not null default 'running',          -- 'running' | 'exited'
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_attached_at timestamptz
);
```

Service-role access only (matches existing tables). Archive = set `archived_at`; nothing is deleted; archived sessions remain resumable from the Archive view.

## 7. Agent Profiles & Per-Agent Memory (MetaArchitect changes)

Done in this repo as session work (never stories):

1. **Frontmatter additions** to all 6 agents in `.claude/agents/`:
   - `category:` — COO, blog-writer, sitemaster → `Business`; tech-support → `Infra`; health, family → `Personal`
   - `reports_to:` — blog-writer, sitemaster, tech-support → `coo`; coo, health, family → omitted (top level under Simon)
2. **"Usual workspaces" note** in each body where missing (e.g. sitemaster: "usually works in `projects/simonparis-website/` and `projects/command-center/`; full MetaArchitect repo available").
3. **Per-agent memory protocol.** Memory files live at `docs/agent-memory/<name>.md` (NOT inside `.claude/agents/` — Claude Code would parse them as agents). Each profile gains a short section:
   - *At session start*: read `docs/agent-memory/<name>.md`.
   - *At session close / when a durable lesson surfaces*: **propose** an edit to the memory file (and, if warranted, to the agent's own profile) as a diff for Simon to approve — never auto-apply profile changes. Memory-file appends of plain facts may be applied directly; profile edits are always propose-only.
   - Boundary note: agent memory = how this agent operates; `brain` = Simon's life/business facts; `docs/lessons.md` = system-wide anti-recurrence.
4. Seed each memory file with a 3–5 line starter (role summary + known preferences from existing profiles).

## 8. Auth & Security

- Both ports bind the Tailscale interface IP only (existing guard, extracted to a shared helper).
- Daemon HTTP + WS require `TERM_DAEMON_TOKEN` (env, generated at setup; also in the app's env so API proxies and the token endpoint can use it). Browser gets it from `/api/terminal/token` — acceptable because reaching that endpoint already requires being on the tailnet.
- PTYs run as user `diamond` — same trust level as Simon SSHing in. `--dangerously-skip-permissions` is opt-in per session, surfaced in the UI (badge on the tab), not the silent default the current chat uses.
- Path guard on `cwd`: must resolve inside `$HOME` (reuse `resolveWorkspaceDir` logic).

## 9. Deploy

- New unit `deploy/term-daemon.service` (After=network + tailscaled; Restart=on-failure). Installed by `deploy/setup.sh`.
- **`deploy-sync` must NOT restart term-daemon** — only `command-center.service`. Add a comment making this invariant explicit.
- `next.config.ts` unchanged (`node-pty` already in `serverExternalPackages`; daemon runs outside Next anyway).

## 10. Error Handling & Edge Cases

- **Daemon down**: UI banner ("terminal daemon offline — `systemctl --user start term-daemon`"); session lists still render from Supabase; attach/create disabled.
- **Daemon restart**: boot-time sweep marks stale `running` rows `exited`; UI offers Resume.
- **claude exits** (user types `exit`, crash, `/quit`): PTY exit handler → status `exited`, WS clients get `exit` frame, tab shows resume affordance.
- **WS drop** (laptop sleep): client auto-reconnects with backoff; scrollback replay makes it seamless; PTY unaffected.
- **Resume of a session whose JSONL is gone**: `claude --resume` fails visibly in the terminal itself; no special handling.
- **Two tabs, same session**: allowed (broadcast attach) — both render identical output; input multiplexes like tmux shared sessions.
- **Worktree add fails** (dirty repo, name collision): session creation fails with the git error surfaced in the dialog; nothing spawned.

## 11. Testing & Verification

- **Daemon unit tests** (vitest, matching repo conventions): registry lifecycle, ring buffer semantics, stale-row sweep, token gate (mock `node-pty`).
- **Integration smoke** (manual + scripted): create session via API → WS attach → observe Claude banner → input roundtrip → detach → reattach (scrollback intact) → kill → resume → status transitions in Supabase.
- **UI verify**: drive the real app per repo `verify` skill — new session from sidebar, tab restore after reload, archive flow, machine-session resume, org chart renders all 6 agents.
- Brand check: dark-only, zero radius, orange accents, mono labels.

## 12. Decisions Log

| Decision | Choice |
|---|---|
| Replace or coexist with chat | Replace; legacy chats read-only archive |
| Disconnect behavior | Sessions persist server-side (tmux-like) |
| Sidebar structure | Categories from agent frontmatter |
| PTY host | Sidecar daemon :3738 (survives deploy-sync restarts) |
| tmux backing | No — `--session-id`/`--resume` covers daemon restarts |
| Machine sessions / archive / org chart / worktrees / per-agent memory | All in v1 (Simon: no v2) |
| Multi-model (OpenRouter) | Out of scope |
| Agent identity injection | `--append-system-prompt` from repo `.md`, cwd = MetaArchitect root by default |
| Self-improvement | Per-agent memory files + propose-don't-apply profile edits |
