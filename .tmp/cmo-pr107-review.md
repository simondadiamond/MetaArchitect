# CMO review — simonparis-website PR #107 (dark-refresh → master)

Reviewed 2026-08-13 against `.claude/product-marketing.md` v2, `brand/audiences/operator.md`,
`brand/brand-summary.md`, `brand/visual-operator.md`, `funnel/setup-offer/copy-audit-2026-08-09.md`,
and `docs/research/operator-trust-criteria-independent-2026-08-09.md`.
Read-only: `gh pr view 107` + `gh pr diff 107`, plus the `master` message files for full context.
Nothing edited, nothing pushed.

**Research caveat, stated because it changes how you should weight Q2.** `WebSearch` and
`WebFetch` were both denied in this session, and `agent-reach` is not installed on this box.
I could not run the live external research the theme question deserves. So: every claim below
about contrast, palette behaviour, cross-page consistency and brand-rule conflict is computed
or verified from the diff and the repo. I am making **no** claim about what SMB buyers
prefer in color surveys, because I could not check one, and inventing that would be exactly
the vibes-answer you asked me not to give. If you want the external leg, enable the web tools
and I'll run it as a separate pass — but read Q2 first, because I don't think it changes the
answer.

---

## VERDICT — Q1: Copy

**Partially. The /setup and homepage copy lands well for the operator. The path a real buyer
walks does not.**

The two pages written for the operator are strong — the Tuesday-evening spine, the verbatim
pain quotes, published prices, honest proof framing. Three things break it:

1. **`/about` is in the nav on every operator page, it is the trust page for a
   person-over-company buyer, and it sells a different business.** It opens "I design AI
   systems that don't break," runs the STATE pillars, cites Law 25 and the EU AI Act, and its
   closing CTA is "Score Your System →" — a practitioner-only CTA per brand rules. An
   owner-operator who does the thing this buyer is measured as doing (checking who the person
   is before spending $6,500) lands on a page for LLM platform leads and never sees `/setup`.
   This PR makes the mismatch *worse*: it paints `/about` in the operator lane's navy, which
   says "same product," while the words say "different product."
2. **This PR silently removes the founding rate from the homepage ladder** (a code bug in the
   `PricingSheet` mapping, C2 below). $6,500 now renders with no $5,000 next to it. Your own
   persuasion map requires that adjacency.
3. **`/setup`'s folder section is still the biggest dev-tool tell on the site.** The PR
   restyled the ASCII tree but kept its content: `your-business/`, `CLAUDE.md`, `skills/`,
   `memory/`, `projects/`. Trailing slashes and a markdown config filename are file-system
   syntax. You removed the terminal chrome and left the file tree inside it.

`/work-with-me` and `/about` copy being practitioner-voiced is *correct* and already locked
(copy-audit 2026-08-09, headline finding) — I'm not reopening that. The gap is that the
operator lane has no equivalent "who is this guy" page, and `/about` is the one the nav points at.

## VERDICT — Q2: Theme

**Drop the navy. Keep everything else in the PR. Stay on the neutral dark you had.**

Not because dark is wrong — because navy buys nothing measurable and costs three things you
already paid for once.

Ship: the dev-tool removals, `ResetVsRemembers`, `PricingSheet`, `FoundingSeal`,
`SignatureLine`, the 4px radius, the copy-audit port, **and the amber ambient light**.
Revert: `.op-hero`'s `background-color`/`background-image` to the neutral values, and delete
the `.op-lane` token overrides entirely.

Reasoning in §Theme below.

---

# THEME — full reasoning

### 1. Navy changes nothing you can measure

I computed the relative luminances. `#0b0e15` = L 0.00439. `#0F0F0F` = L 0.00477. Functionally
identical. Every text and accent ratio is unchanged to two decimals:

| Pair | On navy `#0b0e15` | On neutral `#0F0F0F` |
|---|---|---|
| `#EAEAEA` body text | 15.4:1 | 15.3:1 |
| `#E04500` accent | 5.01:1 | 4.98:1 |
| `#C97A1A` amber | 5.78:1 | 5.74:1 |

So the accessibility argument is a wash in both directions — navy neither helps nor hurts
contrast. What it changes is hue, and only hue. Which brings us to:

