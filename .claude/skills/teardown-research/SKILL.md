---
name: teardown-research
description: Use when Simon says "research teardown candidates", "find teardown targets", "fill the teardown pipeline", or asks for new systems to tear down. Do NOT trigger for generating a teardown from an existing candidate (teardown-generate) or general blog-topic research (research).
---

# /teardown-research

## Purpose

Find 3–6 real production AI systems per run that Simon's ICP would recognize, score them against STATE-analyzability + ICP/FDE relevance criteria, and write qualified candidates to `pipeline.teardown_candidates`.

**This skill handles research and scoring only.** Content generation is `/teardown-generate` (live — it has shipped real teardowns; candidates written here feed it directly).

**Ultimate goal**: Each candidate must pass two filters:
1. **ICP relevance** — LLM Platform/Reliability Leaders at 200–5,000 person enterprises find it credible and worth reading
2. **Content yield** — the teardown will be *dense with insight* and the core finding can be extracted as a standalone 180-300 word LinkedIn post that makes engineers think "oh shit, we do that"

A candidate that only passes one filter goes in the skip pile. Credibility compounds from both together.

---

## Supabase Access

Read `.claude/skills/_shared/supabase-access.md` (repo root) — the single canonical copy of the
Management-API access pattern (token lookup order, project ref, the `User-Agent` Cloudflare
workaround). Edit there, never fork here. After reading it, define:

```python
def supabase_sql(query: str):
    """Per _shared/supabase-access.md. Returns [] for DDL, list[dict] for SELECT/INSERT rows."""
```

---

## First-Run Setup

Tables 13–14 (`pipeline.teardown_candidates`, `pipeline.teardown_drafts`) must exist before this
skill runs. The canonical DDL lives in `infra/supabase/schema.sql` (tables 13–14) — do not copy
it here; read it there if you need column names or CHECK constraints. If the tables are missing,
apply that DDL via the same `supabase_sql` Management API call — no dashboard needed.

Verify before proceeding:

```python
try:
    supabase_sql("SELECT id FROM pipeline.teardown_candidates LIMIT 1")
    print("Tables exist — proceeding.")
except Exception as e:
    raise SystemExit(f"Tables not found — apply infra/supabase/schema.sql tables 13-14 via supabase_sql first.\n{e}")
```

---

## What Makes a Good Candidate

### Hard requirements (all must pass)

1. **Real production system** — deployed to actual users generating real outcomes. Evidence: product URL, paying customers, production case study, or postmortem. Disqualify: tutorials, demos, sandboxes, "we built a PoC."

2. **Observable architecture** — at least 2 public sources with architectural detail:
   - Engineering blog post with design decisions
   - GitHub repo with meaningful production code
   - Postmortem or retrospective naming failure modes
   - Conference talk or whitepaper with technical depth
   - Documentation detailed enough to infer state management

3. **STATE-scoreable** — from public info alone, at least 3 of 5 STATE pillars can be meaningfully scored (not all "I have no idea"). A teardown built on guesses is worthless.

4. **ICP relevance ≥ 3/5** — an LLM Platform/Reliability Leader at a 200–5,000 person finserv / enterprise SaaS / healthcare company would find this relevant because they:
   - Use it or have evaluated it
   - Compete with a system built on the same pattern
   - Have seen the same failure mode in their own stack
   - Would share it in their team Slack as cautionary or aspirational

5. **Dual-axis pass** — must score ≥ 3 on ICP relevance AND ≥ 3 on content yield. No exceptions.

### Instant disqualifiers

- Only evidence is marketing copy or a press release
- "Production AI" = prompt wrapper around OpenAI with zero state management story
- Already exists in `pipeline.teardown_candidates` (check by name, case-insensitive)
- Public teardown of this exact system published by a credible source in the last 6 months

### Preferred (boost scores)

- **Regulated domain** — finserv, healthcare, insurance, legal = stronger Law 25/OSFI angle + differentiates from most teardown content
- **Named failure modes** — system has broken publicly (postmortem, outage report, archived issues)
- **Recency** — actively in production in the current or prior year (derive at runtime — never hardcode years, lessons.md 2026-03-31)
- **Surprise factor** — gap is non-obvious; not just "they don't log" but "their state model breaks specifically when X happens"

---

## Search Strategy

### Target categories

