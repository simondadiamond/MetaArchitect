---
name: editorial
description: Use when Simon asks to edit, review, or improve a blog draft or a specific section, when write-post hands off a completed draft for quality control, or when the blog pipeline dispatcher advances a blog_ideas row to the editing stage. Contract - does NOT add new content or change the argument, only improves execution. Do NOT trigger for writing a new post (write-post) or for LinkedIn copy (the shared gate in repurpose/references covers that).
---

## Editorial Loop — Three Passes

**Risk tier: low in chat mode — deliberately exempt.** Read-only there: no DB writes, no external API calls, no state object, no pipeline logging. Chat mode is ONLY the standalone ad-hoc case — Simon hands over draft text with no `blog_ideas` row involved. A write-post run always invokes this skill in pipeline stage mode (the row is real), never the exempt path. **Pipeline stage mode is medium (S + T):** it writes `blog_artifacts` and `pipeline.logs` (still no external API calls) and carries its own state object — see "Pipeline stage mode" below.

Do not skip a pass. Do not batch them. Output discipline: Pass 2's score block is always shown in full; Passes 1 and 3 present a change summary (or diff) and the final text respectively — never re-print the whole draft between passes.

---

## Pipeline stage mode

Triggered when the blog pipeline dispatcher advances a `blog_ideas` row to `'editing'` (or Simon names a specific row). Run the three passes below **unchanged** — this section is only the pipeline entry/exit/logging wrapper around them.

### STATE Init

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

Stages: `load_input → pass_1 → pass_2 → pass_3 → persist`.

### Stage Contract (pipeline mode)

