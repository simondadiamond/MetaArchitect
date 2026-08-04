# Email Infrastructure — MailerLite → Resend

**Date:** 2026-08-04
**Status:** Draft for Simon's review
**Goals touched:** `1ad689ac` (Operator growth machine), `4a02d3ce` (Operator newsletter), `7bcf50d5` (Decide leads source), `f176b2be` (/score follow-up email), `af0cc0d6` (Verify Email 1 points to /score)

## Outcome sentence

Every email that goes to Simon's list — welcome sequences, the newsletter, follow-ups — can be written, edited, scheduled, and sent by asking, without him opening anyone's dashboard.

---

## 1. Why (verified, not assumed)

Two roadmap goals are blocked on the same wall. `af0cc0d6` logs: *"Connect API cannot edit automation email content — blocked on a MailerLite dashboard edit."* `f176b2be` repeats it. The `/score` welcome sequence has been sending legacy "DOWNLOAD THE CHECKLIST" PDF framing with no `/score` link, in both locale branches, since at least 2026-07-06. Neither Simon nor an agent can fix it without clicking through MailerLite's builder.

Secondary evidence of the same friction: the account contains four automations named `Quiz sequence`, `Copy of Quiz sequence`, `Copy of Copy of Quiz sequence`, and `Copy of Copy of Copy of Quiz sequence`.

**There is nothing to migrate.** Verified against the MailerLite API on 2026-08-04:

| | |
|---|---|
| Subscribers | 43 — **all** Simon's own addresses or test fixtures |
| ├─ `story-verify+…@example.com` / `setup-verify+…@example.com` | 35 (pipeline verify-stage fixtures, 2026-07-17/18) |
| └─ Simon's own | 8 (`me@`, `hello@`, `info@simonparis.ca`, `simondadiamond@`, `sparistech@`, `sparis@autoroot.io`, 2 test aliases) |
| Real subscribers | **0** |
| Campaigns ever sent | **0** |
| Enabled automations | 1 (`Quiz sequence`, 3 steps) |

No export, no consent records to preserve, no sending reputation to protect, no cutover risk, no fallback period. This is greenfield, and it is the cheapest this will ever be.

---

## 2. The finding that shaped the architecture

Resend shipped **Automations** (drip sequences) in April 2026. The obvious move would be to use them.

**Do not use them.** Verified against `resend.com/docs/llms.txt` on 2026-08-04: Resend's API reference has full endpoint groups for Broadcasts, Contacts, Topics, and Suppressions — and **no API endpoints for Automations at all**. Automation sequences are creatable and editable *only* through the Resend dashboard.

That is the identical trap MailerLite set. Adopting Resend Automations would rebuild the exact problem this project exists to solve.

**So the split is:**

| Concern | Owner | Why |
|---|---|---|
| Contact identity, opt-out state, suppression | **Resend** (API-writable) | Compliance machinery we should not hand-roll |
| Newsletter / broadcasts | **Resend Broadcasts API** | Full create/update/send/schedule via API |
| Deliverability, bounce & complaint processing | **Resend** | Their job, and they do it better |
| **Sequence logic and timing** | **Us** (Supabase + cron) | Resend has no API for this |
| **All email content** | **Us** (React Email templates in-repo) | The entire point — agent-editable, version-controlled, PR-reviewable |

The key enabler: Resend's transactional send endpoint accepts a **`topic_id`** parameter, which *"determines whether the recipient receives the email based on their opt-in/opt-out status for that topic."* That means our own sequence engine sends through Resend's compliance layer for free — unsubscribes are enforced by Resend at send time even if our own check were to fail.

This is strictly better than either dashboard: content in git, compliance in Resend.

---

## 3. Current state of the website (full inventory)

Every email touchpoint in `projects/simonparis-website`, verified 2026-08-04.

### 3.1 API routes

| Route | Called by | Writes to | Notes |
|---|---|---|---|
| `app/api/subscribe/route.ts` | **nobody** | MailerLite `checklist` group | **Dead code.** No callers anywhere. Delete. |
| `app/api/blog-subscribe/route.ts` | `BlogSubscribeForm.tsx`, `SetupSignupForm.tsx` | MailerLite `BLOG` group + `public.leads` + ntfy | Dual-purpose: blog CTA *and* `/setup`, discriminated by `consentVersion` prefix |
| `app/api/score-subscribe/route.ts` | `ScoreClient.tsx` | MailerLite `CHECKLIST` group | Sends pillar scores as ML custom fields |
| `app/api/readiness-diagnostic-subscribe/route.ts` | `ReadinessDiagnosticClient.tsx` | MailerLite `DIAGNOSTIC` group + ntfy | Client writes `state_readiness_diagnostic` first, passes `supabase_row_id` |

