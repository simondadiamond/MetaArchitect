# Email Infrastructure — MailerLite → Resend

**Date:** 2026-08-04 (rev. 2026-08-05 — architecture corrected, see §2)
**Status:** Draft for Simon's review
**Goals touched:** `1ad689ac` (Operator growth machine), `4a02d3ce` (Operator newsletter), `7bcf50d5` (Decide leads source), `f176b2be` (/score follow-up email), `af0cc0d6` (Verify Email 1 points to /score)

## Outcome sentence

Every email that goes to Simon's list — welcome sequences, the newsletter, follow-ups — can be written, edited, scheduled, and sent by asking, without him opening anyone's dashboard.

---

## 1. Why (verified, not assumed)

Two roadmap goals are blocked on the same wall. `af0cc0d6` logs: *"Connect API cannot edit automation email content — blocked on a MailerLite dashboard edit."* `f176b2be` repeats it. The `/score` welcome sequence has been sending legacy "DOWNLOAD THE CHECKLIST" PDF framing with no `/score` link, in both locale branches, since at least 2026-07-06.

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

## 2. What Resend actually provides

> **Correction.** The first revision of this spec claimed Resend's Automations were dashboard-only with no API, and designed a custom sequence engine around that limitation. **That was wrong.** It came from a documentation-summarising tool that reported *"Automation sequences cannot be created or updated via API"* — a confident, incorrect answer that became load-bearing because it was not checked against the actual endpoints. Simon caught it. Verified by direct endpoint probe on 2026-08-05, every layer is API-writable. The lesson is logged in `docs/lessons.md`.

Verified `200` on 2026-08-05:

| Layer | Endpoints | Verdict |
|---|---|---|
| **Automations** | `create`, `update`, `get`, `list` | Full CRUD. `steps[]` + `connections[]` define the sequence graph: `trigger`, `send_email`, `delay`, `condition`, `wait_for_event`, `add_to_segment`, `contact_update`, `contact_delete` |
| **Templates** | `create`, `update`, `get`, `list`, `publish`, `duplicate`, `delete` | Full CRUD. Accepts `react` (Node SDK), `html`, `text`, `subject`, `from`, `reply_to`, `alias`, and up to 50 typed `variables`. Version history in the dashboard. |
| **Contacts** | `create`, `update`, `get`, `list`, `delete`, topics, segments | Full CRUD |
| **Topics** | `create`, `update`, `get`, `list`, `delete` | Full CRUD — per-topic opt-out |
| **Suppressions** | `add`, `remove` | Full CRUD |
| **Broadcasts** | `create`, `update`, `send`, `delete`, `get`, `list`, metrics, recipients | Full CRUD |
| **Webhooks** | Svix-signed, retried 5s → 10h, at-least-once | Bounce/complaint/delivery events |

Two details that shape the design:

- **`RESEND_UNSUBSCRIBE_URL` is a reserved template variable.** Unsubscribe is built in — no custom endpoint, no signed tokens, no hosted preference page to build.
- **Templates carry a stable `alias`.** Code can sync a template by alias instead of tracking UUIDs, which makes a repo→Resend sync script trivial and idempotent.
- There is also a **Resend CLI** covering templates, automations, and webhooks, and a documented **React Email → Resend upload path**.

**Conclusion: Resend does all of it.** No custom sequence engine, no cron tick, no self-hosted unsubscribe flow, no suppression logic of our own.

---

## 3. Division of responsibility

Everything email-mechanical lives in Resend. Two things stay in Supabase, for reasons that are not about email:

| Concern | Owner | Why |
|---|---|---|
| **Contact identity & attributes** (email, name, locale, source, topics) | **Supabase**, synced out to Resend | Local-first: enables joins against `quiz_results` / `clients` / `blog_posts` for segmentation Resend cannot do, and makes the list portable. See §5.6b. |
| **Opt-out state, suppression, bounces** | **Resend** — flows *inward* only | Resend hosts the unsubscribe page, so it sees opt-outs first. Pushing our copy outward could re-subscribe someone who left. |
| Sequences, delays, conditions, triggers | **Resend Automations** | API-writable |
| Broadcasts / newsletter | **Resend Broadcasts** | API-writable, schedulable |
| Deliverability, bounce & complaint processing, unsubscribe pages | **Resend** | Better than anything we'd build |
| **Email content (source of truth)** | **Git** (React Email in-repo) → synced to Resend Templates | Diffable, revertable, PR-reviewable. A dashboard edit can persist silently; a file edit cannot. |
| **Provable consent records** | **Supabase** | CASL artifact. The consent proof currently stuck in MailerLite's UI is exactly the thing not to re-create in another vendor. |
| **Lead → CRM linkage** | **Supabase** (`leads`, `clients`) | A `/setup` signup must become a lead row, not just a contact. The funnel depends on it. |

