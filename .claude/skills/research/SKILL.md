---
name: research
description: Use when Simon asks to research a topic for The Meta Architect blog, when write-post needs research for a new post, or when Simon wants angles/hooks without committing to a full draft. Do NOT trigger for writing the post itself (write-post), editing a draft (editorial), or finding teardown candidates (teardown-research).
---

## Research Process

**Risk tier: low (S + T)** — external API calls (NotebookLM), no pipeline writes except `pipeline.logs`. On any failure:

```
❌ research failed at [stage] — [error message] — nothing written except logs, safe to retry
```

### STEP 0 — STATE Init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,          // stays null for standalone research; set it if a pipeline row triggered this
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Stages: `nlm_research → context_pull → summary`. Log every NLM query via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there):

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'nlm_query',
  stage: 'nlm_research', output_summary: '<question> → <answer length> chars, <n> sources',
  model_version: 'notebooklm', status: 'success' });
```

---

### PHASE 1 — NotebookLM Deep Dive

The interface is the **`notebooklm-mcp` MCP tools** — there is no `notebooklm` skill. Auth errors → run `nlm login` via Bash, then retry.

Setup: `notebook_create` named `[topic] — Blog Research [YYYY-MM-DD]` (today's date), then `source_add` for any sources Simon provided.

The NLM research flow is **four steps — all four required** (lessons.md 2026-04-05: the first two alone return source metadata and an EMPTY report, never synthesized text):

1. `research_start` — pass a **REAL descriptive `title` string, never null**. The schema says title defaults to null; the server rejects null (lessons.md 2026-04-13 — error messages are ground truth, schema defaults are hints).
2. Poll `research_status` until complete — this yields only the discovered source list.
3. `research_import` — add the discovered sources to the notebook.
4. `notebook_query` — synthesis happens HERE. A finding exists only once `notebook_query` returns a non-empty answer.

**Session-verified rule (lessons.md 2026-03-17):** a finding counts only if produced by a live NLM or web call in THIS session. Never carry findings forward from compacted context — if the session compacted mid-research, re-run the queries before anything flows downstream.

Query with practitioner-angle questions:

1. **Failure modes** — What are the concrete, specific ways this breaks in production? Not theoretical — what actually goes wrong?
2. **The common wrong assumption** — What do most engineers believe about this that turns out to be false or incomplete?
3. **The reframe** — What's the architecture insight that changes how you'd approach this?
4. **STATE connection** — Which pillar of STATE does this connect to (Structured / Traceable / Auditable / Tolerant / Explicit)? How?
5. **Production specifics** — Any real incidents, patterns, or mechanisms that anchor this in production reality?
6. **Regulatory angle** — Does this touch Law 25, OSFI, or EU AI Act? If so, how?

Capture the answers and tier every finding.

**Evidence tiers — THE canonical definition. Downstream skills (write-post) point here; do not restate it elsewhere:**

- **T1** — named entity + specific metric + primary source. A T1 finding MUST carry (a) the **verbatim source sentence**, quoted exactly, and (b) the **primary source URL** — both fetched live this session. Scope qualifiers ("more than", "at Ramp itself", "since deployment") are part of the finding — record them verbatim. **Only T1-anchored numbers may appear as stats in downstream drafts.**
- **T2** — named failure pattern + mechanism → usable as a primary claim (no numbers).
- **T3** — general principle with specificity → supporting color only.
- **T4** — inference → never cite as fact. Conclusions drawn from a source's *silence* are the author's — never attribute them to the source.

---

### PHASE 2 — Supabase Context Pull

Run from `projects/Content-Engine/`. Pipeline tables go through `tools/supabase.mjs` — column registry: `projects/Content-Engine/.claude/skills/supabase.md`. Pull topic-relevant rows, not an unordered dump:

```javascript
const { getRecords, TABLES } = await import('./tools/supabase.mjs');
const topicTerms = topic.toLowerCase().split(/\W+/).filter(w => w.length > 3);

// Humanity snippets (pipeline.humanity_snippets = TABLES.SNIPPETS) — rank by topic overlap, prefer least-used
const snippets = await getRecords(TABLES.SNIPPETS, null,
  { fields: ['id','snippet_text','tags','used_count'], limit: 50 });
const relevantSnippets = snippets
  .map(s => ({ ...s, hits: [...(s.tags ?? []), ...s.snippet_text.toLowerCase().split(/\W+/)]
      .filter(t => topicTerms.includes(String(t).toLowerCase())).length }))
  .filter(s => s.hits > 0)
  .sort((a, b) => b.hits - a.hits || (a.used_count ?? 0) - (b.used_count ?? 0))
  .slice(0, 10);

// Hook library (pipeline.hooks_library = TABLES.HOOKS) — proven/candidate, best scores first.
// Starting points only — never copy verbatim.
const hooks = await getRecords(TABLES.HOOKS, { status: ['proven', 'candidate'] },
  { fields: ['hook_text','hook_type','status','avg_score','intent'],
    limit: 20, orderBy: { col: 'avg_score', dir: 'desc' } });
```

Website blog posts live in **`public.blog_posts`** — NOT the pipeline schema. (`TABLES.BLOG_POSTS` = `pipeline.blog_posts` is unwired Plan 5 prep — do not read it.) Use a one-off public-schema client, the exact pattern from `repurpose` Step 2:

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
// Overlap check: recent posts + anything matching the topic keyword
const { data: recent } = await pub.from('blog_posts')
  .select('slug, title, pillar, status')
  .order('created_at', { ascending: false }).limit(20);
const { data: adjacent } = await pub.from('blog_posts')
  .select('slug, title, pillar, status')
  .ilike('title', `%${topicKeyword}%`);
```

---

### PHASE 3 — Research Summary

Produce a structured summary:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESEARCH SUMMARY: [topic]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CORE INSIGHT:
[The one sentence that changes how you'd architect this. Must connect to STATE.]

KEY FAILURE MODES (with evidence tiers):
  T1: [finding] — "[verbatim source sentence]" — [primary URL]
  T2: [specific failure mode + mechanism]
  T3: [supporting context]

THE WRONG ASSUMPTION MOST ENGINEERS MAKE:
[What they believe and why it fails]

ANGLES (3 post directions this research supports):
  1. [angle] — best pillar: [pillar]
  2. [angle] — best pillar: [pillar]
  3. [angle] — best pillar: [pillar]

HOOK CANDIDATES:
  [hook type]: [2-3 sentence opener]
  [hook type]: [2-3 sentence opener]

HUMANITY SNIPPET THAT FITS:
  [quote or "none found"]

EXISTING POSTS TO NOT OVERLAP:
  [slug] — [why it's adjacent]

EVIDENCE GAPS (things to flag if used):
  [any T3/T4 findings that need a caveat, any number that failed to reach T1]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Every T1 line carries its verbatim sentence + URL — a T1 entry without both is a T3 entry mislabeled.

If this research was triggered by `write-post`, hand the summary back to that skill's Step 3 (Outline). If it was a standalone request, present the summary to Simon and wait for direction.
