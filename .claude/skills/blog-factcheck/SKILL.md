---
name: blog-factcheck
description: Use when the blog pipeline dispatcher advances a blog_ideas row to the fact_check stage, or when Simon asks to fact-check/verify a pipeline post before it goes to final review — consumes the optimized_draft and research_doc artifacts, independently re-verifies every external-world claim against a primary source, and produces the factcheck_report artifact. Do NOT trigger for SEO/metadata optimization (blog-optimize) or for the human final-review/publish step (blog-insert).
---

## Blog Fact-Check Process

**Risk tier: medium (S + T + E)** — Supabase reads/writes (`blog_ideas` stage, `blog_artifacts`) plus a live WebFetch against the primary source of every claim being verified. On any failure:

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

**Resume check (Tolerant):** after verifying, `latestArtifact(ideaId, 'factcheck_report')` — if a report exists from a prior run, compare its `created_at` against `latestArtifact(ideaId, 'optimized_draft').created_at`. Three branches:
- Report newer than (or same-run as) the optimized_draft **and** it recorded a clean all-PASS verdict → the text hasn't changed since — reuse it and skip straight to the exit claim, saying so in 2-3 lines in the report (still log this run, `output_summary: 'factcheck_report_reused (artifact <id>)'`, so Traceability holds).
- Report current but **not** a clean all-PASS (e.g. this is a retry of a `failed_fact_check` row after the dispatcher reset the stage, and the newest report documents FAILs) → redo the full protocol below against the current text. A failing report is the record of why the last run stopped, never a checkpoint to resume past.
- Optimized_draft newer than the report → the report is stale — redo the full protocol below against the current text.

**Exit — the success transition IS the atomic claim:** after persisting the `factcheck_report` artifact with an all-PASS verdict, `claimStage(ideaId, 'fact_check', 'awaiting_final_review')`. If it returns `false`, another run already advanced the row — report that this run's artifact is a redundant extra version and stop; do NOT `setStage`.

**Failure:** re-check the row is still at `'fact_check'` (`getIdea`), then `setStage(ideaId, 'failed_fact_check')`; if it already moved, just report.

---

### PHASE 1 — Load Inputs

```javascript
const finalDraft = await latestArtifact(ideaId, 'optimized_draft');
const researchDoc = await latestArtifact(ideaId, 'research_doc');
```

`finalDraft` is the text that is actually going to publish — every claim enumerated in Phase 2 comes from here, not from any earlier draft version. `researchDoc` is the evidence *map*: it tells you which primary URL should carry each claim and what sentence to expect there. It is never itself the proof (see the Independence Rule below).

**Both are REQUIRED.** Missing `finalDraft` → `failed_fact_check` ("no optimized_draft found — run blog-optimize first"); stop. Missing `researchDoc` → `failed_fact_check` telling Simon plainly that research provenance is unavailable for this row and nothing can be independently verified until it exists; stop. Do not fact-check against a partial input set, and do not substitute the draft's own inline citations for the research doc — that is exactly the trust this skill exists to withhold (see Independence, below).

---

### PHASE 2 — Enumerate Every Claim

