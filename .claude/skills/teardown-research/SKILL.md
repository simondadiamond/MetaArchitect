---
name: teardown-research
description: Finds and scores real production AI systems as teardown candidates. Writes qualified results to pipeline.teardown_candidates in Supabase. Run when Simon says "research teardown candidates", "find teardown targets", or "fill the teardown pipeline".
---

# /teardown-research

## Purpose

Find 3–6 real production AI systems per run that Simon's ICP would recognize, score them against STATE-analyzability + ICP/FDE relevance criteria, and write qualified candidates to `pipeline.teardown_candidates`.

**This skill handles research and scoring only.** Content generation is `/teardown-generate` (not yet built).

**Ultimate goal**: Each candidate must pass two filters:
1. **ICP relevance** — LLM Platform/Reliability Leaders at 200–5,000 person enterprises find it credible and worth reading
2. **Content yield** — the teardown will be *dense with insight* and the core finding can be extracted as a standalone 150-250 word LinkedIn post that makes engineers think "oh shit, we do that"

A candidate that only passes one filter goes in the skip pile. Credibility compounds from both together.

---

## Supabase Access

Use the Supabase Management API with the access token that persists across workspace volumes. This token can run arbitrary SQL against any schema — no PostgREST exposure required.

```python
#!/usr/bin/env python3
import json, glob, os, urllib.request

def _get_token():
    """Find the supabase access token: popebot workspace volumes, then Sterling local."""
    paths = glob.glob('/app/data/workspaces/*/.supabase/access-token')
    paths += [os.path.expanduser('~/.supabase/access-token')]
    for p in paths:
        if os.path.exists(p):
            return open(p).read().strip()
    raise RuntimeError("No supabase access-token found")

TOKEN = _get_token()
REF   = 'ashwrqkoijzvakdmfskj'

def supabase_sql(query):
    url  = f'https://api.supabase.com/v1/projects/{REF}/database/query'
    body = json.dumps({'query': query}).encode()
    req  = urllib.request.Request(url, data=body, headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type':  'application/json',
        # Cloudflare 403 error 1010 blocks python-urllib's default UA (lessons.md 2026-07-02)
        'User-Agent':    'supabase-cli/2.30.4',
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())
```

`[]` response = DDL success. Array of dicts = SELECT/INSERT result rows.

Save as `/tmp/teardown_db.py` and import, or inline.

---

## First-Run Setup (one-time, done manually in Supabase dashboard)

The tables must exist before this skill runs. Apply the DDL once via **Supabase SQL Editor** (project `ashwrqkoijzvakdmfskj` → SQL Editor → paste and run the contents of `MetaArchitect/infra/supabase/schema.sql` tables 13–14).

To verify before proceeding:

```python
try:
    supabase_sql("SELECT id FROM pipeline.teardown_candidates LIMIT 1")
    print("Tables exist — proceeding.")
except Exception as e:
    raise SystemExit(f"Tables not found — apply DDL via Management API first.\n{e}")
```

The DDL being applied (for reference):

