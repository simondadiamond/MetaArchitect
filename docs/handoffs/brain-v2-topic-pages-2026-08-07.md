# Handoff — Brain v2 topic pages, Tasks 11 → merge

**Date:** 2026-08-07 · **From:** COO session that built Tasks 1–10 · **For:** the agent finishing this

Read this whole file before touching anything. It carries the things the plan does not know,
including two production hazards and one incident that already happened.

---

## Where it stands

**Branch:** `brain-v2` in the git worktree `~/projects/brain/.worktrees/brain-v2`.
30 commits, local only, nothing pushed, nothing merged.
`~/projects/brain` (the primary checkout) is untouched on `main`.

**Suite: 199 tests, 199 pass, 0 fail.** Verified across repeated runs.
**`brain doctor`: clean.** All 138 notes migrated into area folders, zero flat leftovers.

**Tasks 1–10 and one inserted task (9b) are complete and reviewed.** Task 11 is the only
plan task left, plus the plan's Final verification list.

What works today:

- Section-level retrieval. One INDEX row per **live** section, not per file.
- Retirement. `brain save … --supersedes <anchor>`, same-page and cross-page, one atomic write.
- `brain find --history` — the only way to reach retired content, every result labelled.
- `brain save` appends to the best-matching page by default; `--page` / `--section` / `--new` steer.
- Johnny.Decimal area folders behind `resolveNote`/`notePath`; nothing outside `paths.mjs` knows about folders.
- `brain log` (daily chronological record) and `brain recipe` (three skills converted).
- `doctor`: area scanning, duplicate-slug rejection, >15-section warning, `by:` pointer diagnostics.

**The demo is a passing test.** Retire a price → `find` returns the new one → `find --history`
returns the old one labelled retired → the retired section emits no index row at all.

---

## Simon's three rulings (2026-08-07) — these are decided, do not relitigate

1. **Source-note indexing change stands.** All 31 `src-*` notes now index by their `#claims`
   section rather than as one page-level row. His criteria were "simple for an agent to use,
   and stable" — this is the same mechanism as everything else in v2, so it is one behaviour
   rather than a special case.
2. **The corporate ladder note stays live as its own topic page.** It is a *distinct product
   line*, not a superseded price. He may return to it, plans to keep it alive via teardowns,
   and wants it kept and **explicitly identified** — add a line on the page saying it is the
   on-pull lane for a future endeavour. The `$6,500` Audit price is corporate and correct.
3. **Bench Q17 was rewritten, not removed.** He was explicit: deleting a failing test to reach
   green is faking agreement and he is not comfortable with it. Q17 asked "what does the Audit
   tier cost" without naming a ladder and then asserted the corporate answer was wrong — no
   answer satisfied it. It now names the `/setup` consumer ladder, and a **new Q19** asks the
   corporate question directly, so the gate proves `find` can *distinguish* the two ladders.
   **The gate is now 19 questions, not 18.** That raised the bar; do not lower it.

---

## The one remaining plan task: Task 11, content migration

Full brief: `docs/superpowers/plans/2026-08-06-brain-topic-pages.md`, Task 11.
Generate it with the SDD `scripts/task-brief` script rather than re-reading the whole plan.

**The plan's Task 11 clustering brief contains a factual error. Correct it before dispatching.**

The spec and the brief both claim `simonparis-ca-offer-ladder-locked-2026-07-score-free` and
`setup-offer-v2-2026-07-19-deep-research-104-agents-ladder` "contradict each other" and that
BOTH should become history entries resolved to the v4 numbers. They do not contradict. Each
note explicitly says it is a different product line and cross-links the other with the phrase
"same price points by coincidence, different buyer (corporate vs individual operator)".

- `simonparis-ca-offer-ladder-locked-*` = **corporate**, on /work-with-me — Diagnostic $2,500
  founding / $3,500 full, Audit $6,500 founding / $9,500 full. On-pull. **Keep live** (ruling 2).
- `setup-offer-v2-*` = **consumer** /setup, and it already carries its own inline supersession
  to v3. This one genuinely retires into history.

Verified against the arbiter the plan names: `funnel/setup-offer/offer-v4-spec.md` covers the
**consumer** ladder only — Sessions $125/hr, Audit+Roadmap $2,500 credited, OS Setup $6,500 /
founding $5K, Retainer ~$600/mo. It says nothing about the corporate Diagnostic/Audit tiers.

Everything else in the Task 11 brief stands: 3–15 sections per page, ~25 pages, `dropped.md`
with a receipt per drop, expected drop count 1–3 (a larger number is itself the signal the
agent misread the merge instruction), preserve every `[[wikilink]]`, `src-*` pages move
essentially as-is, and run `brain describe` on the two `describe_pending` stubs
(`simon-s-cv`, `open-residency-…`) rather than dropping them.

**Task 11 stops for Simon's sign-off on `dropped.md`. Do not merge without it.**

---

## Hazards. Read these; one already cost us.

### The incident that happened (2026-08-07)

