# Email Infrastructure (MailerLite → Resend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every email on simonparis.ca off MailerLite onto Resend, with email content and the contact list living in the repo/Supabase so an agent can write, edit, and send anything without opening a dashboard.

**Architecture:** Resend is the runtime (contacts, automations, broadcasts, suppression, unsubscribe pages, deliverability). The repo is the source of truth for email content (React Email components synced to Resend Templates by stable `alias`). Supabase is the source of truth for contact identity, attributes, and consent proof, synced outward — while `delivery_status` (unsubscribed/bounced/complained) flows **inward only** from Resend. No custom sequence engine, no cron tick, no self-hosted unsubscribe flow.

**Tech Stack:** Next.js 14.2.35 (App Router), TypeScript 5, `next-intl` 4.8.3, `@supabase/supabase-js` 2.x, Resend API + `resend` Node SDK, React Email, `resend-cli`. Tests: Node's built-in runner (`node --test`) with `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-08-04-email-infrastructure-design.md`

## Global Constraints

- **Repo:** all code changes are in `projects/simonparis-website` (its own git repo, gitignored from the MetaArchitect root). Work in a git worktree, not the primary checkout.
- **Test runner:** `npm test` runs `node --test lib/**/*.test.ts`. **Tests only run if they live under `lib/` and end in `.test.ts`.** There is no vitest/jest. No JSX in test files.
- **No network in tests.** Every module that calls Resend or Supabase takes its dependencies as an injected object so tests pass fakes. Never mock by monkey-patching globals.
- **Sending domain:** `mail.simonparis.ca`. `From: Simon Paris <simon@mail.simonparis.ca>`, `Reply-To: simon@simonparis.ca`.
- **`delivery_status` is NEVER included in an outbound contact-sync payload.** This is the one rule whose violation causes legal harm (§5.6b of the spec).
- **Emails are stored lowercase.** Normalise at write time; DB enforces `CHECK (email = lower(email))`.
- **Template aliases:** `<name>-<locale>`, e.g. `score-welcome-1-en`, `score-welcome-1-fr`.
- **Brand:** any user-visible copy or UI follows `brand/brand-summary.md`. Actions `#E04500`, links `#C97A1A`, zero border-radius, dark mode supported.
- **Secrets:** `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` are read from env at point of use. Never logged, never echoed, never committed.
- **Skills:** load `resend-cli` before running any `resend` command; load `react-email` before writing templates; load `email-best-practices` before writing the footer, consent, or webhook logic. They are installed at `.agents/skills/` in the MetaArchitect repo.

---

## Prerequisites (Simon — must complete before Task 3)

These are not code tasks. Nothing after Task 2 can be verified without them.

- [x] **P1. DONE 2026-08-06.** Resend account created, domain **`mail.simonparis.ca`** added (subdomain, not root — see the DNS note below), region `us-east-1`. Verified live: DKIM `resend._domainkey.mail` resolving, SPF `send.mail` TXT = `v=spf1 include:amazonses.com ~all`, MX `send.mail` → `feedback-smtp.us-east-1.amazonses.com`.

  **No DMARC record needed.** The root already has `v=DMARC1; p=none; sp=none; adkim=r; aspf=r; rua=mailto:hello@simonparis.ca`. `sp=none` applies to subdomains and relaxed alignment (`aspf=r`/`adkim=r`) means `mail.simonparis.ca` aligns against the org domain, so Gmail/Yahoo bulk-sender requirements are met. Separate later hardening, not this project: `p=none` means no enforcement against spoofing.

  **Turn OFF "Enable click tracking"** (it defaults on). Leave open tracking off. Reasons: click tracking rewrites every URL through a tracking subdomain, which is an unwarmed-domain deliverability risk, adds a DNS record, and puts redirect URLs in front of an audience of senior engineers. There is no analytics loop consuming the numbers yet (the stats loop is deliberately deferred). Turn it on later if a decision actually depends on the click rate.

  **Verified DNS state as of 2026-08-05** — checked before choosing the subdomain:
  - Root `simonparis.ca` MX → **Zoho** (`mx.zoho.com`). His real client and personal mail lives there. This is precisely why sending must not happen on the root domain: a marketing complaint would damage the reputation his client mail depends on.
  - `mail.simonparis.ca`, `updates.simonparis.ca`, `send.simonparis.ca` — all unused, no collision. `mail.` chosen for a clean From address (`simon@mail.simonparis.ca`).
  - Root SPF today: `v=spf1 include:zohomail.com a mx include:_spf.mlsend.com ~all` — **already includes MailerLite** (`_spf.mlsend.com`). Removed at cutover (Task 11).
  - Two stale verification TXT records on the root: `mailerlite-domain-verification=…` and `brevo-code:…`. Both are cruft from abandoned providers; removed at cutover.

  Do **not** add Resend's SPF include to the root domain. It belongs on `mail.simonparis.ca` only — that separation is the entire point.
- [ ] **P2.** Create a **Full Access** API key at https://resend.com/api-keys. Write it to `projects/simonparis-website/.env` as `RESEND_API_KEY=` and add it to Vercel (Production + Preview). Do not paste it into chat.
- [ ] **P3.** Confirm to the implementer: keep the `/score` sequence at two emails per locale (delivery + follow-up), or a different shape. Plan assumes **two**.

---

## File Structure

**New — `lib/email/` (all testable, all dependency-injected)**
| File | Responsibility |
|---|---|
| `lib/email/types.ts` | Shared types: `SignupSource`, `Locale`, `SubscriberInput`, `ContactSyncPayload`, `EmailDeps` |
| `lib/email/normalize.ts` | Email normalisation + validation. Pure. |
| `lib/email/contacts.ts` | Builds the outbound contact-sync payload. Pure. **Home of the never-push-status rule.** |
| `lib/email/contacts.test.ts` | Tests for the above, incl. the safety test |
| `lib/email/normalize.test.ts` | Tests for normalisation |
| `lib/email/resend.ts` | Thin Resend HTTP wrapper; takes an injected `fetch` |
| `lib/email/subscribe.ts` | Orchestration: Supabase upsert → consent log → Resend contact → trigger event |
| `lib/email/subscribe.test.ts` | Tests with fake deps |
| `lib/email/webhook.ts` | Svix verification + event→effect mapping. Pure where possible. |
| `lib/email/webhook.test.ts` | Signature and idempotency tests |

**New — templates and sync**
| File | Responsibility |
|---|---|
| `emails/_layout.tsx` | Shared shell: header, footer, unsubscribe, physical address |
| `emails/score-welcome-1.tsx` | `/score` delivery email (one component, both locales) |
| `emails/score-welcome-2.tsx` | `/score` follow-up |
| `emails/automations.json` | Automation graphs as `steps[]` + `connections[]` |
| `scripts/email-sync.mjs` | Renders templates → upserts Resend templates by alias → upserts automations. `--dry-run` default. |

**New — routes**
| File | Responsibility |
|---|---|
| `app/api/email/webhook/route.ts` | Resend webhook receiver |

**Modified**
`app/api/blog-subscribe/route.ts`, `app/api/score-subscribe/route.ts`, `app/api/readiness-diagnostic-subscribe/route.ts`, `components/ReadinessDiagnosticClient.tsx`, `components/blog/PostCTA.tsx`, `app/[locale]/privacy/page.tsx`, `app/admin/(authed)/leads/page.tsx`, `messages/en.json`, `messages/fr.json`, `.env.local.example`, `package.json`

**Deleted**
`app/api/subscribe/route.ts`

---

## Task 1: Supabase schema

**Files:**
- Create: `supabase/migrations/20260805_email_infrastructure.sql` (create the `supabase/migrations/` directory if absent)

**Interfaces:**
- Consumes: nothing
- Produces: tables `public.email_subscribers`, `public.email_consent_log`, `public.email_events`; column `public.leads.email`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260805_email_infrastructure.sql`:

```sql
-- Local system of record for the marketing list. Synced OUT to Resend for
-- identity/attributes; delivery_status flows IN from Resend only.
create table public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  resend_contact_id text,
  name text,
  locale text not null default 'en' check (locale in ('en','fr')),
  source text not null check (source in ('score','setup','blog','readiness','import')),
  topics text[] not null default '{}',
  delivery_status text not null default 'active'
    check (delivery_status in ('active','unsubscribed','bounced','complained')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Append-only consent proof (CASL). Never UPDATE, never DELETE.
create table public.email_consent_log (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email)),
  event text not null check (event in ('granted','withdrawn')),
  consent_version text not null,
  source_page text,
  locale text,
  ip text,
  user_agent text,
  occurred_at timestamptz not null default now()
);
create index email_consent_log_email_idx on public.email_consent_log (email);

