# ADE Chat Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Read the spec first:** `~/projects/MetaArchitect/docs/superpowers/specs/2026-08-07-ade-chat-surface-design.md`. It carries the locked decisions (D1–D9), the empirically verified facts about the Claude CLI on this machine, the existing-asset inventory, and the 17 acceptance criteria. This plan implements it and does not restate its reasoning.

**Goal:** Replace the terminal-rendering agent surface in Command Center with a real web chat UI driven by Claude Code running headless via the Agent SDK, keeping a per-session escape hatch back to the terminal.

**Architecture:** A new standalone `chat-daemon` service (:3739) owns Agent SDK sessions, pending permission requests, and scrollback, so sessions survive the Next.js app's frequent deploy-sync restarts — the same reasoning that produced `term-daemon` on :3738. The Next.js app on :3737 owns UI and session metadata. Every session's Claude session UUID **is** `terminal_sessions.id`, so chat and terminal are two renderers over one conversation.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, Supabase (service-role), `@anthropic-ai/claude-agent-sdk@0.3.224` (new), `ws`, `tsx` runtime for the daemon, vitest.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec.

- **Repo:** `~/projects/MetaArchitect/projects/command-center` (own git repo). **Work in a git worktree** (superpowers:using-git-worktrees) — the primary checkout must stay on `main` (the live service serves it via the `~/command-center` symlink, and PreToolUse hooks deny mutations there). Branch name: `ade/chat-surface-v1`.
- Push with `git push origin <branch>` (gh credential helper is wired). Never SSH push, never `--no-verify`, never force-push. **Always `git fetch && git rebase origin/main` before pushing** — the story-worker merges PRs to origin/main continuously.
- Never restart the live service to test unpushed changes. Verify with a local `next start` on a spare port.
- Never run a broad `pkill -f` on this machine. Kill by port-derived pid, then check `systemctl is-active`.
- Node >= 22. Daemon runs under `tsx` like `worker/` and `term-daemon/`. New API routes: `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
- Both listeners bind the Tailscale interface IP only (guard pattern in `bin/start-cc.js`); `ALLOW_NON_TAILSCALE=1` falls back to `127.0.0.1` for dev.
- Supabase access is service-role, server-only (`createSupabaseServiceClient` in `lib/supabase/server.ts`); `user_id` comes from `getOwnerId()` in `lib/db/owner.ts`.
- Migrations are applied by the agent via the Supabase management API token at `~/.supabase/access-token`. No psql/CLI on this box. Never hand a migration to a human to run.
- **Brand, non-negotiable:** dark-only, **zero border-radius**, accent `#E04500` (hover `#FF5A1A`), links `#C97A1A` never blue, bg `#0F0F0F` / surface `#1A1A1A` / border `#333333`, text `#EAEAEA` / `#B4B4B4` / `#777777`. Mono for labels/metadata (`label-mono` in `app/globals.css`). **No emojis in UI copy.** Icons from `lucide-react`. Every interactive element defines default / hover / active / selected states.
- **Mobile is a first-class target.** No horizontal page scroll at 390px. Wide content scrolls inside its own `overflow-x: auto` container.
- Tests: vitest, colocated `__tests__/*.test.ts`. Run `npx vitest run <path>`. Full suite: `npm run test:unit`. **Commit after every green task.**
- Never leak `ANTHROPIC_API_KEY` into a spawned child env — it shadows the subscription login. Always build child env with `buildSpawnEnv` from `lib/claude/backend-env.ts`.

---

## File Structure

**New — daemon** (`chat-daemon/`, modeled directly on `term-daemon/`):

| File | Responsibility |
|---|---|
| `chat-daemon/index.ts` | Entrypoint: load env, construct registry, start server |
| `chat-daemon/server.ts` | HTTP + WebSocket server, token auth, route handlers |
| `chat-daemon/registry.ts` | In-memory map of live sessions; one `LiveChatSession` per session id |
| `chat-daemon/session.ts` | Wraps one SDK `Query`: lifecycle, input queue, interrupt, mode switching |
| `chat-daemon/permissions.ts` | Pending `canUseTool` requests, promise resolution, reload survival |
| `chat-daemon/scrollback.ts` | Bounded per-session message history for reconnecting clients |
| `chat-daemon/db.ts` | `terminal_sessions` row updates (status, surface, last_attached_at) |
| `chat-daemon/notify.ts` | ntfy push on idle / awaiting-approval |

**New — shared types & normalizer:**

| File | Responsibility |
|---|---|
| `lib/chat/protocol.ts` | Wire protocol types shared by daemon and client |
| `lib/chat/normalize.ts` | SDK message stream → `ChatMessageRecord` (extends `lib/claude/parse-stream-json.ts`) |

**New — client:**

| File | Responsibility |
|---|---|
| `components/chat-session/ChatPane.tsx` | Top-level pane: message list + composer + mode bar |
| `components/chat-session/useChatSocket.ts` | WebSocket attach/reconnect (mirrors `components/terminal/useTerminalSocket.ts`) |
| `components/chat-session/Composer.tsx` | Textarea, attachments, send/stop |
| `components/chat-session/SlashPalette.tsx` | `/` autocomplete dropdown |
| `components/chat-session/ModeSelector.tsx` | Permission mode control |
| `components/chat-session/PermissionCard.tsx` | Tool approval + plan approval cards |
| `components/chat-session/DiffView.tsx` | Unified diff for Edit/Write |
| `components/chat-session/TodoList.tsx` | TodoWrite checklist |