An agent ran `brain sync` with no `BRAIN_ROOT` set, only to smoke-test that commands still
dispatched. The worktree's `.env` is a **real symlink to live production Supabase credentials**;
the vault was still flat so `allNoteFiles()` returned zero notes; and `sync`'s prune stage
deletes remote rows with no local counterpart. Zero local notes matched **all 137 rows**, and
the live `brain_entries` table was emptied.

Recovered by re-deriving from local markdown. **Embeddings were not recovered** — every row
currently has a null embedding, so semantic `find` is lexical-only. Full writeup:
`docs/lessons.md`, 2026-08-07 entry.

**The generalizable rule, and the briefing mistake behind it:** every task brief in this project
warned that `doctor --fix` must never run against the real `notes/`. That reasoning applied word
for word to `sync`, whose blast radius is worse — off-repo, not restorable with `git checkout`.
The warning named a *member* of the class instead of the class, so an agent obeying it precisely
still hit the sibling. When you brief a subagent, name the **class** of dangerous operation and
the property that makes it dangerous, not one example command.

### Standing rules for any agent working in this worktree

- **Never** run a writing command against the real `notes/` or with the real `.env` loaded to
  "smoke-test" anything. Read the dispatch table, or invoke with a deliberately invalid argument
  so it fails at validation.
- `sync` is now hardened: it refuses to mass-prune on a zero-note scan, and on a prune that
  would remove ≥5 orphans **and** >50% of the remote table. `--force-prune` is the
  confirmed-intent escape hatch; **`--skip-prune` is the right lever mid-migration** (upserts,
  never deletes, makes no prune decision). The two flags together are refused as contradictory.
- Temp `BRAIN_ROOT` fixtures are always safe. `doctor --fix` inside one is correct and expected.

### Required post-migration step

Run **`brain sync --skip-prune`** and confirm rows-with-embedding = 138. Tracked as goal
`873c8017-ba67-41b4-a13c-e011b66cc2ba`. Useful accident: `--skip-prune` never fetches the remote
list, so the embed hash-gate treats every note as changed and re-embeds everything — exactly
what this recovery needs. Verified safe: `patchEntry` is a column-scoped PATCH of
`{embedding, embedding_hash}` only, and a per-note failure leaves the existing value untouched.

### Schedules

**Session sweep** (`30 6 * * *`, id `83befe5b-1fe9-4967-a8ce-cf11bb1d57fd`) and
**Brain reconciler** (`0 6 * * 0`, id `39e07782-235f-4354-bf8c-4a0c52cbcd6f`) are **DISABLED**.
Re-enabling them is Task 11's explicit final step, not cleanup. Verify both read
`"enabled": true` before you finish. A sweep left off harvests nothing and nothing surfaces that
it is off.

---

## The bench, and a trap in it

Gate: `node bench/run.mjs`, **19/19 on the `cli` lane**, no regression against
`bench/baseline-v1.json`.