**Source of truth is git; Resend is the runtime.** Templates and automation definitions live as files and are pushed by a sync script. That is strictly better than authoring in Resend directly — the same reason the current MailerLite emails are unfixable is that their content only ever existed in a dashboard.

---

## 4. Current state of the website (full inventory)

Every email touchpoint in `projects/simonparis-website`, verified 2026-08-04.

### 4.1 API routes

| Route | Called by | Writes to | Notes |
|---|---|---|---|
| `app/api/subscribe/route.ts` | **nobody** | MailerLite `checklist` group | **Dead code.** No callers anywhere. Delete. |
| `app/api/blog-subscribe/route.ts` | `BlogSubscribeForm.tsx`, `SetupSignupForm.tsx` | MailerLite `BLOG` group + `public.leads` + ntfy | Dual-purpose: blog CTA *and* `/setup`, discriminated by `consentVersion` prefix |
| `app/api/score-subscribe/route.ts` | `ScoreClient.tsx` | MailerLite `CHECKLIST` group | Sends pillar scores as ML custom fields |
| `app/api/readiness-diagnostic-subscribe/route.ts` | `ReadinessDiagnosticClient.tsx` | MailerLite `DIAGNOSTIC` group + ntfy | Client writes `state_readiness_diagnostic` first, passes `supabase_row_id` |

All four hand-roll the same `fetch` to `connect.mailerlite.com`, the same `EMAIL_REGEX`, and the same 422-means-already-subscribed branch. Four copies of one function.

### 4.2 Client components

| Component | Endpoint | Payload |
|---|---|---|
| `components/blog/BlogSubscribeForm.tsx` | `/api/blog-subscribe` | `consentVersion: "blog-cta-v1"` |
| `components/SetupSignupForm.tsx` | `/api/blog-subscribe` | `consentVersion: "setup-v2"` |
| `components/ScoreClient.tsx` | `/api/score-subscribe` | email, name, totalScore, per-pillar scores, locale |
| `components/ReadinessDiagnosticClient.tsx` | `/api/readiness-diagnostic-subscribe` | email, role, system_name, industry, company_size, supabase_row_id, locale |
| `components/blog/PostCTA.tsx` | — | Comment references the MailerLite group; copy only |

`ReadinessDiagnosticClient` has a `SubmitState` of `"error_mailerlite"` surfaced in the UI — a provider name leaking into user-visible state.

### 4.3 Supabase (project `ashwrqkoijzvakdmfskj` — the only ACTIVE project; website and Command Center share it)

| Table | Rows | RLS | Relevance |
|---|---|---|---|
| `public.leads` | 2 | **off** | **Has no `email` column.** `blog-subscribe` writes `name: email.split("@")[0]` — the domain is discarded. A `/setup` lead lands with a mangled name and no way to email them back. |
| `public.quiz_results` | **0** | on | `ScoreClient` inserts here, but the table is empty — confirm whether inserts are silently failing |
| `public.state_readiness_diagnostic` | 1 | on | Working; client-side insert |

### 4.4 Environment variables

Local `.env` contains **only** `MAILERLITE_API_KEY`; everything else lives in Vercel. `.env.local.example` documents `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID_{BLOG,CHECKLIST,DIAGNOSTIC}`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NTFY_URL`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_CALENDLY_URL`. `blog-subscribe` additionally reads `CC_SUPABASE_URL`, `CC_SUPABASE_SERVICE_KEY`, `CC_OWNER_ID` — undocumented in the example file.

### 4.5 Other surfaces

- `app/[locale]/privacy/page.tsx` names MailerLite as a subprocessor — **Law 25 / CASL requires this be accurate**, so it must change with the provider.
- `app/admin/(authed)/leads/page.tsx` queries a `leads` table on the *website's* Supabase client and renders an error. Its own comment says lead capture lives in MailerLite. The table does exist in the shared project — the page needs the right client and column list.

---

## 5. Target architecture

