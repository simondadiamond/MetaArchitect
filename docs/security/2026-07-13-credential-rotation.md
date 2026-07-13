# Credential rotation runbook — 2026-07-13

> From the post-Fable gate sweep (goal `3df3143e`). Transcript mining found credentials
> in plaintext session transcripts. All occurrences have been **scrubbed** from
> `~/.claude/projects/` (305 replacements, verified zero remaining) — but scrubbing
> is not rotation. Every key below was exposed and should be treated as compromised.
> No secret values appear in this file.

## Status at scrub time

| credential | exposure | verified state | rotation needed |
|---|---|---|---|
| Supabase personal access token (`sbp_…`) | pasted in chat 2026-07-02, flagged for rotation same day | **still live** — management API returned 200 on 2026-07-13 | YES — the 07-02 rotation never happened |
| Supabase service-role JWT (command-center project) | pasted in chat 2026-06-30 | **still live** — identical to the current key in `.env` | YES |
| Supabase anon JWT | pasted alongside | public-by-design (ships to browsers) but rotates together with the service key | with the JWT secret |
| SSH password `diamond@192.168.69.40` | pasted in chat 2026-07-08 | cannot verify remotely | YES — manual change on that box |
| Postiz API key | in transcripts (8 occurrences) | live; tailnet-only service | recommended, low urgency |
| Apify token | in transcripts (18 occurrences) | live; external SaaS | YES — external exposure |
| term-daemon token | in transcripts (181 occurrences) | live; tailnet-only local daemon | recommended, low urgency |

## Rotation steps (Simon — most need dashboard logins)

1. **Supabase PAT**: supabase.com dashboard → Account → Access Tokens → revoke the token created before 2026-07-02, issue a new one. Update `~/.supabase/access-token` on sterling. Verify: the old token gets 401 on `GET https://api.supabase.com/v1/projects`.
2. **Supabase JWT secret** (rotates anon + service-role together): dashboard → command-center project → Settings → API → "JWT secret" → rotate (or migrate to the new publishable/secret key pair if offered). **Downtime warning**: every consumer needs the new keys immediately after —
   - `~/projects/MetaArchitect/projects/command-center/.env` (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) then `systemctl --user restart command-center story-worker`
   - simonparis-website env on Vercel if it reads this project (check — it may only use MailerLite)
   - any brain/reconciler scripts using the service key
   Verify: old key gets 401 on a REST call; `/roadmap` and the pipeline board still load.
3. **SSH password on 192.168.69.40**: `passwd` on that box; prefer key-only (`PasswordAuthentication no`) since agents SSH around the LAN.
4. **Apify**: console.apify.com → Settings → API tokens → rotate; update `APIFY_TOKEN` in command-center `.env`; restart the service (engage-queue sweeps use it).
5. **Postiz**: regenerate the API key in Postiz settings; update `POSTIZ_API_KEY` in command-center `.env` AND `~/projects/MetaArchitect/projects/Content-Engine/.env` if present; restart command-center.
6. **term-daemon**: generate a new random token, update `TERM_DAEMON_TOKEN` in `.env` and wherever the daemon reads it; restart both.

## Prevention now in place

- `secrets-guard` UserPromptSubmit hook (global): detects pasted credentials, injects never-echo/rotate/file-drop instructions into context. Red-green tested in `scripts/hooks/test-hooks.sh`.
- CLAUDE.md secrets rule: credentials go into files Simon names, never chat.
- Residual risk: transcripts still capture tool OUTPUT — commands that print env values would re-expose. The bash history and `.env` files themselves were not part of this exposure.
