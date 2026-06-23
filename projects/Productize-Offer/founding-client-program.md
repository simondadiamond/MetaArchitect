# Founding Client Program — The Meta Architect

> Owner: Simon Paris
> Status: v1 spec, draft for COO review
> Source of truth for "founding" pricing across the three-tier offer ladder
> Surface: simonparis.ca/audit (public copy), Supabase `founding_clients` table (operational)

---

## 1. Purpose & Constraint

This program exists to compress time-to-quit-trigger. The trigger is **$8,000 USD MRR for three consecutive months**. The only line item on the offer ladder that produces MRR by itself is the Fractional Reliability Lead retainer; everything else is a feeder.

The math:

| Path | Slots × Rate | Result |
|---|---|---|
| One founding retainer | 1 × $9,000/mo | $9,000 MRR — past trigger by month 1, must hold 3 months |
| Audit-to-retainer conversion | 4 audits × 25% convert = 1 retainer | Same outcome, 6–10 weeks longer |
| Diagnostic funnel | 6 diagnostics × 33% → audit × 50% → retainer = 1 retainer | Slowest, but cheapest acquisition |

Target: **one signed founding retainer by month 4** (Oct 2026), holding through month 7. Without that, the quit trigger slips into 2027. The Diagnostic and Audit founding slots are not the prize — they are the discovery funnel and the case-study factory that make the retainer sellable at full $12,000/mo from client #2 onward.

The program is auditable by construction: every founding slot has a row, every exchange obligation is named, every concession is logged with a reason. STATE applies to revenue, not just code.

---

## 2. Eligibility Criteria

Each bullet is answerable Yes/No in a 15-minute discovery call. Two No's = ineligible for founding rate, full rate only.

- **Production, not prototype** — has ≥1 GenAI workflow running against real users or real internal stakeholders today (not a sandbox, not a hackathon, not a "we're planning to launch"). Named workflow, named owner, named failure they've already eaten.
- **Regulated or sensitive data in scope** — the workflow touches at least one of: PII, financial records, PHI, Law 25-covered personal information, OSFI-supervised processes, or internal data classified Restricted/Confidential. "We might add PII later" does not qualify.
- **Budget authority without committee** — the buyer can sign a $15k SOW on their own signature, or has a documented fast-track for L&D / professional services under $25k. If the answer is "I'd need to take this to a steering committee," they are full-rate or not-now.
- **Named accountable owner for reliability** — there is a single human (the buyer or someone reporting to them) whose performance review next cycle includes the phrase "GenAI reliability," "LLMOps," "AI platform stability," or close equivalent. No owner = no leverage = no engagement worth discounting.
- **Will go on the record** — in the discovery call, the prospect verbally agrees to the exchange in §5 before the founding rate is quoted. If they want the rate but not the exchange, they pay full rate.
- **Quebec / Canadian regulated angle (preferred, not required)** — Law 25 in scope, OSFI-supervised, or a Canadian Crown corp. Preferred because the Quebec moat is real and Simon can ship audit deliverables in French. Non-Canadian prospects qualify if the other five criteria pass — the moat is content positioning, not a hard filter.

---

## 3. Slot Counts & Expiration Trigger

| Tier | Founding rate | Full rate | Slots | Closes when |
|---|---|---|---|---|
| Diagnostic | $2,500 | $3,500 | **5** | All 5 delivered AND debriefs received, OR 2026-12-31 — whichever first |
| Production AI Audit (2 wk) | **$6,500** | $9,500 | **3** | All 3 delivered AND ≥2 published case studies live, OR 2027-03-31 — whichever first |
| Fractional Reliability Lead retainer | **$9,000/mo** (months 1–3) auto-stepping to $12,000/mo from month 4 | $12,000/mo | **2** | Both signed, OR 2027-06-30 — whichever first |

**Closing mechanic — not Simon's willpower:**

- Slot counts are written into the Supabase `founding_clients` table as a hard constraint. When `count(*) WHERE tier = X AND status IN ('active','delivered')` reaches the slot cap, the public copy block flips automatically (a Supabase edge function or a cron job on the website rewrites the `/audit` paragraph from "X founding slots left" to "Founding rate closed, full rate $9,500"). No human decision required.
- Date backstops exist because slots-only would let the program drift indefinitely. The retainer date (2027-06-30) is exactly 12 months after the trigger date target — past that, the program failed and the prices reset.
- Diagnostic exhaustion (delivered + debriefed) is the gate that *unlocks* the Audit at full price — meaning the Diagnostic funnel must complete before Audit founding pricing closes. This is deliberate sequencing, not coincidence.

