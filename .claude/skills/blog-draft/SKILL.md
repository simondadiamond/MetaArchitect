---
name: blog-draft
description: Use when the blog pipeline dispatcher advances a blog_ideas row to the drafting stage, or when Simon asks to draft an approved pipeline post — consumes the research_doc and outline artifacts and produces the writing_brief then draft artifacts. Do NOT trigger for outlining (blog-outline) or for editing/reviewing a completed draft (editorial).
---

## Blog Draft Process

**Risk tier: medium (S + T + E)** — Supabase reads/writes (`blog_ideas` stage, `blog_artifacts`) in pipeline mode; no external API calls beyond the reasoning done in this session. On any failure:

```
❌ blog-draft failed at [stage] — [error message] — row set to failed_drafting, safe to retry
```

This skill handles **article** rows only (`post_type:'article'`) — teardown rows never reach the `drafting` stage.

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

Stages: `load_inputs → compose_brief → execute_brief`. Log via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there), `step_name: 'blog_draft'`, `stage` matching whichever phase failed or the relevant success point:

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'blog_draft',
  stage: state.stage, output_summary: '<what was produced>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

**Log `blog_draft` TWICE per successful run** — once for the brief, once for the draft:
- After Phase 2: `output_summary: 'brief_composed'`
- After Phase 3: `output_summary: 'draft_written'`

---

### Stage Contract (pipeline mode)

The row must already be at `'drafting'` when this skill runs. The entry transition — `awaiting_outline_approval → drafting` — is **human-only** (Simon approves the outline, via CC or by asking directly): this skill never performs that transition, it only consumes the artifact the human already approved. Retrying a `failed_drafting` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'drafting') throw new Error(`row not at drafting (found: ${idea?.stage})`);
```

Any other stage (`awaiting_outline_approval`, `failed_drafting`, anything) → stop, touch nothing, report the mismatch. Exclusivity is the dispatcher layer's job (single scheduled dispatcher, one row per fire, overlapping fires skipped) — and a double-run is safe anyway because artifacts are append-only.

**Resume check (Tolerant):** after verifying, `latestArtifact(ideaId, 'writing_brief')` — if a brief exists from a prior crashed run, compare its `created_at` against `latestArtifact(ideaId, 'outline').created_at`. If the brief is newer than (or same-run as) the outline, the outline hasn't changed since — reuse the existing brief and skip straight to Phase 3 (Execute) — say so in 2-3 lines in the report. A reused brief still gets a log entry for THIS run (`step_name: 'blog_draft'`, `output_summary: 'brief_reused (artifact <id>)'`) so Traceability holds. If the outline is newer than the brief, the brief is stale — recompose it (Phase 2) before drafting.

**Exit — the success transition IS the atomic claim:** after persisting the `draft` artifact, `claimStage(ideaId, 'drafting', 'editing')`. If it returns `false`, another run already advanced the row — report that this run's artifact is a redundant extra version and stop; do NOT `setStage`.

**Failure:** re-check the row is still at `'drafting'` (`getIdea`), then `setStage(ideaId, 'failed_drafting', '<the error message>')` — the reason lands in `blog_ideas.last_error` and shows in Command Center's failure panel; if it already moved, just report.

---

### PHASE 1 — Load Inputs

```javascript
const research = await latestArtifact(ideaId, 'research_doc');
const outline = await latestArtifact(ideaId, 'outline');
```

**Both are REQUIRED.** Missing either → `failed_drafting` with a clear message naming which one is missing ("no research_doc found — run research first" / "no outline found — run blog-outline first"); stop. Do not draft against a partial input set.

---

### PHASE 2 — Compose the Writing Brief (the meta-prompt)

This is the heart of the skill. The brief is a complete, self-contained writing instruction — **it must be executable by a writer with NO other context**. That is the completeness test: if a fresh writer handed only this brief (no chat history, no repo access beyond what's quoted in) could not produce the intended post, the brief is incomplete. Fix the brief, not the writer's judgment.

Assemble the brief from:

1. **The approved outline, verbatim** — quote the full outline artifact content in, unabridged. Do not summarize or paraphrase it.
2. **The research doc's tiered evidence** — pull every `T1` line (verbatim source sentence + primary URL) that the outline's ARGUMENT STRUCTURE draws on, plus any `T2` mechanism lines used as primary claims. Quote them exactly, scope qualifiers intact. This is what lets the writer cite without re-deriving evidence tiers.
3. **The internal link plan** — copy the outline artifact's `INTERNAL LINK PLAN` section verbatim; the writer places these links, it does not invent new ones.
4. **ICP pain points** — pull the relevant frustration(s) from `brand/icp.md` (the 5 Core Frustrations / Language That Lands) that this post's angle speaks to.
5. **Voice rules** — pointer, not restatement: instruct the writer to hold to `brand/brand-summary.md`'s Prohibitions list and the burned-practitioner / specificity / thesis-alignment tests. Do not copy the prohibitions list into the brief; point at the file.
6. **The drafting rules below, copied in verbatim into the composed brief.** Do not paraphrase — quote them. This is what makes the brief self-contained without a fresh writer needing chat history or repo access.

**Drafting Rules (quote verbatim into every brief — item 6 above):**

**Structure:**
- No `# h1` in body. Use `## h2` as the top-level heading.
- Apply the five SEO/GEO rules (canonical at the top of `.claude/skills/write-post/SKILL.md`) — primary keyword, BLUF, fact-blocks, insight count, named failure mode. They are stated once there; do not improvise variants.
- End on a pointed question OR a one-line STATE tie-in. Not both.
- 800–1800 words. Most strong posts land at 1000–1400. Do not pad to hit length.