-- Webhook ledger. svix_id is the idempotency key.
create table public.email_events (
  svix_id text primary key,
  event_type text not null,
  email text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- leads had no email column; blog-subscribe was storing only the local-part
-- as `name`. Forward-only fix: existing rows cannot be backfilled.
alter table public.leads add column email text;

alter table public.email_subscribers enable row level security;
alter table public.email_consent_log enable row level security;
alter table public.email_events enable row level security;

-- Service role only. No anon/authenticated policies: every write path is a
-- server route using the service-role client.
revoke all on public.email_subscribers from anon, authenticated;
revoke all on public.email_consent_log from anon, authenticated;
revoke all on public.email_events from anon, authenticated;
```

- [ ] **Step 2: Apply it**

Apply via the Supabase MCP `apply_migration` tool against project `ashwrqkoijzvakdmfskj`, name `email_infrastructure`.

- [ ] **Step 3: Verify the schema landed**

Run this SQL via the Supabase MCP `execute_sql` tool:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and (table_name like 'email_%' or (table_name='leads' and column_name='email'))
order by table_name, ordinal_position;
```

Expected: `email_consent_log`, `email_events`, `email_subscribers` columns all present, plus `leads.email`.

- [ ] **Step 4: Verify the lowercase constraint actually rejects bad data**

```sql
insert into public.email_subscribers (email, source) values ('Mixed@Case.com','blog');
```

Expected: ERROR — `violates check constraint "email_subscribers_email_check"`. If it succeeds, the constraint is wrong; fix and re-verify.

- [ ] **Step 5: Verify RLS is on**

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public' and tablename like 'email_%';
```

Expected: `rowsecurity = true` for all three.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260805_email_infrastructure.sql
git commit -m "feat(email): add subscriber, consent log, and webhook event tables"
```

---

## Task 2: Normalisation and the contact-sync payload

This is the safety-critical task. The test in Step 5 is the one that must never be deleted.

**Files:**
- Create: `lib/email/types.ts`, `lib/email/normalize.ts`, `lib/email/normalize.test.ts`, `lib/email/contacts.ts`, `lib/email/contacts.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `normalizeEmail(raw: string): string` — lowercased, trimmed
  - `isValidEmail(raw: string): boolean`
  - `type SignupSource = 'score' | 'setup' | 'blog' | 'readiness' | 'import'`
  - `type Locale = 'en' | 'fr'`
  - `type SubscriberInput = { email: string; name?: string; locale: Locale; source: SignupSource; consentVersion: string; sourcePage?: string; ip?: string; userAgent?: string; context?: Record<string, string | number> }`
  - `type ContactSyncPayload = { email: string; firstName?: string; audienceId: string; topics: string[] }`
  - `buildContactSyncPayload(input: SubscriberInput, audienceId: string): ContactSyncPayload`
  - `topicsForSource(source: SignupSource): string[]`

- [ ] **Step 1: Write `lib/email/types.ts`**

```ts
export type SignupSource = 'score' | 'setup' | 'blog' | 'readiness' | 'import';
export type Locale = 'en' | 'fr';

export type SubscriberInput = {
  email: string;
  name?: string;
  locale: Locale;
  source: SignupSource;
  consentVersion: string;
  sourcePage?: string;
  ip?: string;
  userAgent?: string;
  /** Per-recipient data passed to Resend as automation event data. */
  context?: Record<string, string | number>;
};

/**
 * The outbound contact payload. Deliberately has NO delivery/status field:
 * opt-out state is owned by Resend and flows inward only. Adding one here
 * could re-subscribe someone who used Resend's hosted unsubscribe page.
 */
export type ContactSyncPayload = {
  email: string;
  firstName?: string;
  audienceId: string;
  topics: string[];
};
```

- [ ] **Step 2: Write the failing normalisation test**

Create `lib/email/normalize.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, isValidEmail } from "./normalize.ts";

test("normalizeEmail lowercases and trims", () => {
  assert.equal(normalizeEmail("  Simon@SimonParis.CA "), "simon@simonparis.ca");
});

test("normalizeEmail is idempotent", () => {
  const once = normalizeEmail("A@B.com");
  assert.equal(normalizeEmail(once), once);
});

test("isValidEmail accepts ordinary addresses", () => {
  assert.equal(isValidEmail("me@simonparis.ca"), true);
  assert.equal(isValidEmail("simon+tag@gmail.com"), true);
});

test("isValidEmail rejects malformed addresses", () => {
  assert.equal(isValidEmail("nope"), false);
  assert.equal(isValidEmail("no@domain"), false);
  assert.equal(isValidEmail("two spaces@x.com"), false);
  assert.equal(isValidEmail(""), false);
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./normalize.ts`

- [ ] **Step 4: Write `lib/email/normalize.ts`**

```ts
// Matches the regex the four legacy subscribe routes used, kept deliberately
// permissive: real validation is the confirmation email arriving.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidEmail(raw: string): boolean {
  return EMAIL_REGEX.test(raw.trim());
}
```

- [ ] **Step 5: Write the failing contacts test — including the safety test**

Create `lib/email/contacts.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildContactSyncPayload, topicsForSource } from "./contacts.ts";
import type { SubscriberInput } from "./types.ts";

const base: SubscriberInput = {
  email: "me@simonparis.ca",
  name: "Simon",
  locale: "en",
  source: "score",
  consentVersion: "score-v1",
};

test("buildContactSyncPayload normalizes the email", () => {
  const p = buildContactSyncPayload({ ...base, email: " ME@SimonParis.CA " }, "aud_1");
  assert.equal(p.email, "me@simonparis.ca");
});

test("buildContactSyncPayload carries name and audience", () => {
  const p = buildContactSyncPayload(base, "aud_1");
  assert.equal(p.firstName, "Simon");
  assert.equal(p.audienceId, "aud_1");
});

test("buildContactSyncPayload omits firstName when absent", () => {
  const p = buildContactSyncPayload({ ...base, name: undefined }, "aud_1");
  assert.equal("firstName" in p, false);
});

// SAFETY TEST — DO NOT DELETE.
// Opt-out state is owned by Resend and flows inward only. If a status field
// ever appears in the outbound payload, a stale local 'active' row could
// re-subscribe someone who unsubscribed via Resend's hosted page. That is a
// CASL violation caused by our own sync. See spec 5.6b.
test("outbound contact payload NEVER carries delivery/opt-out state", () => {
  const p = buildContactSyncPayload(base, "aud_1") as Record<string, unknown>;
  const forbidden = [
    "delivery_status", "deliveryStatus", "status",
    "unsubscribed", "subscribed", "suppressed", "opt_out", "optOut",
  ];
  for (const key of forbidden) {
    assert.equal(key in p, false, `outbound payload must not contain "${key}"`);
  }
  assert.deepEqual(
    Object.keys(p).sort(),
    ["audienceId", "email", "firstName", "topics"],
    "payload key set changed — re-read spec 5.6b before widening it",
  );
});

test("topicsForSource: score and setup opt into onboarding plus newsletter", () => {
  assert.deepEqual(topicsForSource("score"), ["onboarding", "newsletter"]);
  assert.deepEqual(topicsForSource("setup"), ["onboarding", "newsletter"]);
});

test("topicsForSource: blog opts into newsletter only", () => {
  assert.deepEqual(topicsForSource("blog"), ["newsletter"]);
});

test("topicsForSource: readiness opts into onboarding only", () => {
  assert.deepEqual(topicsForSource("readiness"), ["onboarding"]);
});
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./contacts.ts`

- [ ] **Step 7: Write `lib/email/contacts.ts`**

```ts
import { normalizeEmail } from "./normalize.ts";
import type { ContactSyncPayload, SignupSource, SubscriberInput } from "./types.ts";

/**
 * Which Resend topics a signup opts into, by where they signed up.
 * Blog readers asked for posts, not onboarding. Diagnostic submitters asked
 * for their result, not a weekly newsletter.
 */
export function topicsForSource(source: SignupSource): string[] {
  switch (source) {
    case "score":
    case "setup":
      return ["onboarding", "newsletter"];
    case "blog":
      return ["newsletter"];
    case "readiness":
      return ["onboarding"];
    case "import":
      return [];
  }
}

/**
 * Builds the OUTBOUND contact payload for Resend.
 *
 * Invariant: this object never carries delivery or opt-out state. Resend owns
 * that and it flows inward via webhook only (spec 5.6b). The safety test in
 * contacts.test.ts pins the exact key set — widen it only after re-reading
 * that section.
 */
export function buildContactSyncPayload(
  input: SubscriberInput,
  audienceId: string,
): ContactSyncPayload {
  const payload: ContactSyncPayload = {
    email: normalizeEmail(input.email),
    audienceId,
    topics: topicsForSource(input.source),
  };
  if (input.name && input.name.trim()) {
    payload.firstName = input.name.trim();
  }
  return payload;
}
```

- [ ] **Step 8: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS — all normalize and contacts tests green.

- [ ] **Step 9: Commit**

```bash
git add lib/email/types.ts lib/email/normalize.ts lib/email/normalize.test.ts lib/email/contacts.ts lib/email/contacts.test.ts
git commit -m "feat(email): contact sync payload with never-push-status invariant"
```

---

## Task 3: Resend HTTP wrapper

**Files:**
- Create: `lib/email/resend.ts`, `lib/email/resend.test.ts`

**Interfaces:**
- Consumes: `ContactSyncPayload` from Task 2
- Produces:
  - `type FetchLike = (url: string, init?: RequestInit) => Promise<Response>`
  - `type ResendClient = { upsertContact(p: ContactSyncPayload): Promise<{ id: string }>; triggerEvent(name: string, email: string, data?: Record<string, unknown>): Promise<void>; addSuppression(email: string): Promise<void> }`
  - `createResendClient(opts: { apiKey: string; fetchImpl?: FetchLike }): ResendClient`

- [ ] **Step 1: Write the failing test**

Create `lib/email/resend.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createResendClient } from "./resend.ts";

function fakeFetch(calls: Array<{ url: string; init?: RequestInit }>, body: unknown = { id: "c_1" }) {
  return async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

test("upsertContact posts to the contacts endpoint with a bearer token", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createResendClient({ apiKey: "re_test", fetchImpl: fakeFetch(calls) });

  const res = await client.upsertContact({
    email: "me@simonparis.ca",
    firstName: "Simon",
    audienceId: "aud_1",
    topics: ["newsletter"],
  });

  assert.equal(res.id, "c_1");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /audiences\/aud_1\/contacts$/);
  const headers = new Headers(calls[0].init?.headers);
  assert.equal(headers.get("authorization"), "Bearer re_test");
});