```sql
-- See MetaArchitect/infra/supabase/schema.sql tables 13-14 for canonical source
    CREATE TABLE IF NOT EXISTS pipeline.teardown_candidates (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name              text NOT NULL,
      company           text,
      category          text,
      description       text,
      primary_source_url text,
      sources           jsonb NOT NULL DEFAULT '[]'::jsonb,
      icp_relevance     int CHECK (icp_relevance  BETWEEN 1 AND 5),
      content_yield     int CHECK (content_yield  BETWEEN 1 AND 5),
      public_info_depth text CHECK (public_info_depth IN ('shallow','medium','deep')),
      state_s_score     int CHECK (state_s_score   BETWEEN 0 AND 2),
      state_t_score     int CHECK (state_t_score   BETWEEN 0 AND 2),
      state_a_score     int CHECK (state_a_score   BETWEEN 0 AND 2),
      state_tol_score   int CHECK (state_tol_score BETWEEN 0 AND 2),
      state_e_score     int CHECK (state_e_score   BETWEEN 0 AND 2),
      interesting_gap   text,
      teardown_angle    text,
      status            text NOT NULL DEFAULT 'candidate'
                          CHECK (status IN ('candidate','selected','in_teardown','published','skipped')),
      skip_reason       text,
      workflow_id       text,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS pipeline.teardown_drafts (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      candidate_id     uuid REFERENCES pipeline.teardown_candidates(id) ON DELETE SET NULL,
      system_summary   text,
      interview_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
      state_scores     jsonb NOT NULL DEFAULT '{}'::jsonb,
      gaps             jsonb NOT NULL DEFAULT '[]'::jsonb,
      remediation      jsonb NOT NULL DEFAULT '[]'::jsonb,
      full_content     text,
      linkedin_post    text,
      post_angle       text,
      blog_slug        text,
      blog_url         text,
      published_at     timestamptz,
      status           text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','reviewed','published','archived')),
      workflow_id      text,
      generation_log   jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE pipeline.teardown_candidates ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pipeline.teardown_drafts     ENABLE ROW LEVEL SECURITY;
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
- **Recency** — actively in production 2024–2025
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

Mix and match per chosen category:
- `"[product name] engineering blog architecture 2024 OR 2025"`
- `"[product name] how it works design decisions"`
- `"[company] LLM agent production case study"`
- `"[domain] AI production postmortem failure 2024 2025"`
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
Combines *insight density* (how rich and specific are the STATE gaps?) with *extractability* (can the core finding stand alone as a 150-word LinkedIn post?). Both dimensions must score well for a high number.

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

Score each based on what public information reveals:

**S — Structured**: Is an explicit state schema documented?
- 0 = No evidence of state management; likely stateless or ad-hoc
- 1 = Some state management implied but no explicit schema
- 2 = Typed state objects with workflow stages documented

**T — Traceable**: Can every LLM call for a session be reconstructed?
- 0 = No mention of logging, tracing, or observability
- 1 = General logging mentioned but not LLM-call-level tracing
- 2 = Full trace capability documented (inputs/outputs/tool calls/session-level)

**A — Auditable**: Can it explain a specific decision from last month?
- 0 = No audit capability, no compliance story
- 1 = Audit mentioned at surface level (access logs only, not decision records)
- 2 = Decision records, explainability, or regulatory compliance documented

**Tol — Tolerant**: Does the workflow resume from failure or restart from scratch?
- 0 = No retry/resume evident; crash-and-restart behavior
- 1 = Basic retries but no mid-workflow checkpoint/resume
- 2 = Explicit checkpoint/resume, idempotency, or distributed lock documented

**E — Explicit**: Are there validation gates before outputs become real-world actions?
- 0 = LLM outputs directly trigger actions without intermediate gates
- 1 = Some content filtering or confidence thresholds mentioned
- 2 = Explicit validation gates, human-in-the-loop checkpoints, or output schemas

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
    'state_s_score': 1,
    'state_t_score': 1,
    'state_a_score': 0,
    'state_tol_score': 0,
    'state_e_score': 1,
    'interesting_gap': '1-2 sentences.',
    'teardown_angle': '1 sentence hook.',
}
```

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

```python
qualified = []   # populated in Step 5

for c in qualified:
    def esc(v): return (str(v) if v is not None else '').replace("'", "''")
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
          {c.get("icp_relevance") or "NULL"}, {c.get("content_yield") or "NULL"},
          '{esc(c.get("public_info_depth","medium"))}',
          {c.get("state_s_score",1)}, {c.get("state_t_score",1)}, {c.get("state_a_score",0)},
          {c.get("state_tol_score",0)}, {c.get("state_e_score",1)},
          '{esc(c.get("interesting_gap"))}', '{esc(c.get("teardown_angle"))}',
          'candidate', '{WORKFLOW_ID}'
        ) RETURNING id
    """
    result = supabase_sql(sql)
    c['db_id'] = result[0]['id'] if result else None
    print(f"  ✓ Inserted: {c['name']} → {c['db_id']}")
```

### Step 7: Log the run

```python
skipped_summary = '; '.join([
    f"{c['name']} ({c.get('_skip_reason','unknown')})"
    for c in raw_candidates if c not in qualified
])[:500]

supabase_sql(f"""
    INSERT INTO pipeline.logs (workflow_id, entity_id, step_name, stage, output_summary, model_version, status)
    VALUES ('{WORKFLOW_ID}', 'teardown-research', 'research_complete', 'complete',
            '{skipped_summary.replace("'","''")}... inserted {len(qualified)}',
            'claude-sonnet-4-6', 'success')
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
  - [Name]: [reason — shallow / ICP<3 / FDE<2 / already exists / <3 pillars scoreable]

TOP PICK for next teardown: [Name with highest ICP + content_yield combined score]
  → [teardown_angle]

Next: say "teardown [name]" to generate content.
────────────────────────────────────────────────────
```

---

## STATE Compliance

- **S — Structured**: Every candidate is a typed row with explicit scores, status, and source chain. No free-form blobs.
- **T — Traceable**: `workflow_id` stamped on every inserted row. Run logged to `pipeline.logs` with input/output summary.
- **A — Auditable**: `interesting_gap` + `teardown_angle` + `sources` preserve the reasoning chain so any future agent can understand why a candidate was included.
- **Tol — Tolerant**: Each INSERT is atomic. If the run crashes mid-way, already-inserted candidates are preserved. Rerun skips existing names via the dedup check in Step 2.
- **E — Explicit**: No writes happen until all three gates pass: `icp_relevance >= 3`, `fde_relevance >= 2`, `public_info_depth != 'shallow'`, ≥3 STATE pillars scored, dedup passes.