All four hand-roll the same `fetch` to `connect.mailerlite.com`, the same `EMAIL_REGEX`, and the same 422-means-already-subscribed branch. Four copies of one function.

### 3.2 Client components

| Component | Endpoint | Payload |
|---|---|---|
| `components/blog/BlogSubscribeForm.tsx` | `/api/blog-subscribe` | `consentVersion: "blog-cta-v1"` |
| `components/SetupSignupForm.tsx` | `/api/blog-subscribe` | `consentVersion: "setup-v2"` |
| `components/ScoreClient.tsx` | `/api/score-subscribe` | email, name, totalScore, per-pillar scores, locale |
| `components/ReadinessDiagnosticClient.tsx` | `/api/readiness-diagnostic-subscribe` | email, role, system_name, industry, company_size, supabase_row_id, locale |
| `components/blog/PostCTA.tsx` | — | Comment references the MailerLite group; copy only |

`ReadinessDiagnosticClient` has a `SubmitState` of `"error_mailerlite"` surfaced in the UI — a provider name leaking into user-visible state.

### 3.3 Supabase (project `ashwrqkoijzvakdmfskj` — the only ACTIVE project; website and Command Center share it)

| Table | Rows | RLS | Relevance |
|---|---|---|---|
| `public.leads` | 2 | **off** | **Has no `email` column.** `blog-subscribe` writes `name: email.split("@")[0]` — the domain is discarded. A `/setup` lead lands with a mangled name and no way to email them back. |
| `public.quiz_results` | **0** | on | `ScoreClient` inserts here, but the table is empty — worth confirming whether inserts are silently failing |
| `public.state_readiness_diagnostic` | 1 | on | Working; client-side insert |

### 3.4 Environment variables

Local `.env` contains **only** `MAILERLITE_API_KEY`; everything else lives in Vercel. `.env.local.example` documents `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID_{BLOG,CHECKLIST,DIAGNOSTIC}`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NTFY_URL`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_CALENDLY_URL`. `blog-subscribe` additionally reads `CC_SUPABASE_URL`, `CC_SUPABASE_SERVICE_KEY`, `CC_OWNER_ID` — undocumented in the example file.

### 3.5 Other surfaces

- `app/[locale]/privacy/page.tsx` names MailerLite as a subprocessor — **Law 25 / CASL requires this be accurate**, so it must change with the provider.
- `app/admin/(authed)/leads/page.tsx` queries a `leads` table on the *website's* Supabase client and renders an error. Its own comment says lead capture lives in MailerLite. The table does exist in the shared project — the page needs the right client and column list.

---

## 4. Target architecture

```
  /score  /setup  /blog  /readiness
        │      │      │       │
        └──────┴──────┴───────┘
                  │
        lib/email/subscribe.ts        ← one function, four thin routes
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
  Supabase                Resend
  email_subscribers       Contacts + Topics
  email_consent_log       (identity, opt-out, suppression)
  email_sequence_runs
  email_send_log
        │
        │  pg_cron (every 15 min) ──► pg_net ──► POST /api/email/tick
        ▼                                              │
  due sequence steps ──────────────────────────────────┘
        │
        ▼
  React Email template (in repo) ──► Resend send (topic_id) ──► inbox
                                            │
  Resend webhook (Svix-signed) ──► POST /api/email/webhook ──► suppression
                                            ▲
  pg_cron (hourly) ──► /api/email/reconcile ─┘  (backfill missed events)
```

### 4.1 Sending domain

Send from **`mail.simonparis.ca`**, not the root domain. Marketing volume can damage a domain's reputation; the root domain carries Simon's client and transactional mail and must not share that risk. This is effectively irreversible once sending starts, so it is decided now.

- `From: Simon Paris <simon@mail.simonparis.ca>`
- `Reply-To: simon@simonparis.ca` (replies land where he reads)
- DNS on `mail.simonparis.ca`: SPF, DKIM (Resend-provided), and DMARC — all three are required by Gmail and Yahoo for bulk senders since Feb 2024. **~15 min of Simon's time, one-time, in the domain registrar.**

### 4.2 Topics (Resend-managed opt-out granularity)

| Topic | Used by |
|---|---|
| `newsletter` | Weekly operator newsletter (broadcasts) |
| `onboarding` | Lead-magnet delivery + welcome sequences |

