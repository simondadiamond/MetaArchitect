# Brain v2 — topic pages, section retrieval, supersede

**Date**: 2026-08-06 · **Approved by**: Simon (in-session, three decisions recorded below)
**Relationship to prior specs**: complements `2026-07-16-second-brain-v2-intake.md` (which fixed *what*
gets saved) and `2026-07-17-brain-sources-vault.md` (sources). This one fixes *how it is stored and
retrieved*. Neither prior spec is superseded.
**Trigger**: Simon, reviewing the vault: "every time I look at them I'm like, what the fuck is this…
it feels like a bunch of sticky notes where I should have ever-growing pages."

## Problem

Three findings, measured against the live vault (138 notes, 2026-08-06).

**1. The store returns stale decisions as authoritative.** Nine notes mention the offer ladder. Two of
them say **locked** in their own title and contradict each other, and both are superseded by v4
(2026-07-27):

- `simonparis-ca-offer-ladder-locked-2026-07-score-free` — Diagnostic $2,500/$3,500, Audit $6,500
- `setup-offer-v2-2026-07-19-deep-research-104-agents-ladder` — Audit+Roadmap $2.5K → Setup $6.5K

Nothing marks either dead. `brain find "offer ladder"` can hand a future agent a dead price that reads
as locked. The cause: `brain save` has no supersede operation. Rule 4 of `brain/CLAUDE.md` ("one fact
per note") means a revised decision becomes a *new file beside the old one*. The intake spec's
contradiction pre-check (2026-07-16 §2) only runs on the auto-harvest path — facts Simon states
directly save as confirmed without it — so his own corrections are exactly the ones that accrete.

This is a correctness defect, not an aesthetics one, and it is the primary justification for v2.

**2. The unit of storage is wrong for a human reader.** Median note is 816 bytes *including* ~300 bytes
of YAML frontmatter — roughly three sentences wrapped in seven lines of ceremony.
`my-middle-name-is-mathew.md` is a whole file asserting a middle name. A dumped Facebook link became a
permanent standalone note. 138 index cards where ~25 living documents belong.

**3. The atomicity rule was a retrieval optimization, and it is no longer necessary.** `scoreEntry`
(`tools/lib/score.mjs`) scores one INDEX row per file, so atomic files gave precise hits. Scoring
sections instead of files buys the same precision without forcing the file to be atomic. The tradeoff
between "readable page" and "precise recall" is false.

## Decisions recorded

| Question | Decision |
|---|---|
| Truth lives in… | The **topic page**. One artifact, edited by hand or by CLI. No generated view layer. |
| Migration and junk | The migration agent **drops** notes it judges worthless, with a `dropped.md` manifest and a git tag on the pre-migration commit. |
| Scope | Storage + supersede + folders + daily log + **recipes** in v2. Recipe *format* plus three converted skills as proof; converting the remaining skills is a follow-on. |

Simon overrode the recommendation on junk-dropping (recommended: archive, never delete) and on scope
(recommended: defer recipes). Both stand; the manifest and tag are the safety net on the first.

## What does not change

Hard constraints. Live callers depend on these.

- **CLI signatures**: `brain find <q>`, `brain save <fact> --domain …`, `brain source find|add`,
  `brain promote|drop|doctor|sync|inbox|describe|import`. The `research`, `teardown-research`,
  `blog-factcheck`, and `write-post` skills call `source find`/`source add` directly.
- **Evidence tier** (2026-07-16): `status: evidence` saves, `promote`/`drop`, the 60-day digest.
- **Reconciler contract**: `.reconciler/proposals.json` shape, and the rule that the CC `/brain`
  Approvals tab is the only human gate. `kind: "save"` argv arrays stay executable.
- **Supabase sync** and the CC `/brain` page keep working; `brain_entries` stays service-role-read.
- **`notes` remains the source of truth**; `INDEX.md` is always regenerated, never hand-edited.

## Design

### Page format

One file per topic. Sections are `##` headings. Section state is a single line directly under the
heading — parseable by regex, and renders as inline code in Obsidian rather than as visible metadata
noise.

```markdown
---
slug: setup-offer
title: Setup Offer
domain: business
tags: [pricing, offer, setup-venture]
updated: 2026-08-06
description: The /setup ladder, pricing rationale, and live prospects.
---

## Ladder — locked 2026-07-27
`status: current` · `since: 2026-07-27`

Sessions $125/hr → Audit $2.5K credited → Setup $6.5K (founding 3×$5K) → Retainer $600/mo.
Full spec: [[offer-v4-spec]].

## Ladder — locked 2026-07-19
`status: superseded` · `by: #ladder-locked-2026-07-27`

Audit+Roadmap $2.5K credited → Business OS Setup $6.5K fixed/30d.

## Pricing rationale
`status: current` · `since: 2026-07-23`

Operator-ICP budget is proven by category comparables (Notion/business-OS consulting, same buyer
type). Enterprise comps like OptyxStack ($42–58K) are a different segment — see [[src-optyxstack]].
```

Rules:

- Frontmatter keys are the existing set from `serializeNote` ORDER, plus `updated`. `created` stays for
  the page's birth; per-section dates live in the `since:` field.
- Section state line is optional. Absent ⇒ `status: current`, `since:` = page `updated`.
- Valid section `status`: `current` | `superseded` | `evidence`. The evidence tier moves from
  file-level to section-level; `promote` and `drop` operate on anchors.
- `by:` holds an anchor — same-page (`#anchor`) or cross-page (`page-slug#anchor`).

### Section addressing

A section's anchor is `slugify(heading text)`, deduped within the page by numeric suffix. Anchors are
what `find` returns and what `by:` points at.

Renaming a heading changes its anchor and can orphan a `by:` pointer. Mitigation: `brain doctor` gains
a check that every `by:` resolves to a real anchor, and reports unresolvable ones as diagnostics (not
proposals — consistent with RECONCILER.md §1). `--fix` does not guess; a human or agent repairs it.

### Retrieval moves to the section

`tools/lib/index-file.mjs` currently emits one INDEX row per note (`noteToIndexEntry`). v2 emits **one
row per section**:

```
- [setup-offer#ladder-locked-2026-07-27](notes/10-business/setup-offer.md#ladder-locked-2026-07-27) (business) — Sessions $125/hr → Audit $2.5K credited → Setup $6.5K → Retainer $600/mo.
```

- `LINE_RE` widens to accept a nested path and an optional `#anchor`; the marker slot gains
  `superseded` alongside the existing `evidence` / `source`.
- Row `description` = the section's first sentence (page `description` for a page-level row).
- `scoreEntry` is unchanged in shape but now scores `slug#anchor`, the section's first sentence, and
  page-level `domain`/`tags`. The anti-shadowing tiebreaks in `rankEntries` gain one more rung:
  **`current` beats `superseded`**, above the existing source/evidence rungs.
- `superseded` rows are excluded from `find` results entirely unless `--all` is passed. They remain in
  INDEX so the audit trail is greppable.
- `tools/lib/embed.mjs` embeds sections rather than files. Semantic results keep the
  `[semantic match — similarity N]` label and the sub-0.85 "lead, not answer" rule.
- `find` prints `notes/10-business/setup-offer.md#ladder-locked-2026-07-27` as its source line, so a
  caller can open exactly the section.

### Supersede

`brain save "<fact>" --page <slug> --section "<heading>" --supersedes <anchor>`

One atomic write: append the new section, flip the target's state line to
`status: superseded` · `by: #<new-anchor>`, regenerate INDEX, commit. Same lock discipline as today
(`tools/lib/lock.mjs`).

`--supersedes` accepts a cross-page anchor, which is how the migration retires the two dead ladders
into the single `setup-offer` page.

### Save defaults to append

The behavioural inversion. Today `save` creates a file. In v2 `save` **appends to the best-matching
page and creates one only when nothing fits**:

1. Run the existing `find` ranking on the incoming fact.
2. Confident page-level match ⇒ append as a new section on that page.
3. No confident match ⇒ create a new page in the domain folder.
4. `--page <slug>` forces the target; `--new` forces creation.

This is AMV's "append before you create" rule, enforced in the CLI instead of asked of the agent —
v1 put consolidation in prose (`brain/CLAUDE.md` rule 4) and it did not hold. State beats intelligence,
applied to the tool that stores the thesis.

### Layout

Johnny.Decimal over the existing `domain` values, so `domain` frontmatter and folder agree:

```
notes/10-business/   notes/20-content/   notes/30-infra/    notes/40-personal/
notes/50-family/     notes/60-health/    notes/70-finance/
notes/80-sources/    notes/90-recipes/   notes/99-archive/
daily/
```

`tools/lib/paths.mjs` hardcodes `NOTES_DIR`, and eight command files build `notes/${slug}.md` inline.
All of that collapses into one exported `notePath(slug)` / `resolveNote(slug)` pair; slugs stay globally
unique, so nothing outside the resolver needs to know about folders. Obsidian resolves `[[slug]]` by
note name rather than path, so every existing wikilink survives the move.

`src-*` source notes already have page shape (one page per source, claims as items) and move to
`80-sources/` essentially untouched.

### Recipes

`notes/90-recipes/<name>.md`, boot-chain format (adapted from the AMV Job note — the idea, not the
file; that repo is CC BY-NC-SA and must not be copied into a paid deliverable):

```markdown
## The job
One line: what this produces and when it fires.

## Boot chain
1. This page, end to end.
2. [[brand-summary]] — voice and prohibitions.
3. [[linkedin-playbook]] — format and timing.

## Procedure
## Quality bar
## Lessons
```

`brain recipe <name>` prints one to stdout. Any agent that can read a file or run a shell gets the
skill; the Claude skill becomes a pointer at the recipe.

Three skills convert in v2 as proof — `engage-replies`, `weekly-review`, `linkedin-publish` (chosen as
one high-frequency, one analytical, one with a fragile external call, so the format is tested against
all three shapes). The rest is a follow-on batch, not this spec.

### Daily log

`daily/YYYY-MM-DD.md`. `brain log "<what happened>"` appends a timestamped entry, creating the day's
file from a fixed template on first write. Sections: **Done · In progress · Decisions · Notes touched**.
`session-close` writes it as part of the harvest. Daily files are append-only and are excluded from
`find` ranking by default (`--daily` includes them) — they are a chronological record, not knowledge.

## Migration

One agent pass over the 138 notes, run overnight.

1. Tag the pre-migration commit `brain-v1-final` and push. Nothing below is irreversible.
2. Cluster the 138 by topic into ~25 pages. Target: no page under three sections; no page over ~15.
3. Write pages, preserving each source note's substance as a section with `since:` = its `created`.
4. **Resolve contradictions against the locked source docs**, not against each other:
   `funnel/setup-offer/offer-v4-spec.md`, `funnel/setup-offer/audit-runbook.md` (both verified present
   2026-08-06), and the `operating-strategy-locked-2026-07-19-*` note. Losing
   versions become `status: superseded` sections with a `by:` pointer — retired, not deleted, because
   the audit trail is the thing that failed.
5. Drop worthless notes (dead links, contentless dupes). Every drop gets a line in
   `99-archive/dropped.md`: slug, one-line content, reason. Nothing leaves without a receipt.
6. `brain doctor --fix` regenerates INDEX. `brain sync` re-embeds sections and refreshes Supabase.
7. Run all 15 test files green.
8. Report: page count, section count, dropped count, unresolved contradictions.

Simon reviews `dropped.md` and the page list before the branch merges. Recovery for any mistake is
`git show brain-v1-final:notes/<slug>.md`.

## Testing

The 15 existing test files in `tools/tests/` must pass, updated where the contract genuinely changed
(`index-file`, `score`, `note`, `save`, `find`, `doctor`). New coverage:

- `section.test.mjs` — parse/serialize state lines; anchor generation and dedupe; absent-state defaults.
- `supersede.test.mjs` — flip is atomic; cross-page anchors resolve; `find` hides superseded without
  `--all`; `current` outranks `superseded` on equal score.
- `save-append.test.mjs` — confident match appends; no match creates; `--page` and `--new` override.
- `paths.test.mjs` — `resolveNote` finds a slug in any domain folder; duplicate slugs across folders
  are a `doctor` error.
- A regression test seeded with the three real ladder notes asserting `find "offer ladder"` returns
  only the 2026-07-27 section. That defect is the reason for this spec; it gets a permanent test.

## Command Center and the product angle

Simon asked for the sellable inclusions. Recorded here so the follow-on viewer spec inherits them.

- **The differentiator is ownership.** Competitors sell "we set up Claude for you." None sell "your
  business gets a memory that outlives the model, in markdown you own, readable by any AI — and if you
  fire me, you keep it." Markdown plus a Node CLI, no vendor database required.
- **Supersede is the demo.** Change a price and watch a typical AI memory keep both versions and quote
  the dead one; watch this one retire it. Sixty seconds, the client's own data, and it *is* State Beats
  Intelligence rather than a slide about it.
- **Recipes are the upsell past setup.** A client's SOPs become artifacts any agent executes the same
  way twice — and they are not Claude-specific, which answers the "what if we switch models" objection
  before it is raised.
- **The CC viewer is what makes it sellable to a non-technical buyer** — nested tree, page reader,
  daily log. Spec'd separately, after the structure exists. Building a viewer over 138 sticky notes
  would render the problem at higher resolution.
- **brain-lite for clients**: pure-markdown subset, no Supabase, no reconciler. Supabase sync is
  already optional, so this is a subtraction rather than a fork.

## Risks

| Risk | Mitigation |
|---|---|
| Migration agent merges two topics that should stay apart | Page list reviewed before merge; `brain-v1-final` tag makes any split cheap |
| Agent drops a note Simon wanted | `dropped.md` manifest + tag; recovery is one `git show` |
| Section anchors break `by:` pointers on heading rename | `doctor` validates every pointer resolves; reports unresolvable |
| Live skills break on the CLI change | CLI signatures frozen; `source find`/`source add` covered by existing tests |
| Scope creep from recipes | Exactly three skills convert; the rest is explicitly out |

## Out of scope

- Converting the remaining ~22 skills to recipes (follow-on batch).
- The Command Center tree viewer (follow-on spec).
- brain-lite client packaging (follow-on, gated on a real /setup client).
- Any change to the intake extraction contract (2026-07-16 stands).
- Semantic search architecture — embeddings change granularity only, not provider or method.

## Anti-recurrence

The stale-`locked` defect gets a `docs/lessons.md` entry when this ships: *a knowledge store that can
only append will state two contradictory things with equal confidence; retirement must be an operation,
not a convention.*