### 2. Seven commits to find a saturation you could see is the finding, not the process

The commit chain is the evidence: S37.5% "too much navy" → S15% "the navy is fully gone" →
S24% "still too subtle on real device" → S32% → "navy on canvas only, cards revert to neutral."
That is not iteration converging on a good value. That is a signal sitting at the threshold of
perceptibility on your own hardware, where you *knew what to look for*.

A stranger gives this page maybe fifteen seconds and does not know a design decision was made.
If the owner has to check on a second device to confirm the hue is present, it is not doing
persuasion work on a cold buyer. Nothing in your own trust research — six findings, all of it
about named-human attribution, account ownership, anti-lock-in, and specific quantified proof
— touches palette at all.

### 3. The final split creates the weakest boundary on the page

Update #4 landed on navy canvas + neutral cards. Contrast between them:

- card `#1a1a1a` on canvas `#0b0e15` — **1.11:1**
- card border `#333333` on canvas `#0b0e15` — **1.53:1**

Card edges are now essentially invisible by luminance. Their separation from the canvas rests
on the hue difference plus a drop shadow — i.e. on precisely the signal you twice reported as
invisible on your phone. And on the homepage, `PricingSheet` rows are `<Link>`s, so this is an
interactive component whose boundary reads at 1.53:1 against its ground (WCAG 1.4.11 wants 3:1
for boundaries that identify controls). Neutral-on-neutral had a warmer relationship and no
hue dependency.

### 4. It reintroduces the exact defect that killed PR #106

`.op-lane` applies to home, `/setup`, `/about`, `/work-with-me`. It does not apply to `/blog`,
`/score`, `/readiness`. Your nav is: **About (navy) · Blog (neutral) · Score (neutral) · Setup
(navy)**. Click across the nav and the page ground changes hue mid-session. Cross-page visual
inconsistency is the named reason paper was rejected on 2026-08-10. This is a smaller dose of
the same thing, shipped three days later.

### 5. It breaks two written rules that were never amended

- `brand/brand-summary.md`, shared visual rules (both lanes): **"Never blue. Anywhere."**
- `projects/simonparis-website/CLAUDE.md`: **"amber `#C97A1A` for links (never blue)"** — filed
  under "Design rules are non-negotiable."

Only `visual-operator.md`'s changelog records the navy. A hotfix commit chain quietly
overriding a rule marked non-negotiable in two other places is a governance problem
independent of whether navy looks good. If the rule is wrong, kill the rule on purpose.

### 6. Keep the lamp

The one genuinely good idea in the navy work is `.op-hero::before` — the off-centre amber
ambient light motivated by "tuesday · 9:14 pm." That is the warmth/approachability signal navy
was reaching for, it reads at a much higher amplitude than a 4%-lightness hue shift, and it
works fine on `#0F0F0F`. It also already passes the checks you did against `frontend-design`
(not a centred glow). Keep it, on a neutral ground, at the same opacity.

### 7. On dark vs light, which is the question actually worth money

Navy-vs-neutral is a rounding error. Dark-vs-light is a real question, and I am not going to
answer it from vibes with no research access. What I'll say from what's verifiable:

- Your ICP's stated objection, confirmed by you directly and recorded in `visual-operator.md`,
  was **"this reads like a developer built it for himself"** — not "this is dark." This PR
  addresses that objection correctly by removing components rather than the palette.
- You have zero traffic attribution and zero discovery calls. A palette change is
  untestable right now, so any answer would be unfalsifiable for at least sixty days.
- The 60-day kill switch is running against *discovery calls*, and the thing most likely to
  suppress those is Q1's finding — the trust page sells the wrong business — not the ground
  colour.

Recommendation: stay dark, stop spending Simon-minutes on palette until Gate B gives you a
call to attribute, and if you ever revisit it, revisit dark-vs-light as an experiment with a
number attached — never navy-vs-charcoal by eye.

### What to actually do