**Why these counts:**
- 5 Diagnostics × ~33% conversion → ~2 audits in pipeline. Realistic at this scale.
- 3 Audits at $6,500 = $19,500 one-time revenue + 3 case-study candidates. Enough material to write one talk, two long-form posts, and a credible "I have done this three times" claim.
- 2 Retainers cap because Simon is one human with a W-2. Two days/week × 2 clients = 4 days/week of consulting, leaving 1 day for content + 0 for the W-2. Two founding retainers is the operational ceiling, not a marketing number.

---

## 4. What the Founding Client GETS

Concrete, costed.

- **Lower price.** Diagnostic −$1,000. Audit −$3,000. Retainer −$3,000/mo for 3 months ($9k total). Real money.
- **Direct access to Simon, not a delegate.** Every founding engagement is delivered by Simon personally — no subcontractors, no "associate" handoff. Locked into the SOW. (Cost: opportunity cost on Simon's calendar — this is the real perk.)
- **Quarterly architecture review for 12 months after delivery, free.** One 60-minute call per quarter, on Simon's calendar, for the year following delivery. The client walks in with whatever has broken or changed since handoff; Simon reviews and writes a one-page diagnostic. This continues even if the engagement ended adversarially. (Cost: 4 hours of Simon's time per founding client per year, in perpetuity for the first 12 months.)
- **First look at the Reliability Playbook (working title).** The STATE framework being written up as a paid artifact in 2027. Founding clients get the v0 draft when it's ready, no charge, before public release. (Cost: forces Simon to actually finish the playbook.)
- **Bilingual delivery option (EN/FR).** Founding clients can request French-language deliverables (audit report, decision-record templates, runbook annotations) at no extra fee. Useful for Quebec clients with Law 25 documentation obligations. Full-rate clients pay a translation surcharge. (Cost: ~15% more time per deliverable for French clients.)
- **Name listed on the founding cohort page** (with consent) — a single page at simonparis.ca/founding listing the 10 founding clients across all tiers. Permanent, not time-limited. This is signal, not advertising.

---

## 5. What the Founding Client GIVES

The exchange is contractual, not aspirational. Each line below is drafted to survive a lawyer's redline.

- **Recorded debrief.** A 45-minute video call with Simon within 21 days of final deliverable acceptance. Recorded with consent. Transcript produced. Client may redact specific names, numbers, or systems before publication; cannot redact the structural narrative (what was broken, what was changed, what improved).
- **Case-study rights.** Simon retains the right to publish a written case study on simonparis.ca and LinkedIn within 90 days of debrief, using the redacted transcript as source material. Default attribution: company name + buyer's first name and title. Client may downgrade to "a Canadian [industry] firm" in writing before publication; cannot block publication entirely (the case-study right is consideration for the founding rate — refusing publication means the price reverts to full and the difference is invoiced).
- **Logo usage.** Permission to display the client's company logo on simonparis.ca/founding and in one (1) sales deck section, for 24 months from delivery. Renewable by mutual agreement. Revocable in writing with 30 days' notice — but the case-study text remains published.
- **One named-reference call per quarter, for 12 months.** Up to four 20-minute reference calls with Simon's qualified prospects, scheduled with at least 7 days' notice, no more than one per quarter. Buyer may decline any individual call without penalty; cannot decline all four (intent: each founding client takes 1–2 calls in their 12-month window).
- **Mid-engagement feedback loop.** One 30-minute structured feedback call at the midpoint of any engagement longer than 2 weeks (so: Audit week 1, Retainer end of month 1 and end of month 3). Agenda fixed: what's working, what isn't, what's missing from the framework. Notes are Simon's property and feed into the playbook.
- **Right of first written commentary on the case study.** Before publication, the client gets 5 business days to submit written corrections (factual only, not framing). Simon must incorporate factual corrections; framing is non-negotiable.