**New — API routes:** `app/api/chat-session/{sessions,token,attachment}/route.ts`

**Modified:** `lib/db/terminal-sessions.ts`, `components/chat/ToolUseCard.tsx`, the agents-section pane switch, `package.json`, `bin/start-cc.js`, systemd unit for the daemon.

**Reused unchanged:** `lib/claude/{backend-env,agents,spawn}.ts`, `components/chat/{Markdown,MessageBubble,useSpeech}.*`, `lib/db/owner.ts`, `lib/supabase/server.ts`.

---

### Task 1: Migrations + db module

**Files:**
- Create: `supabase/migrations/0018_chat_surface.sql`
- Modify: `lib/db/terminal-sessions.ts`
- Test: `lib/db/__tests__/terminal-sessions.test.ts`

**Interfaces:**
- Produces: `PermissionMode` type (`'manual'|'auto'|'acceptEdits'|'dontAsk'|'bypassPermissions'|'plan'`), `Surface` type (`'terminal'|'chat'`), both exported from `lib/db/terminal-sessions.ts`. `TerminalSessionRow` gains `surface: Surface`. Used by Tasks 3, 4, 6, 11.

- [ ] **Step 1: Confirm the CLI's permission modes have not drifted**

Run: `claude --help 2>&1 | grep -A4 -- "--permission-mode"`
Expected: the six values `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan`. If the set differs, use what the CLI reports and note the change at the top of the migration.

- [ ] **Step 2: Write the migration**

```sql
-- 0018_chat_surface.sql
-- Widen permission_mode to the CLI's real mode set (verified 2026-08-07,
-- claude v2.1.224) and record which renderer currently holds the session.
-- Old values ('normal','skip') stay accepted so a rollback can't strand rows.

alter table public.terminal_sessions
  drop constraint if exists terminal_sessions_permission_mode_check;

update public.terminal_sessions set permission_mode = 'auto' where permission_mode = 'normal';
update public.terminal_sessions set permission_mode = 'bypassPermissions' where permission_mode = 'skip';

alter table public.terminal_sessions
  add constraint terminal_sessions_permission_mode_check
  check (permission_mode in (
    'manual','auto','acceptEdits','dontAsk','bypassPermissions','plan',
    'normal','skip'
  ));

alter table public.terminal_sessions
  alter column permission_mode set default 'auto';

alter table public.terminal_sessions
  add column if not exists surface text not null default 'terminal'
  check (surface in ('terminal','chat'));

create index if not exists terminal_sessions_surface_idx
  on public.terminal_sessions (surface, status, created_at desc);
```

- [ ] **Step 3: Apply the migration via the Supabase management API**

Use the token at `~/.supabase/access-token` against the command-center project. Confirm by selecting one row and checking `surface` exists and `permission_mode` is `auto` where it was `normal`.

- [ ] **Step 4: Write the failing test**

```typescript
// lib/db/__tests__/terminal-sessions.test.ts
import { describe, it, expect } from "vitest";
import { PERMISSION_MODES, SURFACES } from "../terminal-sessions";

describe("terminal-sessions constants", () => {
  it("exposes the CLI's six permission modes", () => {
    expect(PERMISSION_MODES).toEqual([
      "manual", "auto", "acceptEdits", "dontAsk", "bypassPermissions", "plan",
    ]);
  });
  it("exposes both surfaces", () => {
    expect(SURFACES).toEqual(["terminal", "chat"]);
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npx vitest run lib/db/__tests__/terminal-sessions.test.ts`
Expected: FAIL — `PERMISSION_MODES` is not exported.

- [ ] **Step 6: Implement**

Add to `lib/db/terminal-sessions.ts`:

```typescript
export const PERMISSION_MODES = [
  "manual", "auto", "acceptEdits", "dontAsk", "bypassPermissions", "plan",
] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];

export const SURFACES = ["terminal", "chat"] as const;
export type Surface = (typeof SURFACES)[number];
```

Add `surface: Surface` to `TerminalSessionRow`, accept `surface` in `createTerminalSession`'s input (defaulting to `"chat"`), and allow it in `updateTerminalSession`'s patch.

- [ ] **Step 7: Run tests, then the full suite**

Run: `npx vitest run lib/db/__tests__/terminal-sessions.test.ts` → PASS
Run: `npm run test:unit` → PASS

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0018_chat_surface.sql lib/db/terminal-sessions.ts lib/db/__tests__/terminal-sessions.test.ts
git commit -m "feat(chat): widen permission_mode, add surface column"
```

---

### Task 2: Pin the SDK's real message shapes against a live fixture

**Do not skip this task and do not write SDK types from memory or from prose docs.** The published docs summarize some `SDKMessage` members loosely. This task captures ground truth once so every later task types against reality.

**Files:**
- Modify: `package.json`
- Create: `scripts/capture-sdk-fixture.ts`
- Create: `lib/chat/__fixtures__/sdk-stream.jsonl`
- Create: `lib/chat/protocol.ts`

**Interfaces:**
- Produces: `lib/chat/protocol.ts` exporting `ChatServerEvent` and `ChatClientCommand` discriminated unions (see Step 5). Consumed by Tasks 3, 5, 6, 7, 9.

- [ ] **Step 1: Install the SDK, pinned**

```bash
npm install --save-exact @anthropic-ai/claude-agent-sdk@0.3.224
```

- [ ] **Step 2: Write the capture script**

```typescript
// scripts/capture-sdk-fixture.ts
import { writeFileSync } from "node:fs";
import { query } from "@anthropic-ai/claude-agent-sdk";

