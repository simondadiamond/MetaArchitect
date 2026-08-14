# ICP v2 — Simon Paris, Independent AI Implementation Practice

> **Owner:** Simon. Written 2026-08-14 by the CMO seat from a five-lane live external research run
> (operator forums via Arctic Shift + Discourse, buy-side purchase proof, job-post demand signals,
> Quebec/Canada market and subsidy reality, vertical workflow pain).
> **Supersedes** `funnel/setup-offer/icp.md` v1 as the operating ICP. v1 is kept as research history.
> **Fits the offer in** `funnel/practice-plan-v1.md` (Mapping Session C$350 → Workflow Sprint
> C$1,750 founding / C$2,500 standard → Ongoing Improvement C$400–600/mo).
>
> **Read this first.** v1's ICP — "owner-operated 2–30 person service business" — was not wrong so
> much as unfalsifiable. It described roughly every small business in North America, which is why it
> produced zero inbound in four weeks and why no test could have killed it. v2 narrows to a segment
> defined by a **named recurring workflow**, not by headcount. Two structural findings drive that
> change, and both are verified primary data:
>
> 1. **Cost is not the objection. Relevance is.** US Census BTOS: among non-adopters, "AI is not
>    applicable to this business" **63.3%**, "too expensive" **6.7%**. StatCan Q2 2026 Canada: "not
>    relevant to the business" **40.0%**, cost **10.6%**. A generic AI-help pitch dies on legibility,
>    not price. This invalidates the instinct to lead with price, guarantee, or risk reversal.
> 2. **The buyer is not the median small business.** JPMorgan Chase Institute, de-identified
>    transaction data across **4.6M small firms**: median monthly paid AI spend **~$28–30**, and
>    **63% of AI-paying small businesses spend $1–40/month**. A C$2,500 Sprint is ~7 years of the
>    median firm's entire AI budget. The Sprint buyer is a firm already paying for **outside
>    operational help**, not one shopping for AI.

---

## 0. The single most important number in this document

**Among firms of 1–4 employees that use AI, the share that "used vendors or consulting services to
install/integrate AI" is 3.1% in the US and 10.7% in Canada.**

| Firm size | US (BTOS AI Supplement 2026) | Canada (StatCan 11-621-M2026010) |
|---|---|---|
| 1–4 employees | **3.1%** | **10.7%** |
| 5–9 employees | 4.0% | — |
| 10–19 employees | 4.3% | — |