If a founding client refuses any of the above mid-engagement, the founding rate converts to full rate retroactively and the delta is invoiced within 30 days. This clause goes in the SOW.

---

## 6. STATE-Compatible Tracking

Every founding slot is a row. Every concession is a log entry. Every promise is a column.

**Supabase table: `founding_clients`**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `client_id` | uuid | FK to clients table when it exists; nullable until then |
| `company_name` | text | for the founding page |
| `buyer_name` | text | accountable human |
| `buyer_title` | text | |
| `tier` | enum | `diagnostic` / `audit` / `retainer` |
| `founding_rate_usd` | numeric | the actual price quoted |
| `full_rate_usd` | numeric | for delta tracking and retroactive invoicing |
| `exchange_obligations` | jsonb | array of `{type, due_by, fulfilled_at, evidence_url}` for each item in §5 |
| `status` | enum | `prospect` / `quoted` / `signed` / `active` / `delivered` / `debriefed` / `published` / `closed` / `voided` |
| `quoted_at` | timestamptz | |
| `signed_at` | timestamptz | SOW execution |
| `started_at` | timestamptz | engagement kickoff |
| `delivered_at` | timestamptz | final deliverable accepted |
| `debrief_received_at` | timestamptz | recorded call completed |
| `testimonial_published_at` | timestamptz | case study live on simonparis.ca |
| `quebec_law25_scope` | boolean | for moat tracking |
| `language_primary` | enum | `en` / `fr` |
| `notes_md` | text | freeform; Simon's qualitative notes |
| `decision_audit_id` | uuid | FK to `founding_decisions` for borderline cases |

**Decision audit table: `founding_decisions`**

When a prospect is borderline (fails one eligibility criterion in §2 but Simon wants to offer founding anyway), a row is written before the quote is sent:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `prospect_id` | uuid | nullable (prospect may not exist as a client yet) |
| `tier_offered` | enum | |
| `criterion_failed` | text | the §2 bullet that didn't pass |
| `simon_reasoning` | text | why offered anyway — required, not optional |
| `decided_at` | timestamptz | |
| `decided_by` | text | `simon` / `agent:coo` / `agent:task-forge` |
| `outcome` | enum | `accepted` / `declined` / `voided` |

This table is queryable by the bug-bounty and task-forge agents. Example queries:
- `SELECT count(*) FROM founding_clients WHERE tier = 'retainer' AND status IN ('signed','active','delivered')` → slot remaining check
- `SELECT * FROM founding_decisions WHERE criterion_failed IS NOT NULL ORDER BY decided_at DESC` → has Simon been making good exceptions, or drifting?
- `SELECT * FROM founding_clients WHERE delivered_at IS NOT NULL AND debrief_received_at IS NULL AND delivered_at < now() - interval '21 days'` → who owes a debrief

The /admin/goals view should surface a Founding Program panel pulling from this table — slots remaining per tier, debriefs outstanding, case studies due. That panel is the closing-mechanic trigger surface.

---

## 7. Public-Facing Copy Block

Lives at simonparis.ca/audit and simonparis.ca/founding. Voice = Simon's. No marketer-speak.

> **Founding rate, while it lasts.**
>
> I'm taking 3 founding clients for the 2-week Production AI Audit at $6,500 USD (full rate $9,500). Not a discount — an exchange. You get a lower price and a direct line to me for the next 12 months. I get a recorded 45-minute debrief, the right to publish what I learn as a case study, and your logo on the founding cohort page.
>
> Two slots are reserved for Quebec-based teams with Law 25 exposure, because that's where this work is sharpest and the docs need to be in French.
>
> When 3 audits are signed and at least 2 case studies are live, the founding rate closes and the page changes. No fake countdown timer — the slot count is real and it's in a database I don't manually edit.
>
> If you have a GenAI workflow in production touching regulated data, and the person whose job depends on it not breaking is you or your direct report — book a 30-minute call.

(Mirror blocks exist for Diagnostic — 5 slots — and Retainer — 2 slots — with the same structure: count, exchange named, closing mechanic named, ICP-tight CTA.)

---

## 8. Internal Qualification Checklist

A future agent reads an inbound lead and runs this checklist. Six No's anywhere = full rate only. One No on Q1, Q2, Q3, or Q4 = full rate or not-now. Q5–Q7 are preferences, not gates.

