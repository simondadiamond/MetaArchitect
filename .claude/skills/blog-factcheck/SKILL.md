---
name: blog-factcheck
description: Use when the blog pipeline dispatcher advances a blog_ideas row to the fact_check stage, or when Simon asks to fact-check/verify a pipeline post before it goes to final review — consumes the optimized_draft and research_doc artifacts, independently re-verifies every external-world claim against a primary source, and produces the factcheck_report artifact. Do NOT trigger for SEO/metadata optimization (blog-optimize) or for the human final-review/publish step (blog-insert).
---

## Blog Fact-Check Process

**Risk tier: medium (S + T + E)** — Supabase reads/writes (`blog_ideas` stage, `blog_artifacts`) plus live WebFetch calls against primary sources when the research doc doesn't already carry the sentence a claim needs. On any failure:

```
❌ blog-factcheck failed at [stage] — [error message] — row set to failed_fact_check, safe to retry
```

This skill handles **article** rows only (`post_type:'article'`) — teardown rows never reach the `fact_check` stage (teardown-generate runs its own claim-provenance check at generation time, in its own Step 1).

**Why this skill exists.** On 2026-07-07, a fabricated "more than 65%" Ramp stat, a sharpened "shadow mode" process narrative, and a false ZenML attribution passed through editorial's Pass 2 (dimension 9, stat provenance) unchallenged and shipped into a live blog page and four scheduled LinkedIn posts before anyone caught it (`docs/lessons.md` 2026-07-07). That incident is the reason this stage exists at all: a dedicated, independent tripwire whose only job is re-verifying every external-world claim in the FINAL text against a primary source — not trusting what upstream stages already claimed to have checked.

---

### STEP 0 — STATE Init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,          // set to the blog_ideas row id once known
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Stages: `load_inputs → enumerate_claims → verify_claims → repair → gate → persist`. Log via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there), `step_name: 'blog_factcheck'`, `stage` matching whichever phase failed or `'persist'` on success:

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'blog_factcheck',
  stage: state.stage, output_summary: '<claim counts: N checked, N passed, N repaired, N cut>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

---

### Stage Contract (pipeline mode)