| ID | Category | Example targets |
|----|----------|-----------------|
| A  | Enterprise search / RAG | Glean, Coveo AI, Stack Overflow AI, Notion AI, Guru, Perplexity Enterprise |
| B  | Customer-facing agents | Intercom Fin, Zendesk AI, Salesforce Einstein, Sierra, Decagon, Cresta |
| C  | Financial services AI | Morgan Stanley AI @ Work, JPMorgan contract analysis LLM, credit decisioning AI, fraud detection |
| D  | Healthcare AI | Nuance DAX Copilot, Epic AI Assistant, AWS HealthLake AI, clinical decision support |
| E  | Agent orchestration in enterprise | AutoGen at named companies, LangGraph production deployments, CrewAI enterprise |
| F  | Open-source with documented production use | LlamaIndex enterprise stories, Haystack in production, LangChain reference architectures |
| G  | Observability / AIOps | Datadog AI, Dynatrace Davis AI, PagerDuty AIOps in production |

**Per run**: check which categories are under-represented in `pipeline.teardown_candidates` (status != 'skipped'), then pick 2–3. Default on first run: A, B, C.

### Search queries

Derive year anchors at runtime — hardcoded years rot (lessons.md 2026-03-31):

```python
from datetime import date
YEARS = f"{date.today().year - 1} OR {date.today().year}"  # current and prior year
```

Mix and match per chosen category:
- `"[product name] engineering blog architecture {YEARS}"`
- `"[product name] how it works design decisions"`
- `"[company] LLM agent production case study"`
- `"[domain] AI production postmortem failure {YEARS}"`
- `"[FDE target company] AI system design technical deep dive"`

Run 4–6 searches per invocation. WebFetch primary sources for candidates with promising titles. Target 8–12 raw candidates before applying the filter.

---

## Scoring Rubric

### ICP Relevance (1–5)
| Score | Meaning |
|-------|---------|
| 1 | Only interesting to AI researchers or enthusiasts |
| 2 | Relevant to ML engineers but not Reliability/Platform leaders |
| 3 | Would come up in an LLM Platform leader's team discussion |
| 4 | Directly relevant to production decisions this ICP makes weekly |
| 5 | This is exactly what the ICP is solving or trying to avoid failing at |

### Content Yield (1–5)
Combines *insight density* (how rich and specific are the STATE gaps?) with *extractability* (can the core finding stand alone as a 180-word LinkedIn post?). Both dimensions must score well for a high number.

| Score | Meaning |
|-------|---------|
| 1 | One obvious gap only (e.g. "no logging") — unoriginal, won't stand alone as a post |
| 2 | 1–2 inferable gaps, somewhat teachable but derivative — post would be thin |
| 3 | 2–3 specific gaps with clear production consequences — generates 1 solid LinkedIn post |
| 4 | 3+ specific gaps with a surprising angle + clear "aha moment" — generates 2–3 posts, engineers forward it |
| 5 | Rich non-obvious insight + generalizable principle beyond this one system + immediate "oh shit, we do that" reaction — multiple posts, referenceable in content for months |

### Public Info Depth
- `shallow` — only marketing page + 1 vague blog post → **DISQUALIFY**
- `medium` — 2–3 sources, some architectural detail, STATE scoring requires inference
- `deep` — 4+ sources, detailed architecture, STATE scoring from direct evidence

### STATE Pillars (0, 1, 2 per pillar)

Canonical rubric: `.claude/skills/_shared/state-scoring-rubric.md` (repo root) — read it before
scoring; never fork a local variant.

Deltas specific to this skill:
- Score from **public information only** — what the sources reveal, not what you'd guess a
  serious team probably does.
- A pillar the public evidence doesn't reach stays **unscored (NULL)** — never invent a score.
  At least 3 of 5 pillars must be scoreable with confidence or the candidate fails the filter.

### Interesting Gap (free text — 1–2 sentences)
The most interesting STATE violation inferable from public information. This becomes the teardown's thesis. If you can't articulate a specific gap, the candidate is too thin.

### Teardown Angle (free text — 1 sentence)
The narrative argument Simon would make. Must be strong enough to be a LinkedIn hook. Bad: "Glean has STATE gaps." Good: "Enterprise search that knows your documents but forgets your session — how Glean's stateless architecture creates invisible trust debt."

---

## Step-by-Step Protocol

### Step 0: Generate workflow_id

```python
from datetime import datetime
WORKFLOW_ID = f"teardown-research-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}"
print(f"Workflow: {WORKFLOW_ID}")
```

### Step 1: Run first-run setup

Check if tables exist. Apply DDL if not (see First-Run Setup above).

