# Handoff — Email Infrastructure (MailerLite → Resend)

**Date:** 2026-08-06
**For:** a fresh agent session picking up implementation
**Status:** Tasks 1–10 BUILT AND MERGED (PR #103, simonparis-website `master`). **Task 11 — cutover — is not done.** Automations are enabled but the path has never been exercised end to end. Updated 2026-08-07.

Read this document first. It exists so you do not need the original scoping conversation.

---

## 1. What this is

**Outcome sentence:** Every email that goes to Simon's list — welcome sequences, the newsletter, follow-ups — can be written, edited, scheduled, and sent by asking, without him opening anyone's dashboard.

**Why it exists:** MailerLite's API cannot edit automation email content. Two roadmap goals have been blocked on that for a month (`af0cc0d6`, `f176b2be`), and the `/score` welcome sequence has been sending copy written for a retired PDF lead magnet since at least 2026-07-06 because nobody could fix it without clicking through MailerLite's builder.

---

## 2. The two authoritative documents

| Document | Role |
|---|---|
| `docs/superpowers/specs/2026-08-04-email-infrastructure-design.md` | **The design.** Architecture, division of responsibility, schema, risks. Rev. 2026-08-05. |
| `docs/superpowers/plans/2026-08-05-email-infrastructure-resend.md` | **The implementation plan.** 11 tasks, TDD, real code in every step. Execute this. |

Both are committed on branch `ade/coo-601eedba` in the MetaArchitect repo. The plan is written to be executed by `superpowers:subagent-driven-development` or `superpowers:executing-plans` — Simon has **not yet chosen** which (see §8).

**Code lives in a different repo:** `projects/simonparis-website/` (own git repo, gitignored from the MetaArchitect root). Work in a git worktree there, never the primary checkout.

---

## 3. Decisions already made — do not re-litigate

Each of these cost real discussion. The reasoning matters more than the choice.

**Resend, not another ESP.** Full CRUD on automations, templates, contacts, topics, suppressions, broadcasts. Verified by endpoint probe.

**Git is the source of truth for email content; Resend is the runtime.** Templates are React Email components in the repo, synced to Resend Templates by stable `alias`. The reason the current MailerLite emails are unfixable is that their content only ever existed in a dashboard — do not recreate that, even in a better dashboard.

**Do NOT build a custom sequence engine.** An earlier revision of the spec did, based on a wrong premise (see §5). Resend Automations handle triggers, delays, and conditions, all API-writable.

**Contacts are local-first: Supabase → Resend.** Justified by segmentation (joining the list against `quiz_results`, `clients`, `blog_posts` — impossible if the list only lives in Resend), not primarily by portability. Portability is real but oversold: templates and automations would not port anywhere regardless.

**Authority is per-field, not per-system.** Supabase owns email/name/locale/source/topics, pushed outward. Resend owns `delivery_status`, flowing **inward only**. See §5 for why this is the one rule that can cause legal harm.

**Sending subdomain `mail.simonparis.ca`, never the root.** Root MX is Zoho — Simon's real client mail. Domain reputation is largely domain-level at Gmail, so marketing complaints on the root would damage mail he depends on daily.

**Locale via `next-intl` message files, one component per email.** Not one `.tsx` per locale. Two files for one email drift; one component with two message sets cannot. The site already uses `next-intl` for every other string.

**CLI over MCP.** Resend ships an official CLI, an MCP server, and official skills. Use the CLI + skills. MCP tool schemas load into context every session whether email work happens or not; a CLI + skill costs nothing until invoked.

**Click tracking OFF.** Rewriting every URL through an unwarmed tracking subdomain is a deliverability risk, and no analytics loop consumes the numbers yet.

**ONE Resend audience, not one per ICP** (decided 2026-08-06, Simon asked). The brand serves two audiences — Operator (primary, `/setup`, "busy owner test") and Practitioner (pull-only, `/score`, "burned practitioner test") per `brand/brand-summary.md` — and they stay two audiences *editorially*. But in Resend they share one audience, because:
- A Resend audience is a separate contact list. Someone in both would be **two contacts with two independent unsubscribe states** — and the overlap is real (a reliability lead who also runs a consultancy). They could opt out of one and keep receiving the other, which reads as ignoring an opt-out.
- The ICP is already recoverable without splitting: `email_subscribers.source` is a strong proxy (`/score` → practitioner, `/setup` → operator), and Supabase can join it against `quiz_results`, `clients`, and `blog_posts`. That is better targeting than audience membership gives.
- **Topics** handle the thing that actually needs separating — per-topic opt-out. When there are genuinely two newsletters, add a second newsletter topic; do not add a second audience.
- Asymmetric cost: adding an ICP property later is trivial. Merging two audiences later means deduplicating contacts and reconciling conflicting unsubscribe state.

Store the ICP as a contact property and an `email_subscribers` column when a lane-specific send actually exists. Not before — there are zero subscribers and the newsletter format is still unscoped (`4a02d3ce`).

---

## 4. Verified facts — established by checking, not assuming

Re-verify anything load-bearing before relying on it, but these were all checked directly:

**MailerLite (checked 2026-08-04 via its API)**
- 43 subscribers, **all** Simon's own addresses or pipeline test fixtures. 35 are `story-verify+…@example.com` / `setup-verify+…@example.com`. **Zero real subscribers.**
- Zero campaigns ever sent. One enabled automation.
- **Nothing to migrate.** No export, no consent records worth preserving, no sending reputation, no cutover risk.

**DNS on simonparis.ca (checked 2026-08-06)**
- Root MX → Zoho (`mx.zoho.com`). Simon's real mail.
- `mail.simonparis.ca` **verified in Resend**: DKIM at `resend._domainkey.mail` resolving; SPF `send.mail` TXT = `v=spf1 include:amazonses.com ~all`; MX `send.mail` → `feedback-smtp.us-east-1.amazonses.com`. Region `us-east-1`.
- **DMARC needs no new record.** Root is `v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:hello@simonparis.ca`. `sp=none` covers subdomains and relaxed alignment means the subdomain aligns. Gmail/Yahoo bulk-sender requirements are satisfied. (Separate later hardening: `p=none` means no enforcement against spoofing. Not blocking, not this project.)
- **Root SPF still includes MailerLite** and there are stale `mailerlite-domain-verification` and `brevo-code` TXT records. Cleaned in Task 11 Steps 4–6.

**Supabase**
- One ACTIVE project: `ashwrqkoijzvakdmfskj` ("MetaArchitect"). Website and Command Center share it.
- `public.leads` exists (2 rows, both Simon's) and **has no `email` column** — `blog-subscribe` writes `email.split("@")[0]` as `name` and discards the domain. Forward-only fix; no backfill possible.
- `public.quiz_results` has **0 rows** despite `ScoreClient` inserting into it. Worth diagnosing; not blocking.
- `citext` is available but **not installed**. Emails are `text` + `CHECK (email = lower(email))`.

**simonparis-website conventions**
- Tests: `npm test` = `node --test lib/**/*.test.ts`, using `node:test` + `node:assert/strict`. **Tests only run if they live under `lib/` and end in `.test.ts`.** No vitest, no jest, no JSX in tests.
- `next-intl` 4.8.3, Next 14.2.35 App Router, TypeScript 5.
- `lib/supabase/admin.ts` exports `createSupabaseAdminClient()` (service role, server only).
- `app/api/subscribe/route.ts` is **dead code** — zero callers. Delete it.

---

## 5. Three traps

**Trap 1 — Negative API claims from doc summarisers.** The first spec revision concluded Resend Automations were dashboard-only, based on a WebFetch of `llms.txt` that returned *"Key Finding: Automation sequences cannot be created or updated via API."* It was wrong, and half a subsystem got designed around it. Simon caught it. **Verify a negative capability claim by probing the surface** (`curl -o /dev/null -w "%{http_code}"` against plausible endpoint paths, or grep raw `llms.txt`/OpenAPI), never by asking a model to summarise docs. Positive claims are cheap to trust — they error at build time. Negative claims silently expand scope. Full entry: `docs/lessons.md` 2026-08-05.

**Trap 2 — Never push `delivery_status` outward.** Resend hosts the unsubscribe page, so it learns of an opt-out before the database does. If a stale local `active` were pushed to Resend, it would re-subscribe someone who unsubscribed — a CASL violation caused by our own sync. Task 2 Step 5 contains a test that pins the exact key set of the outbound payload and fails if anyone widens it. **That test carries a do-not-delete comment. Honour it.**

**Trap 3 — The SPF edit can break Simon's daily email.** Task 11 Step 4 edits the root SPF to drop MailerLite. `include:zohomail.com` must survive. Follow it with a real test email from Zoho. This is the only step in the plan that can break something he uses every day.

---

## 6. Two blockers outside this project

**Blocking Task 11 (cutover):** the story pipeline's verify stage writes test signups into production — that is where 35 of the 43 MailerLite subscribers came from (2026-07-17/18). Same class of failure as `docs/lessons.md` 2026-07-16, where a verify stage clicked a real brain note. **Fix the verify-stage instructions before enabling any Resend automation**, or fake signups pollute a list that finally matters.

**Not blocking, but surface it:** RLS is disabled on 17 Supabase tables, including `public.leads`, `public.clients`, `public.client_notes`, `public.conversions` — client PII readable by anyone with the anon key. Supabase flags this critical. Not caused by and not fixed by this project; the new email tables ship with RLS on from creation. Deserves its own goal, since enabling RLS without policies blocks all access.

---

## 7. Where things stand

**Done**
- Spec written, reviewed, corrected once (commits `c55ac12`, `4e52533`, `7682b33`, `a240475`)
- Plan written (`7fcffbb`, `0fdf26f`)
- Lesson logged in `docs/lessons.md`
- Official Resend skills installed: `.agents/skills/{resend-cli,resend,react-email,email-best-practices,agent-email-inbox}` with `.claude/skills/` symlinks and `skills-lock.json`. **Currently untracked** — the primary checkout had other uncommitted work so they were deliberately left uncommitted. Recommend committing.
- **Prerequisite P1 complete:** Resend account exists, `mail.simonparis.ca` verified (DKIM + SPF).

**P2 — mostly done 2026-08-06.** Resend is provisioned:

| Env var | Value |
|---|---|
| `RESEND_AUDIENCE_ID` | `9333ee14-10bb-47eb-99f6-78f4eb480750` (audience "General") |
| `RESEND_TOPIC_ID_NEWSLETTER` | `963f4eb6-1619-4cf1-9c70-c6d89a23930d` |
| `RESEND_TOPIC_ID_ONBOARDING` | `dd511559-2469-41ce-8634-1e45c7fe0c68` |
| `RESEND_API_KEY` | **In Supabase Vault** under that exact name — see below |
| `RESEND_WEBHOOK_SECRET` | Not yet — produced by Task 9 Step 6 |

Audience currently holds **0 contacts**.

**Reading the API key.** It lives in Supabase Vault (`vault.secrets`), not in any `.env`. Sterling can read it with the management API token at `~/.supabase/access-token`:

```bash
TOKEN=$(cat ~/.supabase/access-token | tr -d '\r\n')
KEY=$(curl -s -X POST "https://api.supabase.com/v1/projects/ashwrqkoijzvakdmfskj/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"select decrypted_secret from vault.decrypted_secrets where name='"'"'RESEND_API_KEY'"'"';"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['decrypted_secret'])" | tr -d '\r\n')
```

**Never echo `$KEY`.** Print `${#KEY}` if you need to confirm it loaded. A `secrets-guard` hook watches for credentials in transcripts, and a key was already leaked once this project (2026-08-04, MailerLite, via a Python traceback that included the Authorization header — strip `\r\n` from values read out of files, because a trailing newline in a header raises an exception that prints the header).

**Still needs Simon:** `RESEND_API_KEY` added to **Vercel** (Production + Preview). Vercel cannot read Sterling's vault, so the deployed site needs its own copy. He can copy it from Command Center's `/settings` vault UI.

**Verified 2026-08-06 — topic subscription defaults.** `default_subscription` **cannot be changed after creation**, so it was tested empirically rather than inferred: a topic created with `opt_out`, then a contact created with no topics specified, reads back `subscription: "opt_out"`. So **`opt_out` = new contacts start UNSUBSCRIBED**. Both topics were created `opt_out` deliberately: the subscribe path opts people in explicitly per source (`topicsForSource`), which means a bug in topic assignment fails *silently-safe* (nobody gets email, noticed immediately in testing) rather than *silently-unsafe* (everyone gets everything). That is also the CASL-aligned posture.

### Tasks 1–10: DONE (verified 2026-08-07)

Merged as **PR #103** ("Email infrastructure: MailerLite → Resend (Tasks 1–10)") into simonparis-website **`master`** — note that repo's default branch is `master`, not `main`. Squash-merged, so `email/resend-infrastructure` branch commits are not ancestors of master; the content is.

Verified present on `master`: `lib/email/{types,normalize,contacts,resend,subscribe,store,webhook,pillars}.ts` with tests, `emails/{_layout,score-welcome-1,score-welcome-2}.tsx`, `emails/automations.json`, `app/api/email/webhook/route.ts`, `scripts/email-sync.mjs`, `supabase/migrations/0007_email_infrastructure.sql`. MailerLite appears nowhere in `app/`, `lib/`, `components/`, `messages/`, `scripts/`. Dead `app/api/subscribe/route.ts` deleted.

Verified in Supabase: `email_subscribers`, `email_consent_log`, `email_events` all exist; `leads.email` added.

Verified in Resend: 4 templates (`score-welcome-{1,2}-{en,fr}`), 2 automations **both `enabled`**, webhook registered and `enabled` on `https://simonparis.ca/api/email/webhook`.

The implementing session also went beyond the plan, correctly: it added `lib/email/pillars.ts`, fixed the footer address to Quebec City (not Lévis), added contact-property personalization, and caught a real bug the plan would have shipped — **`POST /events` only *defines* an event; firing one needs `/events/send`**.

### Task 11 (cutover): NOT DONE — this is the remaining work

Current state is *armed but unproven*: both automations are enabled, so a real `/score` signup runs a path that has never once been exercised. If `RESEND_API_KEY` never made it into Vercel, that signup fails silently.

| # | Item | Evidence it's outstanding (2026-08-07) |
|---|---|---|
| 1 | **Live end-to-end test** | `email_subscribers`, `email_consent_log`, `email_events` all have **0 rows**; Resend audience has **0 contacts** |
| 2 | **Confirm `RESEND_API_KEY` is in Vercel** | Never verified. Item 1 proves it either way. |
| 3 | **Retire MailerLite** | Its API still returns **200** — account live, key still valid. That key leaked into a transcript 2026-08-04, so **revoke** it, don't just abandon it. |
| 4 | **Clean root DNS** | Root SPF is still `v=spf1 include:zohomail.com a mx include:_spf.mlsend.com ~all`; stale `mailerlite-domain-verification=…` and `brevo-code:…` TXT records still present. **Keep `include:zohomail.com`** — that's Simon's daily mail — and send a Zoho test after editing. Plan Task 11 Steps 4–6. |
| 5 | **Close goals** | `af0cc0d6`, `f176b2be`, `7bcf50d5` all still `pending`. First two look genuinely complete; `7bcf50d5`'s decision was "Supabase `email_subscribers` is the list of record, `leads` stays the CRM." **Propose, don't self-write** — status changes Simon didn't ask for are propose-only. |
| 6 | Delete Resend cruft | An `Untitled Automation` (disabled) is sitting in the account |

**Still blocking item 1:** the story-pipeline verify-stage fix (§6). 35 of MailerLite's 43 contacts were verify-stage fixtures; with automations now enabled, a verify run could both pollute the list and send real email.

**Load these skills at the right moments:** `resend-cli` before any `resend` command; `react-email` before writing templates; `email-best-practices` before the footer, consent, or webhook logic. They may shrink the risk section — they cover compliance, deliverability, and list-management ground the spec treats as open.

---

## 8. Open questions for Simon

1. **Execution mode** — subagent-driven (fresh agent per task, review between; recommended) or inline with checkpoints. He has not answered.
1b. **`RESEND_API_KEY` into Vercel** — the only remaining provisioning step (§7).
2. **`/score` sequence shape** — keep two emails per locale (delivery + follow-up), or reshape while rewriting. **Plan assumes two.** Copy is drafted; he reviews it in the React Email preview server at Task 7.
3. **Commit the vendored Resend skills?** His call — it vendors a third-party dependency into the repo.

---

## 9. The acceptance test

Not "the system is built." **A newsletter went out.**

Zero campaigns have ever been sent from this brand. Better infrastructure does not create a writing habit — it only removes the excuse. Newsletter format is deliberately out of scope here (goal `4a02d3ce`, whose first step is a format-scoping chat with Simon); this project builds the pipe.

One gap recorded in the plan's self-review and repeated here so it is not lost: **the first task of the newsletter build must be the dry-run-default + recipient-count-confirmation guard**, before any broadcast send path exists. A script can email the whole list in one line where MailerLite's UI made that hard. `scripts/email-sync.mjs` already establishes the dry-run-default pattern to copy.