The row must already be at `'fact_check'` when this skill runs. The `optimizing → fact_check` transition is `blog-optimize`'s exit claim — this skill never performs it. Retrying a `failed_fact_check` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either. The `awaiting_final_review → inserting` transition is **human-only** (Simon's final review and go-ahead) — this skill never performs it, no matter how clean the verdict table is.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'fact_check') throw new Error(`row not at fact_check (found: ${idea?.stage})`);
```

Any other stage (`optimizing`, `failed_fact_check`, anything) → stop, touch nothing, report the mismatch. Exclusivity is the dispatcher layer's job (single scheduled dispatcher, one row per fire, overlapping fires skipped) — and a double-run is safe anyway because artifacts are append-only.

**Resume check (Tolerant):** after verifying, `latestArtifact(ideaId, 'factcheck_report')` — if a report exists from a prior crashed run, compare its `created_at` against `latestArtifact(ideaId, 'optimized_draft').created_at`. If the report is newer than (or same-run as) the optimized_draft, the text hasn't changed since — reuse the existing report (if it was a clean PASS) and skip straight to the exit claim, saying so in 2-3 lines in the report (still log this run, `output_summary: 'factcheck_report_reused (artifact <id>)'`, so Traceability holds). If the optimized_draft is newer than the report, the report is stale — redo the full protocol below against the current text.

**Exit — the success transition IS the atomic claim:** after persisting the `factcheck_report` artifact with an all-PASS verdict, `claimStage(ideaId, 'fact_check', 'awaiting_final_review')`. If it returns `false`, another run already advanced the row — report that this run's artifact is a redundant extra version and stop; do NOT `setStage`.

**Failure:** re-check the row is still at `'fact_check'` (`getIdea`), then `setStage(ideaId, 'failed_fact_check')`; if it already moved, just report.

---

### PHASE 1 — Load Inputs

```javascript
const finalDraft = await latestArtifact(ideaId, 'optimized_draft');
const researchDoc = await latestArtifact(ideaId, 'research_doc');
```

`finalDraft` is the text that is actually going to publish — every claim enumerated in Phase 2 comes from here, not from any earlier draft version. `researchDoc` is the evidence base this skill checks claims against first, before falling back to a live fetch.

**Both are REQUIRED.** Missing `finalDraft` → `failed_fact_check` ("no optimized_draft found — run blog-optimize first"); stop. Missing `researchDoc` → `failed_fact_check` telling Simon plainly that research provenance is unavailable for this row and nothing can be independently verified until it exists; stop. Do not fact-check against a partial input set, and do not substitute the draft's own inline citations for the research doc — that is exactly the trust this skill exists to withhold (see Independence, below).

---

### PHASE 2 — Enumerate Every Claim

Read `finalDraft` in full and build a worklist of **every external-world claim** before verifying any of them — enumerate first, verify second (Structured: don't check ad hoc while reading, or claims near the end get a shallower pass than claims near the top).

An external-world claim is anything the post asserts about a system, company, dataset, or event outside Simon's own STATE scoring or reasoning. These fall into the three classes that failed on 2026-07-07 (`docs/lessons.md` 2026-07-07; canonical wording in `.claude/skills/teardown-generate/SKILL.md` Step 1, "Claim provenance"):

1. **Numbers** — percentages, multipliers, counts, dates, anything quantitative that isn't Simon's own STATE score. The scope qualifiers that shipped with the number ("at Ramp itself", "more than 65%", "since deployment") are part of the claim — a number that lost its qualifier on the way into the post is a different, unverifiable claim even if the digits match.
2. **Process/architecture narratives** — descriptions of how a system actually works or was built ("ran in shadow mode against human ground truth until accuracy cleared a threshold"). The failure mode here isn't inventing a fact from nothing, it's sharpening what a source vaguely describes into a cleaner, more citable-sounding pattern than the source ever claimed — "shadow mode" was invented at the research step from a source that only described suggestion mode, then propagated into the title, FAQ, and three LinkedIn posts before anyone checked it against the source sentence.
3. **Attributed statements** — anything framed as a named source's own words or position ("ZenML says it plainly: …"). The named source must literally say it. A conclusion the author draws from a source's *silence* (e.g., "crash recovery isn't described anywhere in their docs") is a legitimate claim — but it must be attributed to the author, never phrased as something the source itself asserts.

List each claim with its exact sentence (or clause) from `finalDraft` and, if present, whatever URL the draft already cites for it. This worklist is the spine of the report table in Phase 6 — one row per claim here becomes one row there.

---

### PHASE 3 — Verify Each Claim Against a Primary Source

For every claim on the worklist, in order:

1. **Search `researchDoc` first** — primarily its `## Evidence (tiered)` section, but check the whole doc — for a verbatim sentence that supports the claim, plus the primary URL attached to it.
2. **If found:** confirm the scope qualifiers from Phase 2 survived unchanged from the research doc's sentence into `finalDraft` — no widened numbers, no dropped "at X itself", no generalized process description.
3. **If absent from `researchDoc`:** WebFetch the primary URL live (use whatever URL the draft or research doc already associates with the claim, or the closest named source if none is cited) and search the fetched page for the sentence. This is not optional — a claim not found in the research doc is not yet a FAIL, it's an instruction to go check the source directly, because the research doc can itself be incomplete or stale.
4. **If found via live fetch:** record the URL (add it to the report row even if it wasn't in the research doc already) and treat it as PASS, same qualifier check as step 2.
5. **If not found anywhere reachable** — not in the research doc, not on a live fetch of the named or best-guess primary source — the claim is **FAIL: unsourced**.
6. **For attributed statements specifically:** confirm the sentence you found actually says what the draft attributes to it — a paraphrase upgraded into something that reads like a quote is a FAIL even if a *related* sentence exists. And check the reverse direction: if the draft's "attribution" is actually the author's own inference from the source saying nothing on the topic, that's a FAIL unless the final text attributes the conclusion to Simon, not to the source.

---

### PHASE 4 — Repair Rule

A FAIL may be repaired in exactly two ways, and no others:

> **Cut the claim, or reattribute it to the author. Never repair a FAIL by softening or paraphrasing the source's language to make the claim technically defensible.** "The source doesn't say exactly that, but something close enough" is the failure mode this rule exists to close off — it is how a fabricated stat survives two review passes by getting quietly rounded toward plausibility instead of removed.

If repair requires touching the text (cutting a sentence, rewording an attribution to name Simon instead of the source, dropping a claim entirely):

- Save the repaired text as a **new `optimized_draft` version** (this skill does not own `optimized_draft` as its primary output, but a repair is a text change and must persist as a new version of the artifact it changed, per the append-only convention every other stage follows) — `meta` on that version must include `{ repaired_by: 'blog-factcheck', cut_claims: [<claim text>, ...] }` naming exactly what was cut or reattributed.
- Re-check every row affected by the edit (a cut sentence can change the flow of an adjacent paragraph — re-read the section, not just the deleted line) before moving on.
- Any surviving links or metadata that referenced the cut claim (FAQ answers, internal-link anchors, metadata excerpt) get the same treatment — a claim that's gone from the body but still implied in the FAQ is not repaired.

**Unrepairable FAIL** (the claim is load-bearing to the post's argument and can't be cut or reattributed without gutting the section) → this run ends at `failed_fact_check`, naming the specific claim verbatim in the log's `output_summary` — this is not a "note it and move on" situation.

---

### PHASE 5 — Independence Rule

Read and apply literally: **this skill does not trust editorial's Pass 2 dimension-9 score** ("Stat provenance" — see `.claude/skills/editorial/SKILL.md`) **or the draft's own inline citation links as evidence that a claim is correct.** Both already claimed to check exactly this and both were true the day the Ramp incident shipped. Every claim in Phase 3 is re-derived from the research doc or a live primary-source fetch performed *in this run* — a citation already sitting in the text is a claim about where the fact came from, not proof the fact is there. Treat a cited-but-unverified link the same as an uncited claim: it goes through the full Phase 3 check.

---

### PHASE 6 — Gate

Assemble the final text — `finalDraft` plus any Phase 4 repairs — to a temp file at `projects/Content-Engine/.tmp/factcheck-gate-<ideaId>.md` (create `.tmp/` if it doesn't exist; it's gitignored runtime state), then run:

```bash
bash scripts/linkedin-gate.sh --blog projects/Content-Engine/.tmp/factcheck-gate-<ideaId>.md
```

This is blog mode (brand prohibitions + AI-tell shape only — the same re-grep every other blog stage runs on assembled text before persisting it). **Gate failure → fix the offending prose and re-run. Never persist a report claiming PASS, or advance the row, on text that hasn't cleared the gate.**

---

### PHASE 7 — Report Format & Persist

Report format — one row per claim from the Phase 2 worklist, in the same order:

```
| claim | source URL | verbatim sentence found? | qualifiers intact? | verdict |
|-------|------------|--------------------------|---------------------|---------|
| "<claim text>" | <primary URL> | yes/no | yes/no/n-a | PASS/FAIL |
```

Append a short gate output summary (pass/fail, any fixes made) below the table.

**Persist the `factcheck_report` artifact in every case, PASS or FAIL** — a report documenting which claims failed and why is exactly what Traceability requires, even on the run that ends at `failed_fact_check`.

```javascript
const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
const meta = {
  workflowId: state.workflowId,
  claims_checked: N, claims_passed: N, claims_repaired: N, claims_cut: N,
  gate_result: 'pass' | 'fail (fixed)',
};
await saveArtifact({ ideaId: state.entityId, kind: 'factcheck_report', content: reportMarkdown, meta });
```

**Rule: a run that ends without a `factcheck_report` artifact is a failed run**, whether the cause was a missing input, an unrepairable claim, or a gate that never passed — do not fabricate a partial report or skip persisting it on the failure path.

**On all-PASS:** persist the report, close the run per the Stage Contract's exit transition (`claimStage` to `'awaiting_final_review'`), log `blog_factcheck`, and print for Simon: the full verdict table, the gate summary, confirmation that the row now sits at `awaiting_final_review` waiting on his read, and the artifact id(s) for the `factcheck_report` (and, if Phase 4 ran, the new `optimized_draft` version).

**On unrepairable FAIL:** persist the report showing the failing row(s), set `failed_fact_check` per the Stage Contract's failure path, and report to Simon the specific claim, why it couldn't be repaired by cutting or reattributing, and that the row needs his call before this skill can be retried.