**Current: 11/19.** The 8 failures are 4 ladder-pricing questions (Task 11's job) and 4
recall failures, several of which are depressed *because the incident wiped the embeddings* —
they fall through to the semantic branch, which has nothing to match against. Expect some to
recover from the re-sync alone.

**The trap:** `bench/run.mjs` lane 1 shells out to `brain` on PATH. That symlink resolves to
`~/projects/brain/tools/brain.mjs` — the **primary checkout, on `main`** — so it runs v1 code
regardless of `BRAIN_ROOT`. `BRAIN_ROOT` moves the *vault*, not the *code*. A bench run from
this worktree reads 0/19 for that reason alone, which looks catastrophic and means nothing.

**Recommendation: change lane 1 to invoke `node tools/brain.mjs` from the repo root** so the
bench always tests the code in its own tree. That is a correctness fix to the harness, not a
loosening of the gate, and it removes a way for a future session to badly misread its own
results. Do it before the Task 11 gate run.

Also note `--fast` runs lane 1 only and does **not** write `results.json`; the full 3-lane run
costs ~15 minutes of real model calls.

**The v1 baseline was 12/15, not 15/15** as the plan predicted. That was an honest finding, not a
broken harness: recall had decayed from 15/15 on 2026-07-07 with zero code change, purely from
the vault growing to 138 notes. Long multi-topic notes were outranking the atomic note that
actually answered the question — the same disease v2 treats, measured on precision instead of
staleness. `bench/baseline-v1.json` records it truthfully.

---

## Parked findings, deferred minors, and carries

The full list with rulings is in the ledger:
`~/projects/brain/.worktrees/brain-v2/.superpowers/sdd/2026-08-06-brain-topic-pages/progress.md`.
**Read it.** It is the recovery map and it survives context loss. The ones most likely to matter:

- **Parked, section parser:** retired prose containing a literal `<details>` substring miscounts
  the depth counter, swallowing subsequent live body into history. Fails in the *safe* direction
  (content hidden, visible on the page, recoverable) rather than the Critical one. Narrow trigger;
  fenced code blocks are already exempt.
- **Parked, section parser:** a `##` line inside an open history block prematurely closes it.
  Only reachable by hand-editing; every obvious fix trades it for a worse failure mode.
- **Deferred:** an INDEX row whose anchor no longer exists (heading renamed) is invisible to all
  four `doctor` categories until `--fix` regenerates. **Task 11 renames headings across ~25
  pages**, so this is the most likely of these to bite you.
- **Deferred:** `--history` has no confidence threshold — any single keyword hit surfaces a
  retired entry. Fine as an escape hatch, blunt on a large vault.
- **Deferred:** `--page X --file Y` on a page that already has an attachment silently clobbers
  page-level `attachment`/`describe_pending`; there is no per-section attachment model.
- **Deferred:** INDEX.md's append path is a full-file overwrite where the create path appends;
  exception paths are covered by rollback, but a torn write now risks the whole file.
- **Deferred:** `import.mjs` mid-batch rollback can no-op against an appended page.
- **Deferred:** every `--skip-prune` run re-embeds the whole migrated subset (no hash-gating,
  since `remote` is never fetched). Fine once; wasteful if migration syncs repeat.
- **Known and accepted:** recipes live at `notes/90-99-system/recipes/` and are deliberately
  **not** indexed, doctor-validated or `find`-able — `allNoteFiles()` does not recurse and the
  INDEX line grammar allows one subfolder level. The plan's claim that doctor validates them is
  false; that correction lives in a header comment in `recipe.mjs`.

---

## Final verification list (from the plan, plus what this session added)

- [ ] `npm test` green
- [ ] `brain doctor` clean, warnings reviewed
- [ ] `node bench/run.mjs` — **19/19** on the cli lane, no regression vs `baseline-v1.json`
- [ ] `brain find "offer ladder"` returns v4 consumer pricing, no `$3,500`
- [ ] `brain find "corporate audit"` returns the corporate ladder, `$6,500` intact ← **new, ruling 2**
- [ ] `brain find --history "offer ladder"` returns retired prices, labelled
- [ ] `brain sync --skip-prune`, then confirm rows-with-embedding = 138 ← **incident recovery**
- [ ] `dropped.md` reviewed and approved **by Simon**
- [ ] Both schedules re-enabled and verified `"enabled": true`
- [ ] **Rewrite `~/projects/brain/CLAUDE.md` rule 4** — "one fact per note" is now wrong and will
      re-teach every future session the exact habit this project removed. Describe topic pages,
      section append, and `--supersedes`.
- [ ] Add the `docs/lessons.md` entry from the spec's Anti-recurrence section (the stale-`locked`
      defect: *a knowledge store that can only append will state two contradictory things with
      equal confidence; retirement must be an operation, not a convention*).
      Note the 2026-08-07 sync incident entry is already there — this is a second, different one.
- [ ] Capture a goal row for the stalled `describe_pending` pipeline bug (two attachments sat
      undescribed for over a week with nothing surfacing it) — out of scope, but real.

---

## Recommendations from having built it

**Keep the review gate. It is where the value came from.** Reviews found real defects in nearly
every task, and *most were in code the plan supplied*, not in what implementers wrote: a parser
that leaked retired text on a formatting variant, an index fallback that resurrected retired
pages, a guard file that passed for a reason unrelated to what it guarded, and a `doctor` that
would have failed Task 11's own gate on every page it produced. None were visible from reading
the plan.

**Verify a guard by breaking the code it guards.** The single most valuable technique this
session used: copy the module to a scratch directory, introduce the exact regression the test
claims to catch, confirm the test goes red, delete the scratch copy. Production is never touched.
It caught a guard file that passed for the wrong reason and it validated the atomicity rollback.
Simon endorsed this explicitly. Use it on anything Task 11 asserts about the invariant.

**Treat the plan as a claim under test.** Three of its stated facts were wrong: the v1 baseline,
the dependency map of which files break, and the corporate/consumer ladder conflation. Each was
found by checking rather than assuming. When a plan states a fact about the codebase or the
content, verify it before building on it.

**Match specificity to fragility.** Prescriptive step-by-step is correct for the destructive,
order-dependent paths (the Postiz publish flow, cross-page retirement, the migration sequence)
and wrong everywhere else. Two fix rounds were burned this session because I over-specified a
parser rule ("any line containing `<details`") and the literal instruction caused data loss on
ordinary prose. State the outcome and the *why*; prescribe steps only where the operation is
fragile or must be exact.

**Task 11 is the judgment half and the model matters.** Clustering 138 notes and resolving
contradictions is exactly the work that gets better with a better model — that is why the plan
made it an agent pass and not a script. Do not cheap out on it. Conversely, run the mechanical
verification (doctor, tests, bench) as scripts, not as agent inspection.

**One content note for the clustering pass:** there are two overlapping Valerie notes —
`valerie-simon-s-partner-since-2015` and
`valerie-simon-s-girlfriend-is-a-cpa-and-external-auditor-mun`. Both are accurate (she is an
accountant — a CPA and external auditor, municipal, for Quebec City). They are a good example of
the container problem the merge exists to fix: two files, one topic, neither wrong. Merge, do not
drop.