```
app/globals.css
  .op-hero        — background-color: #0b0e15 → #0F0F0F
                  — delete the two navy grid linear-gradients (or retint to #1A1A1A)
                  — KEEP .op-hero::before (the amber lamp) unchanged
  .op-lane        — delete the whole rule (all 8 token overrides + background-color)
                  — keep the class on the 4 pages if you want a future lane hook; it just
                    stops repainting the ground
```
Discriminator for checking the result: the correct build serves `background-color:#0F0F0F`
(or no `.op-lane` background rule at all) and still contains `op-hero-lamp-in`. The wrong one
contains `#0b0e15` or `#080a0f`.

---

# COPY — CURRENT → REPLACE

Ranked. C1–C4 are conversion-critical, C5–C13 are voice/clarity, C14–C18 are FR + hygiene.
Every string is literal; FR pairs given where the key exists in both locales.

---

### C1 — `/about` gives the operator no reason to think he's in the right place, and no door out to `/setup`
**Files:** `messages/{en,fr}/about.json` · conversion-critical

`/about` is nav-linked from every operator page, it's the page a person-over-company buyer
checks before a $6,500 decision (your own trust research, Finding 3/6), and it currently
mentions the operator offer zero times. Its closing CTA is `/score`. Minimum viable fix is two
additions — a bio sentence and a fourth door — not a rewrite.

**ADD `about.hero.bio3`** (renders after `bio2`):
- EN: `"Most of my week now goes to owner-operators — consultants, coaches, agency principals — setting up the AI they already pay for so it actually knows their business. The rest goes to engineering teams running LLM systems in production. Same discipline, two very different Tuesdays."`
- FR: `"L'essentiel de ma semaine va maintenant aux propriétaires-exploitants — consultants, coachs, dirigeants d'agence — à configurer l'IA qu'ils paient déjà pour qu'elle connaisse vraiment leur entreprise. Le reste va aux équipes techniques qui opèrent des systèmes LLM en production. Même discipline, deux mardis très différents."`

**ADD as the FIRST entry of `about.work.items`** (before the Blog card):
```json
{
  "tier": "Paid",
  "label": "Service",
  "title": "Claude, set up for your business.",
  "desc": "For owner-operators: a workspace that already knows your clients, your rates, and your voice, so the invoices and follow-ups stop eating your evenings. On Claude's desktop app. No code, no terminal.",
  "cta": "See the setup →",
  "href": "/setup"
}
```
FR:
```json
{
  "tier": "Payant",
  "label": "Service",
  "title": "Claude, configuré pour votre entreprise.",
  "desc": "Pour les propriétaires-exploitants : un espace de travail qui connaît déjà vos clients, vos tarifs et votre voix, pour que les factures et les suivis cessent de gruger vos soirées. Dans l'application de bureau de Claude. Pas de code, pas de terminal.",
  "cta": "Voir la configuration →",
  "href": "/setup"
}
```
`about.work.heading` CURRENT `"Four ways in."` → REPLACE `"Five ways in."`
FR CURRENT `"Quatre portes d'entrée."` → REPLACE `"Cinq portes d'entrée."`

*Note the page then has one heading ("Four/Five ways in") that competes with the homepage's
"Three ways in." Not a blocker — different audiences, different counts — but worth a look
post-Gate-B alongside the two-different-$2,500-offers issue the copy audit already flagged.*

---

### C2 — This PR deletes the founding rate from the homepage ladder
**File:** `components/home/HomeOperator.tsx` · conversion-critical · **code bug, not copy**

```js
founding: i === rungs.length - 1 ? undefined : rung.founding,
```
The **only** rung that carries a `founding` value is the last one. So this expression
guarantees the founding line never renders anywhere in the ladder. `"Founding rate: first
three at $5,000"` is gone from the homepage; `$6,500` now sits alone with a stamp next to it.

`brand/visual-operator.md`'s persuasion placement map: *"'$2,500 audit, credited in full'
adjacent to every $6,500 mention — never separated from the big number."* Same principle, and
the founding rate is the stronger of the two anchors.

CURRENT: `founding: i === rungs.length - 1 ? undefined : rung.founding,`
REPLACE: `founding: rung.founding,`

Discriminator: the correct build renders the literal string `Founding rate: first three at
$5,000` inside the homepage ladder panel. The wrong one shows `$6,500 USD` in that panel with
no `$5,000` anywhere in the same section.

---

