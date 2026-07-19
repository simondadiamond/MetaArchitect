# Workflow Rescue — Side-Quest Offer Design

> Owner: Simon Paris · Produced by: COO brainstorm session, 2026-07-09
> Status: KILLED 2026-07-19 (Simon) — see docs/handoffs/2026-07-15-workflow-rescue-launch-kit.md for rationale; do not build
> Relationship to main ladder: side quest, firewalled. Does NOT touch offer-ladder.md tiers or the Agent Factory Kit (§9). Different buyer (SMB/solopreneur with broken automations), different channel (freelance marketplaces), different positioning language.

---

## 1. Goal and constraints (from session)

- **Target:** $2–5k/mo recurring side income ("f-you money" accelerant toward the $8k MRR quit trigger — not a replacement for the ladder).
- **Hours:** 0–4 Simon-hours/week, or front-load then coast. Ladder outbound remains the schedule-critical path; this must never eat it.
- **Liability:** no standing responsibility for other people's production systems. Caretaker/maintenance retainers were considered and **killed** — not on insurance cost (tech E&O for a solo consultant in Canada is ~$800–1,500/yr, and the main ladder's audit/retainer tiers require E&O anyway), but on the duty-of-care/on-call surface, unacceptable alongside a W-2 at 0–4 h/wk.
- **Market check (2026-07-09):** n8n platform is healthy ($5.2B valuation May 2026, SAP stake, $100M+ ARR, 1.7M monthly builders). But **paid *generic* templates are a dead product form**: 9,000+ free templates in the official library plus AI-generated workflows on demand. Differentiated packs (reliability-hardened / STATE-compliant workflows) remain viable — but that positioning is the brand's thesis verbatim, so they belong to the Meta Architect estate (kit-adjacent proof asset), not this side quest (see §9). For the side quest: sell judgment and outcomes, not artifacts.
- **Surviving principle:** sell one-off outcomes and tools; never standing operations. Buyer retains responsibility; each engagement closes.

## 2. The offer

**Workflow Rescue** — fixed-price, one-off: *"Your n8n / Make / Zapier automation broke or silently fails. I fix it within 48 hours and deliver a written report on why it broke and what I hardened so it doesn't recur."*

| SKU | Scope | Price (USD) |
|---|---|---|
| Rescue — Standard | Single workflow, ≤15 nodes, no custom code nodes | $350 |
| Rescue — Complex | Multi-branch, custom code, external API debugging | $500 |
| Hardening Pass (add-on) | Error handling, retries, dead-letter path, failure alerting on the fixed workflow | +$250 |
| Review-builder rate | First 3 marketplace gigs only, to seed reviews | $200 flat |

Deliverables per rescue: (1) fixed, tested workflow; (2) 1–2 page failure report — root cause, what changed, what was hardened; (3) optional 15-min handoff call.

**Scope gates (decline or re-quote anything outside):**
- Platforms: n8n, Make, Zapier only (expand only if demand shows).
- One workflow per rescue. New builds are not rescues — decline or quote separately as fixed-price.
- **No retainers, no maintenance contracts, no monitoring services. Ever.** This is the liability firewall.
- Credentials: prefer client-run changes for anything touching production secrets; otherwise scoped, time-boxed access revoked at delivery.
- Tail: 7-day fix-verification window (if the delivered fix itself fails, one free re-fix). After that, engagement closed.

**Pricing rules:** the $200 review-builder rate is a deliberate, bounded exception to the never-discount rule (offer-ladder §1b) — marketplace review economics are a different game and this identity is not the brand. After 3 reviews: list price only; excess demand raises price, never hours.

## 3. Identity & brand firewall

- Upwork requires verified legal names → this is **separation, not secrecy**: "Simon P. — Automation Reliability Engineer."
- Never mentioned on LinkedIn, simonparis.ca, or any Meta Architect surface. No cross-links in either direction.
- Positioning language is SMB-native ("your automation broke") — never STATE framework vocabulary, never "AI Reliability Engineering" (that's the brand's category).
- If a rescue client turns out to be enterprise-ICP-shaped, that's a bonus, never a plan (mirrors kit rule, offer-ladder §9).

## 4. Channels (no audience building)

