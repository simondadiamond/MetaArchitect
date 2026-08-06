# Handoff — Email Infrastructure (MailerLite → Resend)

**Date:** 2026-08-06
**For:** a fresh agent session picking up implementation
**Status:** scoped, specced, planned, prerequisites partly done. **No code written yet.**

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

**Not done — start here**
- **P2:** full-access Resend API key written to `projects/simonparis-website/.env` as `RESEND_API_KEY`, and added to Vercel (Production + Preview). Also needed: `RESEND_AUDIENCE_ID` (create the audience first — Task 8 assumes it exists), and later `RESEND_WEBHOOK_SECRET` from Task 9 Step 6. **Never paste a key into chat**; have Simon write it to the file and tell you the path.
- **Tasks 1–11.** Tasks 1 and 2 (Supabase migration, contact-payload module) need no Resend credentials and can start immediately.

**Load these skills at the right moments:** `resend-cli` before any `resend` command; `react-email` before writing templates; `email-best-practices` before the footer, consent, or webhook logic. They may shrink the risk section — they cover compliance, deliverability, and list-management ground the spec treats as open.

---

## 8. Open questions for Simon

1. **Execution mode** — subagent-driven (fresh agent per task, review between; recommended) or inline with checkpoints. He has not answered.
2. **`/score` sequence shape** — keep two emails per locale (delivery + follow-up), or reshape while rewriting. **Plan assumes two.** Copy is drafted; he reviews it in the React Email preview server at Task 7.
3. **Commit the vendored Resend skills?** His call — it vendors a third-party dependency into the repo.

---

## 9. The acceptance test

Not "the system is built." **A newsletter went out.**

Zero campaigns have ever been sent from this brand. Better infrastructure does not create a writing habit — it only removes the excuse. Newsletter format is deliberately out of scope here (goal `4a02d3ce`, whose first step is a format-scoping chat with Simon); this project builds the pipe.

One gap recorded in the plan's self-review and repeated here so it is not lost: **the first task of the newsletter build must be the dry-run-default + recipient-count-confirmation guard**, before any broadcast send path exists. A script can email the whole list in one line where MailerLite's UI made that hard. `scripts/email-sync.mjs` already establishes the dry-run-default pattern to copy.