### C3 — The founding seal reads "3 of 3", which reads as sold out
**Files:** `messages/{en,fr}/homeOperator.json`, `messages/{en,fr}/setup.json`, `messages/{en,fr}/audit.json` · conversion-critical

`FoundingSeal` renders `count` alone in the centre of a circular stamp, with no verb. `"3 of 3"`
with nothing else is a consumed-fraction. Every other progress indicator a buyer has ever seen
("3 of 3 steps", "3 of 3 used") reads that way. Your body copy says "3 of 3 founding slots
**open**" — the seal drops the word doing all the work.

| Key | CURRENT | REPLACE |
|---|---|---|
| `homeOperator.ladder.sealCount` (en) | `"3 of 3"` | `"3 slots open"` |
| `homeOperator.ladder.sealCount` (fr) | `"3 sur 3"` | `"3 places libres"` |
| `setup.pricing.sealCount` (en) | `"3 of 3"` | `"3 slots open"` |
| `setup.pricing.sealCount` (fr) | `"3 sur 3"` | `"3 places libres"` |
| `audit.diagnostic.founding.sealCount` (en) | `"5 slots"` | `"5 slots open"` |
| `audit.diagnostic.founding.sealCount` (fr) | `"5 places"` | `"5 places libres"` |

Check the rendered width — "3 slots open" is longer than "3 of 3" and `FoundingSeal` centres it
at `fontSize="11"` in a 96-unit viewBox. If it clips, use `"3 open"` / `"3 libres"` rather
than reverting to the ambiguous version.

---

### C4 — Hero CTA hierarchy points away from the only metric you're being judged on
**Files:** `messages/{en,fr}/homeOperator.json` · conversion-critical · **decision required**

Homepage hero: primary = `"See how it works"` (→ `/setup`), secondary = `"Book a discovery call"`.
The visually dominant button is a page navigation; the money action is de-emphasised. Your kill
switch fires on *sixty days with zero discovery calls* — the site is being scored on the button
you made secondary. And "See how it works" is already served by scrolling.

The PR flagged the two-CTA hero and left it as out-of-scope. I'd act on it. Trade-off named
honestly: at $6,500 with cold traffic and zero proof, an argument exists for education-first —
but that argument is about the *page*, not the *button*, and the page below the fold already
does the educating.

| Key | CURRENT | REPLACE |
|---|---|---|
| `homeOperator.hero.ctaPrimary` (en) | `"See how it works"` | `"Book the discovery call"` |
| `homeOperator.hero.ctaSecondary` (en) | `"Book a discovery call"` | `"See how it works first"` |
| `homeOperator.hero.ctaPrimary` (fr) | *(swap to)* | `"Réserver l'appel découverte"` |
| `homeOperator.hero.ctaSecondary` (fr) | *(swap to)* | `"Voir d'abord comment ça marche"` |

The `href`s swap with the labels. And add the risk-reversal inline so the primary can carry its
own weight — `homeOperator.hero` gains:
- EN `"ctaPrimaryNote": "Free, thirty minutes. I'll tell you if it isn't worth your money."`
- FR `"ctaPrimaryNote": "Gratuit, trente minutes. Je vous dis si ça ne vaut pas votre argent."`

