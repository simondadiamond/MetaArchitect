# Handoff — Second Brain upgrade #2: sources/claims vault (compounding research knowledge)

**Date**: 2026-07-16 · **From**: COO session (second-brain v2 redesign) · **For**: the next agent session on this work
**Goal**: research knowledge should compound. Today every research crawl (teardown-research, /research,
NotebookLM sweeps) evaporates after the deliverable ships; claims get re-verified from scratch and
crawls get rebuilt. Build a **sources layer** in the brain: one note per external source carrying its
load-bearing claims, so research skills check the vault before crawling and write back after.

## Verified context — don't re-litigate

**What already shipped today (all live, all committed):**
- Second brain v2 intake: evidence tier, extraction contract, semantic fallback. Spec (read it first):
  `docs/superpowers/specs/2026-07-16-second-brain-v2-intake.md`. Original design:
  `docs/superpowers/specs/2026-07-07-second-brain-design.md`.
- Brain repo `~/projects/brain`: CLI verbs find/save/promote/drop/sync/doctor/inbox/describe
  (`tools/cmd/`), note anatomy in its `CLAUDE.md` rule 5, INDEX grammar in `tools/lib/index-file.mjs`
  (slug + domain + optional `, evidence` marker), 88-test suite (`npm test`), recall bench
  (`PATH="$HOME/.local/bin:$PATH" node bench/run.mjs --fast` — brain must stay ≥13/15; 2 known fails
  are the n8n/sterling shadowing, proposal filed).
- Supabase projection: `brain_entries` (status, snippet, embedding vector(384), embedding_hash),
  `embed` edge function (gte-small, zero external keys), `match_brain_entries` RPC, semantic threshold
  0.82 (calibrated — related 0.826–0.849, noise ≤0.803).

**Decisions already made (Simon-approved or session-settled — do not reopen):**
- Slugs are IDs: never renamed. One-fact-per-note stays for facts — **sources are a NEW note class,
  not a reshaping of facts**.
- Lexical find first, semantic fallback. Never embeddings-only.
- Metadata minimalism: do NOT port claude-obsidian's full frontmatter surface or OB1's governance
  ceremony. The steal is exactly: per-source note, `key_claims` (2–4 assertions each with a verbatim
  quote + confidence), update-don't-duplicate, contradiction-flag-don't-overwrite.
- Note bodies: no walls of text, no provenance narration (anatomy rule 5 in brain CLAUDE.md).

**Why this matters to the business (the frame that motivates the design):**
- Confirmed brain note `strategic-frame-adopted-2026-07-02-the-state-scored-teardown`: the teardown is
  the unit of work. Sources vault = every teardown makes the next one cheaper.
- Claim-provenance rule (lessons.md 2026-07-07, note `claim-provenance-trace-every-claim-to-a-primary-source`):
  every published number/attribution must trace to a fetched verbatim primary-source sentence. The
  vault makes that a lookup instead of a re-crawl.
- Note `pattern-store-upstream-resource-ids-as-explicit-state`: a lost notebook_id once forced a
  40-source re-crawl — store crawl artifact IDs (NotebookLM notebook ids etc.) on the source notes.

**Where research reads/writes today (map these before speccing):**
- `~/projects/MetaArchitect/.claude/skills/research/` and `.claude/skills/teardown-research/`
- Content-Engine pipeline: `projects/Content-Engine/` (commands run from there; STATE medium risk —
  S+T+E: state object, log every LLM/API call, validate before write)

## Open design questions (the spec you write answers these)

1. Storage: `sources/` dir beside `notes/` (own index? own INDEX marker?) vs a `source` note type in
   `notes/`. Consider: doctor/sync/find all scan `notes/` today.
2. Frontmatter shape: slug, url, title, retrieved (date), key_claims (assertion + verbatim quote +
   confidence high/medium/low), tags, crawl artifact IDs. Keep it minimal.
3. Retrieval: does `brain find` search sources (probably yes, labeled `[source]`), or a dedicated
   `brain source find <url|topic>`? Dedup by canonical URL on add.
4. Projection: extend `brain_entries` vs a `brain_sources` table (CC /brain would grow a Sources view —
   that UI part is a story for `sitemaster` AFTER the CLI lands; remember the 2026-07-16 lesson:
   mutation-driving verify criteria use disposable fixtures, never production rows).
5. Skill integration: research skills query the vault first ("known source? claims already verified?"),
   write back new sources + claims after every crawl. Editorial/claim-provenance checks cite vault slugs.

## Exact next steps

1. Read: the two specs above, brain `CLAUDE.md`, `tools/lib/index-file.mjs`, `tools/cmd/save.mjs`,
   both research SKILL.md files. (~30 min)
2. Write the spec to `docs/superpowers/specs/` answering the 5 questions; propose to Simon before
   building — shape decisions are his call.
3. Implement in `~/projects/brain` (session work, not a story — brain repo isn't a story target):
   CLI first, tests green (`npm test`), bench non-regressing, then skill edits in MetaArchitect.
4. CC Sources view: queue as a `sitemaster` story with brand criteria + read-only/fixture-safe verify.

## Constraints (standing)

- `gh` CLI for all pushes; never force-push; worktrees for any command-center code.
- Secrets from `.env` files at point of use, never in chat or commits.
- Brain writes are atomic-with-rollback (mirror `save.mjs`/`promote.mjs` patterns).
- End every session response with a Next Action (COO house style applies to whoever picks this up).
