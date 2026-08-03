# Runbook — Connect Instagram to Postiz (goal `51373480`)

> Simon's part: ~60–75 min across two sittings, all dashboard clicking. Agent part: one
> story-sized code/env change, queued after sitting 1. Research + evidence:
> `docs/research/operator-channel-research-2026-08-03.md` §3 (workflow wf_356ea0b0-121).
> No Meta app review is required: the app stays in Development mode and posts only to your
> own account (added as app Tester).

## Why two blockers, not one

1. No Meta developer app exists yet (Postiz has only LinkedIn connected — verified live).
2. **The sneaky one**: Instagram publishing is fetch-by-URL — Meta's servers download each
   image from a public HTTPS URL. Our Postiz stores media locally behind the tailnet
   (`sterling.tailad7ebc.ts.net`), which Meta cannot reach. Without fixing storage, every IG
   post fails with "Media fetch failed". Fix: Cloudflare R2 (Postiz supports it natively).

## Sitting 1 — Meta side (~40–50 min)

1. Instagram app → Settings → switch the account to **Professional (Business)**. Free, instant.
2. Create (or reuse) a bare **Facebook Page** and link the IG account to it (Business route
   needs the Page; it's the reliable path — the Page can stay empty).
3. https://developers.facebook.com → create app, type **Business**.
4. Add the **Instagram** product to the app. Note the App ID + App Secret.
5. App settings → add OAuth redirect URI:
   `https://sterling.tailad7ebc.ts.net/integrations/social/instagram`
6. Request these permissions on the app (Development mode, no review):
   `instagram_basic`, `pages_show_list`, `pages_read_engagement`, `business_management`,
   `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_insights`.
7. App roles → add your own IG account as **Instagram Tester**, then accept the invite in
   Instagram → Settings → Apps and Websites.
8. Write the App ID + App Secret to a file on sterling and tell the agent the path
   (never paste in chat).

## Sitting 2 — Cloudflare R2 (~10–15 min)

1. Cloudflare dashboard → R2 → create bucket (e.g. `postiz-media`), enable public access
   (r2.dev URL or custom domain — public URL is the point).
2. Create an R2 API token (Object Read & Write, scoped to the bucket). Note Account ID,
   Access Key ID, Secret Access Key, bucket public URL.
3. Write those to a file on sterling, tell the agent the path.

## Agent part (queued once sitting 1 done)

- Add to `~/projects/postiz` compose env: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`,
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY`, `CLOUDFLARE_SECRET_ACCESS_KEY`,
  `CLOUDFLARE_BUCKETNAME`, `CLOUDFLARE_BUCKET_URL`, `CLOUDFLARE_REGION`,
  `STORAGE_PROVIDER=cloudflare`; `docker compose up -d`.
- **After container recreate: re-run `./patch-linkedin-scopes.sh`** (SETUP.md rule — the
  LinkedIn Add-Channel flow breaks otherwise).
- `postiz.mjs` changes: add an `instagram` branch to `integrationFor()` (line ~90; currently
  everything non-x defaults to LinkedIn) + `POSTIZ_INSTAGRAM_INTEGRATION_ID` env; fix
  `upload()` (line ~228) hardcoded `image/png` → mime by extension. IG slides must be JPEG.

## Final step — OAuth (~5 min, Simon)

Postiz UI → Add Channel → Instagram → log in with the Facebook account → pick the Page/IG
account. Then agent runs `node tools/postiz.mjs channels` to capture the integration id.

## Ongoing

Meta long-lived tokens expire ~60 days → Postiz flags the channel; reconnect via the same
OAuth flow (identical pattern to the existing LinkedIn 60-day reconnect in SETUP.md).