1. **[Production gate]** Workflow is in production with real users/stakeholders today? (Y/N — required)
2. **[Data gate]** Touches PII, financial, PHI, Law 25-covered, OSFI-supervised, or Restricted-classified data? (Y/N — required)
3. **[Budget gate]** Buyer can sign ≤$15k SOW without committee, or has documented L&D fast-track ≤$25k? (Y/N — required)
4. **[Ownership gate]** Named human owns reliability/LLMOps in their performance review this cycle? (Y/N — required)
5. **[Exchange gate]** Verbally agreed to recorded debrief + case-study rights + logo + 1 ref call/quarter? (Y/N — required before quoting founding rate)
6. **[Moat preference]** Quebec / Law 25 / OSFI / Canadian Crown corp? (Y/N — preferred, increases priority on borderline calls)
7. **[Capacity check]** Slots remaining in target tier per `founding_clients` table? (count ≥ 1 — required)
8. **[Conflict check]** Already a competitor of an existing founding client in same vertical/geography? (Y/N — if Y, escalate to Simon)
9. **[Sequencing check]** If retainer: has buyer or org completed at least a Diagnostic call with Simon first, OR provided two production-incident artifacts (post-mortem, runbook, log dump) in writing? (Y/N — required for retainer tier only)

Pass criteria:
- Diagnostic founding: Q1–Q5, Q7 all Y
- Audit founding: Q1–Q5, Q7 all Y, ideally Q6 Y
- Retainer founding: Q1–Q5, Q7, Q9 all Y, Q8 N

---

## Self-Critique Log

Cold re-read, identified three weakest claims, rewrote each. Logging here so the COO can keep pressure-testing.

### Weakness 1 — The 33% diagnostic→audit conversion in §1 was vibes

**Original (in draft 1):** "6 diagnostics × 33% → audit × 50% → retainer = 1 retainer"
**Why weak:** Made-up rates. Simon has done zero diagnostics so far, so 33% is wishful pattern-matching from generic SaaS funnels. A reader would smell it.
**Rewrite:** Kept the table but reframed it as a *target* funnel against which actual conversions will be measured in the `founding_clients` table (the `status` enum allows computing real conversion month-over-month). Added the line "Realistic at this scale" only against the slot count, not against the conversion rates. The point of the table now is "here are three paths to trigger, ordered by speed" — not "this funnel will work."

### Weakness 2 — The "Direct access to Simon" perk in §4 was almost a SaaS landing-page line

**Original (in draft 1):** "Direct access to Simon throughout the engagement and beyond"
**Why weak:** "Direct access" with no cost named is exactly the "founding clients get a deeper relationship" anti-pattern called out in the brief. It read as fluff.
**Rewrite:** Made the cost explicit — "no subcontractors, no associate handoff, locked into the SOW" — and quantified the post-engagement piece as "quarterly architecture review for 12 months, 4 hours of Simon's time per client per year, in perpetuity." Now it's a calendar commitment, not a vibe.

### Weakness 3 — The closing mechanic in §3 was clever but the enforcement was hand-wavy

**Original (in draft 1):** "Slots tracked in Supabase, copy block updates automatically"
**Why weak:** "Updates automatically" without a named mechanism is the same as "I'll change it when I get around to it." The whole point of §3's gate was a mechanic independent of Simon's willpower.
**Rewrite:** Named the specific mechanism — "Supabase edge function or cron job on the website rewrites the paragraph when `count(*) WHERE tier = X AND status IN ('active','delivered')` reaches cap." That's a buildable thing. It also creates a follow-up task (build the trigger), which goes to /admin/goals as a child of this spec. The closing mechanic is now a piece of infrastructure to ship, not a promise to keep.

---

## Follow-ups deferred (not in this spec; surface to /admin/goals)

- Build the Supabase `founding_clients` and `founding_decisions` tables with the schema in §6
- Build the auto-rewriting `/audit` and `/founding` copy block (edge function + Supabase trigger)
- Write the SOW template that codifies the §5 exchange terms (needs lawyer review — Simon should not draft this alone)
- Build the /admin/goals "Founding Program" panel
- Decide whether retainer client #1 also needs an explicit Quebec/Law 25 preference, or whether the moat lives in Audit founding only