const lines: string[] = [];
const q = query({
  prompt: "Create a file /tmp/sdk-probe.txt containing the word hello, then tell me you did it.",
  options: {
    cwd: "/tmp",
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    includePartialMessages: true,
    settingSources: ["user", "project", "local"],
    pathToClaudeCodeExecutable: process.env.CLAUDE_BIN || undefined,
  },
});
for await (const msg of q) lines.push(JSON.stringify(msg));
writeFileSync("lib/chat/__fixtures__/sdk-stream.jsonl", lines.join("\n"));
console.log(`captured ${lines.length} messages`);
```

- [ ] **Step 3: Run it**

```bash
mkdir -p lib/chat/__fixtures__ && npx tsx scripts/capture-sdk-fixture.ts
```

Expected: a fixture file with at least one `system` init message, `assistant` messages, a tool use, and a `result`.

- [ ] **Step 4: Read the fixture and record what you found**

Inspect the distinct `type` values and the exact field names on each. Write them as a comment block at the top of `lib/chat/protocol.ts`. **This comment is the contract later tasks rely on.**

Confirm three things explicitly and note them in the comment:
1. The init message contains `slash_commands`, `skills`, `agents`, `tools`, `model`, `permissionMode`, `apiKeySource`.
2. `apiKeySource` is `"none"` (subscription login, not an API key).
3. A repo skill and the project `CLAUDE.md` are reflected in the inventory — proving `settingSources` works. **If they are absent, stop and fix `settingSources` before continuing; every later task depends on this.**

- [ ] **Step 5: Write the wire protocol**

```typescript
// lib/chat/protocol.ts
import type { ChatMessageRecord } from "@/lib/claude/types";
import type { PermissionMode } from "@/lib/db/terminal-sessions";

export type PendingPermission = {
  requestId: string;
  toolName: string;
  input: unknown;
  /** ExitPlanMode requests render as a plan card instead of a tool card. */
  kind: "tool" | "plan";
};

export type SessionInventory = {
  slashCommands: Array<{ name: string; description?: string }>;
  model: string;
  permissionMode: PermissionMode;
  cwd: string;
};

export type ChatServerEvent =
  | { t: "hello"; sessionId: string; inventory: SessionInventory;
      history: ChatMessageRecord[]; pending: PendingPermission[]; busy: boolean }
  | { t: "message"; message: ChatMessageRecord }
  | { t: "delta"; messageId: string; text: string }
  | { t: "permission"; pending: PendingPermission }
  | { t: "permission_resolved"; requestId: string }
  | { t: "mode"; mode: PermissionMode }
  | { t: "busy"; busy: boolean }
  | { t: "error"; message: string }
  | { t: "closed"; reason: string };

export type ChatClientCommand =
  | { t: "send"; text: string; attachments?: Array<{ path: string; mime: string }> }
  | { t: "interrupt" }
  | { t: "set_mode"; mode: PermissionMode }
  | { t: "permission_response"; requestId: string; approved: boolean; reason?: string };
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/capture-sdk-fixture.ts lib/chat/__fixtures__/sdk-stream.jsonl lib/chat/protocol.ts
git commit -m "feat(chat): pin agent SDK, capture stream fixture, define wire protocol"
```

---

### Task 3: chat-daemon skeleton — auth, HTTP, WebSocket, Tailscale bind

**Files:**
- Create: `chat-daemon/index.ts`, `chat-daemon/server.ts`, `chat-daemon/registry.ts`, `chat-daemon/db.ts`
- Test: `chat-daemon/__tests__/server.test.ts`

**Interfaces:**
- Consumes: `Surface`, `PermissionMode` (Task 1); `ChatServerEvent`, `ChatClientCommand` (Task 2).
- Produces: `Registry` class with `get(id)`, `list()`, `add(session)`, `remove(id)`; HTTP routes `GET /healthz`, `GET /sessions`, `POST /sessions`, `DELETE /sessions/:id`; WebSocket at `/attach?id=<uuid>&token=<token>`. Used by Tasks 4, 5, 9, 11.

Copy `term-daemon/server.ts` (205 lines) as the structural model — the token check, the JSON helpers, the `BadJsonError` handling, and the Tailscale bind guard are all directly reusable. Use a distinct env var `CHAT_DAEMON_TOKEN` and port 3739.

- [ ] **Step 1: Write the failing test**

```typescript
// chat-daemon/__tests__/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer } from "../server";
import { Registry } from "../registry";

let close: () => void;
const PORT = 39991;

beforeAll(() => {
  process.env.CHAT_DAEMON_TOKEN = "test-token";
  close = startServer(new Registry(), "127.0.0.1", PORT);
});
afterAll(() => close());

