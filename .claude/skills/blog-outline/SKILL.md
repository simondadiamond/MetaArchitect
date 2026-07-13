---
name: blog-outline
description: Use when the blog pipeline dispatcher advances a blog_ideas row to the outlining stage, or when Simon asks to outline a researched pipeline post — consumes the research_doc artifact and produces the outline artifact. Do NOT trigger for research (research) or for drafting the post (blog-draft).
---

## Blog Outline Process

**Risk tier: medium (S + T + E)** — Supabase reads/writes (`blog_ideas` stage, `blog_artifacts`, public `blog_posts` link map) in pipeline mode only; no LLM external API calls beyond the reasoning done in this session. On any failure:

```
❌ blog-outline failed at [stage] — [error message] — row set to failed_outlining, safe to retry
```

This skill handles **article** rows only (`post_type:'article'`) — teardown rows follow `teardown-generate`'s own path and never reach the `outlining` stage.

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

Stages: `load_inputs → information_gain → link_plan → persist`. Log via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there), `step_name: 'blog_outline'`, `stage` matching whichever phase failed or `'persist'` on success.

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'blog_outline',
  stage: state.stage, output_summary: '<what was produced>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

---

### Stage Contract (pipeline mode)

The row must already be at `'outlining'` when this skill runs — `research` sets it there itself, atomically, on its own success (`claimStage(ideaId, 'researching', 'outlining')`), so no human step precedes this skill's entry. The transition this skill's own exit feeds — `awaiting_outline_approval → drafting` — IS **human-only** (Simon, via CC or by asking directly); this skill never performs it, only produces the artifact the human approves. Retrying a `failed_outlining` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'outlining') throw new Error(`row not at outlining (found: ${idea?.stage})`);
```

Any other stage (`researching`, `failed_outlining`, anything) → stop, touch nothing, report the mismatch. Exclusivity is the dispatcher layer's job (single scheduled dispatcher, one row per fire, overlapping fires skipped) — and a double-run is safe anyway because artifacts are append-only.

**Resume check (Tolerant):** after verifying, `latestArtifact(ideaId, 'outline')` — if an outline already exists from a prior partial run, review and extend it (re-check the link map and information-gain claim are still current) rather than blindly redoing the whole outline from scratch.

**Exit — the success transition IS the atomic claim:** after persisting the artifact, `claimStage(ideaId, 'outlining', 'awaiting_outline_approval')`. If it returns `false`, another run already advanced the row — report that this run's artifact is a redundant extra version and stop; do NOT `setStage`.

**Failure:** re-check the row is still at `'outlining'` (`getIdea`), then `setStage(ideaId, 'failed_outlining')`; if it already moved, just report.

---

### PHASE 1 — Load Inputs

```javascript
const research = await latestArtifact(ideaId, 'research_doc');
```

Missing `research_doc` → `failed_outlining` with reason "no research_doc found — run research first"; stop.

The research doc's `## SERP Snapshot` section is the input the INFORMATION GAIN section is graded against — read it before drafting anything.

---

### PHASE 2 — Link Map Query

Website blog posts live in **`public.blog_posts`**, not the pipeline schema. Use a one-off public-schema client — the exact pattern from `research` SKILL.md Phase 2:

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
const { data: linkMap } = await pub.from('blog_posts')
  .select('slug, title, pillar, post_type').eq('status', 'published');
```

`linkMap` is the **only** source of slugs the INTERNAL LINK PLAN may cite.

---

### PHASE 3 — Build the Outline

<!-- task-12 note: when write-post is rewritten as orchestrator, move the Step 3 template here and flip the pointer -->

**Template**: the outline template is write-post Step 3 — read `.claude/skills/write-post/SKILL.md` Step 3 and produce exactly that block (pillar, CTA, title options, working slug, primary keyword, named failure mode, hook, thesis, BLUF, fact-block argument structure, insight count, evidence planned, humanity snippet, code block, estimate). Do not restate or paraphrase the template here — read it fresh each run so drift in write-post is inherited, not duplicated.

Then append these **two new sections**, in this order, after the write-post Step 3 block:

```
INFORMATION GAIN:
[2-4 sentences]

INTERNAL LINK PLAN:
[anchor text] → /blog/<slug> — why here
[anchor text] → /blog/<slug> — why here
```

**INFORMATION GAIN rule:** 2–4 sentences naming what this post adds that NONE of the research doc's SERP Snapshot results have. If the honest answer is "nothing", the outline FAILS: set `failed_outlining` with reason "no information gain vs current SERP" — do not manufacture a fake differentiator.

**INTERNAL LINK PLAN rule:** 2–5 planned links per 1,000 estimated words (use the same word estimate as the template's `ESTIMATED` line), each line `[anchor text] → /blog/<slug> — why here`, drawn only from the `linkMap` query results (published posts). Fewer than 2 published posts exist → plan what's plannable and note the shortage in the same section; never invent slugs.

---

### PHASE 4 — Persist

```javascript
const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
const meta = {
  workflowId: state.workflowId,
  primary_keyword,     // the PRIMARY KEYWORD chosen in the template
  title_options,        // the TITLE OPTIONS array chosen in the template
  working_slug,          // the WORKING SLUG chosen in the template
};
await saveArtifact({ ideaId: state.entityId, kind: 'outline', content, meta });
```

**Rule: a pipeline outline run that ends without an `outline` artifact is a failed run.** If persistence fails, or the INFORMATION GAIN gate failed, do not fabricate a partial outline — set the row to `failed_outlining` and stop.

Close the run per the Stage Contract's exit transition (`claimStage` to `'awaiting_outline_approval'`), then print the outline in chat for Simon — the row now waits on his human approval before drafting can begin.