```
  /score  /setup  /blog  /readiness
        │      │      │       │
        └──────┴──────┴───────┘
                  │
        lib/email/subscribe.ts          ← one function, four thin routes
                  │
        ┌─────────┴───────────────┐
        ▼                         ▼
  Supabase                    Resend
  email_consent_log           Contact (+ topics)
  leads / clients                  │
                                   │  triggers automation via custom event
                                   ▼
                          Resend Automation
                          trigger → send_email → delay → condition → send_email
                                   │
                                   ▼
                          Resend Template (alias)
                                   ▲
                                   │  sync (idempotent, by alias)
                          emails/*.tsx in git  ← the editable surface
                                   
  Resend webhook (Svix) ──► /api/email/webhook ──► leads/CRM + consent log
```

### 5.1 Sending domain

Send from **`mail.simonparis.ca`**, not the root domain. Marketing volume can damage a domain's reputation; the root domain carries Simon's client and transactional mail and must not share that risk. Effectively irreversible once sending starts, so it is decided now.

- `From: Simon Paris <simon@mail.simonparis.ca>`
- `Reply-To: simon@simonparis.ca` (replies land where he reads)
- DNS on `mail.simonparis.ca`: SPF, DKIM (Resend-provided), DMARC — all three required by Gmail and Yahoo for bulk senders since Feb 2024. **~15 min of Simon's time, one-time.**

### 5.2 Topics

| Topic | Used by |
|---|---|
| `newsletter` | Weekly operator newsletter (broadcasts) |
| `onboarding` | Lead-magnet delivery + welcome sequences |

Recipients can leave one without leaving both. Resend enforces opt-out at send time.

### 5.3 Content — the editable surface

Templates are authored as React Email components in the website repo — **one component per email, not one per locale**:

```
emails/
  _layout.tsx              shared shell: header, footer, {{RESEND_UNSUBSCRIBE_URL}}, address block
  score-welcome-1.tsx      → aliases score-welcome-1-en, score-welcome-1-fr
  score-welcome-2.tsx
  setup-welcome.tsx
  newsletter.tsx           broadcast shell
```

Copy lives in the site's **existing `messages/en.json` / `messages/fr.json`**, under an `emails.*` namespace, read via `next-intl` — which the site already uses for every other string. This follows the official Resend `react-email` skill's i18n guidance (`references/I18N.md`, which names next-intl as the recommended choice for Next.js) and it is better than the per-locale-file approach in the first revision for a concrete reason: two `.tsx` files for the same email drift, whereas one component with two message sets cannot. It also means email copy sits beside page copy in one translation surface.

The sync script renders each component once per locale and uploads two Resend templates with `-en` / `-fr` alias suffixes, so automations can still branch by locale on the Resend side.

Per-recipient data (name, quiz score, weakest pillar) uses Resend template `variables` — typed, with fallbacks, max 50 per template. `RESEND_UNSUBSCRIBE_URL`, `FIRST_NAME`, `LAST_NAME`, and `EMAIL` are reserved and provided automatically.

`npm run email:dev` gives a local preview server with hot reload, a link linter, a caniemail compatibility check, and a spam check — so an email can be verified before it is ever uploaded.

### 5.4 Sync script — `scripts/email-sync.mjs`

The only genuinely new machinery, and it is small. Idempotent, safe to re-run:

1. Render each `emails/*.tsx` and upsert to Resend Templates **by `alias`** (create if absent, update if present), then `publish`.
2. Read `emails/automations.json` — the sequence definitions as `steps[]` + `connections[]`, referencing templates by alias — and upsert each automation via `automations.create` / `automations.update`.
3. `--dry-run` by default; `--apply` to write. Prints a diff of what would change.
4. Runs in CI on merge to `main`, and on demand.

This is the mechanism that makes git the source of truth. It also belongs in `scripts/INDEX.md` per the scriptify rule — it is deterministic, repeated, and exactly specifiable.

### 5.4b Tooling — CLI over MCP (Simon, 2026-08-05)

Resend ships an official CLI (`resend`), an HTTP MCP server (`mcp.resend.com/mcp`), and an official skill set. **Use the CLI and the skills; do not mount the MCP server.**

The reason is structural, not preference: MCP tool schemas load into context at session start and cost tokens in every session whether email work happens or not. A CLI plus a skill costs nothing until invoked, and the skill's reference files load only when the specific operation needs them. Email work here is occasional, so the permanently-mounted option is the wrong trade. This is the same reasoning as the scriptify rule in CLAUDE.md.

