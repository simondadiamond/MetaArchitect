# Blog Masterpiece Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stage-driven blog pipeline (articles + teardowns) on `blog_ideas`, skill per stage, durable artifact per stage, gated insert into `blog_posts` — per the approved spec `docs/superpowers/specs/2026-07-13-blog-masterpiece-design.md`.

**Architecture:** Skills do all generation in Claude Code sessions; a `stage` column on `public.blog_ideas` drives dispatch; every stage persists an append-only `public.blog_artifacts` row; CC/website UI ships separately via the story pipeline.

**Tech Stack:** Claude Code skills (markdown), Node ESM tools in `projects/Content-Engine/tools/` (`@supabase/supabase-js` already a dependency there), Supabase (public schema for blog tables, `pipeline.logs` for tracing), DataForSEO REST (Basic auth), `gh` CLI.

## Global Constraints

- **Repos:** skills/tools/docs → MetaArchitect (commit to `main`, push via gh). Migration file → `simonparis-website` repo **via worktree + PR** (primary checkout is hook-protected; never mutate it). No command-center code in this plan — that's stories.
- **Stage names (canonical, exact):** `candidate, researching, outlining, awaiting_outline_approval, drafting, editing, optimizing, fact_check, awaiting_final_review, inserting, promoted_to_post`, failures `failed_<stage>` (e.g. `failed_editorial`). A row's `stage` means "this work is needed next". Teardowns skip `outlining` and `awaiting_outline_approval` (drafting follows researching).
- **Machine stages (dispatcher may act):** `researching, outlining, drafting, editing, optimizing, fact_check, inserting`. Human stages (only Simon advances): `candidate, awaiting_outline_approval, awaiting_final_review`, all `failed_*`.
- **Artifact kinds (exact):** `research_doc, outline, writing_brief, draft, editorial_report, optimized_draft, factcheck_report`. Append-only; newest per kind is current.
- **Logging:** every LLM stage and DB write logs via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` with `step_name` = `blog_research | blog_outline | blog_draft | blog_editorial | blog_optimize | blog_factcheck | blog_insert | blog_dispatch`. Run all node snippets from `projects/Content-Engine/` (deps + `.env` resolve there).
- **STATE:** every skill is medium tier (state object per `brand/state-framework.md`, log every call, validate before write). Error format: `❌ [skill] failed at [stage] — [msg] — [what was/wasn't written], safe to retry`.
- **Brand:** posts must pass the brand bar (editorial fidelity ≥7 blocking; `bash scripts/linkedin-gate.sh --blog <file>` on any added prose; voice vetoes SEO). Public CTAs → `/score`, never `/readiness`. No h1 in body markdown. `status='draft'` only — never publish.
- **Skill hygiene:** after creating/editing any `.claude/skills/**` file, run `bash scripts/skill-lint.sh` and fix findings before committing (estate convention).
- **Supabase:** blog tables are **public schema**; use the one-off public client pattern (see Task 2 code). DDL via Management API (token `~/.supabase/access-token`, project `ashwrqkoijzvakdmfskj`, `User-Agent` workaround per `.claude/skills/_shared/supabase-access.md`). Large row writes NEVER via Management API (WAF) — always supabase-js.
- **Commits:** frequent, conventional (`feat(blog): …`), each ends with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Additive migration — stage/post_type/capture_id + blog_artifacts

**Files:**
- Create (in a simonparis-website worktree): `supabase/migrations/0002_blog_pipeline.sql`

**Interfaces:**
- Produces: columns `blog_ideas.stage/post_type/capture_id`, table `public.blog_artifacts`, column `blog_posts.post_type` — every later task depends on these existing in the live DB.

- [ ] **Step 1: Create worktree** (primary checkout is hook-protected)

```bash
cd ~/projects/MetaArchitect/projects/simonparis-website
git worktree add /tmp/claude-1000/-home-diamond-projects-MetaArchitect/218c6d34-14bd-49d7-880a-dced0954ec12/scratchpad/spw-blog-pipeline -b feat/blog-pipeline-migration
```

- [ ] **Step 2: Write the migration** (idempotent, additive only)

`supabase/migrations/0002_blog_pipeline.sql`:

```sql
-- Blog masterpiece pipeline (spec 2026-07-13): stage-driven queue + artifacts.
alter table public.blog_ideas add column if not exists stage text not null default 'candidate';
alter table public.blog_ideas add column if not exists post_type text not null default 'article';
alter table public.blog_ideas add column if not exists capture_id uuid;

do $$ begin
  alter table public.blog_ideas add constraint blog_ideas_post_type_check
    check (post_type in ('article','teardown'));
exception when duplicate_object then null; end $$;

create table if not exists public.blog_artifacts (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.blog_ideas(id) on delete cascade,
  kind text not null check (kind in ('research_doc','outline','writing_brief','draft','editorial_report','optimized_draft','factcheck_report')),
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists blog_artifacts_idea_kind_idx
  on public.blog_artifacts (idea_id, kind, created_at desc);
alter table public.blog_artifacts enable row level security;
-- no anon/authenticated policies: service-role only, like pipeline internals

alter table public.blog_posts add column if not exists post_type text not null default 'article';
do $$ begin
  alter table public.blog_posts add constraint blog_posts_post_type_check
    check (post_type in ('article','teardown'));
exception when duplicate_object then null; end $$;
create index if not exists blog_ideas_stage_idx on public.blog_ideas (stage, updated_at);
```

- [ ] **Step 3: Apply via Management API and verify it fails-then-passes**

Apply per `.claude/skills/_shared/supabase-access.md` (read it; token `~/.supabase/access-token`, project `ashwrqkoijzvakdmfskj`). Then verify:

```sql
select column_name from information_schema.columns
 where table_schema='public' and table_name='blog_ideas'
   and column_name in ('stage','post_type','capture_id');            -- expect 3 rows
select count(*) from public.blog_artifacts;                          -- expect 0
select column_name from information_schema.columns
 where table_schema='public' and table_name='blog_posts' and column_name='post_type'; -- 1 row
```

- [ ] **Step 4: Commit, PR, merge** (Simon's standing rule: merge own PRs once green)

```bash
cd <worktree> && git add supabase/migrations/0002_blog_pipeline.sql
git commit -m "feat(blog): pipeline migration — stage/post_type/capture_id + blog_artifacts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin feat/blog-pipeline-migration
gh pr create --title "feat(blog): pipeline migration (additive)" --body "Additive DDL for the blog masterpiece pipeline. Already applied to live DB via Management API; this records it. Spec: MetaArchitect docs/superpowers/specs/2026-07-13-blog-masterpiece-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr merge --squash --auto
git worktree remove <worktree-path>   # after merge
```

---

### Task 2: `blog-artifacts.mjs` — artifact + stage helper

**Files:**
- Create: `projects/Content-Engine/tools/blog-artifacts.mjs`

**Interfaces:**
- Produces (exact signatures, consumed by every stage skill and the dispatcher):

```javascript
export async function getIdea(ideaId)                      // → blog_ideas row or null
export async function saveArtifact({ ideaId, kind, content, meta = {} }) // → artifact id (uuid)
export async function latestArtifact(ideaId, kind)         // → {id, content, meta, created_at} | null
export async function setStage(ideaId, stage)              // unconditional update
export async function claimStage(ideaId, fromStage, toStage) // conditional; → true iff row moved
export async function listActionable(limit = 10)           // rows whose stage ∈ MACHINE_STAGES, oldest updated_at first
export const MACHINE_STAGES                                 // ['researching','outlining','drafting','editing','optimizing','fact_check','inserting']
```

- [ ] **Step 1: Write the tool** (public-schema client; validates kind/stage against the canonical lists; `claimStage` uses `.update(...).eq('id',id).eq('stage',from).select()` and returns `data.length===1` — this is the dispatcher's concurrency lock)

```javascript
// tools/blog-artifacts.mjs — blog pipeline artifacts + stage transitions (public schema).
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export const MACHINE_STAGES = ['researching','outlining','drafting','editing','optimizing','fact_check','inserting'];
const STAGES = ['candidate', ...MACHINE_STAGES, 'awaiting_outline_approval','awaiting_final_review','promoted_to_post'];
const KINDS = ['research_doc','outline','writing_brief','draft','editorial_report','optimized_draft','factcheck_report'];

const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });

const okStage = s => STAGES.includes(s) || /^failed_[a-z_]+$/.test(s);

export async function getIdea(ideaId) {
  const { data, error } = await pub.from('blog_ideas').select('*').eq('id', ideaId).maybeSingle();
  if (error) throw error; return data;
}
export async function saveArtifact({ ideaId, kind, content, meta = {} }) {
  if (!KINDS.includes(kind)) throw new Error(`invalid artifact kind: ${kind}`);
  if (!content?.trim()) throw new Error('artifact content is empty');
  const { data, error } = await pub.from('blog_artifacts')
    .insert({ idea_id: ideaId, kind, content, meta }).select('id').single();
  if (error) throw error; return data.id;
}
export async function latestArtifact(ideaId, kind) {
  const { data, error } = await pub.from('blog_artifacts')
    .select('id, content, meta, created_at').eq('idea_id', ideaId).eq('kind', kind)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error; return data;
}
export async function setStage(ideaId, stage) {
  if (!okStage(stage)) throw new Error(`invalid stage: ${stage}`);
  const { error } = await pub.from('blog_ideas')
    .update({ stage, updated_at: new Date().toISOString() }).eq('id', ideaId);
  if (error) throw error;
}
export async function claimStage(ideaId, fromStage, toStage) {
  if (!okStage(toStage)) throw new Error(`invalid stage: ${toStage}`);
  const { data, error } = await pub.from('blog_ideas')
    .update({ stage: toStage, updated_at: new Date().toISOString() })
    .eq('id', ideaId).eq('stage', fromStage).select('id');
  if (error) throw error; return (data ?? []).length === 1;
}
export async function listActionable(limit = 10) {
  const { data, error } = await pub.from('blog_ideas')
    .select('id, title_working, pillar, post_type, stage, updated_at')
    .in('stage', MACHINE_STAGES).order('updated_at', { ascending: true }).limit(limit);
  if (error) throw error; return data ?? [];
}
```

(If `dotenv` isn't already a Content-Engine dependency, replicate whatever env-loading pattern `tools/supabase.mjs` uses instead — match the existing convention, don't add a dependency.)

- [ ] **Step 2: Add `--self-test`** (red/green, appended to the same file): creates a throwaway `blog_ideas` row (`title_working: 'SELF-TEST — delete me'`), asserts: invalid kind throws; save+latest round-trips; `claimStage(id,'candidate','researching')` → true; repeat same claim → false (already moved); `setStage` invalid stage throws; then deletes the row (cascade removes artifacts) and prints `SELF-TEST PASS`.

- [ ] **Step 3: Run it**

```bash
cd projects/Content-Engine && node tools/blog-artifacts.mjs --self-test
```
Expected: `SELF-TEST PASS`, exit 0.

- [ ] **Step 4: Commit**

---

### Task 3: `dataforseo.mjs` — keyword volume lookup (graceful degrade)

**Files:**
- Create: `projects/Content-Engine/tools/dataforseo.mjs`

**Interfaces:**
- Produces: `export async function keywordVolumes(keywords, opts?)` → `{ ok: true, volumes: {kw: number|null} } | { ok: false, error: string }` — **never throws** (spec: API failure must not block a run).

- [ ] **Step 1: Write the tool**

```javascript
// tools/dataforseo.mjs — keyword search volumes via DataForSEO (Basic auth from .env).
// Contract: NEVER throws — pipeline degrades to "unverified" on any failure.
import 'dotenv/config';

export async function keywordVolumes(keywords, { locationCode = 2124, languageCode = 'en' } = {}) {
  const login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return { ok: false, error: 'DATAFORSEO_LOGIN/PASSWORD not set' };
  try {
    const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ keywords, location_code: locationCode, language_code: languageCode }]),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    const items = json?.tasks?.[0]?.result ?? [];
    const volumes = Object.fromEntries(keywords.map(k => [k, null]));
    for (const it of items) if (it?.keyword in volumes) volumes[it.keyword] = it.search_volume ?? null;
    return { ok: true, volumes };
  } catch (e) { return { ok: false, error: String(e?.message ?? e) }; }
}

if (process.argv[1]?.endsWith('dataforseo.mjs')) {
  const kws = process.argv.slice(2);
  if (!kws.length) { console.error('usage: node tools/dataforseo.mjs <keyword> [...]'); process.exit(2); }
  const r = await keywordVolumes(kws);
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1);
}
```

- [ ] **Step 2: Live smoke test**

```bash
cd projects/Content-Engine && node tools/dataforseo.mjs "llm observability" "ai agent monitoring"
```
Expected: `ok: true` with integer or null volumes (creds verified live 2026-07-13). Also test degrade: `DATAFORSEO_PASSWORD=wrong node tools/dataforseo.mjs "x"` → `ok: false, error: "HTTP 401"`, exit 1, no throw.

- [ ] **Step 3: Commit**

---

### Task 4: Upgrade the `research` skill — durable research doc

**Files:**
- Modify: `.claude/skills/research/SKILL.md`

**Interfaces:**
- Consumes: `saveArtifact/latestArtifact/getIdea` (Task 2), `keywordVolumes` (Task 3).
- Produces: a `research_doc` artifact whose markdown body every later stage consumes. Sections (exact headings): `## Core Insight`, `## Evidence (tiered)`, `## SERP Snapshot`, `## Keyword Candidates`, `## Wrong Assumption`, `## Angles`, `## Hook Candidates`, `## Humanity Snippet`, `## Overlap Check`, `## Evidence Gaps`. `meta` carries `{ workflowId, primary_keyword_candidates: [{keyword, volume, verified}], notebook_id }`.

- [ ] **Step 1: Edit SKILL.md.** Keep: frontmatter description (add "persists a durable research doc"), STATE init, the four-step NLM rule with its lessons, evidence-tier definitions (canonical home), Phase 2 context pulls. Add after Phase 1:
  - **Phase 1b — SERP grounding:** for the top 1–3 keyword candidates, WebSearch what currently ranks; record for each result: title, URL, one-line angle summary — verbatim into `## SERP Snapshot`. This is the information-gain baseline for blog-outline; a missing snapshot is a gate failure for pipeline runs (standalone chat research may skip with a note).
  - **Phase 1c — keyword volumes:** `node -e` snippet calling `keywordVolumes([...])`; record each candidate as `keyword — volume N (verified)` or `keyword — volume unverified (<error>)`. Never block on failure.
  - Replace **Phase 3** ("Research Summary" chat block) with **Phase 3 — Persist the research doc:** same content structure as today's summary plus the new sections, written via `saveArtifact({ideaId, kind:'research_doc', content, meta})`. Rule: **a pipeline research run that ends without a `research_doc` artifact is a failed run.** Standalone runs (no `blog_ideas` row): create a `blog_ideas` row first if Simon confirms it's for a post, else write the doc to `docs/research/YYYY-MM-DD-<topic>.md` and commit — chat summary alone is no longer an allowed terminal state.
  - Stage contract (pipeline mode): claim `researching`, on success `setStage` → `outlining` (article) or `drafting` (teardown — but teardown research uses Task 13's path; this skill handles articles), on failure `failed_researching`. Log `step_name:'blog_research'`.

- [ ] **Step 2: Lint + verify**

```bash
bash scripts/skill-lint.sh
```
Expected: 0 findings on the edited file.

- [ ] **Step 3: Commit**

---

### Task 5: `blog-outline` skill

**Files:**
- Create: `.claude/skills/blog-outline/SKILL.md`

**Interfaces:**
- Consumes: `research_doc` artifact; live link map (query below).
- Produces: `outline` artifact = write-post Step 3 template (copy the block verbatim from `write-post/SKILL.md` — pillar, CTA, title options, working slug, primary keyword, named failure mode, hook, thesis, BLUF, fact-block argument structure, insight count, evidence planned, humanity snippet, code block, estimate) **plus two new sections**: `INFORMATION GAIN:` (2–4 sentences naming what this post adds that NONE of the SERP-snapshot results have; "nothing" → the skill fails the row to `failed_outlining` with reason) and `INTERNAL LINK PLAN:` (2–5 planned links per 1,000 estimated words: `[anchor text] → /blog/<slug> — why here`). `meta` carries `{ primary_keyword, title_options, working_slug }`.

- [ ] **Step 1: Write SKILL.md.** Frontmatter description: "Use when the blog pipeline dispatcher advances a blog_ideas row to the outlining stage, or when Simon asks to outline a researched pipeline post. Consumes the research_doc artifact; do NOT trigger for research (research) or drafting (blog-draft)." Body: STATE init; load idea + `latestArtifact(id,'research_doc')` (missing → `failed_outlining`, tell Simon to run research); link map query:

```javascript
const { data: linkMap } = await pub.from('blog_posts')
  .select('slug, title, pillar, post_type').eq('status', 'published');
```

  Outline rules by reference: "the outline template is write-post Step 3 — read it, don't restate it" **unless** Task 12 has already moved the template here (see Task 12 note — whichever lands second resolves the pointer so the template lives in exactly one place). End: `saveArtifact(kind:'outline')`, `setStage(id,'awaiting_outline_approval')`, log `blog_outline`, print the outline in chat for Simon.

- [ ] **Step 2: Lint** (`bash scripts/skill-lint.sh` → 0 findings). **Step 3: Commit.**

---

### Task 6: `blog-draft` skill (meta-prompting, persisted)

**Files:**
- Create: `.claude/skills/blog-draft/SKILL.md`

**Interfaces:**
- Consumes: `research_doc` + `outline` artifacts, brand files, link plan.
- Produces: `writing_brief` artifact, then `draft` artifact (full post markdown, no h1, `##` top headings). Advances `drafting → editing`.

- [ ] **Step 1: Write SKILL.md.** Two phases, both artifacts mandatory:
  - **Phase 1 — compose the brief** (the meta-prompt): a complete, self-contained writing instruction assembled from: the approved outline (verbatim), the research doc's tiered evidence (T1 lines with verbatim sentences + URLs), the internal link plan, ICP pain points (`brand/icp.md`), voice rules pointer (`brand/brand-summary.md` prohibitions + tests), and the write-post Step 4 rule block copied in (stat provenance origin gate, BLUF, fact-blocks, code-block rules, 800–1,800 words). The brief must be executable by a writer with NO other context — that's the test of completeness. `saveArtifact(kind:'writing_brief')`.
  - **Phase 2 — execute the brief verbatim.** Write the post following ONLY the brief. Do not improvise beyond it; a needed deviation means the brief was wrong — fix the brief artifact first (append a new version), then draft. `saveArtifact(kind:'draft')`, `setStage → 'editing'`, log `blog_draft` (two log entries: brief_composed, draft_written).
  - Failure → `failed_drafting`.

- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 7: `editorial` skill — blocking rule + stage mode

**Files:**
- Modify: `.claude/skills/editorial/SKILL.md`

**Interfaces:**
- Produces: revised `draft` artifact (new version) + `editorial_report` artifact (`FIDELITY CHECK` score block + repairs summary). Advances `editing → optimizing`.

- [ ] **Step 1: Edit SKILL.md.** Add a "Pipeline stage mode" section: when invoked on a `blog_ideas` row — load newest `draft` artifact; run the three passes unchanged; **new blocking rule (all modes): any dimension still < 7 after Pass 3 → do not proceed; in pipeline mode set `failed_editorial` with the flagged dimensions in the log; in chat mode tell Simon which dimension is unrepairable and why. Never silent-continue.** On success save revised draft as a new `draft` artifact + the score block as `editorial_report`, `setStage → 'optimizing'`, log `blog_editorial`. Keep the skill's read-only/no-DB exemption note but scope it: the exemption covers chat mode; pipeline mode writes artifacts + logs (that's S+T, still no external APIs).

- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 8: `blog-optimize` skill (SEO/AEO/GEO layer, voice veto)

**Files:**
- Create: `.claude/skills/blog-optimize/SKILL.md`

**Interfaces:**
- Consumes: newest `draft` artifact, `outline` artifact (link plan, keyword), link map query (Task 5's).
- Produces: `optimized_draft` artifact — final body markdown; `meta` = the full metadata object the insert stage consumes:

```json
{ "title": "", "slug": "", "excerpt": "", "seo_title": "", "seo_description": "",
  "reading_time_minutes": 0, "pillar": "", "cta_type": "", "featured": false,
  "canonical_url": "https://simonparis.ca/blog/<slug>", "tags": [],
  "primary_keyword": "", "geo_citability": { "...write-post Step 6 checklist keys...": true },
  "skipped_optimizations": ["<anything vetoed for voice, with reason>"] }
```

- [ ] **Step 1: Write SKILL.md.** Work items, in order: (1) metadata block per write-post Step 6 (copy the field spec in); (2) confirm BLUF + fact-blocks + question-form headings (AEO) — fix only mechanically, never rewrite argument; (3) **FAQ section**: `## FAQ` with 3–5 questions phrased as the ICP would ask an assistant, each answer 80–150 words and self-contained; (4) insert the outline's internal link plan (2–5 per 1,000 words, varied anchors; drop a planned link if its context vanished — note it); (5) confirm every T1 claim's primary URL is linked in-body. **Voice veto rule (verbatim in the skill): "If an optimization would cost voice — a keyword-stuffed heading, an FAQ answer that reads like a marketer wrote it, an anchor that breaks a sentence — skip it and record it in `meta.skipped_optimizations`. Brand outranks rank."** Gate: write the full new/changed prose (FAQ + any rewritten headings) to a temp file, `bash scripts/linkedin-gate.sh --blog <file>` must pass. End: `saveArtifact(kind:'optimized_draft', meta)`, `setStage → 'fact_check'`, log `blog_optimize`. Failure → `failed_optimizing`.

- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 9: `blog-factcheck` skill

**Files:**
- Create: `.claude/skills/blog-factcheck/SKILL.md`

**Interfaces:**
- Consumes: newest `optimized_draft` + `research_doc` artifacts.
- Produces: `factcheck_report` artifact (verdict table). Advances `fact_check → awaiting_final_review`.

- [ ] **Step 1: Write SKILL.md.** Protocol: enumerate every external-world claim in the FINAL text (numbers, process narratives, attributions — the three 2026-07-07 failure classes, name them in the skill); for each, locate its verbatim source sentence in the research doc — **if absent, WebFetch the primary URL live and find it**; verify scope qualifiers survived verbatim; verify conclusions-from-silence are attributed to the author, never the source; re-run the brand grep (`bash scripts/linkedin-gate.sh --blog <file>`) on the assembled final text. Report format: one row per claim — `claim | source URL | verbatim sentence found? | qualifiers intact? | verdict PASS/FAIL`. Any FAIL that can't be repaired by *cutting or reattributing the claim* (never by softening the source) → `failed_fact_check` naming the claim. All PASS → `saveArtifact(kind:'factcheck_report')`, `setStage → 'awaiting_final_review'`, log `blog_factcheck`, print the report + a link-ready summary for Simon's review.

- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 10: Extend `insert-blog-post.mjs` gate for the new fields

**Files:**
- Modify: `projects/Content-Engine/tools/insert-blog-post.mjs`

**Interfaces:**
- Consumes: payload JSON (existing shape).
- Produces: gate additionally enforces + writes: `post_type` ∈ `article|teardown` (default `article`); `canonical_url` non-empty and starting `https://simonparis.ca/blog/`; `source_idea_id` uuid (required when `--idea <id>` passed, else optional); body contains a `## FAQ` heading with ≥3 `**Q` or `###`-style questions (pipeline posts only — flag `--require-faq`).

- [ ] **Step 1: Red — extend `--self-test` FIRST** with failing fixtures: bad `post_type` value; missing `canonical_url` when `--require-faq` mode; `canonical_url` not on the domain; FAQ-less body with `--require-faq`. Run: `node tools/insert-blog-post.mjs --self-test` — expected: the NEW fixture assertions FAIL (gate doesn't know the fields yet).

- [ ] **Step 2: Green — implement** the new `validatePayload` checks + pass-through of `post_type, canonical_url, source_idea_id` into the insert. Re-run `--self-test` — expected: PASS (all old + new fixtures).

- [ ] **Step 3: Wire into `scripts/gate-selftest.sh`** if it isn't already invoking this self-test (read the script; it was promoted 2026-07-12). Run `bash scripts/gate-selftest.sh` — expected: all gates green.

- [ ] **Step 4: Commit.**

---

### Task 11: `blog-insert` skill

**Files:**
- Create: `.claude/skills/blog-insert/SKILL.md`

**Interfaces:**
- Consumes: newest `optimized_draft` artifact (body + meta), idea row.
- Produces: `blog_posts` draft row; idea `stage`+`status` → `promoted_to_post`.

- [ ] **Step 1: Write SKILL.md.** Build the payload JSON file from `optimized_draft.meta` + body + `post_type` from the idea + `source_idea_id = idea.id` + `linkedin_extract` (generate per the shared gate exactly as write-post Step 6 does today — playbook + `scripts/linkedin-gate.sh`); run `node tools/insert-blog-post.mjs --require-faq --idea <id> <payload.json>` (the script IS the gate — never hand-roll); on success read back by slug, `setStage → 'promoted_to_post'`, update legacy `status` enum to `promoted_to_post`, log `blog_insert`, print write-post Step 8's report block (copy it in) with the publish SQL. Failure → `failed_inserting` (gate output verbatim in the log). Slug conflict → adjust slug, retry once, else fail.

- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 12: Rewrite `write-post` as the interactive orchestrator

**Files:**
- Modify: `.claude/skills/write-post/SKILL.md`

**Interfaces:**
- Consumes: every stage skill above.
- Produces: same chat-triggered behavior Simon has today, implemented as: parse brief (keep Step 1 pillar/CTA tables verbatim) → create `blog_ideas` row (`stage:'researching'`, `post_type:'article'`, pillar, `title_working`) → run the stage skills **in-session in sequence**, honoring the same two human pauses (outline approval + final review happen in chat instead of CC) → blog-insert. Each stage still writes its artifact — a chat-run post is indistinguishable in the DB from a dispatcher-run post.

- [ ] **Step 1: Rewrite SKILL.md.** Keep: risk tier header, Step 1 (parse brief) content, Step 8 report (now lives in blog-insert — point to it). Replace Steps 2–7 with the stage-skill sequence + the row-creation snippet. Move the outline template + Step 4 drafting rules + Step 6 metadata spec INTO the stage skills that own them now (outline template → blog-outline; drafting rules → blog-draft's brief composition; metadata spec → blog-optimize) and leave pointers — the rule is each block lives in exactly ONE skill. Resolve Task 5's pointer here if blog-outline shipped with a reference instead of the template.
- [ ] **Step 2: Lint (whole estate — this touches routing): `bash scripts/skill-lint.sh`. Step 3: Commit.**

---

### Task 13: Adapt `teardown-generate` edges to the pipeline

**Files:**
- Modify: `.claude/skills/teardown-generate/SKILL.md`

**Interfaces:**
- Consumes: `pipeline.teardown_candidates` (unchanged), Task 2 helpers.
- Produces: teardown runs now ALSO maintain a `blog_ideas` row (`post_type:'teardown'`) with `research_doc` + `draft` artifacts, ending at `stage:'editing'` — from where the shared tail (editorial → optimize → factcheck → review → insert) takes over. `teardown_drafts` writes, LinkedIn post, outreach kit, `pipeline.posts` flow: **untouched**.

- [ ] **Step 1: Edit SKILL.md.** Three changes only: (1) Step 0 additionally finds-or-creates the `blog_ideas` row for this candidate (`title_working` = candidate name, pillar `state_applied`, `post_type:'teardown'`, `stage:'researching'`; find by a `meta` match on candidate_id in `notes` or by `title_working` — exact rule in the edit); (2) Step 1's checkpoint persists the research notes via `saveArtifact(kind:'research_doc')` INSTEAD of the `.tmp` file (update the crash-resume instruction to read the artifact back); (3) after Step 4's `teardown_drafts` write, also `saveArtifact(kind:'draft', content: full_content)` and `setStage → 'editing'`. Add one sentence to the output contract: "The blog post now continues through the shared pipeline tail (editorial → optimize → factcheck → Simon's review → gated insert) — full_content in teardown_drafts is no longer the terminal blog artifact."
- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 14: `blog-pipeline-dispatch` skill

**Files:**
- Create: `.claude/skills/blog-pipeline-dispatch/SKILL.md`

**Interfaces:**
- Consumes: `listActionable()`, `claimStage()`, every stage skill.
- Produces: one processed row per invocation.

- [ ] **Step 1: Write SKILL.md.** Protocol: `listActionable(10)`; if empty → print "blog pipeline: nothing actionable" and exit; take the oldest row; map stage→skill (`researching→research` [article] / teardown rows in `researching` are skipped with a note — teardown research is Simon-initiated via teardown-generate; `outlining→blog-outline; drafting→blog-draft` [article] (teardown `drafting` skipped with note, same reason); `editing→editorial; optimizing→blog-optimize; fact_check→blog-factcheck; inserting→blog-insert`); `claimStage(id, stage, stage)` is NOT how claiming works — instead the stage skill itself performs the terminal `setStage`; the dispatcher's job is: verify the row still has the expected stage immediately before invoking the skill, invoke it, and afterwards verify the stage moved (if unmoved and no `failed_*`, set `failed_<stage>` with "skill exited without advancing"). Log every dispatch (`blog_dispatch`, outcome in summary). **Hard rule: process exactly ONE row, then stop** — memory headroom + scheduler-overlap safety. Include a `--dry-run` mode: print what WOULD run, touch nothing.
- [ ] **Step 2: Lint. Step 3: Commit.**

---

### Task 15: Queue the CC stories

- [ ] **Step 1: POST the stories** to `http://100.105.85.5:3737/api/stories` (`target_repo: "command-center"`), one per spec §7 item, in this order with `agent_target` as noted — each description must name concrete files/routes and checkable acceptance criteria including the exact stage names from Global Constraints:
  1. `coo` — "Send to blog pipeline" action: dialog (pillar + post_type) on the ideas inbox → creates `blog_ideas` row (`stage:'candidate'`, `capture_id`), marks the capture. Verify: promoting a test idea creates the row with all fields.
  2. `coo` — Stage-transition API routes: approve (`awaiting_outline_approval→drafting`, `awaiting_final_review→inserting`), retry (`failed_X→X`), reject (`→rejected` status + stage frozen). Server validates transitions against the canonical stage graph; anything else 422. Verify with curl matrix.
  3. `sitemaster` — Pipeline board on `/blog`: rows grouped by stage columns, pillar chip, post_type tab filter (article | teardown), per-pillar counts row. Brand criteria: dark mode only, zero border-radius, `#E04500` primary actions, `#C97A1A` links never blue, default/hover/selected/active states specified for tabs and buttons.
  4. `sitemaster` — Artifact viewer: per-row expandable list of `blog_artifacts` (kind, created_at), rendered markdown body. Same brand criteria block.
  Approve/retry buttons wire to story 2's routes (story 3/4 depend on 2 — note it in descriptions).
- [ ] **Step 2: Record story IDs** in the handoff doc (`docs/handoffs/2026-07-13-blog-masterpiece-handoff.md` — append a "Queued stories" section). Commit.

---

### Task 16: Queue the website stories

- [ ] **Step 1: POST** (`target_repo: "simonparis-website"`, `agent_target: "sitemaster"`, brand criteria in each), one per spec §8 item: (1) real `/llms.txt` route (site nav for agents: identity, pillars, post index; the revalidate webhook already pings it); (2) FAQ render on post pages + FAQPage JSON-LD when body has `## FAQ`; (3) Person schema `sameAs` LinkedIn + Organization `knowsAbout` AI-reliability domains in JsonLd.tsx; (4) "Last updated" from `updated_at` on posts; (5) teardown badge/styling + `/blog/teardowns` index filtered on `post_type='teardown'`; (6) `cta_body` reconciliation (decide in-story: officially add the column to a migration and render as today, or remove the read — pick whichever the code makes cheaper, document it).
- [ ] **Step 2: Append story IDs to the handoff doc. Commit.**

---

### Task 17: Create the dispatcher schedule

- [ ] **Step 1: POST** to `http://100.105.85.5:3737/api/schedules`:

```json
{ "name": "Blog pipeline dispatcher", "kind": "prompt", "cron": "*/25 6-22 * * *",
  "working_dir": "~/projects/MetaArchitect", "agent": "blog-writer",
  "prompt": "/blog-pipeline-dispatch — process at most one actionable blog pipeline row, then stop." }
```
(Explicitly Simon-approved workstream — this schedule IS the deliverable, not agent initiative. Quiet hours 22:00–06:00 spare sterling's headroom.)
- [ ] **Step 2: Verify** the row appears on `/schedules`; trigger one manual run (run-now) with the pipeline empty; expected log: "blog pipeline: nothing actionable".

---

### Task 18: E2E — the meta-prompting post

- [ ] **Step 1: Seed the row** (supabase-js, public schema): `blog_ideas` insert — `title_working: "I was meta-prompting before it had a name"`, `pillar: 'meta_layer'`, `post_type: 'article'`, `stage: 'researching'`, `notes`: pointer to notebook `b5e122c1-e8d1-47d3-8301-06e38b57a49f` + the handoff §4 angle/evidence summary, `source_links`: the T1/T2 URLs from handoff §4.
- [ ] **Step 2: Run the stages via the real dispatcher** (run-now per stage, or let the cron carry it), pausing at both human checkpoints for Simon in CC/chat. NLM findings must come from live queries this session (session-verified rule) — the notebook exists; re-query, don't trust handoff prose for claims.
- [ ] **Step 3: Acceptance:** all 7 artifact kinds present on the row; fidelity scores ≥7 across the board; factcheck report all-PASS; `blog_posts` draft row with `post_type='article'`, `canonical_url`, `source_idea_id`, FAQ section; publish SQL handed to Simon. Judge the post against the burned-practitioner standard and report honestly — if it reads mid, say so and fix before calling this done.
- [ ] **Step 4: Close out:** mark handoff status `done`, append lesson(s) to `docs/lessons.md` if anything bit, memory-file bullet for blog-writer, commit.

---

## Self-Review (done at write time)

- **Spec coverage:** §2 orchestration → T14/T17; §3 data model → T1; §5 skills 1–9 → T4/T5/T6/T7/T8/T9/T10+T11/T13/T14 (write-post orchestrator → T12); §6 brand bar → T7 (blocking), T8 (veto), T9 (re-grep); §7 → T15; §8 → T16; §9 testing → self-tests in T2/T3/T10, dry-run in T14, e2e T18; §10 order → task order; §11 out of scope → absent. `cta_body` deferred decision → T16 item 6.
- **Type consistency:** stage names, artifact kinds, helper signatures identical across T2, T4–T14 (single source: Global Constraints).
- **Placeholder scan:** clean — every code step has code; skill tasks carry exact contracts, section lists, and rule text where new.