Sources: [BTOS](https://www.census.gov/hfp/btos/about) · [StatCan 11-621-M2026010](https://www150.statcan.gc.ca/n1/pub/11-621-m/11-621-m2026010-eng.htm). **Evidence: VERIFIED (primary, national statistical agencies).**

Three consequences, and they are not optional:

- **Sell to Canada first.** The Canadian micro-firm is ~3.5× more likely to buy implementation help
  than the American one. Simon's instinct to chase the larger US market is backwards for this offer.
- **The addressable pool is thin even where it exists.** ~10% of AI-using micro-firms buy help. This
  is a targeting problem, not a volume problem. Broad channels waste the four hours; finite named
  lists do not.
- **Sector matters more than size.** Consultant-use rate among AI-using firms by sector:
  **finance/insurance 6.9% (highest of any sector)**, health care 5.0%, **construction 2.2%
  (lowest)**, accommodation/food 2.8%. VERIFIED. The trades are the loudest complainers and the
  least likely buyers in the same dataset.

---

## 1. Ranked shortlist

| # | Segment | The named workflow | Evidence tier | The one-line risk |
|---|---|---|---|---|
| **1** | **Bookkeeping, accounting & tax practices, 1–20 staff, on QBO/Xero + email with NO practice-management layer** | The monthly missing-document chase | **INFERRED-strong** (verified pain + verified sector purchase rate; no verified transaction in-segment) | **TaxDome and Karbon already ship this feature.** The segment is only the un-tooled slice, and no buyer-side "I paid $X" evidence exists anywhere |
| **2** | **Trades & field service, 5–50 staff (HVAC, plumbing, electrical)** | Quote/estimate follow-up going cold | **SPLIT — verified pain, verified non-purchase.** The most honest disagreement in this research | **Lowest consultant-use rate of any sector (2.2%)**, documented consultant aversion, and a price question that drew zero replies. Highest pain, worst buying record |
| **3** | **Dental & veterinary clinics running Open Dental or Cliniko** | Insurance verification / recall, human-approved | **INFERRED** | Jane App owns Canadian allied health and **has no API at all**; Dentrix/Eaglesoft gate at $3–5K. Qualify on software before anything else. Insurance pain is US-shaped; RAMQ unvalidated |
| **4** | **Law firms, 1–20 lawyers, and Quebec notaries** | Matter-status updates + retainer chase | **INFERRED** | Profession-wide conservatism, saturated intake market, small firms are cheap. Notary angle is genuinely untested |
| **5** | **Boutique agencies & studios as a *capacity channel*, not end clients** | Subcontracted client builds | **VERIFIED (channel exists) / INFERRED (economics)** | Agencies price-shop build labour globally at **$10–15/hr** from PH/VN/ID/LatAm. Funds the practice; never builds it |

### Why the previously assumed #1 is not #1

"Owner-operated 2–30 person service business" survives as a *boundary condition*, not as a segment.
Every candidate above sits inside it. That is precisely the problem: it cannot route a channel, it
cannot write a hook, and it cannot be killed by any test. v2's unit of targeting is
**(named workflow × named vertical × software stack × Canada)**.

### The disagreement inside this research, stated openly

The vertical lane ranked **trades #1** and the buy-side lane's national data says trades are the
**least likely sector in the economy** to buy this. Both are right about different things, and the
tension is worth carrying rather than resolving prematurely.

Trades have the best-quantified pain found anywhere in the study — an HVAC owner doing his own math
unprompted: *"32 hours weekly on quotes that don't convert. My overhead on fuel and time for quotes
alone is $800+ weekly."* The build is the cleanest of all seven verticals: Jobber and Housecall Pro
both publish open developer APIs, there is zero regulated data, and the approval gate is natural.
Quebec has the largest pool (~38,000 construction employers).

Against that: **construction has the lowest consultant-use rate of any sector at 2.2%** and the
lowest AI adoption in Canada at 9.2% (both VERIFIED, national statistics). A member asking the
exact question that matters — *"what would you realistically expect to pay for someone to set it up
for you?"* — got **zero replies**. Software-selection threads list *"Avoid large upfront consultant
fees"* as an explicit criterion, and a post demanding a ban on software developers fishing in the
community drew 204 upvotes.

**Ruling: pain intensity is not purchase probability, and confusing the two is exactly what produced
v1's failure.** Bookkeeping stays #1 because the single most decision-relevant number available —
sector consultant-use rate — differs by roughly 3× in its favour (6.9% highest vs 2.2% lowest).
Trades sit at #2 as the **designated fallback**: if the §6 test kills #1, trades is the next test,
not a re-run with better copy.

---

## 2. Segment #1 in full — Bookkeeping, accounting & tax practices

**Confidence: moderate. Higher than anything in v1, and still short of proven.** The pain is verified
and repeated by identifiable practitioners across three years. The sector's willingness to hire
outside help is verified at the national-statistics level. What does **not** exist anywhere in the
research is a single buyer-side statement from a bookkeeping firm saying "I paid $X to have this
built." That gap is the reason for the 30-day test in §6.

### Firmographics

- **Size:** solo practitioner with 15+ recurring clients, up to a 20-person firm. The boundary is
  *the owner still personally chases client documents* — a 12-person firm whose partner does the
  month-end chase fits; a 6-person firm with a dedicated admin pod does not.
- **Revenue:** ~C$150K–C$2M. Bills C$60–C$150/hr, or fixed monthly per client.
- **Geography:** Canada first (10.7% vs 3.1% consultant-use), Quebec and Ontario weighted. Quebec
  professional/scientific/technical and finance/insurance run **36.9%–55.0%** AI adoption, the top
  bands in the province (ISQ, Q2 2025, VERIFIED). Canada finance/insurance adoption **40.4%**, #2 of
  all sectors.
- **Stack:** QuickBooks Online or Xero, plus Dext, Karbon or TaxDome, plus email. Two integrations
  covers it, which is exactly the Sprint's stated ceiling.
- **Already pays for outside operational help** — an offshore VA, a contract bookkeeper, or a
  document-capture subscription. This is the qualifier that survives from v1's
  "delegation-proven operator," and it is the only part of v1's ICP that the new evidence supports.

### Who signs

**The practitioner-owner or managing partner. One signature, no committee.** VERIFIED: 19 of 24
Zapier Solution Partners list "1–10 employees" as the size they primarily serve; every named
testimonial recovered in the buy-side lane is signed by an owner or principal; every substantive
complaint quoted below is authored by a solo practitioner or firm partner describing their own
week.

The delegated buyer (Chief of Staff, COO, newly created Director of Automation) is **real but lives
above this price point**. Job-post evidence found that reporting line in ~60 full descriptions and
never once found an owner, practice manager, or office manager — but job postings only exist in
companies large enough to hire an employee. The two datasets are measuring different populations,
and at Simon's price the owner signs. Treat the ops-manager buyer as SPECULATIVE: no title-level
evidence supports it at 11–50 staff.

### Budget authority at each price

**At C$350 — trivially approvable, and that is a problem, not a win.**
Market comparison is unkind: PointWake charges **$497 for a single 45-minute session** and credits
it in full against implementation; Solas AI charges **$800 for a 14-day Exploration Milestone** that
ships a working prototype and a feasibility memo; Kopf Consulting sells a **$99 per-workflow audit**
as a productized floor. At local Quebec City consultant rates of C$100–C$175/hr, **C$350 reads as
two hours of billable time, not as a product.** It is priced like a discount, which invites the
buyer to value it like one.

**At C$2,500 — the owner signs, and the number is defensible.**
- All 24 Zapier Solution Partners examined serve the **$1,001–$5,000 project band**. It is the
  universal band. VERIFIED.
- Aplos AI publishes **$2k–$5k** for "a single workflow that solves one specific problem," live in
  1–3 weeks. Solas AI publishes **$2,500 per Sprint**, 1–2 weeks, "single problem solved end-to-end
  with documentation." Simon's scope, timeline and price all land inside the published market.
- Against the buyer's own economics: C$2,500 is ~20–30 billable hours for a bookkeeper, and roughly
  six months of a $5/hr offshore VA running 20 hours a week.

**The pricing hazards, stated plainly:**
- Freelance marketplaces clear this work at **61% under $500** and **zero North American listings
  above $1,500** on the sample day. Never compete on the same axis as that pool.
- In Quebec specifically, a subsidized **ADRIQ Clinique d'innovation** sells **40 hours of accredited
  advisory for a $2,000 flat fee** (real value $8,000, balance paid by DEC) to manufacturing SMEs
  outside Montreal with $1M–$100M revenue. That is C$500 below the Sprint for 40 hours. It does not
  reach bookkeeping firms (manufacturing-scoped), which is a further argument for segment #1, but it
  is the reason the Sprint must never be sold as hours.

### The recurring workflows that are actually painful

Ranked by verified complaint volume and sprint-feasibility:

1. **The monthly missing-document chase.** Per client, per month: identify which statements,
   receipts and payroll files are missing behind unmatched transactions, then chase the client for
   them across email, text and WhatsApp. This is the flagship. It is recurring by definition,
   bounded, needs exactly two integrations (accounting platform + email/storage), and the
   human-approval step is natural — the practitioner reviews the drafted chase before it sends.
2. **The uncategorized-transaction queue** and the "what was this $340 charge" client query that
   follows it.
3. **Client onboarding packet** assembly and collection.
4. **Month-end close checklist** per client, where the checklist differs per client.
5. **Quebec-specific:** bilingual client communication under Bill 96, which applies at *every*
   business size to invoices, receipts, contracts and written communications.

**Feasibility verdict: this fits the Sprint better than any other workflow found in the research.**
A practitioner has already publicly described building a crude version — Claude connected to
Box.com, running on the 3rd of each month, checking whether each client's file set is present and
drafting a Gmail message when it is not, with a human hitting send. That is proof the workflow is
buildable in the Sprint's scope. It is also proof a slice of the segment will build it themselves.

### The substitute wall — the qualifier that decides every deal

**TaxDome and Karbon already ship automated document chasing as a feature.** VERIFIED, from Karbon's
own marketing copy: *"Automatic reminders and follow-ups chase clients for missing information on
your behalf, without a team member having to remember to send them."* TaxDome's "Client requests"
does the same with configurable auto-reminders. Karbon runs $59–89/user/month; TaxDome
$700–1,200/seat/year.

This does not kill the segment. It defines it. **The buyer is the firm running QuickBooks Online or
Xero plus Excel plus email, with no practice-management layer at all** — which is precisely why they
are the ones complaining. A practitioner describes the scale even inside tooled environments: *"In
one real production snapshot there were 3,307 missing document lines across 60 client companies."*

**The first qualifying question on every call, before anything else:**

> "What do you run alongside QuickBooks — is there a practice-management tool, or is it email and
> spreadsheets?"

TaxDome or Karbon → **disqualify immediately and say so plainly.** Selling a build of a feature they
already pay for is how a practice loses a referral network. QBO/Xero + email + Excel → proceed.

A hard delivery boundary that comes with the segment: route document *intake* through the client's
existing portal. Never build custom storage for bank statements or tax data. Law 25 Art. 3.3 makes
that a privacy-assessment trigger, and the liability is disproportionate to the fee.

### Trigger events — what makes someone go looking

- **Hubdoc's disappearance.** A practitioner writes, in May 2026: *"With Hubdoc gone, my workflow is
  completely broken."* **UNVERIFIED — flagged.** Xero's own pages 503'd and the session's search
  budget was exhausted, so this is a practitioner's claim, not a confirmed vendor action. It is the
  single sharpest hook in this document and it must be verified with Xero before it appears in one
  line of outreach copy. Five-minute check, high payoff.
- **Tax-season crunch**, January–April. The pain is maximal and the willingness to fix it is
  seasonal. A Sprint sold in October lands before the crunch; a Sprint sold in February competes
  with the crunch itself.
- **Losing an admin or a VA**, which converts a labour problem into a systems problem overnight.
- **Onboarding a batch of new clients**, which multiplies the chase linearly.
- **A client asks a Law 25 question**, or the firm realizes it has been pasting client financials
  into a US-hosted model.

### The Law 25 wedge — the strongest positioning asset found

This is Quebec-specific, it is verified against the statute, and it converts Simon's existing offer
mechanics into legal necessity. It matters most for accountants because they hold the most sensitive
client personal information of any small-business vertical.

- **Art. 3.3** — a privacy impact assessment is required for *any* project acquiring, developing or
  redesigning an information system involving personal information. Adopting an AI tool **is** that
  project.
- **Art. 17** — an assessment **and a written agreement** are required before communicating personal
  information outside Quebec. Pasting client financials into a US-hosted model is exactly this.
- **Art. 12.1** — decisions made exclusively by automated processing must be disclosed, their
  principal factors and parameters explained on request, and the person given the opportunity to
  make representations **to a staff member able to revise the decision**.

Art. 12.1 means **the human-approval step Simon already builds is a legal design requirement in
Quebec, not a trust ornament.** Competitors are not building it. Law 25 applies to every business
regardless of size, sole proprietors included.

Sell it as *"this is what unblocks you,"* never as a fine threat: **no evidence of CAI enforcement
against small businesses was found.** The honest frame is that the assessment and the revising human
are what make it safe to start, which speaks directly to the 13.4% of Canadian firms citing
privacy/cybersecurity as their adoption barrier.

---

## 3. The buyer's own language — verbatim, with sources

All quotes are operator-authored, recovered live from r/Bookkeeping and r/Accounting via the Arctic
Shift archive API. **VERIFIED as posted.**

**The chase:**

> "Hey everyone, solo practitioner here. I'm spending half my week chasing down small business
> clients via text and email just to get them to upload their monthly statements and receipts. With
> Hubdoc gone, my workflow is completely broken."
> — r/Bookkeeping, 2026-05-21, [thread](https://www.reddit.com/r/Bookkeeping/comments/1tj7d1u/)

> "We're constantly chasing receipts and asking clients about random transactions they don't
> remember. It's exhausting. We send emails, texts, even WhatsApps — and then wait days (or weeks)
> for a reply."
> — r/Bookkeeping, 2025-08-05, [thread](https://www.reddit.com/r/Bookkeeping/comments/1mig8a2/)

> "Chasing clients for documents – bank statements, invoices, receipts, payroll information, etc. I
> feel like I'm constantly sending reminder emails or following up because something is missing or
> incomplete."
> — r/Accounting, 2026-07-24, [thread](https://www.reddit.com/r/Accounting/comments/1v578ch/)

**The line to build the entire campaign around:**

> "It isn't really a list, **it's a feeling you get at 11pm.**"
> — u/HereGoesStuff, r/Accounting, 2026-08-10

That sentence passes the Busy Owner Test on its own. It names the felt state, it is falsifiable, and
it came from the buyer rather than from us. It is a better foundation than the working headline in
`practice-plan-v1.md` ("Stop being the glue holding your operations together"), which is generic by
comparison and could be addressed to any business on earth.

**Why the incumbent tools do not close it:**

> "I have. It doesn't stick for most clients. I've tried using QBO, Dext, Hubdoc, etc. It works for
> some clients, but the old school ones still refuse to go that route."
> — u/crabby_patty_57, r/Bookkeeping, 2025-03-14

> "The exact opposite - getting receipts is impossible with some clients."
> — u/juswannalurkpls, r/Bookkeeping, 2025-03-09

**Identity language, useful and dangerous:**

> "I'm a bookkeeper, not a babysitter."
> — u/Oldladyphilosopher, r/Bookkeeping, 2025-03-09

**Counter-evidence, quoted at equal weight — this is the segment arguing against the offer:**

> "Isnt this all just part of the job description? […] If clients being stuck in the stone age is too
> much stress for you i would say theres 2 options then: 1. change vocations or 2. charge more"
> — u/hootywarrior, r/Bookkeeping, 2025-03-09

> "We connected Claude to Box.com and on 3rd of each month Claude runs an automated task to check if
> the set of files for the current month is there […] and if not it drafts an email in gmail to send
> it out. […] we still have a draft before hitting send. We are pretty happy how Claude is handling
> it."
> — u/Anelya, r/Accounting, 2026-07-23, [thread](https://www.reddit.com/r/Accounting/comments/1v48gxu/)

> "what actually cut my chasing time down was making it scheduled instead of reactive […] Clients
> ignore random nags way more than they ignore a predictable same-day-every-week ask"
> — u/idreesBughio, r/Accounting, 2026-07-31

The last two are the real competitive threat and they should stay in front of Simon: **the segment's
smartest members are already solving this with the tools Simon would use, and the fix is partly a
process change rather than a build.** The Sprint's defensible ground is not "I can build this" — it
is that the practitioner has not written the process down, and cannot automate what they cannot
define.

**Words to use:** chasing, missing receipts, month-end, unmatched transactions, statements,
uncategorized queue, "before it sends," 11pm. **Words to avoid** (unchanged hard rule): agents,
orchestration, MCP, context windows, workflow engine, LLM, n8n. The buyer says "Zapier" or says
nothing; n8n is an enterprise and European brand and leading with it borrows the wrong positioning.

---

## 4. Where these people gather, and which channels one person can actually work

**The four-hour constraint is the whole analysis.** Four hours a week is ~16 hours a month. One CCIQ
lunch is ~2.5 hours door to door. A weekly BNI chapter is ~8 hours a month before travel. The
ceiling is **one recurring commitment plus one monthly event**, and neither of those is where
segment #1 lives.

| Rank | Channel | Specifics | Verdict at 4 hrs/week |
|---|---|---|---|
| **1** | **QuickBooks ProAdvisor + Xero Partner directories, geo-filtered to Quebec & Ontario** | Public, free, finite, nameable. Produces a list of every accounting/bookkeeping practice in the region with the exact stack the Sprint targets | **The only channel that fits the constraint.** An agent builds the list at zero Simon-minutes; Simon spends his four hours on bilingual personal outreach, not on discovery |
| **2** | **Referral partners already in the plan** — bookkeepers and accountants named in `practice-plan-v1.md` | Reframe required: they were listed as a *channel to* owner-operators. The research says they are the **buyer**, and a channel second | High value, near-zero cost, immediately actionable. The reframe is the cheapest strategic change in this document |
| **3** | **Karbon / TaxDome / Dext user communities; r/Bookkeeping, r/Accounting** | Where the verbatim above came from | Listen-only. These surfaces are actively hostile to sellers — every discovery-shaped post in the research got flamed. Mine for language, never post an offer |
| **4** | **Ordre des CPA du Québec, APFF, regional bookkeeping associations** | Sponsorship, directories, CPD sessions | **Unassessed — real gap.** No association page was read in this research. Worth 30 minutes before ranking it properly |
| **5** | **Productivité-Compétences (CPMT/MESS) as a hired trainer** | Promoters are collective bodies (sectoral committees, mutuelles de formation); consultant/trainer fees capped at **$150/h**, needs analysis reimbursed at 100%, delivery at 85%; **must be in French**. July 2026: $10M+, 51 projects, ~3,000 businesses | Real B2B2B income lane, wrong shape for the Sprint. Simon cannot apply as promoter; he can be hired. Call list is associations, not end clients |
| **6** | **CCIQ / JCCQ / BNI / CTAQ** | JCCQ $150/yr (~900 members); CCIQ 5,500+ members, non-member lunch $178; CTAQ supplier tier $995/yr, $2,495 tier includes attendee lists | General-business rooms. Poor segment targeting, high hours-per-contact. CTAQ is the exception because dollars substitute for hours |
| **7** | **Content** | LinkedIn, blog | Real but lagged 6–18 months. Correctly excluded from the 90-day window in the plan; keep it byproduct-only |

**Two phone calls worth more than any of the above.** **NUMERI certification** (MEIE-backed,
ADRIQ-operated, launched 2026-04-21): $200 application + $600 on approval, valid 3 years, requires 5
years documented experience plus 2 anonymized diagnostics and 2 client references — and there are
**11 certified experts in the entire province, none identifiably in Quebec City.** Whether it confers
paid-supplier status on government programs is **not stated on the page**; that is the question to
ask. Separately, **DEC's Initiative régionale en IA** (opened 2026-06-18, runs to 2031-03-31, up to
90%, continuous intake) is worth a direct call.

The accreditation moat is otherwise **closed**: ADRIQ's own page states there is a moratorium on
accrediting new consultants, which gates both Trans Num and the Clinique d'innovation.

---

## 5. Disqualifiers — who looks like a fit and is not

- **Any firm whose software is closed.** This is now the fastest disqualifier in the practice and it
  is checkable in one question. **Jane App has no API at all** — in their own words, *"Jane doesn't
  currently have an open API or provide API keys, and there aren't any plans to make these
  available"* — and Jane dominates Canadian allied health, which removes most of Quebec's physio,
  chiro and massage market from a 2–3 week sprint. **Eaglesoft** charges $3,000–5,000 enrollment
  plus monthly; Dentrix is similarly gated. **AppFolio** requires partner registration, a 50-unit
  minimum, Plus tier only, and offers one-way export with no write-back. Green lights: QuickBooks
  Online, Xero, Open Dental, Cliniko, Clio, Jobber, Housecall Pro, Guesty, Hostaway.
- **Small law firms — for anything except the administrative lane.** Discovery-shaped questions were
  met with *"No AI and no we're not trying to help you find 'pain points' to assist your marketing"*
  and *"How stupid do you think we are?"* One practitioner stated it outright: *"Neither me nor [my]
  clients care about time spend. We care about the highest quality work product."* A firm that does
  not sell hours does not buy hours back. **Permanently excluded regardless of how loudly a prospect
  asks: conflict checks** (a false negative is a bar complaint, not a bug) **and trust accounting**
  (regulated three-way reconciliation, disbarment-level risk). What survives is matter-status
  updates and retainer chasing, which the **Barreau du Québec has effectively pre-approved in
  writing** — its generative-AI guide for members permits "administrative task support" while
  cautioning against legal analysis and drafting opinions. That is the regulator's own words usable
  as sales collateral, and it is why law sits at #4 rather than in this list.
- **Property management as a *segment*.** Demoted out of the ranked list entirely. The competing
  labour price is visible and low — a VA pitching guest messaging and turnover tracking at
  *"$8 per hour (negotiable)"*, after-hours answering services at $35–45/month — and the most-upvoted
  success story on the surface was someone who **built it themselves for free**. In a 37-property
  operation described in the research, two contract managers absorbed 24/7 pain at $200/day flat
  while an absentee owner controlled spend: the pain-holder is not the budget-holder. Sym remains a
  genuine warm one-off worth closing on his own merits; **one friend with 100 doors is not a
  segment**, and letting him define the ICP would repeat v1's error in a new costume.
- **MSPs and IT shops — as customers.** They own the automation platform layer already, employ
  in-house developers, and run competent build-vs-buy analysis. Rewst is entrenched (currently
  churning after layoffs and a repricing, which is a distraction, not an opening), and triage and
  QBR are saturated with funded vendors. The community actively identifies and rejects solo
  consultants pitching this: *"I believe OP works for an n8n consultancy firm."* Worth one future
  test as a **reseller channel to their own SMB base**; never as a direct buyer.
- **E-commerce and DTC retail.** Highest raw volume in the buy-side data (17 of 24 Zapier partners
  serve it) and the most price-shopped, most offshore-compressed buyer in the market. Wrong first
  segment for a practice with no proof and premium positioning.
- **Anyone with in-house developers.** MSPs and agencies with a dev team run a competent
  build-vs-buy analysis and frequently conclude "just code it" or "hire in an emerging economy."
- **Businesses below ~C$250K revenue**, and any firm not already paying for outside operational
  help. The JPMorgan median ($28–30/month of AI spend) is the disqualifier: if AI is the first
  operational spend they have ever made, C$2,500 is not a purchase they can rationalize.
- **Hospitality and food service.** Last in every adoption survey (8.3% US / 12.7% Canada, 2.8%
  consultant use).
- **The seller economy, on every surface.** The LinkedIn finding replicates on Reddit in different
  costume: a large share of "what's your biggest time sink?" threads are founders and builders doing
  discovery, not operators complaining. Tell: *"Not selling anything — just trying to learn."*
  Operators have learned the tell and are hostile to it. **Read post authorship before counting a
  thread as demand.**
- **Any prospect whose pain-holder is not the budget-holder.** Generalize the property-management
  finding above into a standing qualifier: if the person describing the pain cannot sign for
  C$2,500, the deal is a two-step sale and should be priced and paced as one, or declined.

---

## 6. The single cheapest test that confirms or kills segment #1 in 30 days

**The claim under test:** *Canadian bookkeeping and accounting practices of 1–20 staff will pay
C$350 for a session that maps their monthly client-document chase.*

**The test — one channel, one workflow, one hook, forty names.**

1. **Agent builds the list (zero Simon-minutes).** Scrape the QuickBooks ProAdvisor and Xero Partner
   directories, filter to Quebec and Ontario, keep practices of 1–20 staff. Target 60 names to
   yield 40 contactable. Where a firm's site advertises TaxDome or Karbon, **drop it before Simon
   ever sees it** — the substitute wall is a list-building filter, not a call-time discovery.
2. **Verify the Hubdoc claim first** (5 minutes). If Hubdoc is genuinely retired or degraded, it is
   the hook. If not, the hook is the 11pm line.
3. **Simon sends 40 bilingual personal emails over three weeks.** The ask is the C$350 mapping
   session, never "do you need AI help." One workflow named in the subject line: the monthly chase.
4. **Qualify on stack in the first two minutes of every call** — "is there a practice-management
   tool, or is it email and spreadsheets?" A TaxDome or Karbon answer ends the call honestly and
   earns a referral. Log it either way; the ratio of tooled to un-tooled firms is itself the
   segment-sizing data this document lacks.
5. **Every call is a buyer interview.** Log trigger, verbatim problem language, what they already
   pay for help, and whether they have already tried building it.

**Cost:** ~C$0 cash. **~4 Simon-hours total** across the month, inside the protected outreach budget,
displacing nothing.

**Kill criteria — decide on evidence, not feeling:**

| Outcome from 40 contacts | Verdict |
|---|---|
| 0–1 booked sessions | **Segment dead.** Run the same test against **trades and quote follow-up** (segment #2) — do not re-run bookkeeping with better copy |
| 2 booked | Inconclusive. One more 40-name batch, different hook, then decide |
| ≥3 booked, ≥1 progressing to a Sprint conversation | **Confirmed.** Harden the ICP here and raise the Mapping Session toward the C$500 market rate |

**If it kills #1, the fallback test is already specified.** Same shape, different segment: pull HVAC,
plumbing and electrical contractors of 5–50 staff running Jobber or Housecall Pro, hook on quotes
that went quiet, and reach them **by referral and through the trade associations (CMEQ, CMMTQ) —
never by posting in their forums**, where a ban-the-software-vendors post drew 204 upvotes. Expect
worse reply rates and better call quality: the pain is self-quantified in dollars, and the sector's
2.2% consultant-use rate is the thing actually being tested.

**Why this test and not another.** It uses the only channel that fits four hours a week, it tests the
narrowest falsifiable claim rather than the whole practice, it produces revenue if it works, and it
produces the buyer interviews that this document is missing either way. Reply rate is not the
metric; **booked paid sessions** are.

**Second, near-free test worth running in parallel:** re-price the Mapping Session experiment. Every
comparable diagnostic in the market charges more (PointWake $497/45min, Solas $800/14 days), and
PointWake's mechanic — **fee credited in full against implementation** — is already in Simon's offer.
Quote C$500 to the second half of the list and compare booking rates. Cost: zero.

---

## 7. What could NOT be verified — stated plainly

**Blocking gaps in the research itself:**
- The session's **200-call WebSearch budget was exhausted** mid-run. Later lanes worked by direct
  fetch, which improved some results (LinkedIn's guest jobs API returned ~120 real postings with pay
  fields) and blocked others.
- **Reddit, Upwork, Fiverr, Indeed and ZipRecruiter all 403 to direct fetch.** Reddit was recovered
  through the Arctic Shift archive; the others were not. **No buyer-side "here's what I paid"
  evidence was obtainable from Upwork or Fiverr at all.**
- **No French-language operator forum was mined.** Every verbatim quote in §3 is English. For a
  bilingual practice selling into Quebec, this is a real hole.

**Unverified claims that are load-bearing and must not be repeated as fact:**
- **Hubdoc's retirement.** Practitioner claim only. Xero's pages returned 503. Verify before use.
- **Willingness to pay C$2,500 in segment #1.** No bookkeeping firm anywhere in the research states
  having paid for a workflow build. The price is defensible against market comps and against the
  buyer's own hourly economics; it is not proven in-segment.
- **Whether C$350 → Sprint conversion works at all.** Unchanged from `practice-plan-v1.md`.
- **The ops-manager / practice-manager buyer at 11–50 staff.** SPECULATIVE. No title-level evidence
  in either direction; typical department-manager discretionary caps of ~$500–$2,000 suggest C$350
  is approvable by them and C$2,500 is not, which would make it a two-step sale.
- **Whether NUMERI certification confers paid-supplier status** on Quebec government programs. Not
  stated on the page.
- **ESSOR Volet 1B terms** — Investissement Québec's page says 50%/max $20,000, helloDarwin says
  30%/max $10,000. Unresolved. **Audit industrie 4.0** official page 404s. **DEC AI initiative**
  official terms not readable (403).
- **Every published competitor price is an ask, not a proven transaction.** Solas, Aplos, PointWake
  and Zaps Studios are small shops publishing what they would like to charge. The Zapier directory
  budget bands and Clutch minimums are closer to transaction evidence because they sit behind
  verified review volume.
- **All competitor case-study results are vendor-authored** and several concern unnamed clients.
- **The "average SMB spends $18,000/year on AI" figure** circulating in SEO content has no traceable
  primary source and contradicts JPMorgan's transaction data by ~50×. Do not cite it.

- **The size of the un-tooled slice of segment #1.** The substitute wall defines the buyer, and
  nothing in this research sizes it. What fraction of Canadian bookkeeping practices run QBO or Xero
  with no practice-management layer is **unknown**. The §6 test produces this number as a byproduct,
  which is a second reason to run it.
- **Whether Quebec clinics share the US insurance-verification pain.** The pain is US-shaped;
  RAMQ plus a private-insurer mix may dissolve it entirely. Unvalidated, and it gates segment #3.

**Not assessed at all:** Ordre des CPA du Québec and every professional-order channel; SEAO (Quebec
public procurement) and Bonfire; Quebec Facebook/LinkedIn groups, Slack and Discord communities
(zero findings, not a negative result — simply unread); CCIQ's actual fee schedule; Élan's prices
(the most locally relevant competitor, sales-gated); Ordre des dentistes, CMEQ, CMMTQ and Chambre
des notaires member counts; Buildium and DoorLoop API openness; the MSP-as-reseller hypothesis.

---

## 8. What this changes in the existing estate

| Doc | Change required |
|---|---|
| `funnel/practice-plan-v1.md` | ICP line updated from "owner-operated 2–30 person service business" to segment #1. Referral-partner list reframed: bookkeepers and accountants are the **buyer**, channel second. Working headline reconsidered against the 11pm line |
| `.claude/product-marketing.md` | Version bump to v3. Target audience, personas, customer-language bank, competitive landscape (Solas/Aplos/PointWake are the real comps, not FloatAI/DigiSmart), and the relevance-not-cost objection all change |
| `brand/audiences/operator.md` | The "delegation-proven operator" qualifier survives and strengthens. The Claude-desktop-app framing does not — the offer is tool-agnostic now |
| `funnel/setup-offer/icp.md` | Marked superseded by this document |

---

## Sources

**Primary statistical:** [US Census BTOS AI Supplement](https://www.census.gov/hfp/btos/about) ·
[StatCan 11-621-M2026010](https://www150.statcan.gc.ca/n1/pub/11-621-m/11-621-m2026010-eng.htm) ·
[StatCan 11-621-M2025008](https://www150.statcan.gc.ca/n1/pub/11-621-m/11-621-m2025008-eng.htm) ·
[StatCan 36-28-0001 AI productivity study](https://www150.statcan.gc.ca/n1/pub/36-28-0001/2026004/article/00002-eng.htm) ·
[ISQ Quebec AI adoption](https://statistique.quebec.ca/en/produit/publication/adoption-et-utilisation-intelligence-artificielle-entreprises-au-quebec-2024-2025) ·
[JPMorgan Chase Institute, AI use by small businesses](https://www.jpmorganchase.com/institute/all-topics/business-growth-and-entrepreneurship/understanding-ai-use-by-small-businesses)

**Buyer language:** r/Bookkeeping and r/Accounting threads cited inline in §3, recovered via the
Arctic Shift archive API.

**Market comps:** [Solas AI pricing](https://www.solasai.net/pricing) ·
[Aplos AI pricing](https://aplosai.com/pricing) · [PointWake pricing](https://pointwake.com/pricing) ·
[Kopf workflow audit](https://kopfconsulting.org/workflow-audit-services/) · Zapier Solution Partner
directory (24 profiles) · Clutch profiles for Automation Strategy Group, Connex Digital, Hypelocal,
Flow Digital, Routine Automation

**Channel evidence:** [Ace Workflow contract posting](https://www.linkedin.com/jobs/view/4450973791) ·
[Globixs/MCTechnology](https://www.linkedin.com/jobs/view/4447786367) ·
[LuminaFlow](https://ca.linkedin.com/jobs/view/4447368164) ·
[BDC LIFT release](https://www.bdc.ca/en/about/mediaroom/news-releases/bdc-launches-lift-getting-canadian-smes-off-the-ai-sidelines)

**Quebec regulatory:** Law 25 arts. 3.3, 17, 12.1 · Bill 96 arts. 52, 57 · CCQ monthly reporting ·
CNESST LMRSST obligations ·
[Barreau du Québec generative-AI guide for members](https://www.barreau.qc.ca/fr/membres-ordre/ressources/normes-outils-references-guides/intelligence-artificielle-generative/) ·
[ISQ active businesses in Quebec](https://statistique.quebec.ca/en/document/nombre-entreprises-actives-quebec)

**Vertical / stack evidence:** Karbon and TaxDome product copy (automated document chasing) · Jane
App API statement · Open Dental, Cliniko, Clio, Jobber, Housecall Pro, Guesty and Hostaway developer
documentation · AppFolio and Eaglesoft partner-gate terms · r/HVAC, r/electricians, r/Plumbing,
r/Dentistry, r/Chiropractic, r/LawFirm, r/PropertyManagement, r/ShortTermRentals, r/agency, r/msp
threads cited inline, recovered via the Arctic Shift archive API and a redlib mirror ·
BiggerPockets, AccountingWEB, Dentaltown, Capterra, Hacker News

---

## Changelog

- **v2.1 (2026-08-14)** — Revised on the fifth research lane's return. Added the **TaxDome/Karbon
  substitute wall**, which redefines segment #1 as the un-tooled slice and adds a stack-qualifying
  question that gates every deal. Promoted **trades and field service to #2** as the designated
  fallback and documented the honest disagreement between pain intensity (trades highest) and sector
  purchase rate (trades lowest at 2.2%). Demoted property management out of the ranked list; Sym is
  a warm one-off, not a segment. Added the closed-API disqualifier (Jane App, Eaglesoft, AppFolio)
  and the Barreau du Québec administrative-automation permission.
- **v2 (2026-08-14)** — Rewritten from a five-lane live external research run. Replaced the
  headcount-defined ICP with a workflow-defined one. Segment #1 moved from "owner-operated service
  SMB" to Canadian bookkeeping/accounting practices. Established that relevance, not cost, is the
  adoption barrier; that Canada outperforms the US ~3.5× on consultant purchase rate; and that the
  owner signs at this price point. Added the Law 25 Art. 12.1 wedge, the disqualifier list, and a
  30-day falsifiable test with explicit kill criteria.
- v1 (2026-07-20) — `funnel/setup-offer/icp.md`, 102-agent deep-research run. Superseded.