Installed 2026-08-05 via `npx skills add resend/resend-skills` (official Resend repo, MIT, verified before install) into `.agents/skills/` with `.claude/skills/` symlinks and a `skills-lock.json`. Five skills:

| Skill | Use |
|---|---|
| `resend-cli` | Terminal operations; carries the non-interactive flag contract and gotchas. Its own instruction: *"Always load this skill before running `resend` commands."* |
| `resend` | API/SDK reference incl. `references/automations.md`, `broadcasts.md`, `topics.md`, `webhooks.md` |
| `react-email` | Components, styling, **i18n** (see §5.3), sending, editor |
| `email-best-practices` | `compliance.md`, `deliverability.md`, `list-management.md`, `email-capture.md` — read these during implementation; they cover the CASL and suppression ground this spec treats as risk |
| `agent-email-inbox` | Inbound/receiving. Not used by this project. |

The install landed in the primary checkout and is currently untracked. **Recommend committing it** so every worktree and session picks the skills up, with `skills-lock.json` pinning versions.

The CLI supports `--react-email` to send a `.tsx` template directly, which makes the stage-7 live test a one-liner.

### 5.5 Subscribe path

`lib/email/subscribe.ts`, called by all four routes:

1. Normalise email to lowercase.
2. Upsert the Resend contact (`audience_id`), set topics per the signup source.
3. Append a row to `email_consent_log` (below).
4. Emit the Resend custom event that triggers the right automation, carrying context (locale, score, name) as event data.
5. For `/setup`, additionally write the `leads` row + ntfy — existing behaviour, with the email actually stored.

### 5.6 Supabase schema (three tables)

**`public.email_subscribers`** — the local system of record for the list (Simon, 2026-08-05; see §5.6b for why). RLS on from creation.
`id`, `email` (unique), `resend_contact_id`, `name`, `locale`, `source` (`score` | `setup` | `blog` | `readiness` | `import`), `topics` (text[]), `delivery_status` (`active` | `unsubscribed` | `bounced` | `complained`), `synced_at`, `created_at`, `updated_at`.

**`public.email_consent_log`** — append-only; never updated or deleted. RLS on from creation.
`id`, `email`, `event` (`granted` | `withdrawn`), `consent_version`, `source_page`, `locale`, `ip`, `user_agent`, `occurred_at`.

**`public.email_events`** — thin webhook ledger, for idempotency and audit. RLS on from creation.
`svix_id` (PK), `event_type`, `email`, `payload` (jsonb), `received_at`.

Relationship to CRM: `email_subscribers` is the *marketing list*; `leads` and `clients` are the CRM. They join on email and stay separate — a client is not automatically a subscriber, and a subscriber is not automatically a lead. Conflating them is how you end up emailing a paying client a lead-magnet welcome sequence.

### 5.6b Sync direction — the rule that keeps this safe

The list is **local-first**: a signup writes Supabase, then pushes to Resend. But authority is **per-field, not per-system**, and getting this backwards is the one way this design causes real harm.

| Field | Authority | Direction |
|---|---|---|
| email, name, locale, source, topics | **Supabase** | Supabase → Resend on write |
| `delivery_status` (unsubscribed / bounced / complained) | **Resend** | Resend → Supabase via webhook |

**Never push `delivery_status` outward.** Resend's built-in `RESEND_UNSUBSCRIBE_URL` means someone can unsubscribe on a Resend-hosted page that our database never sees until the webhook lands. If our row were treated as authoritative and pushed, a stale `active` would re-subscribe a person who opted out — a CASL violation caused by our own sync. Opt-out flows inward only, and Resend remains the enforcement point at send time regardless of what our table says.

A nightly reconcile (`scripts/email-sync.mjs --contacts`) diffs both directions and reports drift: contacts in Supabase missing from Resend get pushed; `delivery_status` disagreements resolve **in Resend's favour, always**.

**Honest caveat on portability:** the provider-swap argument is the weaker half of the case. Templates and automations would not port to Kit or anywhere else regardless — different step models, different variable syntax — and the engagement history stays behind too. What ports is the list and the consent proof, which is the part that matters, but a swap would still be a real project rather than an adapter change.

