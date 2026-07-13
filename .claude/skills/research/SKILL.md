---
name: research
description: Use when Simon asks to research a topic for The Meta Architect blog, when write-post needs research for a new post, or when Simon wants angles/hooks without committing to a full draft — every run persists a durable research doc. Do NOT trigger for writing the post itself (write-post), editing a draft (editorial), or finding teardown candidates (teardown-research).
---

## Research Process

**Risk tier: medium (S + T + E)** — external API calls (NotebookLM, DataForSEO, WebSearch) plus Supabase writes (`blog_ideas` stage, `blog_artifacts`) in pipeline mode. On any failure:

```
❌ research failed at [stage] — [error message] — [pipeline mode: row set to failed_researching, safe to retry | standalone mode: nothing written, safe to retry]
```

### Modes

- **Pipeline mode** — a `blog_ideas` row id arrives from the dispatcher or write-post, already at stage `'researching'` (see Stage Contract). The research doc is persisted as a `research_doc` artifact on that row.
- **Standalone mode** — no row. If Simon confirms the topic is headed for a post, create a `blog_ideas` row (`title_working`, best-fit `pillar`, `post_type:'article'`, `stage:'researching'`) and continue as pipeline mode from there. Otherwise write the doc to `docs/research/YYYY-MM-DD-<topic>.md` (kebab-case topic slug) and commit it — **a chat summary alone is no longer an allowed terminal state.**

### STEP 0 — STATE Init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: null,          // set to the blog_ideas row id once known (passed in, claimed, or just-created)
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Stages: `nlm_research → serp_grounding → keyword_volumes → context_pull → persist`. Log every NLM query via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (run node snippets from `projects/Content-Engine/` — deps + `.env` resolve there):

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'nlm_query',
  stage: 'nlm_research', output_summary: '<question> → <answer length> chars, <n> sources',
  model_version: 'notebooklm', status: 'success' });
```

---

### PHASE 1 — NotebookLM Deep Dive

The interface is the **`notebooklm-mcp` MCP tools** — there is no `notebooklm` skill. Auth errors → run `nlm login` via Bash, then retry.

Setup: `notebook_create` named `[topic] — Blog Research [YYYY-MM-DD]` (today's date) — **capture the returned notebook id as `notebook_id`** (Phase 3 writes it into the artifact meta) — then `source_add` for any sources Simon provided.

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

Capture the answers and tier every finding. From the findings + topic, also draft **3–5 candidate primary keywords** (specific technical terms, not generic) — Phases 1b and 1c ground these in real SERP and volume data before they reach the doc.

**Evidence tiers — THE canonical definition. Downstream skills (write-post) point here; do not restate it elsewhere:**

- **T1** — named entity + specific metric + primary source. A T1 finding MUST carry (a) the **verbatim source sentence**, quoted exactly, and (b) the **primary source URL** — both fetched live this session. Scope qualifiers ("more than", "at Ramp itself", "since deployment") are part of the finding — record them verbatim. **Only T1-anchored numbers may appear as stats in downstream drafts.**
- **T2** — named failure pattern + mechanism → usable as a primary claim (no numbers).
- **T3** — general principle with specificity → supporting color only.
- **T4** — inference → never cite as fact. Conclusions drawn from a source's *silence* are the author's — never attribute them to the source.

---

### PHASE 1b — SERP Grounding

For the **top 1–3** keyword candidates, WebSearch what currently ranks. For each result, record: title, URL, one-line angle summary — verbatim into `## SERP Snapshot`. This is the information-gain baseline blog-outline uses to prove the post adds something new.

A missing snapshot is a **gate failure for pipeline runs** — do not persist a pipeline `research_doc` without it. Standalone chat research may skip this with an explicit note in the doc instead.

---

### PHASE 1c — Keyword Volumes

Never block on failure — `keywordVolumes` is contract-guaranteed to never throw.

```javascript
const { keywordVolumes } = await import('./tools/dataforseo.mjs');
const candidates = ['keyword one', 'keyword two', 'keyword three'];
const { ok, volumes, error } = await keywordVolumes(candidates);
const primary_keyword_candidates = candidates.map(keyword => {
  const v = ok ? volumes[keyword] : null;
  return { keyword, volume: v, verified: v != null };
});
```

