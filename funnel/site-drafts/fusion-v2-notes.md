> **SUPERSEDED by `fusion-v3` on 2026-08-17.** v2 dissolved the implementation
> product and could not price it; v3 restores it. Kept because the CRO verdict
> and the review-provenance table below are still the record. Design system:
> `THEME.md`.

# fusion v2 — the repositioning

A sibling to `fusion.html`, not a replacement. Both build, both verify, both are
served. `fusion.src.html` is untouched.

```
python3 fusion-v2-build.py && node verify.js fusion-v2.html && python3 audit-contrast.py
```

Preview: `http://100.105.85.5:8086/fusion-v2.html` (v1 is `/fusion.html`).

## Where this came from, and the caveat that matters

Simon took the page to an outside AI and brought back a long review. **That review
was reading `stitch-quiet-luxury-v2.html`, not the fusion.** Every line it quotes
is Stitch placeholder copy the fusion had already killed:

| It flagged | Status before the review |
|---|---|
| "Intelligent Efficiency for the Small Firm" | gone |
| "The Weight of the Invisible" / "True luxury in business…" | gone |
| Audit → Build → Deploy | gone (was Map/Build/Run live/Hand off) |
| "100% Satisfaction Guarantee" | gone |
| "I do not build software. I build capacity." | gone |
| "Clarity awaits." | gone |
| "Absolute confidentiality", "data localization", "never trains public models" | gone |
| "we do not consider a project complete until the system runs perfectly" | gone |
| "The Methodology", "forensic examination", "bespoke", "Executive Summary" | gone |
| nav "The Process / Pricing / The Practice" | gone |
| the "recommended" badge on a pricing card | never built |
| stock portraits, invented logos, empty case-study nav | gone |

So roughly half the review was already done. Saying so is not a defence of the
fusion — the half that was *not* already done is a genuine repositioning, and it
is what v2 is.

## What v2 actually changes — the offer architecture

**1. One published price, not two.** The homepage shows C$350 and no
implementation price. This is the biggest change and the review's strongest
argument: publishing C$1,750 for "one workflow, live and measured" reads as
*less* premium to a sophisticated buyer, because they cannot see how it is
delivered properly at that number. The C$350 session already satisfies the
pricing-transparency need. Implementation is now "scoped individually, after the
session or after a conversation."

`C$1,750` is not deleted from the business — it moves to the vertical pages,
where a cold arrival from targeted outreach can be told *"typical first
implementations start around C$1,750."* Different page, different job. That is
now a requirement on the `/practices` build.

**2. Two unequal things, not two tiers.** A wide, fully specified session card
(7 columns, six deliverables, the credit rule) beside a short dark implementation
panel (5 columns, six "could include" lines, no price). Equal cards invite a
comparison that is not on offer.

**3. The session is renamed and respecified.** "Workflow Mapping Session" → **AI
Workflow Opportunity Session**, and the deliverables are the review's: a
pre-session questionnaire, a ninety-minute working session, current → proposed
workflow, an AI vs automation vs human recommendation, feasibility/risks/impact,
and a named implementation.

**4. FIND / DESIGN / IMPLEMENT**, three phases, replacing Map / Build / Run live
/ Hand off. The point of the change is DESIGN's wording — *"AI, deterministic
automation, existing software, custom code, or a combination"* — because **not
automatically prescribing AI is the credibility play**. A new FAQ ("What if AI is
not the right answer?") carries the same idea. Phase labels stay gold, per
Simon's 2026-08-17 call, but the hardcoded durations are gone.

**5. The hero names the practice, not a segment.** *"Put AI to work in your
business."* / *"I help businesses find where AI can save time, improve how work
gets done, and turn those opportunities into reliable systems."* The old headline
narrowed to "the work that only happens when you do it" — good, but the review is
right that this one is clearer and does not pre-narrow the brand.

**6. The portrait moves into the hero.** copy | Simon, which is what the original
Stitch composition did. The about section is text-only now. The argument is
sound: the thing being bought is a person's judgment, so the person is the hero
image.

**7. "Builder first."** The about section says what is actually true — a software
developer and technical lead who works deeply with AI, automation and agentic
systems — instead of the practice's older tool-agnostic framing. This is a real
positioning shift and the strongest single correction in the review.

**8. "See what you'll leave with."** The report's eight headings, set as an
artifact: current workflow, friction, proposed workflow, what stays human, what
gets automated, systems involved, expected impact, implementation options. **No
"VIEW SAMPLE →" button** — there is still no sample document. Building one is now
the highest-value missing asset on the whole funnel; it substitutes for social
proof, which is the one thing this practice cannot manufacture.

**9. The close asks a question.** *"What work should AI be doing for you?"* with
`FIND AN OPPORTUNITY — C$350` and a secondary *"Not sure the session is right for
you? Start a conversation."* — a second, lower-commitment door out of the page,
which v1 does not have.

**10. The quote survives, corrected.** *"The goal isn't more AI. It's more
capacity."* The review is right that "I do not build software, I build capacity"
is literally false and throws away the advantage.

## What I did not take from the review

- **The typefaces.** It says keep EB Garamond and Source Sans — those are
  Stitch's. The handoff settled on Libre Caslon Text and Hanken Grotesk and Simon
  approved them; the review was not looking at them.
- **`AI LAB` and `CONTACT` in the nav.** Both need pages that do not exist. Nav
  is `How I work · The session · About` plus the CTA. Its own advice applies:
  don't put an empty trophy case on the wall.
- **`VIEW SAMPLE →`.** Same reason it was cut the first time.
- **Both line drawings are out of v2** — the review asked for fewer abstract
  architectural illustrations, and the report sheet is a stronger artifact for
  that section. They remain in v1, which is now the honest A/B: v1 argues
  visually, v2 argues in specifics.

## What Simon has to decide, because these are offer changes and not design

1. **Does the sprint guarantee survive?** v1 promised *"if it is not doing the job
   at the end of the fourteen days, I keep working at no charge until it is, or
   the balance is waived."* With no implementation price and no fixed scope on the
   homepage, that guarantee has nowhere to live, and the review's objection to
   unbounded outcome promises does partly apply to it. v2 replaces it with
   **"Defined scope. Clear success criteria. Human oversight where it matters."**
   and keeps only the session's credit rule. That is a real reduction in risk
   reversal — the CRO research says guarantees matter *most* for a seller with no
   other quality cues.
2. **Is the fourteen-day live run still part of the offer?** It is in
   `practice-plan-v1.md` and it is gone from this page.
3. **Is the practice still tool-agnostic, or is it "builder first"?** Both are
   true; they lead to different clients.

## Verification — same standard as v1

- No horizontal overflow at 360, 390, 768, 1024, 1180, 1440.
- 124 painted-pixel crops at 3×, **0 failures**.
- Reduced motion: 29 reveals, 0 hidden.
- 0 network requests outside `file://` and `data:`.

**Two harness bugs were found and fixed while auditing v2** — both had been
silently threatening false passes on v1 too:

1. `settle()` waited a fixed 400ms against a 700ms reveal transition, so crops
   could be sampled mid-fade. Transitions are now disabled outright before the
   end state is forced.
2. **The sticky nav is translucent with a backdrop blur, and
   `element.screenshot()` scrolls its target into view — so anything landing under
   the nav was captured *through* it.** That reported "PHASE I" as umber at 10%
   opacity on paper, 1.15:1, when it computes at 5.61:1 on band. The nav is now
   hidden for the crop pass, after its own roles are sampled from the top of the
   page. This is exactly the failure mode the handoff warns about in reverse:
   auditing the pixel is right, but it has to be the *right* pixel.
