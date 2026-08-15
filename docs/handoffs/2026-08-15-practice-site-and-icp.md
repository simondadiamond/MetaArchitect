# Handoff — practice site + ICP (2026-08-15)

> Written by the CRO seat at the end of the 2026-08-14/15 session. Everything a fresh
> agent needs to continue the website work or the ICP test without re-reading the
> transcript. **Nothing here is customer-facing yet. No outreach has been sent.**

## 1. The business, in one paragraph

Simon is going independent as an AI implementation consultant, not as a productized
product company. He takes one piece of recurring work an owner personally coordinates
and turns it into a reliable AI-assisted workflow, tool-agnostic. This replaced the
`/setup` "Business OS" ladder, which is dead — commercial agent platforms (Grok, Cowork)
commoditize any interface, the five-rung ladder closed zero clients, and the real scope
is one workflow, not an OS.

**The ladder and the full plan are saved and current: [`funnel/practice-plan-v1.md`](../../funnel/practice-plan-v1.md).**
That file is the source of truth for offer, pricing, guarantees, geography, time budget,
quit trigger and decision rules. Read it first. Summary:

| Rung | Price | Guarantee |
|---|---|---|
| Workflow Mapping Session | C$350 / US$350, credited to a Sprint within 30 days | Nothing worth building → no charge |
| Workflow Sprint | C$1,750 founding (first 3) / C$2,500 standard | 50% deposit; balance only on acceptance after a 14-day live run; work-until-it-works. No refunds after acceptance, stated plainly |
| Ongoing Improvement | C$400–600/mo, post-Sprint only | — |

Price-raise trigger: after three delivered Sprints with a measured result, standard goes
to C$4,000 and scope grows to two workflows.

## 2. ICP status — moderate confidence, test pending

Full document: [`funnel/icp-v2.md`](../../funnel/icp-v2.md) (v2.2). `funnel/setup-offer/icp.md`
is marked superseded.

**#1: bookkeeping, accounting and tax practices, 1–20 staff, on QuickBooks Online or Xero
with no practice-management layer.** The monthly missing-document chase. Buyer language:
*"It isn't really a list, it's a feeling you get at 11pm."* Channel: QuickBooks ProAdvisor
and Xero Partner directories, Quebec and Ontario. Fallback segment: trades and field
service.

**Read these caveats before acting on it:**

- Confidence is moderate and was *declining* through the research. **TaxDome and Karbon
  already ship automated document chasing**, so the buyable segment is only the un-tooled
  slice, and nothing sizes that slice. This is a disqualifying question on every call.
- No bookkeeping firm anywhere is documented as having paid for a workflow build.
- The sector is regulated and risk-averse, handling client financial data — Simon's own
  objection, and a fair one. The *workflow* is administrative; the *data* is not.
- **One of five research lanes fabricated a large part of its report** (see
  `docs/lessons.md`, 2026-08-14). All Quebec competitor pricing, chamber dues, Bill 96
  article numbers and a Law 25 positioning argument were invented and are stripped.
  Treat any Quebec-specific price or statute claim as *absent*, not merely uncertain.
  **Simon currently has no verified idea what local competitors charge.** A clean re-run
  of that lane is outstanding.
- Do NOT argue "the old ICP produced zero inbound" — Simon correctly pointed out no
  outreach was ever sent, so that observation is worthless. The real case against v1 is
  that it was **unfalsifiable**: "owner-operated 2–30 person service business" described
  every small business in North America, so no test could have killed it.