### Step 2: Load existing candidates

```python
try:
    existing = supabase_sql("SELECT name, category, status FROM pipeline.teardown_candidates")
    existing_names    = {row['name'].lower() for row in existing}
    category_counts   = {}
    for row in existing:
        if row['status'] != 'skipped':
            cat = row.get('category') or 'unknown'
            category_counts[cat] = category_counts.get(cat, 0) + 1
    print(f"Existing candidates: {len(existing)}")
    print(f"By category: {category_counts}")
except Exception as e:
    print(f"WARNING: Could not load existing candidates: {e}")
    existing_names  = set()
    category_counts = {}
```

### Step 3: Pick categories for this run

Identify the 2–3 least-covered categories from the table above. If `category_counts` is empty, default to A, B, C.

### Step 4: Web research

For each selected category:
1. Run 2 targeted WebSearch queries
2. For each result with a promising title/snippet, WebFetch the primary URL
3. Look for: architecture diagrams, engineering decisions, tech stack specifics, failure modes, postmortems, GitHub links
4. Collect candidate data in a list of dicts

Keep every URL you WebFetch in a `sources_fetched` list — it goes into the Step 7 run log (T).
**Every source that shaped a candidate field must ALSO appear in that candidate's `sources` array** — a consulted-but-unlisted source is how the Ramp "shadow mode" transplant became untraceable (2026-07-07): the term came from a LangChain article no verification pass could check because it wasn't on the candidate's list. If a claim came from a URL, the URL goes on the candidate.

Per candidate dict:
```python
{
    'name': 'Glean Enterprise Search',
    'company': 'Glean',
    'category': 'enterprise_search',
    'description': '2-3 sentences from sources.',
    'primary_source_url': 'https://...',
    'sources': [
        {'url': 'https://...', 'title': 'How Glean Works', 'type': 'engineering_blog'},
        {'url': 'https://...', 'title': 'Glean Architecture Deep Dive', 'type': 'conference_talk'},
    ],
    'icp_relevance': 4,
    'content_yield': 4,
    'public_info_depth': 'deep',
    # Pillar scores: 0/1/2 per the shared rubric. A pillar the evidence doesn't reach is
    # set to None — it stays NULL in the DB. Never invent a score.
    'state_s_score': 1,
    'state_t_score': 1,
    'state_a_score': 0,
    'state_tol_score': None,
    'state_e_score': 1,
    'interesting_gap': '1-2 sentences.',
    'teardown_angle': '1 sentence hook.',
}
```

**Claim provenance (the Ramp 65% orphan AND the fabricated "shadow mode" narrative both entered
the pipeline at this exact step):** every external-world assertion written into `description`,
`interesting_gap`, or `teardown_angle` must trace to a sentence you actually fetched this run:

- **Numbers** — a percentage, multiplier, count, dollar figure — carry their source URL inline,
  in parentheses, right after the number, with the source's scope qualifiers intact
  ("more than 65% of approvals at Ramp itself (https://...)").
- **Process narratives** — how the system was rolled out, validated, or operated ("shadow mode",
  "pioneered X", "validated against ground truth", "accuracy thresholds") — must paraphrase a
  fetched sentence **about the same subsystem**. The Ramp candidate said "shadow mode rollout
  ... against human ground truth until accuracy thresholds are met"; the listed sources contain
  none of it. The term turned out to be real — a LangChain article describes Ramp's
  *self-monitoring/alerting loop* running in shadow mode — but it was transplanted onto the
  approval rollout and embellished. A real term applied to the wrong subsystem is still a
  fabrication. Flattering upgrades like this are the most dangerous class: they make the
  subject sound MORE rigorous, so nobody challenges them.
- **Attributed statements** ("X's write-up says...") — the named source must contain the statement.
  Conclusions drawn from a source's *silence* are OURS, never the source's.

If a claim can't be traced to a fetched sentence, cut it. Downstream generation and LinkedIn
derivatives inherit these fields verbatim; an unsourced claim here becomes an unattributable
claim on LinkedIn.

Collect 8–12 raw candidates before filtering.

### Step 5: Filter

Reject if ANY of:
- `public_info_depth == 'shallow'`
- `icp_relevance < 3`
- `content_yield < 3`
- Fewer than 3 STATE pillars scored with confidence
- `name.lower()` in `existing_names`

If fewer than 3 pass, run 2 more searches before concluding.

### Step 6: Write qualified candidates