*(`/setup`'s hero is already correct — primary is `"Request a discovery call"`. No change there.)*

---

### C5 — The folder section is still a developer file tree
**File:** `messages/{en,fr}/setup.json`, `tree.*`

The PR removed the `$ tree` chrome and the box-drawing glyphs. It kept `your-business/`,
`CLAUDE.md`, `skills/`, `memory/`, `projects/` — trailing-slash path syntax and a markdown
config filename, now displayed in styled tags, which arguably makes them *more* prominent than
when they were grey monospace. This is the last real dev-tool tell on an operator page.

| Key | CURRENT | REPLACE |
|---|---|---|
| `tree.title` (en) | `"The mechanism underneath"` | `"What's actually on your machine"` |
| `tree.title` (fr) | `"Le mécanisme en dessous"`* | `"Ce qui se trouve vraiment sur votre machine"` |
| `tree.intro` (en) | `"Clarity needs structure. This is the folder that makes that Tuesday possible. It lives on your machine, under your control:"` | `"That Tuesday works because your business is written down in one place — plain files on your machine that you can open, read, and change:"` |

\* verify the FR string against the file; I read the EN values from `master`.

`tree.items` — EN:

| CURRENT `name` | REPLACE `name` | CURRENT `note` | REPLACE `note` |
|---|---|---|---|
| `"your-business/"` | `"Your business"` | `""` | `""` |
| `"CLAUDE.md"` | `"How your business works"` | `"how your business works, loaded every session"` | `"read at the start of every conversation, so you never explain it again"` |
| `"skills/"` | `"Your recurring work"` | `""` | `""` |
| `"invoicing/"` | `"Invoicing"` | `"a recurring process, encoded once"` | `"your process, written down once"` |
| `"onboarding/"` | `"Client onboarding"` | `"your checklist, made executable"` | `"your checklist, ready to run"` |
| `"content/"` | `"Writing in your voice"` | `"your voice, never generic AI text"` | `"drafted from your files, never generic AI text"` |
| `"memory/"` | `"Decisions"` | `"decisions and facts that persist"` | `"what you decided and when, so nobody asks 'where did we land on that?' again"` |
| `"projects/"` | `"Clients and projects"` | `"one folder per client, product, or launch"` | `"one place per client, product, or launch"` |

FR `name` values: `"Votre entreprise"`, `"Comment votre entreprise fonctionne"`, `"Votre travail récurrent"`,
`"Facturation"`, `"Accueil des clients"`, `"Écrire dans votre voix"`, `"Décisions"`, `"Clients et projets"`.

---

### C6 — `gap.p2` is house vocabulary plus a metaphor that needs decoding
**File:** `messages/{en,fr}/setup.json`

"files / skills / memory / sessions" is the internal glossary. "Wiring beats wattage" is
clever and requires a beat to parse — against your own standing law, *comprehension beats
cleverness*.

CURRENT (en):
`"A better prompt won't close that gap. Structure will: files that hold what Claude needs to know, skills that carry how you work, memory that keeps decisions from vanishing between sessions. Wiring beats wattage, and the wiring is what I build."`

REPLACE (en):
`"A smarter chatbot won't close that gap. Writing your business down will: what you sell and what you charge, how you like each job done, and what you decided last month — all in one place Claude reads before it writes a word. That's the part I build, and it's the part nobody sells you."`

CURRENT (fr):
`"Un meilleur prompt ne comblera pas cet écart. La structure, oui : des fichiers qui contiennent ce que Claude doit savoir, des compétences qui portent votre façon de travailler, une mémoire qui empêche les décisions de disparaître entre les sessions. Le câblage compte plus que la puissance, et ce câblage, c'est ce que je construis."`

REPLACE (fr):
`"Un robot conversationnel plus intelligent ne comblera pas cet écart. Mettre votre entreprise par écrit, oui : ce que vous vendez et ce que vous facturez, comment vous aimez que chaque mandat soit fait, et ce que vous avez décidé le mois dernier — le tout au même endroit, que Claude lit avant d'écrire un seul mot. C'est cette partie-là que je construis, et c'est celle que personne ne vous vend."`

---

### C7 — The flagship inclusions read as a feature list in your vocabulary, not his
**File:** `messages/{en,fr}/setup.json`, `pricing.tiers[2].includes`

Three of the nine bullets. The rest are fine.

**7a** CURRENT (en): `"Replaces what you're already juggling: a light CRM view, memory, and schedules, plus an approvals view for anything AI drafted before it goes out"`
REPLACE (en): `"Replaces the tabs you're juggling now: who your clients are and where each one stands, what you decided and when, what's due next — and one place to approve anything drafted for you before it goes out"`

FR: `"Remplace les onglets que vous jonglez aujourd'hui : qui sont vos clients et où chacun en est, ce que vous avez décidé et quand, ce qui s'en vient — et un seul endroit pour approuver tout ce qui est rédigé pour vous avant que ça parte"`

**7b** CURRENT (en): `"Three library workflows personalized to you, plus up to two custom workflows built on your own work. Beyond that, more is a Working Session"`
REPLACE (en): `"Five of your recurring jobs, set up end to end: three adapted from work I've already built and proven, two built from scratch around yours. Want a sixth later? That's an hourly session, not a new project."`

FR: `"Cinq de vos tâches récurrentes, configurées de bout en bout : trois adaptées de travaux que j'ai déjà bâtis et éprouvés, deux construites sur mesure à partir des vôtres. Une sixième plus tard ? C'est une séance à l'heure, pas un nouveau mandat."`

*Why: "library workflows" is Kit vocabulary the buyer has no referent for, and "Beyond that,
more is a Working Session" plants a fence at the exact moment he's deciding. Same boundary,
stated as generosity.*

**7c** CURRENT (en): `"Owner training to independence, on the Command Center itself"`
REPLACE (en): `"Training until you can run it without me — on your own Command Center, not a demo"`
FR: `"De la formation jusqu'à ce que vous puissiez le piloter sans moi — sur votre propre Command Center, pas une démo"`

---

### C8 — "A smarter model" is tool language on the homepage
**File:** `messages/{en,fr}/homeOperator.json`, `pain.sub`

"Model" is the vocabulary of the DIY crowd that doesn't buy. Also fixes "wired around," which
is halfway to plumbing language.

CURRENT (en): `"Every owner-operator I talk to names some version of these three. A smarter model won't fix any of them. A workspace wired around your business will: it already knows your clients, your rates, your voice, and your standards. I build it. You keep the keys."`

REPLACE (en): `"Every owner-operator I talk to names some version of these three. A smarter chatbot won't fix any of them. A workspace built around your business will: it already knows your clients, your rates, your voice, and how you like things done. I build it. You keep the keys."`

FR: replace `"Un modèle plus intelligent"` → `"Un robot conversationnel plus intelligent"` and
`"vos standards"` → `"comment vous aimez que les choses soient faites"`. (Verify the exact FR
`pain.sub` string in the file — I read the EN from `master`.)

---

### C9 — "No call required to find out." Find out *what?*
**Files:** `messages/en/homeOperator.json` (`ladder.sub`), `messages/en/setup.json` (`pricing.capacity`)

Dangling object. The reader has to reconstruct the noun. The FR (`"Pas d'appel obligatoire pour
les connaître"`) is already correct — only EN is broken.

`homeOperator.ladder.sub` CURRENT: `"Published prices. No call required to find out."`
REPLACE: `"Prices are on this page. You don't have to book a call to find out what it costs."`

`setup.pricing.capacity` CURRENT ends `"...Published prices. No call required to find out."`
REPLACE ending: `"...Prices are on this page. You don't have to book a call to find out what it costs."`

---

### C10 — "Sprint" is agile jargon on the page whose whole promise is no jargon
**File:** `messages/{en,fr}/setup.json` — 3 EN hits, 3 FR hits

| Key | CURRENT | REPLACE |
|---|---|---|
| `meta.description` (en) | `"A fixed-price sprint that turns Claude..."` | `"A fixed-price setup that turns Claude..."` |
| `steps.items[1].title` (en) | `"Setup sprint"` | `"The build"` |
| `faq.items[2].a` (en) | `"...during the sprint..."` | `"...while I'm building it..."` |
| `meta.description` (fr) | `"Un sprint à prix fixe..."` | `"Une configuration à prix fixe..."` |
| `steps.items[1].title` (fr) | `"Sprint de configuration"` | `"La construction"` |
| `faq.items[2].a` (fr) | `"...pendant le sprint..."` | `"...pendant que je le construis..."` |

---

### C11 — The data-privacy answer is the most load-bearing objection on the page and it's written like a contract clause
**File:** `messages/{en,fr}/setup.json`, `faq.items[2].a`

Your own research: data/privacy is the **#1 and fastest-growing** AI adoption barrier for this
buyer (33%, up from 23% YoY — Bluevine/Centiment n=942). The PR's new wording — *"I never
independently hold the credentials"* — is legally careful and emotionally inert. He's not
worried about credential custody semantics. He's worried you'll have his password.

CURRENT (en, as this PR sets it):
`"Everything lives on your machine, under your Claude account — which is yours from day one; I never independently hold the credentials. I work in your workspace during the sprint and keep no access after handover."`

REPLACE (en):
`"Everything lives on your machine, under your Claude account. It's yours from day one and I never hold your password — I work inside your account while I'm building, with you, and I have no access at all after handover. Nothing gets copied to a server of mine, because there isn't one."`

REPLACE (fr):
`"Tout demeure sur votre machine, sous votre compte Claude. Il vous appartient dès le premier jour et je ne détiens jamais votre mot de passe — je travaille dans votre compte pendant la construction, avec vous, et je n'y ai plus aucun accès après le transfert. Rien n'est copié sur un serveur qui m'appartient, parce qu'il n'y en a pas."`

*Verify the last clause is literally true before shipping it. If anything transits a machine
you control, cut that sentence — an unverified security claim is worse than no claim.*

---

### C12 — `cowork.caption` sells "clarity," which is not a thing anyone buys
**File:** `messages/{en,fr}/setup.json`

CURRENT (en): `"The folders are just the mechanism. What you're buying is clarity: one place where your business thinks straight."`
REPLACE (en): `"None of that is you learning new software. It's your business, written down once, so that asking in plain words is the only step left."`

FR: `"Rien là-dedans ne consiste à apprendre un nouveau logiciel. C'est votre entreprise, mise par écrit une fois, pour qu'il ne vous reste qu'à demander en mots simples."`

---

### C13 — Two different fictional businesses on the same page
**File:** `messages/{en,fr}/{homeOperator,setup}.json` · **decision required**

The hero artifact is `"Dubois Renovations"` invoicing `"Marie for the deck job"`. The new
`ResetVsRemembers` card, ~400px below it, says `"Hi, I run a coaching business, and—"`. Two
personas, one screen. And renovations is a trades business — your ICP is expertise/service
(consultants, coaches, trainers, fractional execs, agency principals), which is what the
`$6,500` tier is priced for.

Counter-argument, stated fairly: a renovation contractor *is* a delegation-proven
owner-operator, the example is vivid and Québécois, and a deck job is more concrete than a
coaching package. If you keep it, at least make `ResetVsRemembers` match:

**Option A (recommended — align to the ICP):** change the hero window.
- `hero.window.titleBar`: `"Dubois Renovations · Claude"` → `"Beaulieu Coaching · Claude"`
- `hero.window.ask`: `"Invoice Marie for the deck job"` → `"Invoice Marie for last month's sessions"`
- `lineItems`: `{"Deck repair","$1,840"}` → `{"Coaching sessions (4)","$1,600"}`; `{"Materials","$312"}` → `{"Workshop prep","$340"}`

**Option B (keep the contractor):** change the device instead.
- `pain.device.resetLine` / `gap.device.resetLine`: `"Hi, I run a coaching business, and—"` → `"Hi, I run a renovation business, and—"`
- FR: `"Bonjour, je dirige une entreprise de rénovation, et—"`

Either is fine. Both on one page is not.

---

### C14 — FR anglicism at the price line
**Files:** `messages/fr/homeOperator.json`, `messages/fr/setup.json` — `*.device.remembersItems[1]`

CURRENT: `{ "label": "Tarifs", "value": "ce que vous chargez, et pourquoi" }`
REPLACE: `{ "label": "Tarifs", "value": "ce que vous facturez, et pourquoi" }`

*"Charger" for "to charge money" is an anglicism. It passes in speech; on a $6,500 sales page
aimed at Québec francophone operators it reads as a translation, not as writing.*

---

### C15 — FR device line is clumsy
**Files:** `messages/fr/homeOperator.json`, `messages/fr/setup.json` — `*.device.resetRepeat`

CURRENT: `"Redit. Encore et encore."`
REPLACE: `"Répété. Encore. Et encore."`

---

### C16 — This PR introduces an FR term collision for "founding rate"
**Files:** `messages/fr/homeOperator.json`, `messages/fr/setup.json`, `messages/fr/audit.json`

The new seal strings use `"Tarif de lancement"`. Existing body copy on the same two pages —
and `fr/audit.json`'s own new seal label — use `"Tarif fondateur"`. Same concept, two names,
introduced by this PR.

| Key | CURRENT | REPLACE |
|---|---|---|
| `fr/homeOperator.json` `ladder.sealLabel` | `"Tarif de lancement"` | `"Tarif fondateur"` |
| `fr/setup.json` `pricing.sealLabel` | `"Tarif de lancement"` | `"Tarif fondateur"` |

---

### C17 — "Warm intros" was translated literally into something that means nothing
**File:** `messages/fr/audit.json`, `diagnostic.founding.body` (pre-existing, untouched by this PR)

CURRENT: `"...et de deux présentations chaleureuses."`
REPLACE: `"...et de deux mises en relation."`

*"Présentations chaleureuses" reads as "warm slideshows." Practitioner page, so lower priority
— but it's in a file this PR opens.*

---

### C18 — "Claude Code" survives in two places the PR's sweep missed
**Files:** `messages/{en,fr}/home.json`

The PR fixed six instances plus the JSON-LD schema name. It missed the practitioner
homepage's door into the operator offer:

| Key | CURRENT | REPLACE |
|---|---|---|
| `en/home.json` `hero.ctaSecondary` | `"Run Your Business on Claude Code"` | `"Run your business on Claude"` |
| `fr/home.json` `hero.ctaSecondary` | `"Votre entreprise sur Claude Code"` | `"Votre entreprise sur Claude"` |

*`home.json` is consumed only by `LegacyHomePractitioner.tsx`, which may not be routed
today — verify before spending time on it. But it's the cross-lane door into `/setup`, and it
currently names a developer tool.*

---

### C19 — Rebase hazard: this branch would revert a live differentiator

`gh pr diff` shows the branch's `setup.faq.items[4].a` "before" text as:
> `"...compressed into two weeks, plus someone who's seen where these systems break."`

but `master` currently reads:
> `"...compressed into two weeks, plus a real place to run it from, not just a chat thread, and someone who's seen where these systems break."`

`master` moved after this branch forked. **"a real place to run it from, not just a chat
thread"** is the Command Center productization wedge — the thing that separates you from a
consultant who configures someone's Claude app. A naive rebase drops it.

**Discriminator for the merged result.** The correct final string contains BOTH
`"a real place to run it from, not just a chat thread"` AND `"compressed into a single setup"`.
The wrong one contains `"compressed into two weeks"`, or is missing `"not just a chat thread"`.
Target:

`"Honestly? Yes. The documentation is public, and if you have the hours, I'd cheer you on. What you're buying is the trial and error I already paid for, compressed into a single setup, plus a real place to run it from, not just a chat thread, and someone who's seen where these systems break."`

FR target:
`"Honnêtement ? Oui. La documentation est publique, et si vous avez les heures, je vous encourage. Ce que vous achetez, c'est l'essai-erreur que j'ai déjà payé, compressé en une seule installation, plus un vrai endroit d'où le piloter, pas juste un fil de clavardage, et quelqu'un qui sait où ces systèmes cassent."`

---

## What's genuinely good and should not be touched

Said plainly so the list above doesn't read as a rejection:

- The Tuesday-evening spine (9:14 pm → 9:58 pm → 10:41 pm) is the best structural idea on the
  site. It passes the Busy Owner Test without a single adjective.
- `"Proof, honestly — No client logos yet. Here's what there is instead."` This is the
  highest-trust move on the page and most people in this category would never ship it.
- The `SignatureLine` strings. `"I build every workspace myself: no team, no handoff"` answers
  the anti-lock-in fear your research names as the actual trust-breaking memory (Finding 2),
  in eleven words, in the right place.
- The wedge against Claude for Small Business, verbatim as locked.
- Dropping the terminal chrome, blinking cursor and typing loop. Correct diagnosis, correctly
  executed — that part of the PR is right and should ship.
- The `ResetVsRemembers` device concept. Static, labelled, no decoding required.

---

## Merge recommendation

**Don't merge as-is.** In order:

1. Fix C2 (one line — the founding rate is currently deleted from the homepage).
2. Revert the navy (`.op-hero` background + delete `.op-lane`), keep the amber lamp.
3. Apply C3, C9, C16 — trivial string swaps, all conversion or consistency defects.
4. Rebase carefully with C19's discriminator in hand.
5. Then Simon's live check.

C1 (`/about`) and C4 (CTA hierarchy) are the two with real money attached and both are copy-only
— they can ship in a follow-up story rather than blocking this one, but they should not wait
for Gate B. C5–C8, C10–C15, C17–C18 are a clean batch for one `sitemaster` story.