test("upsertContact body carries email and first_name but no status field", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createResendClient({ apiKey: "re_test", fetchImpl: fakeFetch(calls) });

  await client.upsertContact({
    email: "me@simonparis.ca",
    firstName: "Simon",
    audienceId: "aud_1",
    topics: ["newsletter"],
  });

  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.email, "me@simonparis.ca");
  assert.equal(body.first_name, "Simon");
  assert.equal("unsubscribed" in body, false);
  assert.equal("status" in body, false);
});

test("triggerEvent posts the event name and email", async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const client = createResendClient({ apiKey: "re_test", fetchImpl: fakeFetch(calls, {}) });

  await client.triggerEvent("score.submitted", "me@simonparis.ca", { quiz_score: 11 });

  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.name, "score.submitted");
  assert.equal(body.email, "me@simonparis.ca");
  assert.equal(body.data.quiz_score, 11);
});

test("a non-2xx response throws with the status in the message", async () => {
  const client = createResendClient({
    apiKey: "re_test",
    fetchImpl: async () => new Response('{"message":"nope"}', { status: 422 }),
  });

  await assert.rejects(
    () => client.upsertContact({ email: "me@simonparis.ca", audienceId: "aud_1", topics: [] }),
    /422/,
  );
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./resend.ts`

- [ ] **Step 3: Write `lib/email/resend.ts`**

```ts
import type { ContactSyncPayload } from "./types.ts";

const BASE_URL = "https://api.resend.com";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type ResendClient = {
  upsertContact(p: ContactSyncPayload): Promise<{ id: string }>;
  triggerEvent(name: string, email: string, data?: Record<string, unknown>): Promise<void>;
  addSuppression(email: string): Promise<void>;
};

export function createResendClient(opts: {
  apiKey: string;
  fetchImpl?: FetchLike;
}): ResendClient {
  const doFetch = opts.fetchImpl ?? ((u, i) => fetch(u, i));

  async function request(path: string, body: unknown): Promise<unknown> {
    const res = await doFetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      // Never include the API key or the request body in the message.
      throw new Error(`Resend ${path} failed: ${res.status} ${detail.slice(0, 200)}`);
    }
    return res.status === 204 ? {} : await res.json().catch(() => ({}));
  }

  return {
    async upsertContact(p) {
      // Contacts are upserted by email — no status field, by design (spec 5.6b).
      const body: Record<string, unknown> = { email: p.email, topics: p.topics };
      if (p.firstName) body.first_name = p.firstName;
      const json = (await request(`/audiences/${p.audienceId}/contacts`, body)) as { id?: string };
      return { id: json.id ?? "" };
    },

    async triggerEvent(name, email, data) {
      await request(`/events`, { name, email, data: data ?? {} });
    },

    async addSuppression(email) {
      await request(`/suppressions`, { email });
    },
  };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Verify the endpoint paths against the real API**

Load the `resend-cli` skill, then confirm the contact, event, and suppression paths used above match the current API surface:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://resend.com/docs/api-reference/contacts/create-contact.md
curl -s -o /dev/null -w "%{http_code}\n" https://resend.com/docs/api-reference/suppressions/add-suppression.md
```

Read each page and correct `lib/email/resend.ts` if a path or field name differs. **Do not trust a doc-summarising tool for a negative answer here** — read the page or probe the endpoint (see `docs/lessons.md` 2026-08-05).

- [ ] **Step 6: Commit**

```bash
git add lib/email/resend.ts lib/email/resend.test.ts
git commit -m "feat(email): Resend HTTP wrapper with injectable fetch"
```

---

## Task 4: Subscribe orchestration

**Files:**
- Create: `lib/email/subscribe.ts`, `lib/email/subscribe.test.ts`

**Interfaces:**
- Consumes: `SubscriberInput` (Task 2), `ResendClient` (Task 3)
- Produces:
  - `type SubscribeStore = { upsertSubscriber(row: {email: string; name?: string; locale: string; source: string; topics: string[]; resend_contact_id?: string}): Promise<void>; appendConsent(row: {email: string; event: 'granted'|'withdrawn'; consent_version: string; source_page?: string; locale?: string; ip?: string; user_agent?: string}): Promise<void> }`
  - `type SubscribeDeps = { store: SubscribeStore; resend: ResendClient; audienceId: string; triggerEventName?: string }`
  - `subscribe(input: SubscriberInput, deps: SubscribeDeps): Promise<{ ok: true } | { ok: false; error: string }>`

- [ ] **Step 1: Write the failing test**

Create `lib/email/subscribe.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { subscribe } from "./subscribe.ts";
import type { SubscriberInput } from "./types.ts";

function makeDeps(overrides: Record<string, unknown> = {}) {
  const calls = { subscribers: [] as unknown[], consents: [] as unknown[], contacts: [] as unknown[], events: [] as unknown[] };
  const deps = {
    audienceId: "aud_1",
    triggerEventName: "score.submitted",
    store: {
      async upsertSubscriber(row: unknown) { calls.subscribers.push(row); },
      async appendConsent(row: unknown) { calls.consents.push(row); },
    },
    resend: {
      async upsertContact(p: unknown) { calls.contacts.push(p); return { id: "c_1" }; },
      async triggerEvent(name: string, email: string, data?: unknown) { calls.events.push({ name, email, data }); },
      async addSuppression() {},
    },
    ...overrides,
  };
  return { deps: deps as never, calls };
}

const input: SubscriberInput = {
  email: " ME@SimonParis.CA ",
  name: "Simon",
  locale: "en",
  source: "score",
  consentVersion: "score-v1",
  sourcePage: "/score",
  context: { quiz_score: 11 },
};

test("subscribe writes subscriber, consent, contact, and event", async () => {
  const { deps, calls } = makeDeps();
  const res = await subscribe(input, deps);

  assert.deepEqual(res, { ok: true });
  assert.equal(calls.subscribers.length, 1);
  assert.equal(calls.consents.length, 1);
  assert.equal(calls.contacts.length, 1);
  assert.equal(calls.events.length, 1);
});

test("subscribe normalizes the email everywhere it writes", async () => {
  const { deps, calls } = makeDeps();
  await subscribe(input, deps);

  assert.equal((calls.subscribers[0] as { email: string }).email, "me@simonparis.ca");
  assert.equal((calls.consents[0] as { email: string }).email, "me@simonparis.ca");
  assert.equal((calls.contacts[0] as { email: string }).email, "me@simonparis.ca");
  assert.equal((calls.events[0] as { email: string }).email, "me@simonparis.ca");
});

test("subscribe records consent as granted with the version and source page", async () => {
  const { deps, calls } = makeDeps();
  await subscribe(input, deps);

  const consent = calls.consents[0] as Record<string, string>;
  assert.equal(consent.event, "granted");
  assert.equal(consent.consent_version, "score-v1");
  assert.equal(consent.source_page, "/score");
});

test("subscribe passes context through as automation event data", async () => {
  const { deps, calls } = makeDeps();
  await subscribe(input, deps);

  const evt = calls.events[0] as { data: Record<string, number> };
  assert.equal(evt.data.quiz_score, 11);
});

test("subscribe rejects an invalid email without writing anything", async () => {
  const { deps, calls } = makeDeps();
  const res = await subscribe({ ...input, email: "nope" }, deps);

  assert.equal(res.ok, false);
  assert.equal(calls.subscribers.length, 0);
  assert.equal(calls.consents.length, 0);
  assert.equal(calls.contacts.length, 0);
});

test("subscribe still records consent when Resend is down", async () => {
  const { deps, calls } = makeDeps({
    resend: {
      async upsertContact() { throw new Error("Resend 503"); },
      async triggerEvent() {},
      async addSuppression() {},
    },
  });

  const res = await subscribe(input, deps);

  // The consent record is the legal artifact — it must survive a provider
  // outage. The caller sees the failure so it can retry the Resend side.
  assert.equal(res.ok, false);
  assert.equal(calls.consents.length, 1);
  assert.equal(calls.subscribers.length, 1);
});

test("subscribe skips the trigger event when no event name is configured", async () => {
  const { deps, calls } = makeDeps({ triggerEventName: undefined });
  await subscribe(input, deps);
  assert.equal(calls.events.length, 0);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./subscribe.ts`

- [ ] **Step 3: Write `lib/email/subscribe.ts`**

```ts
import { buildContactSyncPayload, topicsForSource } from "./contacts.ts";
import { isValidEmail, normalizeEmail } from "./normalize.ts";
import type { ResendClient } from "./resend.ts";
import type { SubscriberInput } from "./types.ts";

export type SubscribeStore = {
  upsertSubscriber(row: {
    email: string;
    name?: string;
    locale: string;
    source: string;
    topics: string[];
    resend_contact_id?: string;
  }): Promise<void>;
  appendConsent(row: {
    email: string;
    event: "granted" | "withdrawn";
    consent_version: string;
    source_page?: string;
    locale?: string;
    ip?: string;
    user_agent?: string;
  }): Promise<void>;
};

export type SubscribeDeps = {
  store: SubscribeStore;
  resend: ResendClient;
  audienceId: string;
  /** Resend custom event that triggers the automation for this source. */
  triggerEventName?: string;
};

/**
 * Order matters. Supabase first, Resend second: the consent record is the
 * legal artifact and must survive a provider outage. If Resend fails we still
 * hold proof of consent and can re-sync, but we report failure so the caller
 * knows the welcome email did not go out.
 */
export async function subscribe(
  input: SubscriberInput,
  deps: SubscribeDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidEmail(input.email)) {
    return { ok: false, error: "invalid_email" };
  }

  const email = normalizeEmail(input.email);
  const topics = topicsForSource(input.source);

  await deps.store.upsertSubscriber({
    email,
    name: input.name?.trim() || undefined,
    locale: input.locale,
    source: input.source,
    topics,
  });

  await deps.store.appendConsent({
    email,
    event: "granted",
    consent_version: input.consentVersion,
    source_page: input.sourcePage,
    locale: input.locale,
    ip: input.ip,
    user_agent: input.userAgent,
  });

  try {
    const contact = await deps.resend.upsertContact(
      buildContactSyncPayload({ ...input, email }, deps.audienceId),
    );
    if (contact.id) {
      await deps.store.upsertSubscriber({
        email, locale: input.locale, source: input.source, topics,
        resend_contact_id: contact.id,
      });
    }
    if (deps.triggerEventName) {
      await deps.resend.triggerEvent(deps.triggerEventName, email, input.context);
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "resend_failed" };
  }

  return { ok: true };
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/email/subscribe.ts lib/email/subscribe.test.ts
git commit -m "feat(email): subscribe orchestration, consent-first ordering"
```

---

## Task 5: Rewire the subscribe routes

**Files:**
- Create: `lib/email/store.ts` (Supabase-backed `SubscribeStore`)
- Modify: `app/api/blog-subscribe/route.ts`, `app/api/score-subscribe/route.ts`, `app/api/readiness-diagnostic-subscribe/route.ts`
- Delete: `app/api/subscribe/route.ts`

**Interfaces:**
- Consumes: `subscribe`, `SubscribeDeps` (Task 4), `createResendClient` (Task 3)
- Produces: `createSupabaseStore(): SubscribeStore`, `emailDepsFromEnv(triggerEventName?: string): SubscribeDeps`

- [ ] **Step 1: Write `lib/email/store.ts`**

```ts
import { createSupabaseAdminClient } from "../supabase/admin.ts";
import { createResendClient } from "./resend.ts";
import type { SubscribeDeps, SubscribeStore } from "./subscribe.ts";

export function createSupabaseStore(): SubscribeStore {
  const db = createSupabaseAdminClient();
  return {
    async upsertSubscriber(row) {
      const { error } = await db
        .from("email_subscribers")
        .upsert({ ...row, updated_at: new Date().toISOString(), synced_at: row.resend_contact_id ? new Date().toISOString() : null }, { onConflict: "email" });
      if (error) throw new Error(`email_subscribers upsert failed: ${error.message}`);
    },
    async appendConsent(row) {
      const { error } = await db.from("email_consent_log").insert(row);
      if (error) throw new Error(`email_consent_log insert failed: ${error.message}`);
    },
  };
}

export function emailDepsFromEnv(triggerEventName?: string): SubscribeDeps {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!apiKey || !audienceId) {
    throw new Error("RESEND_API_KEY and RESEND_AUDIENCE_ID must be set");
  }
  return {
    store: createSupabaseStore(),
    resend: createResendClient({ apiKey }),
    audienceId,
    triggerEventName,
  };
}
```

- [ ] **Step 2: Rewrite `app/api/score-subscribe/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/email/subscribe";
import { emailDepsFromEnv } from "@/lib/email/store";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, name, totalScore, locale, scores } = body as {
    email?: string; name?: string; totalScore?: number; locale?: string;
    scores?: { s: number; t: number; a: number; tol: number; e: number };
  };

  if (typeof email !== "string") {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const weakest = scores
    ? (Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? "")
    : "";

  const result = await subscribe(
    {
      email,
      name,
      locale: locale === "fr" ? "fr" : "en",
      source: "score",
      consentVersion: "score-v1",
      sourcePage: "/score",
      context: {
        quiz_score: totalScore ?? 0,
        weakest_pillar: weakest,
        ...(scores ?? {}),
      },
    },
    emailDepsFromEnv("score.submitted"),
  );

  if (!result.ok) {
    if (result.error === "invalid_email") {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    console.error("[score-subscribe]", result.error);
    return NextResponse.json({ error: "Could not complete signup." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Rewrite `app/api/blog-subscribe/route.ts`**

Keep the existing `/setup` lead capture and ntfy behaviour, and **store the real email** this time. Replace the whole file:

```ts
import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/email/subscribe";
import { emailDepsFromEnv } from "@/lib/email/store";
import { normalizeEmail } from "@/lib/email/normalize";

// /setup signups (consentVersion starts with "setup") also land in the
// leads table + fire an ntfy ping. Both are best-effort: the subscribe must
// succeed even when this whole path fails, so every error is logged and
// swallowed.
async function captureSetupLead(email: string, locale: string, consentVersion: string) {
  const ccUrl = process.env.CC_SUPABASE_URL;
  const ccKey = process.env.CC_SUPABASE_SERVICE_KEY;
  const ccOwner = process.env.CC_OWNER_ID;
  if (ccUrl && ccKey && ccOwner) {
    try {
      const res = await fetch(`${ccUrl.replace(/\/$/, "")}/rest/v1/leads`, {
        method: "POST",
        headers: {
          apikey: ccKey,
          Authorization: `Bearer ${ccKey}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          owner_id: ccOwner,
          name: email.split("@")[0],
          email, // was dropped entirely before this change
          channel: "inbound",
          source_ref: "/setup form",
          status: "new",
          next_action: "Reply within a day",
          locale: locale === "fr" ? "fr" : "en",
          notes: `Signed up via /setup form (${consentVersion})`,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error("[blog-subscribe] lead insert failed:", res.status);
      }
    } catch (err) {
      console.error("[blog-subscribe] lead insert error:", err);
    }
  }

  const ntfyUrl = process.env.NTFY_URL;
  if (ntfyUrl) {
    try {
      await fetch(ntfyUrl, {
        method: "POST",
        headers: { Title: "New /setup signup" },
        body: `New /setup signup: ${email} (${locale})`,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      console.error("[blog-subscribe] ntfy error:", err);
    }
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, locale, consentVersion } = body as {
    email?: string; locale?: string; consentVersion?: string;
  };

  if (typeof email !== "string") {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const isSetup = typeof consentVersion === "string" && consentVersion.startsWith("setup");
  const version = consentVersion ?? "blog-cta-v1";

  const result = await subscribe(
    {
      email,
      locale: locale === "fr" ? "fr" : "en",
      source: isSetup ? "setup" : "blog",
      consentVersion: version,
      sourcePage: isSetup ? "/setup" : "/blog",
    },
    emailDepsFromEnv(isSetup ? "setup.signup" : undefined),
  );

  if (!result.ok) {
    if (result.error === "invalid_email") {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    console.error("[blog-subscribe]", result.error);
    return NextResponse.json({ error: "Could not complete signup." }, { status: 502 });
  }

  if (isSetup) {
    await captureSetupLead(normalizeEmail(email), locale ?? "en", version);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Rewrite `app/api/readiness-diagnostic-subscribe/route.ts`**

Keep the ntfy notification; replace the MailerLite call with `subscribe`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/email/subscribe";
import { emailDepsFromEnv } from "@/lib/email/store";

async function notifyNewSubmission(fields: {
  email: string; system_name?: string; industry?: string; locale?: string;
}): Promise<void> {
  const url = process.env.NTFY_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { Title: "New /readiness submission" },
      body: [
        `system_name: ${fields.system_name || "(none)"}`,
        `email: ${fields.email}`,
        `industry: ${fields.industry || "(none)"}`,
        `locale: ${fields.locale || "(none)"}`,
      ].join("\n"),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error("[readiness-diagnostic-subscribe] ntfy error:", err);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, role, system_name, industry, company_size, supabase_row_id, locale } =
    body as {
      email?: string; role?: string; system_name?: string; industry?: string;
      company_size?: string; supabase_row_id?: string; locale?: string;
    };

  if (typeof email !== "string") {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  void notifyNewSubmission({ email: email.trim(), system_name, industry, locale });

  const result = await subscribe(
    {
      email,
      name: role,
      locale: locale === "fr" ? "fr" : "en",
      source: "readiness",
      consentVersion: "readiness-v1",
      sourcePage: "/readiness",
      context: {
        ...(system_name ? { system_name } : {}),
        ...(industry ? { industry } : {}),
        ...(company_size ? { company_size } : {}),
        ...(supabase_row_id ? { supabase_row_id } : {}),
      },
    },
    emailDepsFromEnv("readiness.submitted"),
  );

  if (!result.ok) {
    if (result.error === "invalid_email") {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    console.error("[readiness-diagnostic-subscribe]", result.error);
    return NextResponse.json({ error: "Could not complete signup." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Delete the dead route and confirm nothing referenced it**

```bash
grep -rn "api/subscribe" app components lib --include="*.ts" --include="*.tsx" | grep -v "blog-subscribe\|score-subscribe\|readiness-diagnostic-subscribe"
```

Expected: no output. Then:

```bash
git rm app/api/subscribe/route.ts
```

- [ ] **Step 6: Confirm MailerLite is gone from the routes**

```bash
grep -rn "mailerlite\|MAILERLITE" app lib --include="*.ts" --include="*.tsx"
```

Expected: no output.

- [ ] **Step 7: Typecheck and test**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A lib/email app/api
git commit -m "feat(email): route all subscribe endpoints through Resend, delete dead route"
```

---

## Task 6: React Email scaffolding and the shared layout

**Files:**
- Create: `emails/_layout.tsx`
- Modify: `package.json`, `messages/en.json`, `messages/fr.json`

**Interfaces:**
- Produces: `EmailLayout` React component accepting `{ preview: string; locale: 'en'|'fr'; children: React.ReactNode }`

- [ ] **Step 1: Install React Email**

```bash
npm install react-email @react-email/components
```

- [ ] **Step 2: Add the scripts to `package.json`**

Add to the `scripts` block:

```json
"email:dev": "email dev --dir emails",
"email:sync": "node scripts/email-sync.mjs"
```

- [ ] **Step 3: Add the email copy namespace to `messages/en.json`**

Add a top-level `emails` key:

```json
"emails": {
  "footer": {
    "reason": "You're getting this because you signed up at simonparis.ca.",
    "unsubscribe": "Unsubscribe",
    "address": "Simon Paris · Lévis, Québec, Canada"
  }
}
```

- [ ] **Step 4: Add the same namespace to `messages/fr.json`**

```json
"emails": {
  "footer": {
    "reason": "Vous recevez ce courriel parce que vous vous êtes inscrit sur simonparis.ca.",
    "unsubscribe": "Se désabonner",
    "address": "Simon Paris · Lévis, Québec, Canada"
  }
}
```

- [ ] **Step 5: Write `emails/_layout.tsx`**

Load the `react-email` skill first for component and styling guidance. Brand: white background, near-black text, `#E04500` for the primary action, `#C97A1A` for links, zero border-radius.

```tsx
import {
  Body, Container, Head, Hr, Html, Link, Preview, Section, Text,
} from "@react-email/components";
import * as React from "react";

export type EmailLayoutProps = {
  preview: string;
  locale: "en" | "fr";
  copy: { reason: string; unsubscribe: string; address: string };
  children: React.ReactNode;
};

// CASL requires sender identification and a working unsubscribe in every
// marketing email. RESEND_UNSUBSCRIBE_URL is a reserved Resend variable
// substituted at send time — do not replace it with our own URL.
export function EmailLayout({ preview, locale, copy, children }: EmailLayoutProps) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 24px" }}>
          {children}
          <Hr style={{ borderColor: "#e5e5e5", margin: "40px 0 16px" }} />
          <Section>
            <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#6b6b6b", margin: "0 0 8px" }}>
              {copy.reason}
            </Text>
            <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#6b6b6b", margin: "0 0 8px" }}>
              <Link href="{{RESEND_UNSUBSCRIBE_URL}}" style={{ color: "#C97A1A", textDecoration: "underline" }}>
                {copy.unsubscribe}
              </Link>
            </Text>
            <Text style={{ fontSize: "12px", lineHeight: "18px", color: "#9a9a9a", margin: 0 }}>
              {copy.address}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 6: Verify the preview server renders it**

```bash
npm run email:dev
```

Open http://localhost:3000. Confirm `_layout` appears in the sidebar and renders without error. Check the Compatibility and Spam tabs show no errors. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json emails/_layout.tsx messages/en.json messages/fr.json
git commit -m "feat(email): React Email scaffolding and shared brand layout"
```

---

## Task 7: The `/score` welcome emails

Replaces four stale MailerLite emails written for the retired PDF checklist. Read `brand/brand-summary.md` in the MetaArchitect repo before writing copy.

**Files:**
- Create: `emails/score-welcome-1.tsx`, `emails/score-welcome-2.tsx`
- Modify: `messages/en.json`, `messages/fr.json`

**Interfaces:**
- Consumes: `EmailLayout` (Task 6)
- Produces: default-exported components accepting `{ locale, copy, firstName, quizScore, weakestPillar }`

- [ ] **Step 1: Add email 1 copy to `messages/en.json` under `emails`**

```json
"scoreWelcome1": {
  "subject": "Your STATE score: {score}/25",
  "preview": "What your score says about where your system will break first.",
  "heading": "Your STATE score is {score}/25",
  "body1": "You answered honestly, which is the hard part. Here's what the number means: STATE measures whether your system can tell you what it did. Most systems that fail in production don't fail because the model was wrong — they fail because nobody could reconstruct what happened.",
  "body2": "Your weakest pillar is {pillar}. That's where your next outage comes from.",
  "cta": "Re-run the scorecard on a real system",
  "closing": "Reply to this email with what you scored. I read every one."
}
```

- [ ] **Step 2: Add the French translation to `messages/fr.json`**

```json
"scoreWelcome1": {
  "subject": "Votre score STATE : {score}/25",
  "preview": "Ce que votre score révèle sur le prochain point de rupture.",
  "heading": "Votre score STATE est {score}/25",
  "body1": "Vous avez répondu honnêtement, et c'est le plus difficile. Voici ce que le chiffre signifie : STATE mesure si votre système peut vous dire ce qu'il a fait. La plupart des systèmes qui échouent en production n'échouent pas parce que le modèle avait tort — ils échouent parce que personne ne pouvait reconstituer ce qui s'est passé.",
  "body2": "Votre pilier le plus faible est {pillar}. C'est de là que viendra votre prochaine panne.",
  "cta": "Refaire l'évaluation sur un vrai système",
  "closing": "Répondez à ce courriel avec votre score. Je les lis tous."
}
```

- [ ] **Step 3: Write `emails/score-welcome-1.tsx`**

```tsx
import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout.tsx";

export type ScoreWelcome1Props = {
  locale: "en" | "fr";
  copy: {
    preview: string; heading: string; body1: string; body2: string;
    cta: string; closing: string;
    footer: { reason: string; unsubscribe: string; address: string };
  };
};

// Per-recipient values come from Resend template variables, substituted at
// send time. SCORE and WEAKEST_PILLAR are declared in emails/automations.json.
export default function ScoreWelcome1({ locale = "en", copy }: ScoreWelcome1Props) {
  const fill = (s: string) =>
    s.replace("{score}", "{{SCORE}}").replace("{pillar}", "{{WEAKEST_PILLAR}}");

  return (
    <EmailLayout preview={fill(copy.preview)} locale={locale} copy={copy.footer}>
      <Heading style={{ fontSize: "24px", lineHeight: "32px", fontWeight: 600, color: "#111111", margin: "0 0 24px" }}>
        {fill(copy.heading)}
      </Heading>
      <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#333333", margin: "0 0 20px" }}>
        {fill(copy.body1)}
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#333333", margin: "0 0 28px" }}>
        {fill(copy.body2)}
      </Text>
      <Section style={{ margin: "0 0 28px" }}>
        <Button
          href="https://simonparis.ca/score"
          style={{ backgroundColor: "#E04500", color: "#ffffff", fontSize: "15px", fontWeight: 600, padding: "14px 24px", borderRadius: "0px", textDecoration: "none", display: "inline-block" }}
        >
          {copy.cta}
        </Button>
      </Section>
      <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#333333", margin: 0 }}>
        {copy.closing}
      </Text>
    </EmailLayout>
  );
}
```

- [ ] **Step 4: Add email 2 copy to both message files**

`messages/en.json` under `emails`:

```json
"scoreWelcome2": {
  "subject": "The pillar you scored lowest on",
  "preview": "Structured, Traceable, Auditable, Tolerant, Explicit — and which one to fix first.",
  "heading": "Fix {pillar} first",
  "body1": "Three days ago you scored {score}/25. If you only change one thing, change {pillar} — it's the pillar that makes every other one measurable.",
  "body2": "State beats intelligence. A dumber system that records what it did beats a smarter one that can't tell you. That's the whole thesis, and it's why the scorecard weights traceability the way it does.",
  "cta": "Read the teardowns",
  "closing": "— Simon"
}
```

`messages/fr.json`:

```json
"scoreWelcome2": {
  "subject": "Le pilier où votre score est le plus faible",
  "preview": "Structured, Traceable, Auditable, Tolerant, Explicit — et lequel corriger en premier.",
  "heading": "Corrigez {pillar} en premier",
  "body1": "Il y a trois jours, vous avez obtenu {score}/25. Si vous ne changez qu'une seule chose, changez {pillar} — c'est le pilier qui rend tous les autres mesurables.",
  "body2": "L'état bat l'intelligence. Un système plus bête qui enregistre ce qu'il a fait bat un système plus intelligent incapable de vous le dire. C'est toute la thèse, et c'est pourquoi l'évaluation pondère la traçabilité comme elle le fait.",
  "cta": "Lire les analyses",
  "closing": "— Simon"
}
```

- [ ] **Step 5: Write `emails/score-welcome-2.tsx`**

```tsx
import { Button, Heading, Section, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./_layout.tsx";

export type ScoreWelcome2Props = {
  locale: "en" | "fr";
  copy: {
    preview: string; heading: string; body1: string; body2: string;
    cta: string; closing: string;
    footer: { reason: string; unsubscribe: string; address: string };
  };
};

export default function ScoreWelcome2({ locale = "en", copy }: ScoreWelcome2Props) {
  const fill = (s: string) =>
    s.replace("{score}", "{{SCORE}}").replace("{pillar}", "{{WEAKEST_PILLAR}}");

  return (
    <EmailLayout preview={fill(copy.preview)} locale={locale} copy={copy.footer}>
      <Heading style={{ fontSize: "24px", lineHeight: "32px", fontWeight: 600, color: "#111111", margin: "0 0 24px" }}>
        {fill(copy.heading)}
      </Heading>
      <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#333333", margin: "0 0 20px" }}>
        {fill(copy.body1)}
      </Text>
      <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#333333", margin: "0 0 28px" }}>
        {fill(copy.body2)}
      </Text>
      <Section style={{ margin: "0 0 28px" }}>
        <Button
          href="https://simonparis.ca/blog"
          style={{ backgroundColor: "#E04500", color: "#ffffff", fontSize: "15px", fontWeight: 600, padding: "14px 24px", borderRadius: "0px", textDecoration: "none", display: "inline-block" }}
        >
          {copy.cta}
        </Button>
      </Section>
      <Text style={{ fontSize: "16px", lineHeight: "26px", color: "#333333", margin: 0 }}>
        {copy.closing}
      </Text>
    </EmailLayout>
  );
}
```

- [ ] **Step 6: Review both in the preview server, both locales**

```bash
npm run email:dev
```

For each of the two templates: check the Linter tab (no broken links), the Compatibility tab (no unsupported CSS), and the Spam tab. Confirm the unsubscribe link and address render in the footer. **Confirm no email says "DOWNLOAD THE CHECKLIST" or "TÉLÉCHARGER LA LISTE"** — that legacy framing is what this task exists to remove.

- [ ] **Step 7: Commit**

```bash
git add emails/score-welcome-1.tsx emails/score-welcome-2.tsx messages/en.json messages/fr.json
git commit -m "feat(email): rewrite /score welcome sequence, EN + FR"
```

---

## Task 8: Template + automation sync script

**Files:**
- Create: `emails/automations.json`, `scripts/email-sync.mjs`

**Interfaces:**
- Consumes: templates from Tasks 6–7
- Produces: CLI `node scripts/email-sync.mjs [--apply] [--contacts]`

- [ ] **Step 1: Write `emails/automations.json`**

```json
{
  "automations": [
    {
      "name": "Score welcome (EN)",
      "status": "disabled",
      "steps": [
        { "key": "start", "type": "trigger", "config": { "event_name": "score.submitted" } },
        { "key": "gate_en", "type": "condition", "config": { "field": "locale", "operator": "equals", "value": "en" } },
        { "key": "email1", "type": "send_email", "config": { "template": { "alias": "score-welcome-1-en" } } },
        { "key": "wait", "type": "delay", "config": { "duration": 72, "unit": "hours" } },
        { "key": "email2", "type": "send_email", "config": { "template": { "alias": "score-welcome-2-en" } } }
      ],
      "connections": [
        { "from": "start", "to": "gate_en" },
        { "from": "gate_en", "to": "email1" },
        { "from": "email1", "to": "wait" },
        { "from": "wait", "to": "email2" }
      ]
    },
    {
      "name": "Score welcome (FR)",
      "status": "disabled",
      "steps": [
        { "key": "start", "type": "trigger", "config": { "event_name": "score.submitted" } },
        { "key": "gate_fr", "type": "condition", "config": { "field": "locale", "operator": "equals", "value": "fr" } },
        { "key": "email1", "type": "send_email", "config": { "template": { "alias": "score-welcome-1-fr" } } },
        { "key": "wait", "type": "delay", "config": { "duration": 72, "unit": "hours" } },
        { "key": "email2", "type": "send_email", "config": { "template": { "alias": "score-welcome-2-fr" } } }
      ],
      "connections": [
        { "from": "start", "to": "gate_fr" },
        { "from": "gate_fr", "to": "email1" },
        { "from": "email1", "to": "wait" },
        { "from": "wait", "to": "email2" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify the step and condition schemas against the docs before coding the sync**

Load the `resend` skill and read `references/automations.md`. Then read:

```bash
curl -sL https://resend.com/docs/dashboard/automations/condition.md | head -60
curl -sL https://resend.com/docs/dashboard/automations/delay.md | head -40
```

Correct the `config` shapes in `emails/automations.json` to match the documented `Step Properties` exactly. The field names above (`duration`/`unit`, `field`/`operator`/`value`) are the plan's best guess from the create-automation example and **must be reconciled with the docs** — a wrong config shape fails at apply time, which is the cheap failure, but fix it here rather than debugging it later.

- [ ] **Step 3: Write `scripts/email-sync.mjs`**

```js
#!/usr/bin/env node
/**
 * Syncs email content from this repo to Resend. Idempotent: templates are
 * upserted by stable alias, automations by name.
 *
 * Usage:
 *   node scripts/email-sync.mjs              # dry run (default)
 *   node scripts/email-sync.mjs --apply      # write to Resend
 *   node scripts/email-sync.mjs --contacts   # contact drift report only
 *
 * Source of truth is this repo. Resend is the runtime.
 */
import { readFile } from "node:fs/promises";
import { render } from "@react-email/render";
import React from "react";

const API = "https://api.resend.com";
const APPLY = process.argv.includes("--apply");
const CONTACTS_ONLY = process.argv.includes("--contacts");
const KEY = process.env.RESEND_API_KEY;

if (!KEY) {
  console.error("RESEND_API_KEY is not set");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  return res.status === 204 ? {} : res.json();
}

const TEMPLATES = [
  { module: "../emails/score-welcome-1.tsx", base: "score-welcome-1", copyKey: "scoreWelcome1" },
  { module: "../emails/score-welcome-2.tsx", base: "score-welcome-2", copyKey: "scoreWelcome2" },
];

const VARIABLES = [
  { key: "SCORE", type: "number", fallback_value: 0 },
  { key: "WEAKEST_PILLAR", type: "string", fallback_value: "traceability" },
];

async function loadMessages(locale) {
  return JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
}

async function syncTemplates() {
  const existing = await api("GET", "/templates");
  const byAlias = new Map((existing.data ?? []).map((t) => [t.alias, t.id]));

  for (const locale of ["en", "fr"]) {
    const messages = await loadMessages(locale);
    for (const t of TEMPLATES) {
      const { default: Component } = await import(t.module);
      const copy = { ...messages.emails[t.copyKey], footer: messages.emails.footer };
      const html = await render(React.createElement(Component, { locale, copy }));
      const text = await render(React.createElement(Component, { locale, copy }), { plainText: true });
      const alias = `${t.base}-${locale}`;

      const payload = {
        name: `${t.base} (${locale})`,
        alias,
        subject: copy.subject.replace("{score}", "{{SCORE}}").replace("{pillar}", "{{WEAKEST_PILLAR}}"),
        from: "Simon Paris <simon@mail.simonparis.ca>",
        reply_to: "simon@simonparis.ca",
        html,
        text,
        variables: VARIABLES,
      };

      const id = byAlias.get(alias);
      if (!APPLY) {
        console.log(`[dry-run] ${id ? "update" : "create"} template ${alias} (${html.length} bytes html)`);
        continue;
      }
      if (id) {
        await api("PATCH", `/templates/${id}`, payload);
      } else {
        const created = await api("POST", "/templates", payload);
        byAlias.set(alias, created.id);
      }
      await api("POST", `/templates/${byAlias.get(alias)}/publish`, {});
      console.log(`synced template ${alias}`);
    }
  }
}

async function syncAutomations() {
  const spec = JSON.parse(await readFile(new URL("../emails/automations.json", import.meta.url), "utf8"));
  const existing = await api("GET", "/automations");
  const byName = new Map((existing.data ?? []).map((a) => [a.name, a.id]));

  for (const a of spec.automations) {
    const id = byName.get(a.name);
    if (!APPLY) {
      console.log(`[dry-run] ${id ? "update" : "create"} automation "${a.name}" (${a.steps.length} steps)`);
      continue;
    }
    // status is never changed by sync — enabling an automation is a human act.
    const { status, ...rest } = a;
    if (id) {
      await api("PATCH", `/automations/${id}`, rest);
    } else {
      await api("POST", "/automations", { ...rest, status: "disabled" });
    }
    console.log(`synced automation "${a.name}"`);
  }
}

async function contactDriftReport() {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: local, error } = await db
    .from("email_subscribers")
    .select("email, delivery_status, resend_contact_id");
  if (error) throw new Error(error.message);

  const remote = await api("GET", `/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`);
  const remoteByEmail = new Map((remote.data ?? []).map((c) => [c.email, c]));

  const missingRemote = local.filter((l) => !remoteByEmail.has(l.email));
  const statusDrift = local.filter((l) => {
    const r = remoteByEmail.get(l.email);
    if (!r) return false;
    const remoteUnsub = r.unsubscribed === true;
    const localUnsub = l.delivery_status !== "active";
    return remoteUnsub !== localUnsub;
  });

  console.log(`contacts: ${local.length} local, ${remoteByEmail.size} in Resend`);
  console.log(`missing from Resend: ${missingRemote.length}`);
  console.log(`status drift: ${statusDrift.length}`);
  for (const d of statusDrift) {
    // Resend always wins. Report only; the webhook is the write path.
    console.log(`  DRIFT ${d.email}: local=${d.delivery_status}, Resend is authoritative`);
  }
}

if (CONTACTS_ONLY) {
  await contactDriftReport();
} else {
  await syncTemplates();
  await syncAutomations();
  if (!APPLY) console.log("\nDry run. Re-run with --apply to write.");
}
```

- [ ] **Step 4: Verify the dry run writes nothing**

```bash
cd projects/simonparis-website
node scripts/email-sync.mjs
```

Expected: prints `[dry-run] create template score-welcome-1-en …` for four templates and two automations, ends with "Dry run." Then confirm nothing was created:

```bash
node -e "fetch('https://api.resend.com/templates',{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY}}).then(r=>r.json()).then(d=>console.log('templates in Resend:',(d.data??[]).length))"
```

Expected: `0`.

- [ ] **Step 5: Apply, then verify idempotency**

```bash
node scripts/email-sync.mjs --apply
node scripts/email-sync.mjs --apply
```

Expected: first run creates 4 templates + 2 automations. Second run updates in place — still exactly 4 templates and 2 automations, no duplicates:

```bash
node -e "fetch('https://api.resend.com/templates',{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY}}).then(r=>r.json()).then(d=>console.log((d.data??[]).map(t=>t.alias).sort()))"
```

Expected: `['score-welcome-1-en','score-welcome-1-fr','score-welcome-2-en','score-welcome-2-fr']`

- [ ] **Step 6: Confirm automations are still disabled**

```bash
node -e "fetch('https://api.resend.com/automations',{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY}}).then(r=>r.json()).then(d=>console.log((d.data??[]).map(a=>[a.name,a.status])))"
```

Expected: both `disabled`. Sync must never enable an automation.

- [ ] **Step 7: Register the script in the toolbox index**

Add to `scripts/INDEX.md` in the **MetaArchitect** repo:

```
- projects/simonparis-website/scripts/email-sync.mjs — renders emails/*.tsx and upserts Resend templates (by alias) + automations (by name). Dry-run by default; --apply writes; --contacts reports local↔Resend drift. Never enables an automation and never pushes delivery_status.
```

- [ ] **Step 8: Commit**

```bash
git add emails/automations.json scripts/email-sync.mjs
git commit -m "feat(email): idempotent template and automation sync from repo to Resend"
```

---

## Task 9: Webhook receiver

**Files:**
- Create: `lib/email/webhook.ts`, `lib/email/webhook.test.ts`, `app/api/email/webhook/route.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces:
  - `verifySvixSignature(opts: { payload: string; svixId: string; svixTimestamp: string; svixSignature: string; secret: string }): boolean`
  - `type WebhookEffect = { kind: 'none' } | { kind: 'mark_status'; email: string; status: 'unsubscribed'|'bounced'|'complained' }`
  - `effectForEvent(event: { type: string; data: Record<string, unknown> }): WebhookEffect`

- [ ] **Step 1: Write the failing test**

Create `lib/email/webhook.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { effectForEvent, verifySvixSignature } from "./webhook.ts";

const SECRET = "whsec_dGVzdHNlY3JldA==";

function sign(payload: string, id: string, ts: string, secret: string) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${payload}`).digest("base64");
  return `v1,${sig}`;
}

test("verifySvixSignature accepts a correctly signed payload", () => {
  const payload = '{"type":"email.bounced"}';
  const id = "msg_1";
  const ts = String(Math.floor(Date.now() / 1000));
  assert.equal(
    verifySvixSignature({ payload, svixId: id, svixTimestamp: ts, svixSignature: sign(payload, id, ts, SECRET), secret: SECRET }),
    true,
  );
});

test("verifySvixSignature rejects a tampered payload", () => {
  const id = "msg_1";
  const ts = String(Math.floor(Date.now() / 1000));
  const good = sign('{"type":"email.bounced"}', id, ts, SECRET);
  assert.equal(
    verifySvixSignature({ payload: '{"type":"email.delivered"}', svixId: id, svixTimestamp: ts, svixSignature: good, secret: SECRET }),
    false,
  );
});

test("verifySvixSignature rejects a wrong secret", () => {
  const payload = '{"type":"email.bounced"}';
  const id = "msg_1";
  const ts = String(Math.floor(Date.now() / 1000));
  assert.equal(
    verifySvixSignature({ payload, svixId: id, svixTimestamp: ts, svixSignature: sign(payload, id, ts, "whsec_b3RoZXI="), secret: SECRET }),
    false,
  );
});

test("verifySvixSignature rejects an empty signature", () => {
  assert.equal(
    verifySvixSignature({ payload: "{}", svixId: "m", svixTimestamp: "1", svixSignature: "", secret: SECRET }),
    false,
  );
});

test("effectForEvent maps a hard bounce to bounced", () => {
  assert.deepEqual(
    effectForEvent({ type: "email.bounced", data: { to: ["a@b.com"], bounce: { type: "hard" } } }),
    { kind: "mark_status", email: "a@b.com", status: "bounced" },
  );
});

test("effectForEvent ignores a soft bounce", () => {
  assert.deepEqual(
    effectForEvent({ type: "email.bounced", data: { to: ["a@b.com"], bounce: { type: "soft" } } }),
    { kind: "none" },
  );
});

test("effectForEvent maps a complaint to complained", () => {
  assert.deepEqual(
    effectForEvent({ type: "email.complained", data: { to: ["a@b.com"] } }),
    { kind: "mark_status", email: "a@b.com", status: "complained" },
  );
});

test("effectForEvent maps a contact unsubscribe", () => {
  assert.deepEqual(
    effectForEvent({ type: "contact.updated", data: { email: "a@b.com", unsubscribed: true } }),
    { kind: "mark_status", email: "a@b.com", status: "unsubscribed" },
  );
});

test("effectForEvent ignores delivered and opened", () => {
  assert.deepEqual(effectForEvent({ type: "email.delivered", data: { to: ["a@b.com"] } }), { kind: "none" });
  assert.deepEqual(effectForEvent({ type: "email.opened", data: { to: ["a@b.com"] } }), { kind: "none" });
});

test("effectForEvent lowercases the email it reports", () => {
  assert.deepEqual(
    effectForEvent({ type: "email.complained", data: { to: ["MixedCase@B.com"] } }),
    { kind: "mark_status", email: "mixedcase@b.com", status: "complained" },
  );
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./webhook.ts`

- [ ] **Step 3: Write `lib/email/webhook.ts`**

```ts
import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./normalize.ts";

export type WebhookEffect =
  | { kind: "none" }
  | { kind: "mark_status"; email: string; status: "unsubscribed" | "bounced" | "complained" };

/**
 * Svix signature verification. A public webhook URL is world-postable — without
 * this, anyone could POST fabricated unsubscribe or bounce events.
 */
export function verifySvixSignature(opts: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  secret: string;
}): boolean {
  if (!opts.svixSignature) return false;

  const key = Buffer.from(opts.secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${opts.svixId}.${opts.svixTimestamp}.${opts.payload}`)
    .digest("base64");

  // The header may carry several space-separated versioned signatures.
  return opts.svixSignature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

function firstRecipient(data: Record<string, unknown>): string | undefined {
  if (typeof data.email === "string") return data.email;
  const to = data.to;
  if (Array.isArray(to) && typeof to[0] === "string") return to[0];
  return undefined;
}

/**
 * Maps a Resend event to the single local effect it should have.
 *
 * Note what is NOT here: nothing suppresses sending. Resend enforces opt-out
 * at send time, so this handler only keeps our own records in step (spec 5.7).
 */
export function effectForEvent(event: {
  type: string;
  data: Record<string, unknown>;
}): WebhookEffect {
  const email = firstRecipient(event.data);
  if (!email) return { kind: "none" };

  switch (event.type) {
    case "email.bounced": {
      const bounce = event.data.bounce as { type?: string } | undefined;
      // Soft bounces are transient — a full mailbox is not a dead address.
      if (bounce?.type !== "hard") return { kind: "none" };
      return { kind: "mark_status", email: normalizeEmail(email), status: "bounced" };
    }
    case "email.complained":
      return { kind: "mark_status", email: normalizeEmail(email), status: "complained" };
    case "contact.updated":
      return event.data.unsubscribed === true
        ? { kind: "mark_status", email: normalizeEmail(email), status: "unsubscribed" }
        : { kind: "none" };
    default:
      return { kind: "none" };
  }
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Write `app/api/email/webhook/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { effectForEvent, verifySvixSignature } from "@/lib/email/webhook";

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[email-webhook] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const raw = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";

  if (!verifySvixSignature({ payload: raw, svixId, svixTimestamp, svixSignature, secret })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // svix_id is the idempotency key: Resend guarantees at-least-once delivery,
  // so duplicates are normal. A conflict means we already handled this event.
  const { error: ledgerError } = await db.from("email_events").insert({
    svix_id: svixId,
    event_type: event.type,
    email: (event.data.email as string) ?? null,
    payload: event,
  });
  if (ledgerError) {
    if (ledgerError.code === "23505" || /duplicate key/i.test(ledgerError.message)) {
      return NextResponse.json({ ok: true, note: "duplicate" });
    }
    console.error("[email-webhook] ledger insert failed:", ledgerError.message);
    return NextResponse.json({ error: "ledger failed" }, { status: 500 });
  }

  const effect = effectForEvent(event);
  if (effect.kind === "mark_status") {
    await db
      .from("email_subscribers")
      .update({ delivery_status: effect.status, updated_at: new Date().toISOString() })
      .eq("email", effect.email);

    if (effect.status === "unsubscribed") {
      await db.from("email_consent_log").insert({
        email: effect.email,
        event: "withdrawn",
        consent_version: "resend-hosted",
        source_page: "resend-unsubscribe",
      });
    }

    // Make a dead or hostile address visible in the CRM.
    if (effect.status !== "unsubscribed") {
      await db.from("leads").update({ notes: `email ${effect.status}` }).eq("email", effect.email);
    }
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Register the webhook in Resend and verify a real delivery**

Load the `resend-cli` skill, then register the endpoint and capture the signing secret:

```bash
resend webhooks create \
  --endpoint https://simonparis.ca/api/email/webhook \
  --events email.bounced,email.complained,contact.updated
```

Put the returned signing secret in Vercel as `RESEND_WEBHOOK_SECRET` and in `.env`. Then confirm rejection of an unsigned request against the deployed route:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://simonparis.ca/api/email/webhook \
  -H 'Content-Type: application/json' -d '{"type":"email.bounced","data":{}}'
```

Expected: `401`.

- [ ] **Step 7: Commit**

```bash
git add lib/email/webhook.ts lib/email/webhook.test.ts app/api/email/webhook/route.ts
git commit -m "feat(email): Svix-verified webhook receiver with idempotency ledger"
```

---

## Task 10: Remaining surfaces — privacy, admin, i18n, env

**Files:**
- Modify: `app/[locale]/privacy/page.tsx`, `app/admin/(authed)/leads/page.tsx`, `components/ReadinessDiagnosticClient.tsx`, `components/blog/PostCTA.tsx`, `messages/en.json`, `messages/fr.json`, `.env.local.example`

- [ ] **Step 1: Find every MailerLite mention in user-facing surfaces**

```bash
grep -rn "MailerLite\|mailerlite\|error_mailerlite" app components messages --include="*.tsx" --include="*.ts" --include="*.json"
```

Record the list; every hit must be resolved by the end of this task.

- [ ] **Step 2: Update the privacy page, both locales**

In `app/[locale]/privacy/page.tsx` (and any localized copy in `messages/*.json` it reads), replace the MailerLite subprocessor disclosure with Resend. Law 25 requires this be accurate. The replacement names the processor, its purpose, and where data is held:

- EN: "Resend (email delivery and list management)"
- FR: "Resend (livraison de courriels et gestion de la liste)"

- [ ] **Step 3: Rename the provider-leaking error state**

In `components/ReadinessDiagnosticClient.tsx`, rename the `SubmitState` member `error_mailerlite` → `error_subscribe` everywhere it appears (type, `setSubmitState` calls, the JSX branch at ~line 1293). Then rename the matching i18n key in `messages/en.json` and `messages/fr.json` from `errors.mailerlite` (or equivalent — use the grep from Step 1) to `errors.subscribe`, keeping the user-visible wording unchanged.

- [ ] **Step 4: Fix the stale comment in `components/blog/PostCTA.tsx`**

Replace `// Captures email into the "Blog Readers" MailerLite group.` with `// Captures email into the Resend audience with the newsletter topic.`

- [ ] **Step 5: Fix `/admin/leads`**

In `app/admin/(authed)/leads/page.tsx`:
- Add `email` to the `select` list: `'id, email, name, source_ref, status, created_at'`
- Add an Email column to the table header and body
- Delete the stale comment block at the top saying there is no leads table and MailerLite is the source of truth
- Change the `status` prop text from `table missing · MailerLite is source of truth · /score + /audit` to `{n} lead(s) · /setup + inbound`

- [ ] **Step 6: Update `.env.local.example`**

Remove `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID_BLOG`, `MAILERLITE_GROUP_ID_CHECKLIST`, `MAILERLITE_GROUP_ID_DIAGNOSTIC`. Add:

```
# Resend — email delivery, contacts, automations
RESEND_API_KEY=
RESEND_AUDIENCE_ID=
RESEND_WEBHOOK_SECRET=

# Supabase service role (server only, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=

# Command Center Supabase — /setup lead capture
CC_SUPABASE_URL=
CC_SUPABASE_SERVICE_KEY=
CC_OWNER_ID=
```

- [ ] **Step 7: Verify no MailerLite reference survives**

```bash
grep -rn "MailerLite\|mailerlite\|MAILERLITE" app components lib messages scripts .env.local.example --include="*.ts" --include="*.tsx" --include="*.json" --include="*.mjs" --include="*.example"
```

Expected: no output.

- [ ] **Step 8: Typecheck, test, build**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: clean typecheck, tests pass, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore(email): purge MailerLite from privacy, admin, i18n, and env"
```

---

## Task 11: Cutover

**Blocked on:** the story-pipeline verify-stage fix (spec §11 finding 1). Fake signups must not be able to reach the new list. Confirm that fix has shipped before Step 4.

- [ ] **Step 1: Deploy**

Merge the branch and confirm the Vercel production deploy is green. Verify `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`, `RESEND_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` are all set in Production.

- [ ] **Step 2: Live-test the subscribe path with Simon's own address**

Submit the real `/score` form at https://simonparis.ca/score using `me+resendtest@simonparis.ca`. Then verify all four writes landed:

```sql
select email, source, locale, delivery_status, resend_contact_id
from public.email_subscribers where email like 'me+resendtest%';

select email, event, consent_version, source_page
from public.email_consent_log where email like 'me+resendtest%';
```

Expected: one subscriber row with a non-null `resend_contact_id`, one `granted` consent row.

- [ ] **Step 3: Confirm the contact reached Resend**

```bash
resend contacts list --audience-id "$RESEND_AUDIENCE_ID" | grep resendtest
```

Expected: the contact exists, `unsubscribed: false`.

- [ ] **Step 4: Enable the automations and confirm delivery**

```bash
resend automations update <en-automation-id> --status enabled
resend automations update <fr-automation-id> --status enabled
```

Re-submit `/score` with `me+resendlive@simonparis.ca`. Confirm email 1 arrives in Simon's inbox. **Report this as "pending Simon's live check" — agents have no read access to his inbox.** Check `resend logs list` for the send record.

- [ ] **Step 5: Live-test unsubscribe end to end**

Click the unsubscribe link in the received email. Then confirm the webhook wrote inward:

```sql
select email, delivery_status from public.email_subscribers where email like 'me+resendlive%';
select email, event, consent_version from public.email_consent_log
where email like 'me+resendlive%' order by occurred_at;
```

Expected: `delivery_status = 'unsubscribed'`, and a second consent row with `event='withdrawn'`, `consent_version='resend-hosted'`.

- [ ] **Step 6: Confirm the drift report is clean**

```bash
node scripts/email-sync.mjs --contacts
```

Expected: `status drift: 0`.

- [ ] **Step 7: Clean up the test contacts**

Delete the two test rows from `email_subscribers` and the test contacts from Resend. **Leave the `email_consent_log` rows** — that table is append-only by design.

- [ ] **Step 8: Retire MailerLite**

Only after Steps 2–6 all passed:
1. Delete the MailerLite account.
2. **Revoke the MailerLite API key** — it was exposed in a session transcript on 2026-08-04 (spec §11 context).
3. Remove `MAILERLITE_*` env vars from Vercel (Production, Preview, Development).
4. **Clean the root-domain DNS.** Edit the root `simonparis.ca` SPF record to drop the MailerLite include — from `v=spf1 include:zohomail.com a mx include:_spf.mlsend.com ~all` to `v=spf1 include:zohomail.com a mx ~all`. Leave the Zoho include alone; that is his real inbound/outbound mail and breaking it breaks his client email.
5. Delete the two stale verification TXT records on the root: `mailerlite-domain-verification=2777109984bd4ca4c8a0bb58af91a900aedb57a9` and `brevo-code:7866d9ed6d243e510475021503538699` (Brevo is another abandoned provider).
6. Verify the root SPF still resolves and still authorises Zoho:

```bash
dig +short simonparis.ca TXT | grep spf
```

Expected: exactly one SPF record, containing `include:zohomail.com`, with no `mlsend` or `brevo` reference. **Send yourself a test email from Zoho afterwards to confirm client mail still works** — an SPF edit is the one step in this plan that can break something Simon uses daily.

- [ ] **Step 9: Close the goals**

Mark `af0cc0d6` and `f176b2be` complete (the stale `/score` emails no longer exist). Append a one-liner to `7bcf50d5` ("Decide leads source") recording the decision: Supabase `email_subscribers` is the list of record, synced to Resend; `leads` remains the CRM.

- [ ] **Step 10: Commit any cleanup**

```bash
git add -A
git commit -m "chore(email): cutover complete, MailerLite retired"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| §5.1 sending domain | Prereq P1 |
| §5.2 topics | Task 2 (`topicsForSource`), Task 11 (live verify) |
| §5.3 content, next-intl i18n | Tasks 6, 7 |
| §5.4 sync script | Task 8 |
| §5.4b CLI over MCP | Global Constraints (skills), used in Tasks 8, 9, 11 |
| §5.5 subscribe path | Tasks 4, 5 |
| §5.6 schema (3 tables + leads.email) | Task 1 |
| §5.6b per-field sync authority | Task 2 Step 5 (safety test), Task 8 (drift report), Task 9 (inward only) |
| §5.7 webhook | Task 9 |
| §6 website changes | Tasks 5, 10 |
| §7 content rewrite | Task 7 |
| §8 build sequence | Task order |
| §9 test plan | Tasks 2, 3, 4, 8, 9 |
| §10 risk: broadcast blast radius | **Gap — see below** |
| §11 verify-stage fix | Task 11 blocker |

**Gap found and resolved:** §10's "a script can email the entire list in one line" mitigation has no task, because no broadcast-sending code exists yet in this plan — the newsletter is deferred to goal `4a02d3ce` per §7. Recorded here so it is not lost: **the first task of the newsletter build must be the dry-run-by-default + recipient-count-confirmation guard, before any broadcast send path exists.** `email-sync.mjs` already establishes the dry-run-default pattern to follow.

**Placeholder scan:** clean. Task 8 Step 2 asks the implementer to reconcile automation `config` shapes against the live docs — that is a verification step with an explicit method and rationale, not a placeholder, and the plan's best-guess values are supplied so the diff is concrete.

**Type consistency:** `SubscriberInput`, `ContactSyncPayload`, `SignupSource`, `Locale` defined in Task 2 and used unchanged in Tasks 3–5. `ResendClient` defined in Task 3, consumed in Task 4. `SubscribeStore`/`SubscribeDeps` defined in Task 4, implemented in Task 5. `WebhookEffect` defined and used within Task 9. `topicsForSource` is the single source of topic assignment, called by `buildContactSyncPayload` — routes never pass topics directly.
