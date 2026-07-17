# Second Brain upgrade #2 — sources/claims vault

**Date**: 2026-07-17 · **Status**: PROPOSED — awaiting Simon's approval on the 5 shape decisions
**Goal**: `139c69d3` (Second brain upgrade #2 — sources/claims vault)
**Handoff**: `docs/handoffs/2026-07-16-brain-sources-vault.md` · **Builds on**: `2026-07-16-second-brain-v2-intake.md`, `2026-07-07-second-brain-design.md`

## Problem

Every research crawl (teardown-research, /research, NotebookLM sweeps) evaporates after the
deliverable ships. Claims get re-verified from scratch; crawls get rebuilt; a lost notebook id
once forced a 40-source re-crawl. The claim-provenance rule (every published number traces to a
fetched verbatim sentence) is currently satisfied by re-fetching — the vault makes it a lookup.

**Design steal (scoped in the handoff, closed)**: per-source note, 2–4 key claims each with a
verbatim quote + confidence, update-don't-duplicate, contradiction-flag-don't-overwrite. Nothing
more — no claude-obsidian frontmatter surface, no OB1 governance ceremony.

---

## Q1 — Storage: source notes live in `notes/`, as a new note class

**Decision: `notes/` with `type: source` frontmatter, slug prefix `src-`. No `sources/` dir.**

Why not a separate dir:

- **`[[links]]` are the point.** Fact notes and editorial checks must cite source notes
  (`[[src-ramp-eng-ai-approvals]]`). `find`'s pointer-hop and doctor's link check both resolve
  `notes/<slug>.md` — a second dir breaks cross-linking or forks the link grammar.
- **Machinery reuse.** doctor/sync/find/promote/drop all scan `notes/` via one `scan()`. A second
  dir means a second scan path, a second index grammar, and a second projection path — metadata
  minimalism says no.
- Legibility is preserved by the mechanical `src-` slug prefix (added by `brain source add`,
  like the existing slug derivation) — sources are visually distinct in INDEX, `ls`, and links.

Sources are a **new note class, not a reshaping of facts**: one-fact-per-note stays for facts;
a source note holds one *external source* and its 2–4 load-bearing claims.

## Q2 — Note shape

Frontmatter stays flat (the parser is a line parser — no nested YAML). Claims live in the body.

```markdown
---
slug: src-ramp-eng-ai-approvals
type: source
title: How Ramp automated expense approvals with LLMs
url: https://engineering.ramp.com/ai-approvals
canonical: engineering.ramp.com/ai-approvals
domain: business
tags: [teardown, ramp]
created: 2026-07-17
retrieved: 2026-07-17
source: skill:teardown-research
description: Ramp engineering post on LLM approval automation — approval-rate figure and shadow-mode rollout mechanism.
artifacts: nlm:1a2b3c4d
---

## Claims
- (high) Ramp automates more than 65% of expense approvals at Ramp itself.
  > "Today, more than 65% of expense approvals at Ramp are fully automated."
- (medium) The self-monitoring/alerting loop ran in shadow mode before enforcement — scope: the
  monitoring loop, NOT the approval rollout.
  > "We ran the alerting loop in shadow mode until its precision stabilized."
```

- **New frontmatter fields**: `type: source` (absent = fact — every existing note round-trips
  byte-identical), `url` (as retrieved), `canonical` (normalized dedup key: scheme/tracking
  params/trailing slash stripped, host lowercased), `retrieved` (date of last live fetch),
  `artifacts` (comma list of crawl artifact IDs, e.g. `nlm:<notebook-id>` — the
  store-upstream-resource-ids lesson).
- **Claims**: 2–4 per note, each `(confidence) assertion` + an indented verbatim-quote line.
  Confidence maps to the evidence tiers: **high** = verbatim sentence fetched from the primary
  URL (T1-grade — quote line mandatory); **medium** = paraphrase of a fetched sentence or
  secondary source (T2); **low** = inference (T4 — never citable as fact). Scope qualifiers are
  part of the assertion, verbatim.
- **Update-don't-duplicate**: re-adding the same canonical URL merges new claims into the
  existing note and bumps `retrieved`. **Contradiction-flag-don't-overwrite**: a new claim that
  contradicts an existing one is appended with a `⚠ contradicts:` marker line — resolution is
  human. No walls of text, no provenance narration (anatomy rule 5 applies).

## Q3 — Retrieval

- **`brain find` searches sources** (they're INDEX entries like any note). Source hits are
  labeled `[source: <url>]`. INDEX grammar: the existing optional marker slot extends from
  `(domain, evidence)` to `(domain, evidence|source)` — one regex alternation in
  `index-file.mjs`.
- **Tie-break: facts beat sources** (same mechanism as confirmed-beats-evidence in
  `score.mjs`). Guard against the n8n/sterling-style shadowing regression: 57 fact notes will
  gain ~dozens of source lines; the bench (≥13/15) must be re-run and non-regressing before
  merge.
- **`brain source add`** — the write verb (atomic, mirrors `saveNote` stages:
  validate → slug → write-note → write-index → commit). Dedup by `canonical` on add: existing
  note → merge path, never a `-2` slug.
- **`brain source find <url|topic>`** — arg with a scheme/dot → canonical lookup (exact,
  deterministic — the "have we crawled this?" question); otherwise topic search restricted to
  source entries. Exit 1 = unknown source, crawl away.

## Q4 — Projection: extend `brain_entries`, no new table

**Decision: add `kind text not null default 'fact'` (+ `url text`) to `brain_entries`.**
`buildRow` stamps `kind: 'source'`; sync/embed/prune paths untouched; `match_brain_entries`
already returns slugs, so the semantic fallback covers sources for free — `find` labels by
kind from the INDEX. A `brain_sources` table would need its own RPC, embed path, and prune
logic for zero added capability.

CC `/brain` grows a Sources view (filter `kind = 'source'`, claims rendered, contradiction
badge) — **a `sitemaster` story queued AFTER the CLI lands**, with brand criteria and
read-only/fixture-safe verify steps (2026-07-16 lesson: never point a mutating verify at
production rows).

## Q5 — Skill integration (the compounding loop)

Edits in MetaArchitect (session work, after CLI ships):

1. **`research` SKILL.md** — new Phase 0.5 *vault check*: `brain source find "<topic>"` + per
   candidate URL before crawling; known high-confidence claims seed the evidence table without
   re-crawling. New Phase 3.5 *vault write-back*: every source that produced a T1/T2 finding
   (typically 2–6, never the full fetch list) → `brain source add` with claims + the NLM
   `notebook_id` as an artifact.
2. **`teardown-research` SKILL.md** — Step 4 checks the vault before WebFetching a candidate's
   URLs; after Step 6, qualified candidates' sources are written back with the claims that
   entered `description`/`interesting_gap`.
3. **Freshness rule (reconciles lessons.md 2026-03-17)**: the session-verified rule guards
   against *compacted-context memory*; a vault claim is a *persisted verbatim quote + URL*,
   which is exactly what claim-provenance requires. A high-confidence claim is citable as T1 if
   `retrieved` ≤ 90 days ago; older → one cheap re-fetch of the URL to re-verify (bump
   `retrieved`), never a full re-crawl.
4. **`editorial` / claim-provenance checks** cite vault slugs (`[[src-…]]`) as the trace.

## Implementation map

| Piece | Where | Route |
|---|---|---|
| `source add`/`source find`, `type`/`url`/`canonical`/`retrieved`/`artifacts` fields, INDEX marker, find labeling + tie-break, doctor per-type validation | `~/projects/brain/tools/` | session work |
| Migration: `brain_entries` + `kind`, `url` | Supabase (Management API) | session work |
| Tests (extend 88-suite) + bench re-run (≥13/15, non-regressing) | brain repo | session work, gates merge |
| Skill edits (research, teardown-research, editorial) | MetaArchitect `.claude/skills/` | session work |
| CC `/brain` Sources view | command-center | story → `sitemaster`, after CLI |

**STATE**: medium (S+T+E) — `source add` runs the same `state.mjs` staged logging as `save`,
all writes atomic-with-rollback, validation before any disk/DB write.
