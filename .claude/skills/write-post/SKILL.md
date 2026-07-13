---
name: write-post
description: Use when Simon asks to write, create, or draft a new blog post for simonparis.ca. Do NOT trigger for editing an existing post (use editorial skill), research-only requests (use research skill), or turning existing content into LinkedIn posts (use repurpose skill).
---

## Write-Post Pipeline

Nine steps (0–8). Do them in order. Do not skip the editorial loop or the outline approval.

**Risk tier: medium (S + T + E)** — LLM generation + Supabase writes. Full spec: `brand/state-framework.md`. Run all node snippets from `projects/Content-Engine/` (deps + `.env` resolution live there).

**SEO/GEO rules (non-negotiable — canonical here; the Step 6 gate verifies them):**
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
  entityType: "post",
  entityId: null,          // set after the blog_posts insert (Step 7)
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Update `stage` at every transition: `parse_brief → research → outline_approval → draft → editorial → metadata → insert_gate → insert → complete`.

Log every LLM stage (draft, editorial hand-back, metadata + LinkedIn extract) and every Supabase write via `logEntry` from `projects/Content-Engine/tools/supabase.mjs` (logs land in `pipeline.logs`):

```javascript
const { logEntry } = await import('./tools/supabase.mjs');
await logEntry({ workflow_id: state.workflowId, entity_id: state.entityId, step_name: 'write_post_draft',
  stage: state.stage, output_summary: '<what was produced, size, key choices>',
  model_version: '<the id of the model that actually ran>', status: 'success' });
```

On any failure, log it (`status: 'error'`) and report:

```
❌ write-post failed at [stage] — [error message] — nothing written, safe to retry
```

No lock needed — the only pipeline-visible write is the single Step 7 insert, gated.

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

---

### STEP 2 — Research

Run the `research` skill. Pass the topic and any sources Simon provided.

If Simon said "skip research" or "just write it," go straight to Step 3 using your existing knowledge and brand context.

---

### STEP 3 — Outline (pause for approval)

Before writing a word of the draft, produce this outline and **wait for Simon's thumbs up**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOG POST OUTLINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PILLAR:   [enum] — [label]
CTA TYPE: [audit | subscribe]

TITLE OPTIONS:
  1. ...
  2. ...
  3. ...

WORKING SLUG: [kebab-case, ≤60 chars]
PRIMARY KEYWORD: [the 501-2,400 volume term this post targets — SEO/GEO rule 1]
NAMED FAILURE MODE: [specific name for the failure mode, or "n/a" for non-taxonomy posts]

HOOK TYPE: [contrarian | stat_lead | question | story_open | provocative_claim]
HOOK DRAFT: [2-3 sentences. Specific named failure mode or contrarian claim.]

THESIS: [one sentence connecting to "state beats intelligence"]

BLUF STATEMENT: [the core insight in ≤2 sentences — this goes in the first 150 words]

ARGUMENT STRUCTURE:
  ## [Section 1 — question-based heading where natural]
     FACT-BLOCK: [40-50 word standalone statement that opens this section]
     → what engineers assume / why that assumption fails
  ## [Section 2 — question-based heading where natural]
     FACT-BLOCK: [40-50 word standalone statement]
     → what's actually happening / the architecture insight
  ## [Section 3 — question-based heading where natural]
     FACT-BLOCK: [40-50 word standalone statement]
     → concrete pattern or checklist / code block if applicable
  ## [Section 4 — close, optional]
     → STATE tie-in or pointed question

DISTINCT INSIGHTS COUNT: [X] — must be 5-7 non-obvious claims
EVIDENCE PLANNED: [specific failure modes / mechanisms — Tier 1 or 2 only]
HUMANITY SNIPPET: [which one and how it slots in, or "none"]
CODE BLOCK: [yes/no — language: typescript | python | sql | bash]
ESTIMATED: ~[X] words / ~[Y] min read
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If Simon says "just write it, don't ask" — skip this step and proceed.

---

### STEP 4 — Draft

Write the full post. These rules apply without exception.

**Structure:**
- No `# h1` in body. Use `## h2` as the top-level heading.
- Apply the five SEO/GEO rules (top of this file) — primary keyword, BLUF, fact-blocks, insight count, named failure mode. They are stated once there; do not improvise variants.
- End on a pointed question OR a one-line STATE tie-in. Not both.
- 800–1800 words. Most strong posts land at 1000–1400. Do not pad to hit length.

**Voice:** `brand/brand-summary.md` is canonical — its Prohibitions list plus the burned-practitioner / specificity / thesis tests. Don't restate the list here; the shared LinkedIn gate greps the fixed phrases mechanically for the extract (Step 6), and editorial Pass 2 greps them for the blog prose.

**Stat provenance (E — the origin gate; the 2026-07-07 Ramp 65% incident started in this layer):**
- Every external number, process narrative ("ran in shadow mode"), or attributed statement ("ZenML says…") must trace to a **verbatim sentence fetched from a primary source in this session**, and the draft links that primary URL where the claim appears.
- Quote at source precision with scope qualifiers intact ("more than 65%", "at Ramp itself", "since deployment") — dropping a qualifier changes the claim.
- Conclusions drawn from a source's *silence* are the author's — never put them in the source's mouth.
- Untraceable → cut. A punchier line is never worth an unattributable claim.