The stronger reason is **segmentation**. "Everyone who scored under 12 on `/score`, hasn't booked a call, and has read three or more posts" requires joining email data against `quiz_results`, `clients`, and `blog_posts` — impossible if the list only lives in Resend. That is a capability Simon will use, not insurance against a swap he probably won't make. Resend segments can then be built *from* those queries.

**Existing-table fix:** add `email text` to `public.leads`. **No backfill is possible** — `blog-subscribe` writes only `name: email.split("@")[0]` and a `notes` string that omits the address, so the domain is already lost. Both existing rows are Simon's; the fix is forward-only.

Email is stored as `text` normalised to lowercase at write time, with a `CHECK (email = lower(email))` constraint — the `citext` extension is available but not installed on this project (verified 2026-08-04), and enabling one for a single column is not worth it. The constraint makes the normalisation enforceable rather than conventional.

### 5.7 Webhook — `/api/email/webhook`

Thin, because Resend owns suppression. Its job is *our* records, not correctness of sending.

1. Verify the Svix signature. Non-negotiable: a public webhook URL is world-postable.
2. Insert `svix_id` into `email_events`; on conflict return 200 and stop (Resend guarantees at-least-once, so duplicates are normal).
3. On `contact.updated` with an unsubscribe, append a `withdrawn` row to `email_consent_log`.
4. On `email.bounced` / `email.complained`, annotate the matching `leads`/`clients` row so a dead address is visible in the CRM.
5. Return 200 fast.

No reconcile job, no suppression logic, no cron — Resend enforces opt-out at send time regardless of whether this handler ever runs. That is the whole benefit of not building the engine.

---

## 6. Website changes (complete list)

**New**
- `lib/email/client.ts` — Resend client wrapper
- `lib/email/subscribe.ts` — the one subscribe function all routes call
- `emails/**` — React Email templates + `automations.json`
- `scripts/email-sync.mjs` (+ `scripts/INDEX.md` entry)
- `app/api/email/webhook/route.ts`
- Supabase migration for §5.6

**Modified**
- `app/api/blog-subscribe/route.ts` → thin wrapper over `lib/email/subscribe.ts`; keeps `/setup` lead + ntfy branch
- `app/api/score-subscribe/route.ts` → same; pillar scores become automation event data + template variables
- `app/api/readiness-diagnostic-subscribe/route.ts` → same
- `components/ReadinessDiagnosticClient.tsx` → rename `error_mailerlite` state + i18n keys
- `components/blog/PostCTA.tsx` → stale MailerLite comment
- `app/[locale]/privacy/page.tsx` → **MailerLite → Resend as named subprocessor**, both locales
- `app/admin/(authed)/leads/page.tsx` → correct Supabase client, new `email` column, drop stale "MailerLite is source of truth" copy
- `messages/en.json`, `messages/fr.json` → renamed error state
- `.env.local.example` → drop `MAILERLITE_*`; add `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_TOPIC_ID_NEWSLETTER`, `RESEND_TOPIC_ID_ONBOARDING`, `RESEND_WEBHOOK_SECRET`, plus the three undocumented `CC_*` vars
- `package.json` → `email:dev`, `email:sync` scripts

**Deleted**
- `app/api/subscribe/route.ts` — dead, no callers
- All `MAILERLITE_*` vars in Vercel (after cutover)

**No longer needed** (vs. rev. 1): sequence-engine tables, `pg_cron`, `/api/email/tick`, `/api/email/unsubscribe`, and the custom `/[locale]/email-preferences` page.

**Note on reconcile:** rev. 1's `/api/email/reconcile` *route* is gone — Resend enforces opt-out at send time, so nothing about correct sending depends on a reconcile pass. What remains is `scripts/email-sync.mjs --contacts` (§5.6b), a nightly **drift report** on the local↔Resend contact mirror, scheduled as a Command Center schedule. It is an observability tool, not a correctness dependency, which is why Sterling is an acceptable host for it.

---

## 7. Content to rewrite

The four `/score` sequence emails are stale — written for the retired PDF checklist lead magnet, with "DOWNLOAD THE CHECKLIST" / "TÉLÉCHARGER LA LISTE" as the primary action and no `/score` reference. **They are not migrated; they are rewritten**, EN and FR, against `brand/brand-summary.md`. This closes `af0cc0d6` and `f176b2be`.

Newsletter format is **out of scope here** — goal `4a02d3ce` says its first step is a format-scoping chat with Simon, and that decision is his. This spec builds the pipe.

---

## 8. Build sequence

