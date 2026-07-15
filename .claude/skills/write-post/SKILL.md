---
name: write-post
description: Use when Simon asks to write, create, or draft a new blog post for simonparis.ca. Do NOT trigger for editing an existing post (use editorial skill), research-only requests (use research skill), or turning existing content into LinkedIn posts (use repurpose skill).
---

## Write-Post — Interactive Orchestrator

This is the chat entrypoint for a new blog post. It runs the same pipeline the dispatcher runs on `blog_ideas` rows — parse brief → create the row → research → outline (pause) → draft → editorial → optimize → fact-check (pause) → insert — except every stage runs in-session, in this chat, and **Simon's own replies perform the two human-only stage transitions instead of a Command Center click.**

**Invariant: a chat-run post must be indistinguishable in the DB from a dispatcher-run post** — same `blog_ideas` row, same `stage` progression, same `blog_artifacts` rows, same `pipeline.logs` entries. This orchestrator never takes a shortcut that a stage skill itself wouldn't take.

Do not skip the editorial loop, the outline-approval pause, or the final-review pause.

**Risk tier: medium (S + T + E)** — LLM generation + Supabase writes. Full spec: `brand/state-framework.md`. Run all node snippets from `projects/Content-Engine/` (deps + `.env` resolution live there).

**SEO/GEO rules (non-negotiable — canonical here; blog-optimize's metadata gate verifies them):**
1. **Primary keyword** — one 501–2,400 monthly-volume term per post; it appears in the title, the first H2, and naturally in the body.
2. **BLUF** — the core insight, stated as the conclusion (not a preview), in the first 150 words.
3. **Fact-blocks** — every H2 section opens with a bolded 40–50 word standalone statement: the GEO citation unit.
4. **5–7 distinct non-obvious insights** per post — fewer get absorbed by AI summaries, more dilutes. H2/H3 headings phrased as specific technical questions where natural.
5. **Named failure mode** — for `failure_taxonomy` posts, the failure is named precisely and defined on first use.

---

### STEP 0 — STATE Init (S + T)

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,          // set to the blog_ideas row id once Step 2 creates it
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Update `stage` at every transition: `parse_brief → create_row → research → outline_approval → draft → editorial → optimize → fact_check → final_review → insert → complete`.

Log this orchestrator's own writes (row creation, the two human-transition `claimStage` calls) via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` — each stage skill invoked below logs its own LLM/API calls and artifact writes under its own `workflowId`, this state object only covers what the orchestrator itself does:

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'write_post_orchestrator',
  stage: state.stage, output_summary: '<what the orchestrator itself did — row created, stage claimed, etc.>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

On any failure, log it (`status: 'error'`) and report:

```
❌ write-post failed at [stage] — [error message] — [row <id> keeps its artifacts; safe to retry that stage]
```

No lock needed — every write below either goes through a stage skill's own `claimStage` (atomic, retry-safe) or is the one-time row insert in Step 2.

---

### STEP 1 — Parse the Brief

Extract from Simon's message:
- **Topic** — the specific angle, failure mode, or question the post addresses
- **Pillar** — one of the 5 (see table below). If unspecified, pick the best fit and declare it.
- **CTA type** — `audit` or `subscribe`. If unspecified, use the default from the table below.
- **Sources** — any URLs or examples Simon wants included

**Pillar reference:**

| Enum value | Label | Default CTA | When to use |
|---|---|---|---|
| `failure_taxonomy` | Production Failure Taxonomy | `audit` | Naming and classifying LLM failure modes |
| `state_applied` | STATE Framework Applied | `subscribe` | Demonstrating STATE pillars in real decisions |
| `defensive_arch` | Defensive Architecture | `audit` | Design patterns for tolerant systems |
| `meta_layer` | The Meta Layer | `subscribe` | How Simon uses AI to do the work |
| `regulated_law25` | Regulated AI & Law 25 | `audit` | Compliance as architecture requirements |

**CTA logic:**
- `audit` → "Score Your System" card → drives to `/score` (the canonical public lead-capture URL — never point a public CTA at `/readiness`; lessons.md 2026-05-09). Use when the post surfaces a gap — natural next action is self-assessment.
- `subscribe` → inline email form. Use when the post teaches a pattern — natural next action is "get more like this."

Also read Simon's message for the two shortcuts this orchestrator honors:
- **"skip research"** — go straight to outlining using existing knowledge and brand context; no `research` skill run.
- **"just write it, don't ask"** — skip the outline-approval pause (Step 3, stage 2) only. The final-review pause (Step 3, stage 6) never shortcuts — Simon's factcheck go-ahead is always explicit.

---

### STEP 2 — Create the `blog_ideas` Row

Every chat-run post starts as a real pipeline row — this is what makes the rest of the run identical to a dispatcher run.

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });

const { data: idea, error } = await pub.from('blog_ideas').insert({
  title_working: topic,                                  // Step 1's parsed topic/angle
  pillar,                                                 // Step 1's enum value
  post_type: 'article',
  stage: simonSaidSkipResearch ? 'outlining' : 'researching',
  notes: briefSummary,                                    // what Simon actually asked for
  source_links: sourceUrls ?? [],                         // any URLs Simon gave; [] if none
}).select('id, stage').single();
if (error) throw error;
state.entityId = idea.id;
```

Log the write (`step_name: 'write_post_row_created'`, stage `create_row`).

**"skip research" shortcut:** since the row above was created directly at `'outlining'`, `blog-outline` will refuse to run without a `research_doc` artifact (its Phase 1 gate). Satisfy it now, before moving to Step 3:

```javascript
const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
await saveArtifact({
  ideaId: state.entityId, kind: 'research_doc',
  content: "Research skipped on Simon's explicit instruction — no research_doc was produced for this post.",
  meta: { workflowId: state.workflowId, skipped: true },
});
```

---

### STEP 3 — Run the Stage Skills, In Sequence

Each stage below runs by **reading that skill's own `SKILL.md` and following it** — this file only sequences them and performs the two human-only transitions chat replaces. Every stage skill runs in its full pipeline mode (its own STATE object, its own `blog_artifacts` writes, its own `claimStage`) — never a lightweight or improvised version of it.

1. **Research** (skipped if Step 2 took the "skip research" branch) — run the `research` skill on the row. Pass the topic and any sources from Step 1. It persists `research_doc` and claims `researching → outlining` itself.

2. **Outline** — run the `blog-outline` skill on the row. It persists `outline` and claims `outlining → awaiting_outline_approval` itself.
   - **Pause for approval.** Print the outline in chat and wait for Simon's reply. His reply IS the human transition — on his approval, perform the claim yourself (no other caller will):
     ```javascript
     const { claimStage } = await import('./tools/blog-artifacts.mjs');
     await claimStage(state.entityId, 'awaiting_outline_approval', 'drafting');
     ```
   - **"just write it, don't ask" shortcut:** skip the pause — immediately after the outline persists, perform the same `claimStage` call yourself, and note in your next message that Simon pre-approved so nothing waited on him seeing the outline first.

3. **Draft** — run the `blog-draft` skill on the row. It persists `writing_brief` then `draft` and claims `drafting → editing` itself.

4. **Editorial** — run the `editorial` skill on the row (pipeline stage mode — the row is real, this is not the chat-only exempt path). It persists a revised `draft` version plus `editorial_report` and claims `editing → optimizing` itself.

5. **Optimize** — run the `blog-optimize` skill on the row. It persists `optimized_draft` and claims `optimizing → fact_check` itself.

6. **Fact-check** — run the `blog-factcheck` skill on the row. It persists `factcheck_report` and, on an all-PASS verdict, claims `fact_check → awaiting_final_review` itself.
   - **Pause for final review.** Present the verdict table and where the post stands (metadata chosen, links inserted, any `skipped_optimizations`). Wait for Simon's go-ahead — this pause is never shortcut, even under "just write it, don't ask." On his go, perform the claim yourself:
     ```javascript
     await claimStage(state.entityId, 'awaiting_final_review', 'inserting');
     ```

7. **Insert** — run the `blog-insert` skill on the row. It generates and gates the LinkedIn extract, inserts the `blog_posts` row, and claims `inserting → promoted_to_post` itself. Its own report format (title, pillar, CTA, word/read-time, slug, preview URL, Supabase link, publish SQL, LinkedIn-extract confirmation, notes) is the final report to Simon — read `.claude/skills/blog-insert/SKILL.md` Phase 5 and print exactly that.

---

### Failure Mid-Sequence

If any stage skill ends at its own `failed_<stage>` (via its own error path — never re-implement that here): stop the sequence and tell Simon:
- which stage failed and the stage skill's own error message
- that every artifact already persisted by earlier stages is untouched — nothing is lost
- that the row can resume via retry, in Command Center or by asking in this chat — the dispatcher/CC retry action resets `failed_<stage>` back to the stage it failed at, and re-invoking that stage skill from Step 3 above picks up from there (each stage skill's own Resume check decides whether to reuse or redo its prior partial work)

Never re-run an earlier stage "to start clean" after a downstream failure — a `failed_<stage>` row is retry-safe exactly at the stage it failed, and every artifact is append-only.