The row must already be at `'editing'` when this skill runs. The `drafting → editing` transition is `blog-draft`'s exit claim — this skill never performs it. Retrying a `failed_editorial` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact, saveArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'editing') throw new Error(`row not at editing (found: ${idea?.stage})`);
```

Any other stage → stop, touch nothing, report the mismatch. Exclusivity is the dispatcher layer's job (single scheduled dispatcher, one row per fire, overlapping fires skipped) — and a double-run is safe anyway because artifacts are append-only. That safety basis matters here in particular: this skill is also invoked manually on a named row, and an overlap with a dispatcher run resolves the same way — the loser's `claimStage` returns `false` and its artifacts are just a redundant extra version.

**Load input:**

```javascript
const draft = await latestArtifact(ideaId, 'draft');
```

Missing `draft` artifact → `setStage(ideaId, 'failed_editorial')` with a clear message ("no draft found — run blog-draft first"); stop. Do not run the passes against nothing.

**Run Passes 1–3 against `draft.content`.**

**Exit — the success transition IS the atomic claim:** persist TWO artifacts first — the revised full text as a new `draft` version, and the Pass 2 score block + Pass 3 repairs summary as `editorial_report` — then `claimStage(ideaId, 'editing', 'optimizing')`:

```javascript
// Carry the input draft's meta forward (same convention as blog-factcheck's repair path):
// downstream consumers read the NEWEST draft version's meta, so producer fields — e.g.
// teardown-generate's { source, teardown_draft_id, blog_slug } — must survive re-versioning.
await saveArtifact({ ideaId: state.entityId, kind: 'draft', content: revisedContent, meta: { ...draft.meta, workflowId: state.workflowId } });
await saveArtifact({ ideaId: state.entityId, kind: 'editorial_report', content: scoreBlockAndRepairsSummary, meta: { workflowId: state.workflowId } });
const claimed = await claimStage(state.entityId, 'editing', 'optimizing');
```

If `claimStage` returns `false`, another run already advanced the row — report that this run's artifacts are a redundant extra version and stop; do NOT `setStage`.

**Failure (including the blocking rule in Pass 3):** re-check the row is still at `'editing'` (`getIdea`), then `setStage(ideaId, 'failed_editorial')` — note the failure stage is `failed_editorial`, **not** `failed_editing`. If it already moved, just report.

Log via `logEntry` from `projects/Content-Engine/tools/supabase.mjs`, `step_name: 'blog_editorial'`, `stage` matching whichever stage failed or `'persist'` on success, `output_summary` naming the flagged dimension(s) on a blocking-rule failure or `'draft_revised'` on success.

---

### PASS 1 — Humanizer

Goal: improve rhythm and remove crutch language without touching the argument or credibility signals.

**What to do:**
- Alternate sentence length — short punchy sentences (under 10 words) following longer explanatory ones. No five consecutive long sentences.
- Remove hedging words: "somewhat", "rather", "quite", "perhaps", "it's worth noting", "it's important to", "one might argue"
- Remove crutch transitions: "Additionally", "Furthermore", "Moreover", "In conclusion", "To summarize", "Moving on to", "It's also worth mentioning"
- Fix passive voice in diagnostic statements: "the error is thrown" → "the agent throws the error"
- Tighten any paragraph over 5 sentences — break or cut

**What NOT to do:**
- Do not soften diagnostic statements
- Do not remove specific technical language (it's credibility, not jargon)
- Do not alter the argument structure

Present a compact summary of what changed (bullets or a diff) — not the full draft.

---

### PASS 2 — Fidelity Check

**Mechanical greps first**: write the draft to a temp file and run `bash scripts/linkedin-gate.sh --blog <file>` (blog mode: prohibitions + AI-tells only; no word-count or link checks, and **em dashes are allowed** — the zero-em-dash rule is LinkedIn-scoped). The spec behind the script is `.claude/skills/repurpose/references/linkedin-gate.md`.

```bash
grep -inE "excited to share|thrilled to announce|game.chang|revolutionary|groundbreaking|transformational|cutting.edge|state.of.the.art|in today's fast|in the age of ai" draft.md   # must be 0 — brand prohibitions
grep -inE "it'?s not [^.]{1,60}, (it'?s|it is)" draft.md   # AI-tell shape — flag every hit; acceptable only as the brand's own plumbing line, used deliberately in body prose — never in the title or opening hook
```

Then score each dimension 0–10. Anything below 7 is flagged for repair.

| # | Dimension | Question to ask |
|---|---|---|
| 1 | **Burned practitioner** | Would someone paged at 2am because their LLM hallucinated a SQL query feel understood? |
| 2 | **Specificity** | Could you replace the failure mode / mechanism / number with a generic placeholder and lose nothing? (If yes → too vague) |
| 3 | **Thesis alignment** | Does the post connect, explicitly or implicitly, to "state beats intelligence"? |
| 4 | **Pillar alignment** | Does it clearly sit in the declared pillar? |
| 5 | **Voice match** | Practitioner-to-practitioner, not guru-to-student? No talked-down-to feeling? |
| 6 | **Prohibition check** | Zero banned phrases per `brand/brand-summary.md` Prohibitions? The grep above catches the fixed strings; judgment catches the rest (hedged thesis, vague lessons without mechanism, passive-voice diagnostics). |
| 7 | **Hook strength** | Would a burned SRE keep reading after the first paragraph — or skim past it? |
| 8 | **CTA alignment** | Does the natural next action at the end of the post match the declared CTA type? |
| 9 | **Stat provenance** | Does every external number, process narrative, or attributed statement trace to a verbatim primary-source sentence whose URL is linked in the draft — scope qualifiers ("more than", "at X itself") intact? (The Ramp 65% passed through editorial unchallenged — lessons.md 2026-07-07.) |

Report the scores:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━
FIDELITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Burned practitioner:  [X]/10
2. Specificity:          [X]/10
3. Thesis alignment:     [X]/10
4. Pillar alignment:     [X]/10
5. Voice match:          [X]/10
6. Prohibition check:    [X]/10
7. Hook strength:        [X]/10
8. CTA alignment:        [X]/10
9. Stat provenance:      [X]/10

FLAGS (scores < 7): [list]
GREP HITS: [none | list line numbers + phrase]
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### PASS 3 — Repair

If any dimension scored below 7, fix it now.

For each flagged dimension, state:
- **What was wrong**
- **What you changed**
- **Why it scores higher now**

If everything scored 7+: declare "Editorial: clean — no repairs needed."

**Blocking rule (all modes):** after repairing, re-score every dimension that was flagged. Any dimension still below 7 after this pass → do not proceed.
- **Pipeline mode:** do not `claimStage` to `'optimizing'`. Instead `setStage(ideaId, 'failed_editorial')` and put the unrepaired dimension(s) — and why — in the log entry's `output_summary`.
- **Chat mode:** tell Simon exactly which dimension is unrepairable and why. Never hand back a draft as finished with an unaddressed score below 7.

Never silent-continue past a dimension that's still below 7.

Present the final post only once every dimension is at 7 or above.