Every marketing send passes a `topic_id`. Recipients can leave one without leaving both, and Resend enforces opt-out at send time independently of our code.

### 4.3 Supabase schema (new, all with RLS enabled from creation)

**`public.email_subscribers`** — our mirror and the join key for everything else.
`id`, `email` (unique), `resend_contact_id`, `name`, `locale`, `source` (`score` | `setup` | `blog` | `readiness` | `import`), `status` (`active` | `unsubscribed` | `bounced` | `complained`), `created_at`, `updated_at`.

> **Case-insensitivity:** the `citext` extension is *available but not installed* on this project (verified 2026-08-04). Rather than enable an extension for one column, email is stored as `text` normalised to lowercase at write time in `lib/email/subscribe.ts`, with a `CHECK (email = lower(email))` constraint and a plain unique index. The constraint is what makes the normalisation enforceable rather than merely conventional.

**`public.email_consent_log`** — append-only, never updated or deleted. CASL wants provable consent.
`id`, `subscriber_id`, `email`, `event` (`granted` | `withdrawn`), `consent_version`, `source_page`, `ip`, `user_agent`, `occurred_at`.

**`public.email_sequences`** — sequence definitions (metadata only; content lives in the repo).
`id`, `key` (e.g. `score-welcome`), `topic` , `enabled`, `created_at`.

**`public.email_sequence_steps`** — timing and which template.
`id`, `sequence_id`, `step_index`, `delay_hours`, `template_key`, `enabled`.

**`public.email_sequence_runs`** — one row per subscriber per sequence.
`id`, `subscriber_id`, `sequence_id`, `current_step`, `next_run_at`, `status` (`active` | `completed` | `cancelled`), `context` (jsonb — quiz scores, locale, name), `enrolled_at`.

**`public.email_send_log`** — every send, per STATE framework.
`id`, `subscriber_id`, `sequence_run_id` (nullable), `template_key`, `resend_message_id`, `topic`, `status`, `error`, `sent_at`.

**`public.email_webhook_events`** — idempotency ledger.
`svix_id` (PK), `event_type`, `payload` (jsonb), `received_at`, `processed_at`.

**Existing-table fix:** add `email text` to `public.leads`. **No backfill is possible** — `blog-subscribe` writes only `name: email.split("@")[0]` and a `notes` string that does not contain the address, so the domain is already lost for existing rows. Both existing rows are Simon's, so nothing of value is lost; the fix is forward-only.

### 4.4 Email content — the part that makes this worth doing

All templates live at `emails/` in the website repo as **React Email** components, one file per email:

```
emails/
  _layout.tsx                    shared shell: header, footer, unsubscribe, address block
  score-welcome-1.en.tsx
  score-welcome-1.fr.tsx
  score-welcome-2.en.tsx
  score-welcome-2.fr.tsx
  setup-welcome.en.tsx  ...
  newsletter.tsx                 broadcast shell, body injected
```

Locale is a file suffix, not a runtime conditional — MailerLite's condition-step branching is what made the current sequence unreadable. Rendering uses React Email's `render()` to HTML + a plain-text alternative.

**This is the deliverable.** Editing an email becomes editing a `.tsx` file: an agent can do it, it diffs in a PR, it can be reviewed, and it can be reverted. Hand-written HTML email is a genuinely miserable format (Outlook, nested tables, inline CSS); React Email exists to solve exactly that and is the standard pairing with Resend.

### 4.5 The sequence engine

Deliberately small. A tick, a query, a send.