| # | Stage | Simon-minutes |
|---|---|---|
| 1 | Resend account, `mail.simonparis.ca` DNS (SPF/DKIM/DMARC), full-access API key → Vercel | **~20 min** |
| 2 | Audience + 2 topics + webhook endpoint registered (via API) | 0 |
| 3 | Supabase migration (§5.6), RLS policies | 0 |
| 4 | `lib/email/*`, subscribe routes rewritten, webhook, tests | 0 |
| 5 | `emails/**` templates + `automations.json` + `email-sync.mjs` | 0 |
| 6 | `/score` sequence content rewritten EN/FR → **Simon reviews in the preview server before enabling** | ~30 min review |
| 7 | End-to-end live test on his own addresses, automations enabled | ~10 min |
| 8 | Delete MailerLite account, **revoke the API key**, remove Vercel vars | ~5 min |

Total Simon-time ≈ **1 hour**, nearly all DNS and reading email copy.

---

## 9. Test plan

- **Suppression is enforced at send time.** An unsubscribed contact receives neither a broadcast nor an automation step. Resend owns this, so the test asserts the integration, not our logic — but it stays permanently.
- **`delivery_status` is never pushed outward.** A test asserts the contact sync payload contains no unsubscribe/status field, so a stale local row can never re-subscribe someone who opted out (§5.6b).
- Reconcile resolves a `delivery_status` disagreement in Resend's favour, in both directions of drift.
- Every subscribe route writes an `email_subscribers` row, an `email_consent_log` row, and creates/updates the Resend contact.
- Consent log is append-only — an unsubscribe appends, never mutates.
- Webhook rejects unsigned / wrongly-signed payloads.
- Webhook is idempotent — the same `svix_id` twice produces one state change.
- `email-sync.mjs` is idempotent — a second `--apply` with no file changes produces no writes.
- `email-sync.mjs --dry-run` is the default and writes nothing.
- Locale routing — an `fr` signup triggers the `fr` template alias.
- A bounce annotates the matching CRM row.
- Broadcast send requires explicit confirmation above a recipient threshold (§10).

---

## 10. Risks and mitigations

**A script can email the entire list in one line.** MailerLite's UI made that hard; an API does not. Broadcast sends default to dry-run and require an explicit flag plus recipient-count confirmation above a threshold.

**Full-access API key.** The React Email→Resend integration requires a full-access key, which can delete templates, contacts, and automations. It lives in Vercel env and the local `.env` only, never in chat, and is rotated if exposed.

**Compliance liability moves to Simon.** CASL requires provable consent, sender identification, and prompt unsubscribe. Resend handles unsubscribe mechanics and opt-out enforcement; the consent log (§5.6) holds the proof; the footer template carries a physical address. Net position is *better* than today, where the consent records are locked in MailerLite's UI.

**Detection asymmetry on breach.** If Resend is breached they must notify Simon; if his Supabase leaks, only he can notice. Argues for RLS on the new tables from creation — which is specified.

**Deliverability is now his.** Mitigated by the subdomain (§5.1) and full SPF/DKIM/DMARC. At zero real subscribers there is no warmup concern.

**The engine is not why no newsletter has shipped.** Zero campaigns have ever been sent; better infrastructure does not create the writing habit. The acceptance test for this project is **a newsletter went out**, not *the system is built*.

---

## 11. Two findings outside this scope

**1 — The story pipeline's verify stage writes test subscribers into production.** 35 `story-verify+` / `setup-verify+` fixtures reached the live MailerLite account on 2026-07-17/18. Same class of failure as `lessons.md` 2026-07-16, where a verify stage clicked a real brain note. Needs an anti-recurrence entry and a fix in the verify-stage instructions **before** Resend goes live, or fake signups pollute a list that finally matters. **Blocking for stage 7.**

**2 — RLS is disabled on 17 tables**, including `public.leads`, `public.clients`, `public.client_notes`, and `public.conversions` — client PII readable by anyone with the anon key. Supabase flags it critical. Not caused by this project and not fixed by it, but it is the same table neighbourhood. Recommend a separate goal; enabling RLS without policies blocks all access, so it needs its own careful pass.

---

## 12. Open question for Simon

One, and it is genuinely his: **does the `/score` welcome sequence keep its current two-email shape (delivery + follow-up, per locale), or is the rewrite the moment to reshape it?** The spec builds whatever shape is chosen. Defaulting to the existing two-step shape unless told otherwise.