1. **Upwork** — Project Catalog listing (productized fixed-price is native) + targeted proposals on "my n8n/Make/Zapier workflow stopped working" posts.
2. **Contra** — same catalog, no fee, secondary.
3. **Community presence** — r/n8n and community.n8n.io: answer broken-workflow threads helpfully; profile link does the selling. ~30 min/wk cap, can be agent-drafted.
4. Explicitly NOT: LinkedIn, the blog, paid ads, cold email (ladder outbound owns Simon's outbound energy).

## 5. Delivery runbook (agent-leveraged)

Target: **≤1.5 Simon-hours per rescue.** Six rescues/mo ≈ $2.5k gross at ~8–9 h/mo.

1. **Intake** (form: Tally or similar) — platform, workflow JSON export, error output/screenshots, what changed recently, urgency. Qualifies before quote; auto-declines out-of-scope.
2. **Diagnose** (agent) — import export into local sandbox (n8n already runs on sterling at ~/projects/n8n), reproduce, root-cause.
3. **Patch + test** (agent) — fix, run against test payloads, document.
4. **Report** (agent draft) — failure report from a fixed template; failure mode logged to taxonomy (see §6).
5. **Review + deliver** (Simon, 20–40 min) — sanity-check the fix and report, deliver, optional handoff call.
6. STATE compliance: medium-risk work (external systems) — each rescue gets a state object + log per brand/state-framework.md; the taxonomy log doubles as the T pillar.

## 6. The compounding asset — Automation Failure Handbook

- Every rescue logs: platform, failure mode, root cause class, hardening applied. Stored as structured rows (simple JSONL or Supabase table — decide at implementation).
- At ~15 rescues: agents compile **"The Automation Failure Handbook"** — a taxonomy of how production automations actually break + hardened error-handling patterns. $49–79, sold on the marketplace profile and to past clients.
- AI-proof rationale: it's judgment distilled from real incidents, not artifacts an LLM can generate. This is the front-load-then-coast piece and the thesis ("state beats intelligence") applied downmarket, unbranded.

## 7. Money math & success bar

- 6 standard rescues/mo ≈ $2.1k net of Upwork 10%; with complex mixes and hardening add-ons, $2.5–3.5k/mo is the realistic band at the hours cap.
- **Day-30 checkpoint:** profile + catalog live, ≥2 paid rescues (any price) — or an honest no-demand signal.
- **Day-90 checkpoint:** ≥$1.5k/mo run rate → continue and raise prices; below → park, keep the taxonomy data.
- Hours cap 4 h/wk is hard. Demand above cap → raise price. Never add hours; never accept a retainer to "smooth" revenue.

## 8. Pre-launch checks (Simon only — blockers)

- [ ] **Employment contract (autoroot.io):** verify no moonlighting / IP-assignment / non-compete clause covering automation consulting. This gates everything.
- [ ] E&O insurance: get a quote when the first rescue books (~$800–1,500/yr CAD band); same policy family the ladder needs anyway.
- [ ] Tax: side income under sole proprietorship; GST/QST registration required past $30k/yr — accountant question, not a launch blocker.

## 9. Explicitly out of scope (v1)

- Any monitoring/observability SaaS (parked; revisit only if rescue demand proves the pain at volume).
- n8n template packs: *generic* packs are a dead product form per §1 market check. *Hardened/STATE-compliant* workflow packs are viable but on-brand — if ever pursued, they route to the Meta Architect estate (kit-adjacent, offer-ladder §9 firewall rules apply), not this identity. Rescue taxonomy data (§6) would be their raw material.
- Law 25 doc packs (parked — different quest, brand-adjacency risk).
- French-language marketplace presence (add later if EN demand proves out; FR is a differentiator held in reserve).

## 10. Self-critique (three weakest claims)

1. **"6 rescues/mo" has zero observed demand data.** Upwork n8n gig volume is real but conversion from a fresh profile is unproven. Mitigation: day-30 checkpoint is designed to falsify this cheaply.
2. **≤1.5 Simon-hours/rescue is an estimate.** Client back-and-forth (access, unclear intake) is the classic time sink. Mitigation: intake form strictness + decline rules; measure actual hours from rescue #1.
3. **Marketplace identity separation is porous.** A determined prospect can connect "Simon P., automation reliability" to The Meta Architect. Accepted: the work is competent and honest; discovery costs nothing except positioning blur, and rule §3 keeps the surfaces from ever pointing at each other.