**Evidence tiering:** the canonical T1–T4 definitions live in the `research` skill (Phase 1) — do not restate them. The operational rule: only T1-anchored numbers (verbatim source sentence + primary URL) may appear as stats; T2 patterns may carry primary claims without numbers; T3 is supporting color; T4 is never presented as fact.

**Code blocks:**
- Always annotate: ` ```typescript `, ` ```python `, ` ```sql `, ` ```bash `
- One point per block. Under 30 lines. Bad pattern vs. good pattern = two blocks with commentary between.

---

### STEP 5 — Editorial Loop

Run the `editorial` skill on the completed draft. Pass the full draft text and the declared pillar + CTA type so the fidelity check has context.

---

### STEP 6 — Generate Metadata

After the editorial loop produces the final draft:

```
TITLE:            [final chosen title]
SLUG:             [kebab-case, ≤60 chars, no stop words]
EXCERPT:          [40–80 words. Hook + mechanism. A reason to read, not a summary.]
SEO_TITLE:        [title | The Meta Architect — ≤60 chars total]
SEO_DESCRIPTION:  [120–155 chars. Names the problem and the reader type. Specific.]
READING_TIME:     [ceil(word_count / 225)] minutes
PILLAR:           [enum value]
CTA_TYPE:         [audit | subscribe]
FEATURED:         false  [true only if Simon explicitly says so]
PRIMARY_KEYWORD:  [the 501-2,400 volume term — confirm it appears in title + first H2 + body]
TAGS:             [include both brand terms (state-beats-intelligence) and search terms (llmops, production-ai)]

GEO CITABILITY CHECK (required before insert):
  [ ] BLUF: core insight in first 150 words
  [ ] Every H2 opens with a 40-50 word standalone fact-block
  [ ] H2/H3 headings reviewed — question-based where natural
  [ ] Named failure mode defined (failure_taxonomy posts)
  [ ] 5-7 distinct non-obvious insights confirmed
  [ ] Entity density: specific tools/versions/error codes named throughout
  [ ] Primary keyword in title, first H2, and naturally in body

LINKEDIN_EXTRACT:
[Generate per `.claude/skills/repurpose/references/linkedin-playbook.md` — anatomy, hook
 patterns, anti-slop checklist all live there; read it, don't restate it. Then gate the
 candidate BEFORE writing it to `linkedin_extract`: write it to a temp file and run
 `bash scripts/linkedin-gate.sh <file>` (mechanical checks), plus the judgment checks in
 `references/linkedin-gate.md` (claim provenance). Gate failure → rewrite and re-run;
 never save a failing candidate, never lower the bar.]
```

---

### STEP 7 — Validation Gate, then Insert to Supabase (E)

**Validation gate — `node projects/Content-Engine/tools/insert-blog-post.mjs <payload.json>` enforces every box below and refuses to write on any failure (use `--validate-only` to check without inserting). Do not hand-roll the insert; the script IS the gate:**

- [ ] `pillar` ∈ `failure_taxonomy | state_applied | defensive_arch | meta_layer | regulated_law25` — the Step 1 table is the enum; no other value exists
- [ ] `cta_type` ∈ `audit | subscribe`
- [ ] `tags` is a non-empty array of kebab-case strings
- [ ] `slug` kebab-case, ≤60 chars; `status` = `'draft'`
- [ ] GEO citability check (Step 6) — every box ticked
- [ ] Stat provenance (Step 4) holds on the **final** post-editorial text
- [ ] `linkedin_extract` passed the shared gate (Step 6)

**Insert:** `node projects/Content-Engine/tools/insert-blog-post.mjs <payload.json>` — it validates the payload against every gate above, then writes to `blog_posts` (public schema). Write the payload to a JSON file; never embed the post body in a bash heredoc. Column registry: `projects/Content-Engine/.claude/skills/supabase.md`. Do not insert via the Management API (Cloudflare WAF blocks large payloads; short verification queries are fine).

```javascript
import { createClient } from '@supabase/supabase-js';
const pub = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await pub.from('blog_posts').insert({
  slug, title, excerpt, body_markdown, pillar, status: 'draft',
  seo_title, seo_description, cta_type, featured,
  reading_time_minutes, linkedin_extract, tags,
}).select('id, slug, status').single();
if (error) throw error;   // slug conflict → adjust the slug and retry
```

Set `state.entityId = data.id`, log the write (`step_name: 'blog_post_inserted'`, stage `insert`, via `logEntry` as in Step 0), then verify by reading the row back with the same client (`id, slug, title, status, pillar, cta_type` by slug).

---

### STEP 8 — Report Back

```
✍️ Blog draft ready

"[title]"

Pillar: [label]
CTA: [audit → /score | subscribe → email form]
~[X] min read / [N] words

Slug: /blog/[slug]
Preview (after publish): https://simonparis.ca/blog/[slug]
Supabase: https://supabase.com/dashboard/project/ashwrqkoijzvakdmfskj/editor

TO PUBLISH:
  UPDATE blog_posts
  SET status = 'published', published_at = NOW()
  WHERE slug = '[slug]';

LinkedIn extract is in the linkedin_extract field — ready to copy.

Notes: [anything needing Simon's attention]
```