Record each candidate into `## Keyword Candidates` as `keyword — volume N (verified)` or `keyword — volume unverified (<error>)`. The same array, verbatim, is what goes into the artifact `meta.primary_keyword_candidates`.

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

### PHASE 3 — Persist the Research Doc

Build the markdown body with these **exact section headings, in this order**:

```
## Core Insight
[The one sentence that changes how you'd architect this. Must connect to STATE.]

## Evidence (tiered)
T1: [finding] — "[verbatim source sentence]" — [primary URL]
T2: [specific failure mode + mechanism]
T3: [supporting context]

## SERP Snapshot
[title] — [URL] — [one-line angle summary]
[...one row per Phase 1b result, or "skipped — standalone run" with a reason]

## Keyword Candidates
[keyword] — volume [N] (verified)
[keyword] — volume unverified ([error])

## Wrong Assumption
[What most engineers believe about this and why it fails]

## Angles
1. [angle] — best pillar: [pillar]
2. [angle] — best pillar: [pillar]
3. [angle] — best pillar: [pillar]

## Hook Candidates
[hook type]: [2-3 sentence opener]
[hook type]: [2-3 sentence opener]

## Humanity Snippet
[quote or "none found"]

## Overlap Check
[slug] — [why it's adjacent]

## Evidence Gaps
[any T3/T4 findings that need a caveat, any number that failed to reach T1]
```

Every T1 line carries its verbatim sentence + URL — a T1 entry without both is a T3 entry mislabeled.

**Persist it** — write via `saveArtifact`, never leave it only in chat:

```javascript
const { saveArtifact } = await import('./tools/blog-artifacts.mjs');
const meta = {
  workflowId: state.workflowId,
  primary_keyword_candidates,   // from Phase 1c, verbatim
  notebook_id,                  // the NLM notebook id from Phase 1 setup
};
await saveArtifact({ ideaId: state.entityId, kind: 'research_doc', content, meta });
```

**Rule: a pipeline research run that ends without a `research_doc` artifact is a failed run.** If persistence fails, or an upstream gate failed (missing SERP snapshot in pipeline mode), do not fabricate a partial doc — set the row to `failed_researching` and stop.

**Standalone, no-post-intended path:** write `content` to `docs/research/YYYY-MM-DD-<topic>.md` and commit it (`git add` + `git commit`) — this replaces the old chat-only summary as the terminal state for exploratory research.

---

### Stage Contract (pipeline mode)

The row must already be at `'researching'` when this skill runs. `candidate → researching` is a **human-only** transition (Simon, via CC or by asking directly) — this skill never performs it. Retrying a `failed_*` row is the dispatcher/CC retry action's job: it resets the stage BEFORE this skill is invoked; this skill never resets it either.

**Entry — verify, don't lock:**

```javascript
const { getIdea, claimStage, setStage, latestArtifact } = await import('./tools/blog-artifacts.mjs');
const idea = await getIdea(ideaId);
if (!idea || idea.stage !== 'researching') throw new Error(`row not at researching (found: ${idea?.stage})`);
```

Any other stage (`candidate`, `failed_researching`, anything) → stop, touch nothing, report the mismatch. Exclusivity is the dispatcher layer's job (single scheduled dispatcher, one row per fire, overlapping fires skipped) — and a double-run is safe anyway because artifacts are append-only.

**Resume check (Tolerant):** after verifying, `latestArtifact(ideaId, 'research_doc')` — if a doc exists from a prior partial run, review and extend it (re-verify anything stale per the session-verified rule) instead of blindly redoing all the NLM/SERP/volume work.

**Exit — the success transition IS the atomic claim:** after persisting the artifact, `claimStage(ideaId, 'researching', 'outlining')`. If it returns `false`, another run already advanced the row — report that this run's artifact is a redundant extra version and stop; do NOT `setStage`. This skill handles **article** rows only (`post_type:'article'`); teardown research uses `teardown-generate`'s own path.

**Failure:** re-check the row is still at `'researching'` (`getIdea`), then `setStage(ideaId, 'failed_researching')`; if it already moved, just report.

Log the run via `logEntry` with `step_name: 'blog_research'`, `stage` matching whichever phase failed or `'persist'` on success.

---

If this research was triggered by `write-post`, hand the persisted artifact (its content, following the section headings above) back to that skill's Step 3 (Outline). If it was a standalone request, present the doc to Simon and wait for direction.