Pillar scores pass through exactly as scored — an unscored pillar writes NULL. No silent
defaults: a missing score must never invent a number.

```python
qualified = []   # populated in Step 5

def esc(v): return (str(v) if v is not None else '').replace("'", "''")
def num(v): return v if v is not None else "NULL"   # unscored stays NULL — never default

for c in qualified:
    sql = f"""
        INSERT INTO pipeline.teardown_candidates
          (name, company, category, description, primary_source_url, sources,
           icp_relevance, content_yield, public_info_depth,
           state_s_score, state_t_score, state_a_score, state_tol_score, state_e_score,
           interesting_gap, teardown_angle, status, workflow_id)
        VALUES (
          '{esc(c["name"])}', '{esc(c.get("company"))}', '{esc(c.get("category"))}',
          '{esc(c.get("description"))}', '{esc(c.get("primary_source_url"))}',
          '{json.dumps(c.get("sources", [])).replace("'", "''")}'::jsonb,
          {num(c.get("icp_relevance"))}, {num(c.get("content_yield"))},
          '{esc(c["public_info_depth"])}',
          {num(c.get("state_s_score"))}, {num(c.get("state_t_score"))}, {num(c.get("state_a_score"))},
          {num(c.get("state_tol_score"))}, {num(c.get("state_e_score"))},
          '{esc(c.get("interesting_gap"))}', '{esc(c.get("teardown_angle"))}',
          'candidate', '{WORKFLOW_ID}'
        ) RETURNING id
    """
    result = supabase_sql(sql)
    c['db_id'] = result[0]['id'] if result else None
    print(f"  ✓ Inserted: {c['name']} → {c['db_id']}")
```

### Step 7: Log the run

`MODEL_ID` = the id of the model that actually ran this session — set it at runtime; never
hardcode a model id (traceability data that lies when another model runs).

```python
MODEL_ID = '<the id of the model that actually ran>'

skipped_summary = '; '.join([
    f"{c['name']} ({c.get('_skip_reason','unknown')})"
    for c in raw_candidates if c not in qualified
])[:500]

# sources_fetched: every URL WebFetched in Step 4 (T — the run's evidence trail)
sources_blob = json.dumps(sources_fetched)[:1000].replace("'", "''")

supabase_sql(f"""
    INSERT INTO pipeline.logs (workflow_id, entity_id, step_name, stage, output_summary, model_version, status)
    VALUES ('{WORKFLOW_ID}', 'teardown-research', 'research_complete', 'complete',
            '{skipped_summary.replace("'","''")}... inserted {len(qualified)} | sources_fetched: {sources_blob}',
            '{MODEL_ID}', 'success')
""")
```

### Step 8: Print report (see Report Format)

---

## Report Format

```
────────────────────────────────────────────────────
TEARDOWN RESEARCH — {WORKFLOW_ID}
────────────────────────────────────────────────────
Categories searched : [A, B, C]
Searches run        : N
Raw candidates      : N evaluated
Qualified + inserted: N

INSERTED:
  1. [Name] — [Company] | ICP: X/5 | Yield: X/5 | Depth: medium/deep
     Gap: [interesting_gap]
     Angle: [teardown_angle]
  2. ...

SKIPPED:
  - [Name]: [reason — shallow depth / ICP<3 / yield<3 / already exists / <3 pillars scoreable]

TOP PICK for next teardown: [Name with highest ICP + content_yield combined score]
  → [teardown_angle]

Next: say "teardown [name]" to generate content.
────────────────────────────────────────────────────
```

---

## STATE Compliance

- **S — Structured**: Every candidate is a typed row with explicit scores, status, and source chain. No free-form blobs.
- **T — Traceable**: `workflow_id` stamped on every inserted row. Run logged to `pipeline.logs` with input/output summary plus the `sources_fetched` URL list (the run's evidence trail).
- **A — Auditable**: `interesting_gap` + `teardown_angle` + `sources` preserve the reasoning chain so any future agent can understand why a candidate was included.
- **Tol — Tolerant**: Each INSERT is atomic. If the run crashes mid-way, already-inserted candidates are preserved. Rerun skips existing names via the dedup check in Step 2.
- **E — Explicit**: No candidate is written until ALL five gates pass (same list as Step 5's filter — if these ever diverge, Step 5 is canonical):
  1. `icp_relevance >= 3`
  2. `content_yield >= 3`
  3. `public_info_depth != 'shallow'`
  4. ≥3 STATE pillars scored with confidence
  5. case-insensitive name dedup against existing rows