1. `pg_cron` fires every 15 minutes, `pg_net` POSTs `/api/email/tick` with a shared secret header.
2. The route selects `email_sequence_runs` where `status='active'` and `next_run_at <= now()`, limit 100, `FOR UPDATE SKIP LOCKED`.
3. For each: render the step's template with the run's `context`, send via Resend with the sequence's `topic_id`, write `email_send_log`, advance `current_step`, set `next_run_at = now() + next step's delay_hours`, or mark `completed`.
4. Failures log and retry on the next tick with backoff; three consecutive failures mark the run `cancelled` and fire ntfy.

**Why `pg_cron` and not the Command Center scheduler:** Sterling is a home machine with known memory pressure (Claude sessions, headless browsers, Next builds — `project_sterling_memory_headroom`). Email that silently stops because a home box OOM'd is a bad failure mode. `pg_cron` runs inside the database that already holds the state. `pg_net` is already installed (0.19.5); `pg_cron` 1.6.4 is available and needs enabling. Sterling stays out of the critical path entirely.

**Why not Vercel Cron:** Hobby-plan cron is limited to daily granularity, which cannot drive a sequence engine. If the site is on Pro this becomes a viable alternative, but `pg_cron` is correct either way.

### 4.6 Webhooks and reconciliation

`POST /api/email/webhook` on Vercel — beside the code that sends, same language, same env, locally testable. Not a Supabase Edge Function (a second Deno toolchain for no gain), and not Sterling (Tailscale-only, correctly).

1. **Verify the Svix signature.** Non-negotiable: a public webhook URL is world-postable, and without verification anyone could edit the suppression list.
2. Insert `svix_id` into `email_webhook_events`; on conflict, return 200 and stop. Resend guarantees *at-least-once* delivery, so duplicates are normal, not exceptional.
3. On `email.bounced` (hard) or `email.complained`: set `email_subscribers.status`, cancel active sequence runs, and add a Resend suppression.
4. Return 200 fast; do the work in the handler but keep it under the timeout.

Resend retries failures at 5s, 5min, 30min, 2h, 5h, 10h — so a Vercel blip loses nothing.

**Reconcile job** (`/api/email/reconcile`, hourly via `pg_cron`): pulls recent bounce and complaint events from the Resend API and backfills anything the webhook missed. This is the layer that does not depend on webhook delivery at all. Three independent defenses — webhook, reconcile, and Resend's own `topic_id` enforcement at send time — mean a missed event has to survive all three to reach a real inbox.

### 4.7 Unsubscribe

Two paths, one endpoint:

1. `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers (RFC 8058) on every marketing send. This renders Gmail's native unsubscribe control and is required of bulk senders.
2. A visible footer link carrying an HMAC-signed token — no login, no lookup.

Both hit `/api/email/unsubscribe`, which flips `email_subscribers.status`, appends a `withdrawn` row to `email_consent_log`, cancels active sequence runs, and calls Resend's suppression endpoint. A public `/[locale]/email-preferences` page lets someone drop one topic instead of all.

Suppression is **append-only** — a database restore must never resurrect someone who left.

---

## 5. Website changes (complete list)

**New**
- `lib/email/client.ts` — Resend client + typed send wrapper (enforces `topic_id`, `List-Unsubscribe`, send-log write)
- `lib/email/subscribe.ts` — the one subscribe function all routes call
- `lib/email/templates.ts` — `template_key` → React Email component registry
- `emails/**` — all templates (§4.4)
- `app/api/email/webhook/route.ts`
- `app/api/email/tick/route.ts`
- `app/api/email/reconcile/route.ts`
- `app/api/email/unsubscribe/route.ts`
- `app/[locale]/email-preferences/page.tsx` — EN + FR
- Supabase migration for §4.3

**Modified**
- `app/api/blog-subscribe/route.ts` → thin wrapper over `lib/email/subscribe.ts`; keeps the `/setup` lead + ntfy branch
- `app/api/score-subscribe/route.ts` → same; pillar scores go to `email_sequence_runs.context`, not provider custom fields
- `app/api/readiness-diagnostic-subscribe/route.ts` → same
- `components/ReadinessDiagnosticClient.tsx` → rename `error_mailerlite` state (provider name in user-visible state) + its i18n keys
- `components/blog/PostCTA.tsx` → comment references the MailerLite group
- `app/[locale]/privacy/page.tsx` → **MailerLite → Resend as named subprocessor**, both locales; Law 25 requires accuracy here
- `app/admin/(authed)/leads/page.tsx` → point at the shared Supabase project, add the new `email` column, drop the stale "MailerLite is source of truth" copy
- `messages/en.json`, `messages/fr.json` → preference-page copy, renamed error state
- `.env.local.example` → drop `MAILERLITE_*`; add `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_TOPIC_ID_NEWSLETTER`, `RESEND_TOPIC_ID_ONBOARDING`, `RESEND_WEBHOOK_SECRET`, `EMAIL_TICK_SECRET`, `EMAIL_UNSUBSCRIBE_SECRET`, and the three undocumented `CC_*` vars

**Deleted**
- `app/api/subscribe/route.ts` — dead, no callers
- All `MAILERLITE_*` vars in Vercel (after cutover)

**Migration for `public.leads`**
- Add `email citext`; fix `blog-subscribe` to stop mangling the address into `name`

---

## 6. Content to rewrite

The four `/score` sequence emails are stale — written for the retired PDF checklist lead magnet, with "DOWNLOAD THE CHECKLIST" / "TÉLÉCHARGER LA LISTE" as the primary action and no `/score` reference. **They are not migrated. They are rewritten**, EN and FR, against `brand/brand-summary.md`. This closes `af0cc0d6` and `f176b2be` by deletion rather than by fighting a dashboard.

