---
name: write-post
description: Full pipeline for writing a new blog post for simonparis.ca. Trigger when Simon asks to write, create, or draft a new blog post. Covers research, outline, draft, editorial loop, Supabase insert as draft, and DM notification. Do NOT trigger for editing existing posts (use editorial skill) or research-only requests (use research skill).
---

## Write-Post Pipeline

Eight steps. Do them in order. Do not skip the editorial loop or the outline approval.

**SEO/GEO reference**: Read `agents/blog-writer/seo-guidelines.md` before every post. It governs structure, keyword strategy, named failure modes, GEO citability, and the 5-to-7 insight rule. These are non-negotiable for 2026 search visibility.

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
- `audit` → "Score Your System" card → drives to `/readiness`. Use when the post surfaces a gap — natural next action is self-assessment.
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
PRIMARY KEYWORD: [the 501-2,400 volume term this post targets — see seo-guidelines.md]
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
- **BLUF**: Core insight stated in first 150 words — the conclusion, not a preview. (44.2% of LLM citations come from the first 30% of the document.)
- **Fact-blocks**: Every H2 section opens with a bolded 40-50 word standalone statement — the GEO citation unit.
- **Headings**: Review all H2/H3s — phrase as specific technical questions where natural.
- **Named failure mode**: If failure_taxonomy pillar, the failure must be named precisely and defined on first use.
- **Insight count**: 5-7 genuinely non-obvious claims. Fewer = absorbed by AI summaries. More = diluted.
- End on a pointed question OR a one-line STATE tie-in. Not both.
- 800–1800 words. Most strong posts land at 1000–1400. Do not pad to hit length.

**Voice prohibitions (never use):**
- "excited to share" / "thrilled to announce"
- "game-changing" / "revolutionary" / "groundbreaking" / "transformational"
- "in today's fast-paced world" / "cutting-edge" / "state-of-the-art"
- Vague lessons without mechanism ("testing matters" → always name what broke and why)
- Hedging the thesis ("in some cases" / "it depends")
- Passive voice for diagnostic statements

**Evidence tiering:**
| Tier | Use as | Example |
|---|---|---|
| T1 — Named entity + specific metric + source | Primary claim | Verified stat from a real source |
| T2 — Named pattern + mechanism | Primary claim | "Retry loops without idempotency keys corrupt state on partial failures" |
| T3 — General principle with specificity | Supporting color | "Most teams discover this when post-mortems end with 'the model did something weird'" |
| T4 — Reasoned inference | Never as claims | Don't present as fact |

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
[180–300 words. 10-line anatomy:
 Line 1:  Hook — specific failure / contrarian claim / shared-pain question
          [blank line]
 Lines 2-3: Setup — what most engineers do / think
          [blank line]
 Lines 4-6: The turn — what's actually happening
          [blank line]
 Lines 7-9: Lesson — specific, architectural, actionable — include one save-worthy element (checklist, score, taxonomy, or test)
          [blank line]
 Line 10: Close — question that requires production scar tissue to answer, or STATE tie-in — never generic ("Agree?", "Thoughts?")
 Hashtags: 0–3 niche max, 0 preferred — never the final line
 Full mechanics: .claude/skills/repurpose/references/linkedin-playbook.md]
```

---

### STEP 7 — Insert to Supabase

Use the **PostgREST API** (not the Management API) — see `skills/supabase-cli/SKILL.md` for the full Python template. The Management API is blocked by Cloudflare WAF for large payloads. Write the Python script to a file (`/tmp/insert_post.py`) and run it — do not embed in a bash heredoc.

Key fields to set:
- `slug`, `title`, `excerpt`, `body_markdown`, `pillar`, `status='draft'`
- `seo_title`, `seo_description`, `cta_type`, `featured`
- `reading_time_minutes`, `linkedin_extract`, `tags` (Python list → JSON array)

Verify the insert via the Management API (short queries are fine). Read the Supabase access token from your local secret store (`$SUPABASE_ACCESS_TOKEN` in `.env`, or `~/.supabase/access-token` if present):
```bash
TOKEN="${SUPABASE_ACCESS_TOKEN:-$(cat ~/.supabase/access-token 2>/dev/null)}"
REF=ashwrqkoijzvakdmfskj
curl -s -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query": "SELECT id, slug, title, status, pillar, cta_type, reading_time_minutes FROM blog_posts WHERE slug = '"'"'your-slug'"'"'"}' \
  | python3 -m json.tool
```

If slug conflicts, adjust and retry.

---

### STEP 8 — Report Back

```
✍️ Blog draft ready

"[title]"

Pillar: [label]
CTA: [audit → /readiness | subscribe → email form]
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