**The 30-day test (not yet started, needs Simon's go):** 40 Canadian bookkeeping
practices, TaxDome/Karbon users filtered out at list-build, one named workflow, bilingual
personal email, asking for the C$350 session. ~4 Simon-hours, C$0. Zero or one booking
kills the segment and triggers the trades test rather than a copy rewrite. Quote C$500 to
half the list as a free price experiment — comps run higher than C$350 (PointWake $497 for
45 min, Solas $800 for a 14-day prototype, Solas $2,500 per Sprint).

## 3. Website — where the design landed

All working files in the session scratchpad (temporary — **copy anything worth keeping into
the repo before the scratchpad is cleared**):
`/tmp/claude-1000/-home-diamond-projects-MetaArchitect--claude-worktrees-ade-cro-a85cfb6f/a85cfb6f-4fc6-4c42-acbe-75e01aa3fbc9/scratchpad/`

### Lineage and verdicts

| File | What it is | Simon's verdict |
|---|---|---|
| `site-a/b/c.html` | First three directions (generalist agent) | Rejected — "pretty trash" |
| `sm-site-a.html` | Cobalt on chalk, twelve-week grid hero | Not chosen; the grid device is still the best single artifact produced |
| `sm-site-b.html` | **"The Practice"** — deep petrol, bone, no accent | **Chosen as the base.** "A lot going for it but missing something" |
| `practice-v2-a.html` | Ledger-rule field, no accent | Rejected (answered neither half of the ask) |
| `practice-v2-b.html` | **"Brass"** — one warm accent `#D2A968` | **Yes. "Brass looks better."** |
| `practice-v2-c.html` | Guilloche security paper at 5% | Rejected — "essentially the same but with a couple brass lines" (the motif is invisible at that opacity) |
| `brass-v3-a.html` | Corner-gradient ground | **Rejected — see the spec below** |
| `brass-v3-b.html` | **Portrait slot + diagram plates + grain** | **Yes. "Portrait + plates is nice."** |

**Current best = `brass-v3-b.html`.** It has the portrait slot, both diagrams plated, and
the grain layer, on the flat brass ground. It does NOT have a gradient.

### The brass rule — do not break it

Brass marks **human commitments only**: the published price, the guarantee, the deliverable
checkmarks, the approval branch in the sprint diagram. Eight uses on a long page. The
primary CTA deliberately stays bone (12.3:1) — brass would drop it to 6.6:1 and weaken the
one element the page exists to get clicked. Colour carries meaning; contrast keeps the
action. **Simon has been told that "more gold" is the request to refuse.**

### Why the gradient failed, and what would fix it

Simon's two reasons, and they are precise:

1. **Every section must share the same base background.** `brass-v3-a.html` kept each
   `.well` band's own vertical gradient underneath the corner ramp, so sections differ
   from one another. Wrong. One uniform ground, with light on top of it.
2. **The corner lights must line up across section boundaries — when it is done correctly
   there is not a single visible seam.** v3-a painted per-section, so every boundary was a
   seam.

His reference is his old site `https://newtechn9.netlify.app/` (screenshot reviewed this
session): a uniformly dark near-black ground with teal light pooling in from the page
edges *continuously down the whole document*, not painted section by section. The correct
implementation is almost certainly a single document-level light layer (not
`position: fixed` — that binds light to the viewport and kills the rhythm; that was the
flaw in the earlier `practice-v2-b` wash) with sections transparent on top of it.

The earlier finding still holds and is worth keeping: the mechanic that makes his old site
work is the `TL, BR, TR, BL` cycle putting light on the *same side* of every other
boundary, so light zigzags down the page. Also: his old site puts the brand accent at 20%
in every corner. Copying that here would mean eight warm blooms and would triple the brass
footprint — the mechanic transfers, the colour does not.

### The second reference — bookends, NOT alternating (corrected by Simon)

Simon shared a second reference described as *"dark and light at the same time."* An earlier
version of this handoff recorded it as alternating dark/light sections. **That was wrong and
he corrected it:**

> "I didn't want alternating patterns. I wanted, like he's doing — dark green header and
> footer, and the rest more light theme. I don't have to use his exact colors, my colors."

So: **a dark petrol header/hero block, a light bone body through the middle, a dark petrol
footer/close block.** Bookends, not a rhythm. Same three colours The Practice already uses
(petrol, bone, brass), redistributed — petrol becomes the bookend ground and bone becomes
the body ground, instead of petrol-ground-with-bone-ink throughout. Simon indicated The
Practice itself could take this treatment.

**Two technical constraints that will bite whoever builds it:**

1. **Brass does not survive on bone.** `#D2A968` on `#F2EDE3` is roughly 1.8:1 — a hard
   fail for any text. Brass currently marks human commitments (price, guarantee,
   checkmarks, approval branch), and several of those live in the middle of the page, which
   is now light. On light sections the marker needs a darker bronze for text, or brass gets
   demoted to rules and marks only with petrol carrying the ink. **Do not solve this by
   deleting the brass rule** — the rule is the idea; only its light-ground execution changes.
2. **Both SVG diagrams are drawn bone-on-petrol** and need inverting to petrol-on-bone if
   they land in the light body. The sprint diagram's brass approval branch has the same
   contrast problem as above.

### The portrait — no photo shoot needed

The v3 agent specced an empty 4:5 slot and told Simon to book a shoot. **That was wrong —
photos already exist in the website repo:**

- `projects/simonparis-website/public/simon-paris.png` — 1344×1392 (ratio 0.966)
- `projects/simonparis-website/public/simon-paris-v2.png` — 1344×1257 (ratio 1.069)

Both are high-resolution and neither is 4:5; they need a crop, not a camera. The slot lives
beside the *"French or English… Quebec City"* sentence, which is the one line on the page
about the person and the place. Note the artifact CSP forbids external assets, so a preview
build must inline it as a data URI or the slot stays a placeholder.

## 4. Known defects and open decisions

- **WCAG fail in the older files:** `--bone-3` on `--raise-2` measured 4.13:1 (pricing terms
  and the founding-rate line on the Sprint shelf). Fixed in both `brass-v3-*.html` by
  raising `--bone-3` to `#9FB2B3`. Still broken in `sm-site-*.html` and `practice-v2-*.html`.
  Root cause of the miss: the audit sampled the colour token's nearest background instead of
  the actual painted pixel. **Audit against rendered pixels.**
- **Mobile diagram clipping:** below 640px the SVG labels overflow the viewport and render
  as "plier orders" / "eekly report". Fixed from `practice-v2-*` onward; present in
  `sm-site-b.html`.
- **Every CTA is a `mailto:` placeholder.** Needs a real booking link before traffic.
- **Email address is undecided:** early files use `simon@simonparis.ca`, sitemaster's use
  `me@simonparis.ca`. If this practice is a separate brand from The Meta Architect, that
  address is a positioning decision, not a detail.
- **The page is English-only for a Quebec City audience** while claiming service in French
  or English. Given Bill 96 this needs a lawyer's answer, not an agent's. All Bill 96
  specifics found in research were fabricated — do not cite article numbers.
- **No email capture** for visitors not ready to spend C$350. Irrelevant at zero traffic;
  a hole once content runs.
- **Copy is deliberately generic** (quotes, scheduling, invoicing, supplier orders). It must
  NOT be rewritten to bookkeeper-specific language until the 30-day test confirms the
  segment. If the test moves to trades, generic copy survives and specific copy does not.

## 5. Who to continue with

Simon asked whether to route to the web designer or the CMO. The answer:

- **`sitemaster` — design and build.** Continue here now. It has produced every good
  variant. Its brand-enforcement rule must be explicitly suspended each run (it otherwise
  reads `brand/*` and re-applies `#0F0F0F` / `#E04500` / `#C97A1A` from its own profile,
  which is what made earlier attempts all look the same). Point it at `funnel/icp-v2.md`
  for buyer context rather than chaining an agent handoff.
- **`cmo` — copy and positioning. Not yet.** Page copy is where the segment choice lands,
  and the segment is unconfirmed. A copy pass now gets thrown away if the test moves to
  trades. Bring the CMO in *after* the 30-day test resolves — then it rewrites against a
  known buyer, in that buyer's own language, and that is a strong use of the seat.

## 6. Next actions, in priority order

1. **Send Sym the C$1,750 website proposal, 50% deposit.** Warmest paid door; untouched
   since 2026-08-07. Not blocked by anything in this document.
2. **Call the 30-day test: bookkeeping or trades.** Then build the 60-name ProAdvisor/Xero
   list (agent work, zero Simon-minutes).
3. Gradient v2 against the spec in §3, and the alternating dark/light variant as a sibling.
4. Crop a portrait to 4:5 and drop it into the slot.
5. Clean re-run of the Quebec competitor lane — needed before quoting a price in Quebec City.

## 7. Artifact URLs (published previews, private)

- The Practice (base) — https://claude.ai/code/artifact/bb739158-ef1a-49d3-8647-917647126bb9
- Brass — https://claude.ai/code/artifact/f0f5abc1-a94a-4a0e-bf14-f454affade35
- Security paper (rejected) — https://claude.ai/code/artifact/b4495fc7-cb8c-48af-bd96-8e8ee76f52a3
- Corner gradient (rejected) — https://claude.ai/code/artifact/44b96a88-f36a-4d59-bebb-7a1a659e816c
- **Portrait + plates (current best)** — https://claude.ai/code/artifact/0e1809fd-7c50-48be-be10-11de56e6739f
- Standing Order — https://claude.ai/code/artifact/8e925ab4-d536-4c65-a555-95953ea32978