**Voice:** `brand/brand-summary.md` is canonical — its Prohibitions list plus the burned-practitioner / specificity / thesis tests. Don't restate the list here; the shared LinkedIn gate greps the fixed phrases mechanically for the extract (`blog-insert`'s job), and editorial Pass 2 greps them for the blog prose.

**Stat provenance (E — the origin gate; the 2026-07-07 Ramp 65% incident started in this layer):**
- Every external number, process narrative ("ran in shadow mode"), or attributed statement ("ZenML says…") must trace to a **verbatim sentence fetched from a primary source in this session**, and the draft links that primary URL where the claim appears.
- Quote at source precision with scope qualifiers intact ("more than 65%", "at Ramp itself", "since deployment") — dropping a qualifier changes the claim.
- Conclusions drawn from a source's *silence* are the author's — never put them in the source's mouth.
- Untraceable → cut. A punchier line is never worth an unattributable claim.

**Evidence tiering:** the canonical T1–T4 definitions live in the `research` skill (Phase 1) — do not restate them. The operational rule: only T1-anchored numbers (verbatim source sentence + primary URL) may appear as stats; T2 patterns may carry primary claims without numbers; T3 is supporting color; T4 is never presented as fact.

**Code blocks:**
- Always annotate: ` ```typescript `, ` ```python `, ` ```sql `, ` ```bash `
- One point per block. Under 30 lines. Bad pattern vs. good pattern = two blocks with commentary between.

**Persist the brief:**

```javascript
const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
await saveArtifact({ ideaId: state.entityId, kind: 'writing_brief', content: briefContent, meta: { workflowId: state.workflowId } });
```

Log `blog_draft` with `output_summary: 'brief_composed'`.

A pipeline run that ends without a `writing_brief` artifact is a failed run — do not proceed to Phase 3 without persisting it first.

---

### PHASE 3 — Execute the Brief Verbatim

Write the full post following **ONLY** the brief composed in Phase 2. Do not improvise beyond it, do not reach back into the raw research doc or outline for anything the brief didn't carry forward.

**A needed deviation means the brief was wrong, not that improvisation is permitted.** If, while drafting, something in the brief turns out to be missing, ambiguous, or unworkable: stop drafting, fix the brief artifact first (`saveArtifact` a new `writing_brief` version — append, never edit in place), then resume drafting from the corrected brief. Never silently deviate and never patch the gap only in the draft.

Format: full post markdown, no `# h1`, `##` top-level headings — per the brief's copied-in drafting rules (Phase 2, item 6).

**Persist the draft:**

```javascript
await saveArtifact({ ideaId: state.entityId, kind: 'draft', content: draftContent, meta: { workflowId: state.workflowId } });
```

Log `blog_draft` with `output_summary: 'draft_written'`.

A pipeline run that ends without a `draft` artifact is a failed run — do not close the run at `editing` without it.

Close the run per the Stage Contract's exit transition (`claimStage` to `'editing'`), then report the draft's headline stats (word count, section count, primary keyword placement) to Simon — the row now waits on the `editorial` skill.