describe("chat-daemon auth", () => {
  it("rejects a request with no token", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/healthz`);
    expect(res.status).toBe(401);
  });
  it("accepts a request with the right token", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/healthz`, {
      headers: { "x-chat-token": "test-token" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
  it("refuses everything when the token is unconfigured", async () => {
    const prev = process.env.CHAT_DAEMON_TOKEN;
    process.env.CHAT_DAEMON_TOKEN = "";
    const res = await fetch(`http://127.0.0.1:${PORT}/healthz`, {
      headers: { "x-chat-token": "" },
    });
    expect(res.status).toBe(401);
    process.env.CHAT_DAEMON_TOKEN = prev;
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run chat-daemon/__tests__/server.test.ts`
Expected: FAIL — module `../server` not found.

- [ ] **Step 3: Implement registry, db, and server**

`registry.ts` holds `Map<string, LiveChatSession>` (the session type lands in Task 4 — for now type it as an interface with `id`, `close()`). `db.ts` wraps `updateTerminalSession` for `status`, `surface`, and `last_attached_at`. `server.ts` mirrors `term-daemon/server.ts`: `timingSafeEqual` token check that refuses everything when the expected token is empty, JSON body reader, and `startServer(registry, host, port)` returning a close function.

- [ ] **Step 4: Run tests**

Run: `npx vitest run chat-daemon/__tests__/server.test.ts` → PASS

- [ ] **Step 5: Wire the entrypoint and the bind guard**

`index.ts` loads `dotenv/config` (as `worker/index.ts` does), resolves the Tailscale IP with the same guard as `bin/start-cc.js`, honors `ALLOW_NON_TAILSCALE=1` → `127.0.0.1`, and starts the server on `CHAT_DAEMON_PORT || 3739`. Add an `npm` script `"chat-daemon": "tsx chat-daemon/index.ts"`.

- [ ] **Step 6: Verify it binds correctly**

```bash
ALLOW_NON_TAILSCALE=1 CHAT_DAEMON_TOKEN=dev npm run chat-daemon &
curl -s -H "x-chat-token: dev" http://127.0.0.1:3739/healthz
```
Expected: `{"ok":true,"sessions":0}`. Stop it by killing the pid bound to 3739 — **never a broad `pkill -f`.**

- [ ] **Step 7: Commit**

```bash
git add chat-daemon package.json
git commit -m "feat(chat): chat-daemon skeleton with token auth and tailscale bind"
```

---

### Task 4: Session lifecycle — create and resume through the Agent SDK

**Files:**
- Create: `chat-daemon/session.ts`
- Modify: `chat-daemon/server.ts` (wire `POST /sessions`, `DELETE /sessions/:id`)
- Test: `chat-daemon/__tests__/session.test.ts`

**Interfaces:**
- Consumes: `Registry` (Task 3), `buildSpawnEnv` + `Backend` from `lib/claude/backend-env.ts`, `PermissionMode` (Task 1).
- Produces: `class LiveChatSession` with constructor `(opts: CreateChatSessionOpts)` and methods `start(): Promise<void>`, `send(text: string, attachments?): void`, `interrupt(): Promise<void>`, `setMode(mode: PermissionMode): Promise<void>`, `close(): Promise<void>`, plus readonly `id`, `inventory`, `busy`. Used by Tasks 5, 9, 11.

```typescript
export type CreateChatSessionOpts = {
  id: string;                    // MUST equal terminal_sessions.id (the Claude session UUID)
  cwd: string;
  agent: string | null;
  agentPrompt: string | null;    // repo agent markdown body, via --append-system-prompt equivalent
  permissionMode: PermissionMode;
  backend: Backend;
  resume: boolean;               // true = attach to an existing conversation
};
```

**Three things this task must get right** (each is a spec gotcha):

1. `settingSources: ["user", "project", "local"]` — **without it the session gets no CLAUDE.md, no skills, no custom commands.**
2. `sessionId: opts.id` on create, `resume: opts.id` on resume — this keeps the session UUID identical to the DB row id, which is what makes the terminal escape hatch work.
3. Child env built with `buildSpawnEnv(baseEnv, opts.backend, process.env.MINIMAX_API_KEY)` so no `ANTHROPIC_API_KEY` leaks in and the minimax backend keeps working.

- [ ] **Step 1: Write the failing test**

```typescript
// chat-daemon/__tests__/session.test.ts
import { describe, it, expect } from "vitest";
import { buildQueryOptions } from "../session";

describe("buildQueryOptions", () => {
  const base = {
    id: "11111111-2222-3333-4444-555555555555",
    cwd: "/tmp", agent: null, agentPrompt: null,
    permissionMode: "auto" as const, backend: "anthropic" as const,
  };

  it("always loads filesystem settings so CLAUDE.md and skills are present", () => {
    const o = buildQueryOptions({ ...base, resume: false });
    expect(o.settingSources).toEqual(["user", "project", "local"]);
  });

  it("pins the session id on create", () => {
    const o = buildQueryOptions({ ...base, resume: false });
    expect(o.sessionId).toBe(base.id);
    expect(o.resume).toBeUndefined();
  });

  it("resumes by id instead of pinning", () => {
    const o = buildQueryOptions({ ...base, resume: true });
    expect(o.resume).toBe(base.id);
    expect(o.sessionId).toBeUndefined();
  });

  it("never passes ANTHROPIC_API_KEY through", () => {
    const o = buildQueryOptions({ ...base, resume: false });
    expect(o.env?.ANTHROPIC_API_KEY).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run chat-daemon/__tests__/session.test.ts`
Expected: FAIL — `buildQueryOptions` is not exported.

- [ ] **Step 3: Implement `buildQueryOptions` and `LiveChatSession`**

Export `buildQueryOptions(opts)` as a pure function (that is what the test drives) returning the SDK `Options` object, then have `LiveChatSession.start()` call `query({ prompt: <async iterable>, options: buildQueryOptions(opts) })`.

Use **streaming input mode**: `prompt` is an `AsyncIterable<SDKUserMessage>` fed by an internal queue, so the session stays open across turns instead of one-shotting. `send()` pushes onto that queue.

Set `pathToClaudeCodeExecutable` from `process.env.CLAUDE_BIN` when present, `includePartialMessages: true`, and `abortController` so `close()` can tear down.

- [ ] **Step 4: Run tests**

Run: `npx vitest run chat-daemon/__tests__/session.test.ts` → PASS

- [ ] **Step 5: Live-verify a real round trip**

Start the daemon, `POST /sessions` with a fresh uuid and `cwd: "/tmp"`, send "say ok", and confirm an assistant message comes back. Then `POST` again with `resume: true` on the same id and confirm the conversation continues (ask "what did I just ask you?").

- [ ] **Step 6: Commit**

```bash
git add chat-daemon/session.ts chat-daemon/server.ts chat-daemon/__tests__/session.test.ts
git commit -m "feat(chat): SDK session lifecycle with create, resume, and settingSources"
```

---

### Task 5: Stream normalization, scrollback, and broadcast

**Files:**
- Create: `lib/chat/normalize.ts`, `chat-daemon/scrollback.ts`
- Modify: `chat-daemon/session.ts` (emit normalized events)
- Test: `lib/chat/__tests__/normalize.test.ts`

**Interfaces:**
- Consumes: the fixture from Task 2, `ChatMessageRecord` from `lib/claude/types.ts`, `ChatServerEvent` from `lib/chat/protocol.ts`.
- Produces: `normalizeSdkMessage(msg): ChatServerEvent[]` and `class Scrollback` with `push(record)`, `history(): ChatMessageRecord[]`, bounded to the last 500 records. Used by Tasks 6, 9, 10.

- [ ] **Step 1: Write the failing test, driven by the real fixture**

```typescript
// lib/chat/__tests__/normalize.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { normalizeSdkMessage } from "../normalize";

const raw = readFileSync("lib/chat/__fixtures__/sdk-stream.jsonl", "utf8")
  .split("\n").filter(Boolean).map((l) => JSON.parse(l));

describe("normalizeSdkMessage", () => {
  it("never throws on any message in the captured stream", () => {
    for (const msg of raw) expect(() => normalizeSdkMessage(msg)).not.toThrow();
  });

  it("produces at least one assistant text record", () => {
    const events = raw.flatMap(normalizeSdkMessage);
    const texts = events.filter(
      (e) => e.t === "message" && e.message.role === "assistant" &&
             e.message.parts.some((p) => p.kind === "text"),
    );
    expect(texts.length).toBeGreaterThan(0);
  });

  it("produces a tool part for the file write", () => {
    const events = raw.flatMap(normalizeSdkMessage);
    const tools = events.filter(
      (e) => e.t === "message" && e.message.parts.some((p) => p.kind === "tool"),
    );
    expect(tools.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run lib/chat/__tests__/normalize.test.ts`
Expected: FAIL — `../normalize` not found.

- [ ] **Step 3: Implement the normalizer**

Start from `lib/claude/parse-stream-json.ts`, which already maps stream-json to `ChatMessageRecord`. Extend it for the SDK's message union as recorded in Task 2's comment block. Unknown message types return `[]` rather than throwing.

- [ ] **Step 4: Implement scrollback and wire broadcast**

`Scrollback` keeps the last 500 records per session. On WebSocket attach the daemon sends `{ t: "hello", ... }` carrying `history`, `pending`, `inventory`, and `busy` so a reconnecting client is fully re-synced.

- [ ] **Step 5: Run tests, then the full suite**

Run: `npx vitest run lib/chat/__tests__/normalize.test.ts` → PASS
Run: `npm run test:unit` → PASS

- [ ] **Step 6: Commit**

```bash
git add lib/chat/normalize.ts chat-daemon/scrollback.ts chat-daemon/session.ts lib/chat/__tests__/normalize.test.ts
git commit -m "feat(chat): normalize SDK stream to chat records, add scrollback"
```

---

### Task 6: Client socket + ChatPane + message list

**Files:**
- Create: `components/chat-session/useChatSocket.ts`, `components/chat-session/ChatPane.tsx`
- Create: `app/api/chat-session/token/route.ts`
- Test: `components/chat-session/__tests__/useChatSocket.test.ts`

**Interfaces:**
- Consumes: `ChatServerEvent` / `ChatClientCommand` (Task 2), `MessageBubble` + `Markdown` + `useSpeech` from `components/chat/`.
- Produces: `useChatSocket({ sessionId, enabled })` returning `{ messages, inventory, pending, busy, connected, send, interrupt, setMode, respondPermission }`. Used by Tasks 7, 8, 9, 10, 11.

Mirror `components/terminal/useTerminalSocket.ts` (133 lines) for the attach/reconnect/cleanup pattern, including its effect-ordering comment — subscriptions must be torn down before the pane unmounts.

The token route mints a short-lived daemon token for the browser; do not ship `CHAT_DAEMON_TOKEN` to the client directly.

- [ ] **Step 1: Write the failing test** — a mock WebSocket that emits a `hello` frame; assert the hook exposes its `history` as `messages` and its `inventory`.
- [ ] **Step 2: Run it and watch it fail.** Run: `npx vitest run components/chat-session/__tests__/useChatSocket.test.ts` → FAIL, module not found.
- [ ] **Step 3: Implement the hook** — connect, parse frames, reduce into state, reconnect with backoff, and expose the command senders.
- [ ] **Step 4: Implement `ChatPane`** — renders `MessageBubble` per record; auto-scrolls to the bottom unless the user has scrolled up; shows a connection state chip using brand colors.
- [ ] **Step 5: Run tests** → PASS.
- [ ] **Step 6: Commit**

```bash
git add components/chat-session app/api/chat-session
git commit -m "feat(chat): client socket hook and chat pane"
```

---

### Task 7: Composer with image paste and drag-drop

**Files:**
- Create: `components/chat-session/Composer.tsx`, `app/api/chat-session/attachment/route.ts`
- Test: `components/chat-session/__tests__/Composer.test.tsx`

**Interfaces:**
- Consumes: `useChatSocket`'s `send` and `interrupt` (Task 6).
- Produces: `<Composer onSend={(text, attachments) => void} busy={boolean} />`. Used by Tasks 8, 11.

Copy the upload validation from `app/api/terminal/paste-image/route.ts`: 50MB cap, MIME map covering `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `application/pdf`, and the 24h cleanup sweep. **Difference from the terminal version:** the returned path is attached as a real content block on the user message, not injected as a text string.

- [ ] **Step 1: Write the failing tests** — (a) Enter sends, Shift+Enter and Ctrl+Enter insert a newline; (b) a paste event carrying an image file calls the upload handler; (c) a drop event with a file does the same; (d) a non-image file type is rejected with a visible message.
- [ ] **Step 2: Run them and watch them fail.** Run: `npx vitest run components/chat-session/__tests__/Composer.test.tsx` → FAIL.
- [ ] **Step 3: Implement the attachment route**, reusing the constants above.
- [ ] **Step 4: Implement `Composer`** — auto-growing textarea, attachment thumbnails with remove buttons, send button, and a Stop button that swaps in while `busy`.
- [ ] **Step 5: Run tests** → PASS.
- [ ] **Step 6: Manually verify a clipboard screenshot paste end to end** — paste a screenshot, send, and confirm the agent describes the image correctly. This is acceptance criterion 4 and the defect that motivated the project.
- [ ] **Step 7: Commit**

```bash
git add components/chat-session/Composer.tsx app/api/chat-session/attachment components/chat-session/__tests__/Composer.test.tsx
git commit -m "feat(chat): composer with image paste and drag-drop"
```

---

### Task 8: Slash-command palette

**Files:**
- Create: `components/chat-session/SlashPalette.tsx`
- Modify: `components/chat-session/Composer.tsx`, `chat-daemon/session.ts`
- Test: `components/chat-session/__tests__/SlashPalette.test.tsx`

**Interfaces:**
- Consumes: `inventory.slashCommands` from `useChatSocket` (Task 6).
- Produces: `<SlashPalette commands={...} filter={string} onSelect={(name) => void} />`.

The daemon populates `inventory.slashCommands` from `Query.supportedCommands()`, falling back to the init message's `slash_commands` array if that call is unavailable in the pinned SDK version.

- [ ] **Step 1: Write the failing tests** — typing `/` at position 0 opens the palette; typing `/go` filters to `goal`; arrow keys move the selection; Enter inserts the command and closes; Escape closes without inserting; a `/` mid-word does not open it.
- [ ] **Step 2: Run them and watch them fail.** Run: `npx vitest run components/chat-session/__tests__/SlashPalette.test.tsx` → FAIL.
- [ ] **Step 3: Populate `slashCommands` in the daemon's inventory.**
- [ ] **Step 4: Implement the palette and wire it into the composer.**
- [ ] **Step 5: Run tests** → PASS.
- [ ] **Step 6: Commit**

```bash
git add components/chat-session chat-daemon/session.ts
git commit -m "feat(chat): slash command palette from live session inventory"
```

---

### Task 9: Mode selector, permission cards, plan cards

**Files:**
- Create: `chat-daemon/permissions.ts`, `components/chat-session/ModeSelector.tsx`, `components/chat-session/PermissionCard.tsx`
- Modify: `chat-daemon/session.ts`
- Test: `chat-daemon/__tests__/permissions.test.ts`

**Interfaces:**
- Consumes: `PendingPermission` (Task 2), `LiveChatSession.setMode` (Task 4).
- Produces: `class PermissionBroker` with `request(toolName, input): Promise<{approved: boolean; reason?: string}>`, `resolve(requestId, approved, reason?)`, `pending(): PendingPermission[]`.

The broker is what `canUseTool` calls. It stores the unresolved promise **server-side in the daemon**, so a browser reload re-receives it in the `hello` frame (acceptance criterion 8).

A request whose `toolName` is `ExitPlanMode` gets `kind: "plan"` so the client renders a plan card instead of a tool card.

- [ ] **Step 1: Write the failing tests** — a `request()` stays pending until `resolve()`; `resolve(id, false, "nope")` settles the promise with that reason; `pending()` lists unresolved requests; resolving an unknown id is a no-op rather than a throw; an `ExitPlanMode` request is tagged `kind: "plan"`.
- [ ] **Step 2: Run them and watch them fail.** Run: `npx vitest run chat-daemon/__tests__/permissions.test.ts` → FAIL.
- [ ] **Step 3: Implement the broker and pass it as `canUseTool` in `buildQueryOptions`.**
- [ ] **Step 4: Implement `ModeSelector`** — a segmented control over `PERMISSION_MODES` (Task 1), calling `setMode`. It must show the current mode as a labeled selected state, not cycle blind.
- [ ] **Step 5: Implement `PermissionCard`** — tool name plus formatted arguments, Approve / Deny buttons, and an optional deny reason field. The plan variant renders the plan as markdown via the existing `Markdown` component with Approve / Reject.
- [ ] **Step 6: Run tests** → PASS.
- [ ] **Step 7: Live-verify all three flows** — (a) in `manual` mode a Bash call raises a card and Deny-with-reason reaches the agent; (b) in `plan` mode `ExitPlanMode` raises a plan card; (c) reload the page mid-prompt and confirm the card comes back.
- [ ] **Step 8: Smoke-test slash commands** — run `/goal`, `/context`, and `/compact`, plus one repo skill such as `/session-close`. Record in the PR body which built-ins behave correctly headless and which return something useless, and hide the useless ones from the palette.
- [ ] **Step 9: Commit**

```bash
git add chat-daemon/permissions.ts chat-daemon/session.ts components/chat-session chat-daemon/__tests__/permissions.test.ts
git commit -m "feat(chat): permission broker, mode selector, plan approval cards"
```

---

### Task 10: Rich rendering — diffs, todos, thinking

**Files:**
- Create: `components/chat-session/DiffView.tsx`, `components/chat-session/TodoList.tsx`
- Modify: `components/chat/ToolUseCard.tsx`
- Test: `components/chat-session/__tests__/DiffView.test.tsx`

**Interfaces:**
- Consumes: `ToolPart` from `components/chat/ToolUseCard.tsx`.
- Produces: `<DiffView oldText={string} newText={string} path={string} />`, `<TodoList todos={Array<{content: string; status: string}>} />`.

`ToolUseCard` already has a `FRIENDLY` label map (`Edit` → "Edited <path>", `Bash` → "Ran `<cmd>`", `Read`, `Grep`, `Glob`). Extend its expanded body to dispatch on tool name: `Edit`/`Write` → `DiffView`, `TodoWrite` → `TodoList`, everything else → the current JSON view.

Thinking blocks render collapsed with an expand control.

**v1 bar is legible, not TUI-identical.** Do not spend time matching the terminal's exact rendering.

- [ ] **Step 1: Write the failing tests** — a diff shows added lines in green and removed in red with the file path as a header; long lines scroll inside their own container and never widen the page; a todo list renders one row per item with its status.
- [ ] **Step 2: Run them and watch them fail.** Run: `npx vitest run components/chat-session/__tests__/DiffView.test.tsx` → FAIL.
- [ ] **Step 3: Implement `DiffView` and `TodoList`.**
- [ ] **Step 4: Dispatch on tool name inside `ToolUseCard`.**
- [ ] **Step 5: Run tests, then the full suite** → PASS.
- [ ] **Step 6: Commit**

```bash
git add components/chat-session components/chat/ToolUseCard.tsx
git commit -m "feat(chat): diff, todo, and thinking rendering"
```

---

### Task 11: Surface swap and terminal escape hatch

**Files:**
- Modify: the agents-section pane switch, `chat-daemon/server.ts`, `term-daemon/server.ts`
- Create: `app/api/chat-session/sessions/route.ts`
- Test: `chat-daemon/__tests__/handoff.test.ts`

**Interfaces:**
- Consumes: `Surface` (Task 1), `LiveChatSession.close` (Task 4).
- Produces: `POST /api/chat-session/sessions/:id/handoff` with body `{ to: Surface }`.

**The one-attachment rule is the whole point of this task.** A session may be live in the chat daemon *or* `term-daemon`, never both.

Handoff order:
1. Chat daemon closes its `Query` (`query.close()`) and awaits confirmation.
2. Row's `surface` flips to `terminal`.
3. `term-daemon` spawns `claude --resume <id>` with the row's `cwd`, `permission_mode`, and `backend`.
4. UI swaps to the existing `TerminalPane`.

Reverse for the return trip. Attempting to attach while the other holds the session returns a 409 with a clear message — **never silently double-attach.**

- [ ] **Step 1: Write the failing tests** — a handoff to `terminal` closes the chat session before flipping `surface`; attaching to a session whose `surface` is `terminal` returns 409; a full round trip leaves exactly one holder at every step.
- [ ] **Step 2: Run them and watch them fail.** Run: `npx vitest run chat-daemon/__tests__/handoff.test.ts` → FAIL.
- [ ] **Step 3: Implement the handoff endpoint and the 409 guards in both daemons.**
- [ ] **Step 4: Swap the agents-section pane** to render `ChatPane` by default, with a "drop to terminal" control that calls the handoff endpoint and swaps in `TerminalPane`. Preserve the whole create flow (agent, cwd, worktree, permission mode, backend picker) unchanged — decision D5.
- [ ] **Step 5: Run tests** → PASS.
- [ ] **Step 6: Live-verify** — start a task in chat, drop to terminal mid-task, confirm the same conversation continues, come back to chat.
- [ ] **Step 7: Verify an old session opens** — pick a `terminal_sessions` row created before this build and confirm chat resumes its conversation (acceptance criterion 10).
- [ ] **Step 8: Commit**

```bash
git add chat-daemon term-daemon app/api/chat-session
git commit -m "feat(chat): make chat the default surface with terminal escape hatch"
```

---

### Task 12: ntfy notifications

**Files:**
- Create: `chat-daemon/notify.ts`
- Modify: `chat-daemon/session.ts`
- Test: `chat-daemon/__tests__/notify.test.ts`

**Interfaces:**
- Produces: `notifySession(event: "idle" | "awaiting_approval", session: { id: string; title: string })`.

Fire only when the session is not focused by a connected client — the daemon knows this from its WebSocket attachment state.

- [ ] **Step 1: Write the failing tests** — an idle transition with no attached client posts to ntfy; with an attached focused client it does not; an approval request always notifies when unfocused.
- [ ] **Step 2: Run them and watch them fail.** Run: `npx vitest run chat-daemon/__tests__/notify.test.ts` → FAIL.
- [ ] **Step 3: Implement**, reusing whatever ntfy helper already exists in the repo (grep for `ntfy` before writing a new one — the repo convention is to promote shared scripts rather than duplicate them).
- [ ] **Step 4: Run tests** → PASS.
- [ ] **Step 5: Commit**

```bash
git add chat-daemon/notify.ts chat-daemon/session.ts chat-daemon/__tests__/notify.test.ts
git commit -m "feat(chat): ntfy push on idle and awaiting approval"
```

---

### Task 13: Mobile pass, brand audit, systemd, and PR

**Files:**
- Modify: `components/chat-session/*` (responsive), `bin/start-cc.js`, systemd unit for `chat-daemon`

- [ ] **Step 1: Install the systemd unit** for `chat-daemon`, modeled on the `story-worker` and `term-daemon` units. Confirm `systemctl is-active`.
- [ ] **Step 2: Mobile pass at 390px width** — single column, composer pinned bottom with safe-area inset, sidebar collapses to a drawer, no horizontal page scroll, code blocks and diffs scroll inside their own containers. Verify in a real browser at 390px, not by inspection.
- [ ] **Step 3: Brand audit** — walk every new component against the Global Constraints brand list. Zero border-radius, `#E04500` accents, `#C97A1A` links, no emojis, all four interactive states on every control.
- [ ] **Step 4: Run the full suite.** Run: `npm run test:unit` → PASS.
- [ ] **Step 5: Verify unpushed work on a spare port**

```bash
npm run build && npx next start -p 4123
```
Walk all 17 acceptance criteria from spec §9. **Never restart the live service to test this.**

- [ ] **Step 6: Rebase and push**

```bash
git fetch origin && git rebase origin/main
git push origin ade/chat-surface-v1
```

- [ ] **Step 7: Open the PR** with a body listing each of the 17 acceptance criteria and its status, plus the Task 9 Step 8 findings on which built-in slash commands work headless.

---

## Self-Review

**Spec coverage.** D1 → Task 11. D2 → Tasks 7 (images), 8 (palette), 9 (permission/plan), 10 (rich rendering). D3 → Task 4 (resume) and Task 11 Step 7 (verified on a real old row). D4 → v1 bar stated in Task 10; design pass deferred. D5 → Task 11 Step 4. D6 → `useSpeech` reused via `MessageBubble` in Task 6. D7 → Task 12. D8 → Task 13 Step 2. D9 → this document.

Spec §7.3 gotchas: settingSources → Task 2 Step 4 and Task 4 Step 1; no API-key leak → Task 4 Step 1; mode names from the CLI → Task 1 Step 1; SDK shapes pinned to a fixture → Task 2; one-attachment rule → Task 11; detached process group → preserved via `lib/claude/spawn.ts` patterns in Task 4; no broad pkill → Global Constraints and Task 3 Step 6.

Acceptance criteria 1–17 all map to a task step; 13 (settingSources proof) is enforced twice, as a hard stop in Task 2 Step 4 and a unit test in Task 4.

**Type consistency.** `PermissionMode` and `Surface` are defined once in Task 1 and imported everywhere. `ChatServerEvent` / `ChatClientCommand` / `PendingPermission` / `SessionInventory` are defined once in Task 2 Step 5. `LiveChatSession`'s method names (`start`, `send`, `interrupt`, `setMode`, `close`) are used consistently in Tasks 5, 9, and 11. `buildQueryOptions` is the same name in Tasks 4 and 9.

**Known softness, stated honestly:** Tasks 6–10 give interfaces, test intent, and exact file paths but not full component markup, because the reusable components (`Markdown`, `MessageBubble`, `ToolUseCard`) already exist and their current code is the better reference than anything transcribed here. A builder should read those four files before starting Task 6.
