# Local Foundation Runbook (Plan 0)

> Bootstrap of n8n, ntfy push, and the Obsidian vault on Simon's main Windows PC.
> Linux server migration is deferred. Everything runs locally for now.

> **Convention:** every service is identified by `localhost:<port>` in this runbook. Tailnet URLs change with rename and aren't authoritative; they're just one of several front doors.

---

## Status as of 2026-04-26

| Item | Status | Notes |
|---|---|---|
| Obsidian vault directory | ✅ Created | `C:\Users\diamond\Obsidian\MetaArchitect\` with all Plan 6 subfolders |
| Obsidian desktop app | ✅ Installed + opened on vault | `C:\Program Files\Obsidian\Obsidian.exe` |
| ntfy topic | ✅ Generated + tested | See "ntfy" section below; curl test returned HTTP 200 |
| Docker Desktop | ⚠️ Installed but abandoned | Stale Windows logon-session credential blob blocks `docker pull` (see "Decisions") |
| n8n | ✅ Running on `localhost:5678` via npm | n8n 2.8.4, SQLite at `C:\Users\diamond\.n8n\` |
| n8n auto-start | ✅ Registered as Task Scheduler entry | Triggers at user logon, hidden window |
| n8n secure cookie | ✅ Enabled (default) | `N8N_PROXY_HOPS=1` user env var makes n8n trust the proxy's `X-Forwarded-Proto` header |
| n8n bind address | ✅ `127.0.0.1` only | `N8N_LISTEN_ADDRESS=127.0.0.1` — direct port access via tailscale IP is refused; only localhost + Tailscale Serve reach n8n |
| Tailscale Serve | ✅ Active | Tailscale fronts `localhost:5678` with HTTPS over the tailnet (URL is whatever your `<machine>.<tailnet>.ts.net` resolves to) |
| n8n credentials | ⏸️ User to wire in UI (Supabase + Perplexity) | Steps below |

---

## ntfy push notifications

**Topic name (hard-to-guess):** `meta-architect-7993b31b4cb5079b`

This is on the public ntfy.sh service. Self-host later when migrating to Linux box.

### How to send a push (any time)

```bash
# Via Node (works around the local curl hook):
node -e "const https=require('https');const d='Hello from CLI';const r=https.request({hostname:'ntfy.sh',path:'/meta-architect-7993b31b4cb5079b',method:'POST'},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>console.log(res.statusCode,b))});r.write(d);r.end()"
```

Or from any other machine with curl:

```bash
curl -d "Hello from CLI" https://ntfy.sh/meta-architect-7993b31b4cb5079b
```

### USER ACTIONS — to receive pushes

1. **Phone**: install ntfy app (iOS App Store / Play Store → "ntfy"). In the app, tap **+** → "Subscribe to topic" → enter `meta-architect-7993b31b4cb5079b`. Server stays default (`ntfy.sh`).
2. **Desktop**: open `https://ntfy.sh/meta-architect-7993b31b4cb5079b` in browser, allow notifications when prompted. Or install the desktop app.
3. **Confirm receipt**: a test push was already fired during setup (`Plan 0 setup test from Claude`). Once you subscribe, fresh pushes come through; the test message is also retained for ~12 hours so it should appear retroactively.

---

## Obsidian vault

**Path**: `C:\Users\diamond\Obsidian\MetaArchitect\` — already opened in Obsidian as the active vault.

Folder structure (created per Plan 6 spec — populates `/brain` commands later):

```
MetaArchitect/
  Inbox/           ← always lands here first if AI is unsure
  Content Ideas/   ← can flow into Content Engine (cron sync)
  Research/        ← reference material with citations
  Health/          ← personal routines
  Projects/        ← per-project scratch
  Frameworks/      ← reusable mental models
  Fleeting/        ← low-signal quick capture
```

---

## n8n (npm install — Docker abandoned)

**Canonical address**: `http://localhost:5678` — this is the service. All scripts, configs, and other tools should reference it this way.