Read `finalDraft` in full and build a worklist of **every external-world claim** before verifying any of them — enumerate first, verify second (Structured: don't check ad hoc while reading, or claims near the end get a shallower pass than claims near the top).

An external-world claim is anything the post asserts about a system, company, dataset, or event outside Simon's own STATE scoring or reasoning. These fall into the three classes that failed on 2026-07-07 — the canonical incident record is `docs/lessons.md` 2026-07-07; the sibling skill's wording of the same lesson is `.claude/skills/teardown-generate/SKILL.md` Step 1, "Claim provenance":

1. **Numbers** — percentages, multipliers, counts, dates, anything quantitative that isn't Simon's own STATE score. The scope qualifiers that shipped with the number ("at Ramp itself", "more than 65%", "since deployment") are part of the claim — a number that lost its qualifier on the way into the post is a different, unverifiable claim even if the digits match.
2. **Process/architecture narratives** — descriptions of how a system actually works or was built ("ran in shadow mode against human ground truth until accuracy cleared a threshold"). The failure mode here isn't inventing a fact from nothing, it's sharpening what a source vaguely describes into a cleaner, more citable-sounding pattern than the source ever claimed — "shadow mode" was invented at the research step from a source that only described suggestion mode, then propagated into the title, FAQ, and three LinkedIn posts before anyone checked it against the source sentence.
3. **Attributed statements** — anything framed as a named source's own words or position ("ZenML says it plainly: …"). The named source must literally say it. A conclusion the author draws from a source's *silence* (e.g., "crash recovery isn't described anywhere in their docs") is a legitimate claim — but it must be attributed to the author, never phrased as something the source itself asserts.

List each claim with its exact sentence (or clause) from `finalDraft` and, if present, whatever URL the draft already cites for it. This worklist is the spine of the report table in Phase 6 — one row per claim here becomes one row there.

---

### INDEPENDENCE RULE (governs Phase 3)

Read and apply literally before verifying anything: **this skill does not trust editorial's Pass 2 dimension-9 score** ("Stat provenance" — see `.claude/skills/editorial/SKILL.md`), **the draft's own inline citation links, or the research doc's evidence entries as proof that a claim is correct.** All three already claimed to check exactly this, and all three were in place the day the Ramp incident shipped — the fabrication was born at the research step itself, so a plausible research-doc entry pointing at a wrong-subject URL is precisely the artifact this skill must catch, not defer to. The research doc tells you where to look; it is never itself the proof. A PASS is earned only by a live primary-source fetch performed *in this run* (Phase 3). A citation already sitting in the text is a claim about where the fact came from, not proof the fact is there — a cited-but-unverified link goes through the full Phase 3 check the same as an uncited claim.

---

### PHASE 3 — Verify Each Claim Against a LIVE Primary Source

For every claim on the worklist, in order:

1. **Look up the claim in `researchDoc`** — primarily its `## Evidence (tiered)` section, but check the whole doc — to find the primary URL it associates with the claim and the verbatim sentence it expects to be there. This is a map lookup, never a verification: matching the research doc proves nothing on its own (Independence Rule).
2. **WebFetch the primary URL live, in this run** — the URL from step 1, or whatever URL the draft itself cites for the claim, or the closest named source if neither has one. Search the fetched page for a verbatim sentence that carries the claim. **This step is mandatory for every claim — a PASS without a live fetch behind it does not exist in this skill.**
3. **If the sentence is found live:** confirm it actually supports the claim as written, and confirm the scope qualifiers from Phase 2 survived unchanged into `finalDraft` — no widened numbers, no dropped "at X itself", no generalized process description. Record the fetched URL in the report row (even if it differs from what the research doc or draft cited). That's a PASS.
4. **If the URL is unfetchable** (dead, paywalled, blocked, times out): the claim **cannot PASS**. Try any alternate primary URL the research doc or draft offers; if no fetchable primary source confirms the sentence, treat the claim as FAIL → cut or reattribute per Phase 4, and name the unfetchable URL in the report row so Simon can see what couldn't be reached.
5. **If the page fetches but the sentence isn't there** — and no other fetchable primary source carries it — the claim is **FAIL: unsourced**. This includes the wrong-subject case: a page that is live and on-topic but never actually says the thing (the 2026-07-07 shape).
6. **For attributed statements specifically:** confirm the live sentence actually says what the draft attributes to it — a paraphrase upgraded into something that reads like a quote is a FAIL even if a *related* sentence exists. And check the reverse direction: if the draft's "attribution" is actually the author's own inference from the source saying nothing on the topic, that's a FAIL unless the final text attributes the conclusion to Simon, not to the source.

---

### PHASE 4 — Repair Rule

A FAIL may be repaired in exactly two ways, and no others:

> **Cut the claim, or reattribute it to the author. Never repair a FAIL by softening or paraphrasing the source's language to make the claim technically defensible.** "The source doesn't say exactly that, but something close enough" is the failure mode this rule exists to close off — it is how a fabricated stat survives two review passes by getting quietly rounded toward plausibility instead of removed.

**What counts as a cut:** a claim is CUT only if the specific external-world assertion is gone from the text entirely. Rewriting it into a vaguer version of the same assertion about the same subject — "more than 65%" becoming "a majority", "shadow mode" becoming "a validation phase", still said about Ramp — is NOT a cut and is not a reattribution either: it is the same unverifiable external-world claim rounded toward plausibility, and the row stays FAIL. Vague-ing the draft's own wording is the same loophole as softening the source's, closed the same way.

If repair requires touching the text (cutting a sentence, rewording an attribution to name Simon instead of the source, dropping a claim entirely):

- Save the repaired text as a **new `optimized_draft` version** (this skill does not own `optimized_draft` as its primary output, but a repair is a text change and must persist as a new version of the artifact it changed, per the append-only convention every other stage follows):

  ```javascript
  const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
  await saveArtifact({
    ideaId: state.entityId, kind: 'optimized_draft', content: repairedBodyMarkdown,
    meta: { ...finalDraft.meta, workflowId: state.workflowId,
            repaired_by: 'blog-factcheck', cut_claims: ['<claim text>', /* ... */] },
  });
  ```

  Carry the prior version's `meta` forward (title/slug/geo_citability etc. still describe this text) and name in `cut_claims` exactly what was cut or reattributed. Downstream consumers (`blog-insert`) take the NEWEST `optimized_draft` via `latestArtifact` (ordered `created_at desc`), so the repaired version automatically supersedes the one it fixes — no pointer to update.
- Re-check every row affected by the edit (a cut sentence can change the flow of an adjacent paragraph — re-read the section, not just the deleted line) before moving on.
- Any surviving links or metadata that referenced the cut claim (FAQ answers, internal-link anchors, metadata excerpt) get the same treatment — a claim that's gone from the body but still implied in the FAQ is not repaired.

**Unrepairable FAIL** (the claim is load-bearing to the post's argument and can't be cut or reattributed without gutting the section) → this run ends at `failed_fact_check`, naming the specific claim verbatim in the log's `output_summary` — this is not a "note it and move on" situation.

---

### PHASE 5 — Gate

Assemble the final text — `finalDraft` plus any Phase 4 repairs — to a temp file at `projects/Content-Engine/.tmp/factcheck-gate-<ideaId>.md` (create `.tmp/` if it doesn't exist; it's gitignored runtime state), then run:

```bash
bash scripts/linkedin-gate.sh --blog projects/Content-Engine/.tmp/factcheck-gate-<ideaId>.md
```

This is blog mode (brand prohibitions + AI-tell shape only — the same re-grep every other blog stage runs on assembled text before persisting it). **Gate failure → fix the offending prose and re-run. Never persist a report claiming PASS, or advance the row, on text that hasn't cleared the gate.**

---

### PHASE 6 — Report Format & Persist

Report format — one row per claim from the Phase 2 worklist, in the same order:

```
| claim | source URL | verbatim sentence found? | qualifiers intact? | verdict |
|-------|------------|--------------------------|---------------------|---------|
| "<claim text>" | <primary URL> | yes/no | yes/no/n-a | PASS/FAIL |
```

"Verbatim sentence found?" means found on THIS run's live fetch (Phase 3) — never "found in the research doc". A FAIL caused by an unreachable source puts the unfetchable URL in the `source URL` cell so Simon can see exactly what couldn't be reached. Append a short gate output summary (pass/fail, any fixes made) below the table.

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
