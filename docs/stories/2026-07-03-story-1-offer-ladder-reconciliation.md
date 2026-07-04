# Story 1 — Offer-Ladder Reconciliation & Strategy Red-Team

> Owner: Simon Paris · Executor: COO agent (Fable, in-session)
> Status: **EXECUTED 2026-07-03** — output: `projects/Productize-Offer/offer-ladder.md` (locked ladder + zero-proof pricing strategy §1b + amendments + cleanup + copy brief). /audit redesign queued as pipeline story `aa450ce2` (goal `7d384cea`). Goals-table cleanup script at `~/.claude/jobs/107aca07/tmp/goals-cleanup.mjs` — awaiting Simon's manual run (auto-mode classifier requires user review for bulk service-role writes).
> Kind: strategy / deep reasoning — **NOT eligible for the command-center story pipeline** (no code change in a registered target repo; verify stage cannot judge a strategy doc). Run in-session.
> Companion doc & style source: `projects/Productize-Offer/founding-client-program.md` — this story inherits its conventions: constraint-first framing, costed claims, closing mechanics independent of willpower, self-critique log, STATE applied to revenue.

---

## 1. Purpose & Constraint

The quit trigger is **$8,000 USD MRR for three consecutive months, at least one source recurring**. Target: one signed founding retainer by month 4 (Oct 2026). Every surface a prospect can touch must tell the same pricing story, because a prospect who sees two different businesses buys from neither.

Today, **three incompatible offer ladders are live simultaneously**:

| Source | Diagnostic | Audit | Retainer | Status |
|---|---|---|---|---|
| Live `/audit` page + older `goals` rows ("Entry Audit Offer", "Set intro/founder rate dollar amount") | — | $1,295 USD full, intro $750–895 TBD | — | live on the only paid surface |
| `goals` row "Redesign /audit for three-tier ladder" | $3,500 / $7,500 | $10,000 / $15,000 | $10,000/mo | pending, contradicts both others |
| `projects/Productize-Offer/founding-client-program.md` (2026-06-23, newest keystone) | $2,500 / $3,500 | $6,500 / $9,500 | $9,000/mo → $12,000/mo | v1 spec, draft for COO review |

The constraint that governs everything: **Simon has zero paying clients and 254 LinkedIn followers.** The ladder must be priced for the trust level that exists, not the trust level the plan hopes for.

## 2. The Job

Deep red-team pass producing **one locked ladder and the cleanup that makes it true everywhere**. Not a brainstorm — a decision document with the contradictions killed.

### 2a. Lock the ladder
- Start from `founding-client-program.md` as the presumptive winner (newest, most rigorously argued, has closing mechanics and eligibility gates). Red-team it rather than re-derive from scratch.
- Pressure-test each price against the zero-client reality: is $6,500 founding-audit sellable via a 15-min discovery call with no case studies live? If a lower "first-blood" price is warranted for engagement #1 only, say so explicitly and name the mechanism (e.g., Diagnostic as the only cold-sellable SKU — consistent with the goals row "Retainer is never the cold pitch").
- Reconcile public-facing titles per the `goals` row "Lock public-facing offer titles": entry = **Production AI Readiness Audit**; retainer = **Fractional LLMOps Engineer** or **AI Reliability Specialist**; never "Fractional AI Reliability Lead" externally.
- Keep the founding-program exchange terms (§5 of the founding doc) and slot counts (§3) unless the red-team finds a defect; if changed, log why in the self-critique section.

### 2b. Pressure-test the funnel math
- The founding doc's three-path table (§1) assumes conversion rates with zero observed data. Re-derive the Oct 2026 retainer path from what actually exists: 254 followers, no outbound motion, commenting cadence not started, 1 blog post live.
- Answer plainly: **is the Oct 2026 target credible on inbound alone?** If not, state what has to be added (the named-prospect outbound list from recommendation #2) and what the honest slip date is without it.

### 2c. Goals-table cleanup list
- Produce the exact list of `public.goals` rows to archive, rewrite, or re-price so the table agrees with the locked ladder. Known suspects (resolve IDs at runtime — Supabase MCP was down when this story was written): "Entry Audit Offer", "Set intro/founder rate dollar amount", "Apply locked pricing to /audit", "Generate NotebookLM #2 report" (predates the ladder — decide if still relevant), "Redesign /audit for three-tier ladder", "Standard Diagnostic — $3,500 USD", "Founding Diagnostic — $2,500 USD", "Lock public-facing offer titles", "Surface Founding Client on /audit + home".
- Deliver as executable SQL (UPDATE/archive statements) + a one-line rationale per row. Simon approves before it runs — this story does not write to Supabase without sign-off.

### 2d. `/audit` copy brief (handoff artifact)
- Write the copy brief for the `/audit` redesign: locked prices, locked titles, founding-slot copy block (§7 of the founding doc, adjusted to the locked ladder), dual-market framing note (Law 25 primary for CA/QC, EU AI Act/NIST for US — per existing goals row).
- **This child task IS pipeline-eligible**: once the brief exists, queue it as a command-center story targeting `simonparis-website` with `agent_target: sitemaster` and checkable criteria (prices/titles render on `/audit` EN+FR, no `$1,295` string remains anywhere in the repo).

## 3. Deliverables

1. `projects/Productize-Offer/offer-ladder.md` — the locked single source of truth (tiers, founding/full rates, slot counts, closing mechanics, public titles, first-client path decision).
2. Goals cleanup SQL + rationale, appended to the same doc or as `offer-ladder-goals-cleanup.sql` beside it.
3. `/audit` copy brief section inside `offer-ladder.md`, ready to paste into a story-pipeline capture.
4. **Self-critique log** (mandatory, per founding-doc convention): cold re-read, three weakest claims named, each rewritten.

## 4. Acceptance Criteria

- [ ] Exactly one price per tier survives; the other two schemes are explicitly marked dead with a one-line reason each.
- [ ] Every number in the doc traces to either the founding doc, a goals row, or a stated assumption — no unexplained figures.
- [ ] The Oct 2026 credibility question (§2b) is answered yes/no with the reasoning shown, not hedged.
- [ ] Goals cleanup list covers every pricing-touching row found in `public.goals` (query for `%audit%`, `%diagnostic%`, `%retainer%`, `%pricing%`, `%rate%` at runtime).
- [ ] Self-critique log present with three entries.
- [ ] No writes to Supabase or the website repo — outputs are docs + SQL awaiting Simon's approval.

## 5. Constraints

- Brand voice throughout (`brand/brand-summary.md`): no hedging the thesis, no marketer-speak, prices stated flat.
- STATE applies to revenue: any recommendation that adds a tracking obligation must name the table/column it lands in (founding doc §6 schema is the reference).
- Reading list before writing: `projects/Productize-Offer/founding-client-program.md` (whole doc), `goals` rows listed in §2c, `projects/Audience-Growth/pricing-tactics.md` if present, live `/audit` page copy in `projects/simonparis-website/`.