**Version**: 2.8.4
**Binary**: `C:\Users\diamond\AppData\Roaming\npm\n8n.cmd`
**Data dir**: `C:\Users\diamond\.n8n\` (SQLite database, encryption key, settings)

### Required user env

| Var | Value | Purpose |
|---|---|---|
| `N8N_LISTEN_ADDRESS` | `127.0.0.1` | Bind n8n to localhost only. Without this, n8n listens on `0.0.0.0` and is reachable directly via the tailscale IP on plain HTTP, which bypasses Tailscale Serve and degrades the cookie-security path. |
| `N8N_PROXY_HOPS` | `1` | Trust `X-Forwarded-Proto` from one upstream proxy hop (Tailscale Serve). Without this, n8n thinks Tailscale-fronted requests are plain HTTP and warns about the secure cookie. |

Set persistently via:

```powershell
[Environment]::SetEnvironmentVariable('N8N_LISTEN_ADDRESS', '127.0.0.1', 'User')
[Environment]::SetEnvironmentVariable('N8N_PROXY_HOPS', '1', 'User')
```

(`setx` works too but truncates at 1024 chars; `[Environment]::SetEnvironmentVariable` is cleaner.)

These persist in the user registry and are inherited by the Scheduled Task on next logon.

### Remote access

Use whatever HTTPS endpoint your tailnet exposes for this machine. We chose Tailscale Serve fronting `localhost:5678` because:

- Auto-issued Let's Encrypt cert, valid TLS, no manual cert management
- Tailnet-only — never on the public internet
- n8n receives requests as `127.0.0.1` so the secure cookie path stays clean

To inspect or change the proxy:

```bash
tailscale serve status                # show all current routes
tailscale serve --bg 5678             # bind tailnet HTTPS at this machine to localhost:5678 (idempotent)
tailscale serve reset                 # remove ALL routes
tailscale serve --https=443 off       # remove just this route
```

The serve config is persisted by tailscaled and survives reboot. No additional auto-start needed for the proxy.

> The tailnet hostname is intentionally not pinned in this runbook because it's subject to rename. Find it via `tailscale status --json` (`Self.DNSName`) when you need it.

### Auto-start

Registered as a Windows Scheduled Task named `n8n`. Triggers `At log on of diamond`, runs hidden via PowerShell. To inspect or modify:

```powershell
Get-ScheduledTask -TaskName n8n
# Disable:    Disable-ScheduledTask -TaskName n8n
# Remove:     Unregister-ScheduledTask -TaskName n8n -Confirm:$false
# Run now:    Start-ScheduledTask  -TaskName n8n
```

### Manual start (for debugging)

```bash
n8n start
```

It binds to `127.0.0.1:5678` (because of the user env var). Ctrl+C stops it.

### Verifying the bind

Three-way smoke test:

```powershell
# Should refuse — direct tailscale IP is no longer reachable
Invoke-WebRequest -Uri "http://100.x.x.x:5678/healthz" -TimeoutSec 5

# Should return 200
Invoke-WebRequest -Uri "http://localhost:5678/healthz" -UseBasicParsing -TimeoutSec 5

# Should return 200 (HTTPS via Tailscale Serve)
Invoke-WebRequest -Uri "https://<your-tailnet-host>/healthz" -UseBasicParsing -TimeoutSec 30
```

### USER ACTIONS — first-run setup + credentials

1. Open **http://localhost:5678** on this PC (or your tailnet HTTPS endpoint from elsewhere).
2. Complete the owner setup form (email + name + password — pick anything, stays local). On success you land in the workflow editor.
3. Wire the two credentials we need:

   | Credential name (in n8n) | Type | Field values |
   |---|---|---|
   | `Supabase` | Supabase API | Host: `ashwrqkoijzvakdmfskj.supabase.co` · Service Role Secret: copy `SUPABASE_SERVICE_ROLE_KEY` from `C:\repos\MetaArchitect\.env` |
   | `Perplexity` | HTTP Header Auth | Header Name: `Authorization` · Header Value: `Bearer ` + `PERPLEXITY_API_KEY` from `.env` |

   Both keys are already present in `.env` — copy/paste from there. Anthropic credential is **not** wired (Plan 3 uses CC CLI headless, not the SDK).

---

## Adding more services later

When you have additional local services (more n8n workers, Supabase Studio, Grafana, etc.) you have two reasonable patterns. **Pick by port, not by path.**

### Pattern A — Different HTTPS ports, same machine (recommended)

```bash
# n8n stays on the default :443 (mapped to localhost:5678 via the existing rule)
tailscale serve --bg --https=8443 3000   # service B at https://<machine>.<tailnet>.ts.net:8443/
tailscale serve --bg --https=9443 9000   # service C at https://<machine>.<tailnet>.ts.net:9443/
```

Each service is reachable as `localhost:<port>` internally and `https://<machine>.<tailnet>.ts.net:<https-port>/` from elsewhere on the tailnet. Most apps work cleanly under this pattern.