Newsletter format is **out of scope here** — goal `4a02d3ce` says its first step is a format-scoping chat with Simon, and that decision is his. This spec builds the pipe; the newsletter's content design is a separate conversation.

---

## 7. Build sequence

Each stage is independently verifiable, and nothing customer-facing sends until stage 5.

| # | Stage | Simon-minutes |
|---|---|---|
| 1 | Resend account, `mail.simonparis.ca` DNS (SPF/DKIM/DMARC), API key → Vercel | **~20 min** |
| 2 | Supabase migration (§4.3), `pg_cron` enabled, RLS policies | 0 |
| 3 | `lib/email/*`, templates, subscribe routes rewritten, tests | 0 |
| 4 | Webhook + reconcile + unsubscribe + preferences page | 0 |
| 5 | `/score` sequence content rewritten EN/FR → **Simon reviews before enabling** | ~30 min review |
| 6 | End-to-end live test on his own addresses | ~10 min |
| 7 | Delete MailerLite account, **revoke the API key**, remove Vercel vars | ~5 min |

Total Simon-time ≈ **1 hour**, nearly all of it DNS and reading email copy. The rest is agent-hours.

---

## 8. Test plan

The failure mode that matters is not "unsubscribe link broken" — it is "she unsubscribed in March and the July send didn't filter." That gets a permanent test:

- **Suppression is enforced at send time.** An unsubscribed address is excluded from a broadcast and from a sequence tick. This is the test that must never be deleted.
- Consent log is append-only — an unsubscribe writes a row, never mutates one.
- Webhook rejects an unsigned or wrongly-signed payload.
- Webhook is idempotent — the same `svix_id` twice produces one state change.
- A `bounced` webhook cancels that subscriber's active sequence runs.
- Sequence tick is idempotent — two concurrent ticks send once (`SKIP LOCKED`).
- Locale routing — an `fr` subscriber gets the `.fr` template.
- Every subscribe route writes both a subscriber row and a consent row.
- Broadcast send requires an explicit confirm above a recipient threshold (see §9).

---

## 9. Risks and mitigations

**A script can email the entire list in one line.** MailerLite's UI made that hard; an API does not. Any broadcast send defaults to dry-run and requires an explicit flag plus a recipient-count confirmation above a threshold.

**Compliance liability moves to Simon.** CASL (Quebec) requires provable consent, sender identification, and prompt unsubscribe. Mitigated by the append-only consent log, a physical address in the footer template, and Resend's topic enforcement. Worth noting that the consent records MailerLite holds today are locked in their UI — owning them is an improvement, not just a transfer.

**Detection asymmetry on breach.** If MailerLite is breached they must notify Simon; if his Supabase leaks, only he can notice. This argues for RLS on the new tables from creation and for the send log doubling as an audit trail. It does not argue against the move.

**Deliverability is now his.** Mitigated by the subdomain (§4.1) and full SPF/DKIM/DMARC. At zero real subscribers there is no warmup concern.

**The engine is not why no newsletter has shipped.** Zero campaigns have ever been sent; better infrastructure does not create the writing habit. The acceptance test for this project is **a newsletter went out**, not *the system is built*.

---

## 10. Two findings outside this scope

**1 — The story pipeline's verify stage writes test subscribers into production.** 35 `story-verify+` / `setup-verify+` fixtures reached the live MailerLite account on 2026-07-17/18. This is the same class of failure as `lessons.md` 2026-07-16, where a verify stage clicked a real brain note. It needs an anti-recurrence entry and a fix in the verify-stage instructions **before** Resend goes live, or fake signups will pollute a list that actually matters. **Blocking for stage 5.**

**2 — RLS is disabled on 17 tables**, including `public.leads`, `public.clients`, `public.client_notes`, and `public.conversions` — all of which hold client PII, fully readable by anyone with the anon key. Supabase flags this at critical priority. Not caused by this project and not fixed by it, but it is the same table neighbourhood, and the new email tables ship with RLS on from creation. Recommend a separate goal; enabling RLS without policies will block all access, so it needs its own careful pass.

---

## 11. Open question for Simon

Only one, and it is genuinely his call: **does the `/score` welcome sequence keep its current two-email shape (delivery + follow-up, per locale), or is the rewrite the moment to reshape it?** The spec builds whatever shape is chosen; the engine does not care. Defaulting to the existing two-step shape unless told otherwise.