### Pattern B — Different paths under one HTTPS host (avoid for n8n)

```bash
tailscale serve --bg --set-path /grafana http://localhost:3000
```

Works if the app supports being mounted at a subpath. n8n historically does not handle subpath mounting cleanly, so don't put n8n behind one.

### Don't use multiple tailnets

A tailnet is a private network. You typically have one per Tailscale account. "Multiple tailnets" is the wrong knob for "multiple services on one machine" — same tailnet, different ports is the right shape.

---

## Smoke tests

Run after credentials are wired.

### 1. n8n is reachable
```bash
curl -sf http://localhost:5678/healthz && echo OK
```
Expected: `{"status":"ok"}OK`

### 2. n8n can reach Supabase
In n8n UI: create a throwaway workflow → add a "Supabase" node → "Get Many" from `pipeline.ideas` (or any pipeline table that exists post-migration) → Execute. Should return rows.

### 3. n8n can reach Perplexity
In n8n UI: HTTP Request node → POST `https://api.perplexity.ai/chat/completions` → Auth = Perplexity credential → body `{"model":"sonar-small-online","messages":[{"role":"user","content":"ping"}]}` → Execute. Should return a chat completion.

### 4. ntfy push from n8n
HTTP Request node → POST `https://ntfy.sh/meta-architect-7993b31b4cb5079b` → body `n8n test push` → Execute. Phone should buzz.

When all four pass, Plan 0 is done.

---

## Decisions captured (locked)

- **Public ntfy.sh, not self-hosted** — until Linux box migration.
- **No Tailscale Funnel** — public-internet exposure isn't needed; tailnet-only via Tailscale Serve.
- **No Syncthing** — vault lives only on this PC for now.
- **Anthropic key NOT wired into n8n** — Plan 3 uses CC CLI headless (Max subscription), not the Anthropic SDK.
- **n8n via npm, not Docker** — Docker Desktop was installed but every CLI command (`docker pull`, `docker run`, `docker info`) returned `error getting credentials - err: exit status 1, out: 'A specified logon session does not exist. It may already have been terminated.'` Stale Windows credential blob; restart, removing `credsStore`, isolated `--config` dirs, and `docker logout` all failed to clear it. The "Reset to factory defaults" GUI option was not visible in this Docker Desktop build, so the workaround would be a full uninstall/reinstall. Docker is incidental to Plan 0's deliverable, so we pivoted to `npm install -g n8n` (identical functional outcome).
- **Tailscale Serve over HTTPS, not `N8N_SECURE_COOKIE=false`** — initial pivot disabled n8n's secure cookie because Tailscale traffic is plain HTTP at 100.x.x.x:5678. That works but degrades cookie security on the same machine. Better: Tailscale Serve fronts `localhost:5678` with a real Let's Encrypt cert. Combined with `N8N_PROXY_HOPS=1`, n8n trusts the upstream `X-Forwarded-Proto: https` header so the secure cookie path is unbroken. Lesson logged in `docs/lessons.md`.
- **No hardcoded tailnet URLs in this runbook** — tailnet name is subject to rename. Service identity is `localhost:<port>`; tailnet URL is one of several front doors.

---

## Files touched in Plan 0

- `C:\Users\diamond\Obsidian\MetaArchitect\` (created with 7 subdirectories)
- `infra/local-bootstrap.md` (this file)
- `C:\Users\diamond\.n8n\` (created by n8n on first run — SQLite + encryption key)
- Windows Scheduled Task `n8n` (registered)
- User env vars: `N8N_PROXY_HOPS=1`
- Tailscale Serve config (managed by tailscaled, persists across reboot)

No `.env` changes. No `package.json` changes. No code changes.
