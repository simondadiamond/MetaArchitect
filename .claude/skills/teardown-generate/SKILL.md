---
name: teardown-generate
description: Generates a full STATE teardown for a candidate in pipeline.teardown_candidates. Produces a blog article, STATE scores with reasoning, gaps, remediation, and a LinkedIn post. Writes to pipeline.teardown_drafts. Run when Simon selects a candidate and says "teardown [name]".
---

# /teardown-generate

## Purpose

Take a candidate from `pipeline.teardown_candidates`, do deep source research, and produce:
1. Full STATE scoring with per-pillar reasoning (not just 0/1/2 — the *why*)
2. 2–3 specific gaps with production consequences
3. Remediation recommendations (concrete, not generic)
4. A full blog post (~1,000–1,500 words) for `simonparis.ca/blog/teardowns/<slug>`
5. A LinkedIn post (150–250 words, hook→setup→turn→lesson→close)

**Voice**: practitioner-to-practitioner. "I built this because I use it." No marketer-speak. No softening. If the system has a serious gap, name it specifically.

---

## Supabase Access

Same pattern as `/teardown-research`:

```python
import json, glob, urllib.request

def _get_token():
    paths = glob.glob('/app/data/workspaces/*/.supabase/access-token')
    if not paths:
        raise RuntimeError("No supabase access-token found")
    return open(paths[0]).read().strip()

TOKEN = _get_token()
REF   = 'ashwrqkoijzvakdmfskj'

def supabase_sql(query):
    url  = f'https://api.supabase.com/v1/projects/{REF}/database/query'
    body = json.dumps({'query': query}).encode()
    req  = urllib.request.Request(url, data=body, headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type':  'application/json',
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())
```

---

## STATE Scoring Reference

Score each pillar 0, 1, or 2 based on evidence — not assumption:

**S — Structured**: Does an explicit state schema exist? If the system crashed right now, could you look at the last saved state and know exactly where it stopped without reading conversation history?
- 0 = stateless or ad-hoc; no evidence of typed state objects
- 1 = some state management implied but no explicit schema
- 2 = typed state objects with workflow stages documented

**T — Traceable**: Can you pull a trace right now showing every LLM call, input, output, and tool call for a specific user session from last week?
- 0 = no mention of tracing or observability
- 1 = general logging present but not LLM-call-level trace replay
- 2 = full trace capability (inputs/outputs/tools/session-level) documented

**A — Auditable**: If a regulator asked today what data was used and the principal factors behind a specific decision from last month — could you answer in under 30 minutes?
- 0 = no audit capability; decisions are unrecoverable
- 1 = access logs exist but not decision records
- 2 = decision records, explainability, or regulatory compliance documented

**Tol — Tolerant**: If the workflow crashes at step 6 of 10 right now — does it resume from step 6 or restart from step 1?
- 0 = crash-and-restart; no checkpoint or resume
- 1 = basic retries but no mid-workflow resume
- 2 = explicit checkpoint/resume, idempotency, or distributed lock documented

**E — Explicit**: For every LLM call in this workflow — what is the worst thing it could output, and what stops that output from becoming a real-world action?
- 0 = LLM outputs directly trigger actions without gates
- 1 = some content filtering or confidence thresholds
- 2 = explicit validation gates, human-in-the-loop checkpoints, or output schemas

---

## Blog Post Format

```markdown
# [System Name] STATE Teardown: [Specific Insight as Subtitle]

> One-sentence thesis that names the specific gap.

## What [System] Is

[100–150 words. What it does, who uses it, why it matters to the ICP.
No marketing copy — write from the perspective of someone who has read the architecture docs.]

## The STATE Score

| Pillar | Score | One-line verdict |
|--------|-------|-----------------|
| S — Structured  | X/2 | [verdict] |
| T — Traceable   | X/2 | [verdict] |
| A — Auditable   | X/2 | [verdict] |
| Tol — Tolerant  | X/2 | [verdict] |
| E — Explicit    | X/2 | [verdict] |
| **Total**       | **X/10** | |

## Gap 1: [Name the Specific Gap]

[200–300 words. Describe the gap precisely. Cite the evidence (blog post, GitHub, docs).
Explain the production consequence — what breaks, who notices first, what it costs.
Don't moralize — describe the mechanism.]

## Gap 2: [Name the Second Gap]

[Same structure. Be specific. Name the failure mode.]

## [Optional Gap 3 if warranted]

## What Good Looks Like

[150–200 words. Concrete remediation — not "add logging," but "add a workflowId to every
LLM call and store inputs/outputs to a structured log table with the session context."
Reference STATE pillars explicitly. Don't lecture — propose.]

## The Generalizable Lesson

[100–150 words. What does this teardown teach beyond this one system?
This is the insight your ICP takes back to their team.
One clean principle, stated plainly.]

---

*Want to know how your production AI system scores? [Take the STATE assessment →](/score)*
```

---

## LinkedIn Post Format

```
[HOOK — specific, surprising, slightly uncomfortable claim. 1–2 lines.]

[SETUP — what the system built that's genuinely impressive. 2–3 lines.
Establish that this isn't a weak system. Makes the turn land harder.]

[TURN — the gap. Specific. Named. With a production consequence. 3–4 lines.
This is the "oh shit" moment. Name the exact failure mode, not a vague pattern.]

[LESSON — the generalizable principle. 1–2 lines.
Should work as a standalone insight even without the setup.]

[CLOSE — soft CTA or open question. 1 line.
Never "link in bio" or "check my post." Either a question or an implicit invitation.]
```

150–250 words total. No hashtags unless they're earning their keep. No em-dashes as decoration.

---

## Step-by-Step Protocol

### Step 0: Generate workflow_id and load candidate

```python
from datetime import datetime
WORKFLOW_ID = f"teardown-generate-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}"

# Load by name — replace with the actual candidate name
CANDIDATE_NAME = "Intercom Fin AI Engine"  # set per invocation

rows = supabase_sql(f"""
    SELECT * FROM pipeline.teardown_candidates
    WHERE LOWER(name) = LOWER('{CANDIDATE_NAME.replace("'","''")}')
    LIMIT 1
""")
if not rows:
    raise SystemExit(f"Candidate '{CANDIDATE_NAME}' not found in pipeline.teardown_candidates")

candidate = rows[0]
print(f"Loaded: {candidate['name']} (ICP: {candidate['icp_relevance']}, Yield: {candidate['content_yield']})")
```

### Step 1: Deep source research

Fetch the primary source URL and up to 3 additional sources from `candidate['sources']`. Look for:
- Architecture specifics not captured in the research phase
- Exact quotes or data points that can be cited
- Failure modes or incidents mentioned
- Engineering team's own words about trade-offs

Use WebFetch on each source. Take notes — you'll need specific evidence for Gap sections.

### Step 2: Generate the teardown

Using your research, produce:

1. **Final STATE scores** — reconsider the preliminary scores from research phase in light of what you now know. Each score needs a 2–4 sentence reasoning, not just the number.

2. **Gaps** — 2–3 specific, named gaps. Each needs:
   - The exact mechanism (what is happening architecturally)
   - The evidence (where you found it)
   - The production consequence (what breaks, who discovers it, what it costs)

3. **Full blog post** — follow the format above exactly. ~1,000–1,500 words. Ends with the `/score` CTA.

4. **LinkedIn post** — follow the format above. 150–250 words. Distill the sharpest gap into the hook.

5. **Post angle** — one sentence: "is there a post in this beyond the teardown itself?" (e.g., a follow-up angle for a different pillar, a series idea, a broader principle post)

### Step 3: Generate blog slug

```python
import re
slug = re.sub(r'[^a-z0-9]+', '-', candidate['name'].lower()).strip('-')
# e.g. "intercom-fin-ai-engine"
```

### Step 4: Write draft to Supabase

#### Structured Output Contract (REQUIRED)

The draft row has both prose fields (`full_content`, `linkedin_post`) and structured JSONB fields (`state_scores`, `gaps`, `remediation`). **Both must be populated — narrativizing gaps inside the blog post does not satisfy the structured field requirement.** The admin panel and downstream automations read from the structured columns; empty `{}` there means the work is unusable even if the blog post is excellent.

Required JSONB shapes (all keys mandatory, all string values non-empty):

```
state_scores:  {'s'|'t'|'a'|'tol'|'e': {'score': int 0-2, 'reasoning': str 2-4 sentences}}  (all 5 pillars)
gaps:          [{'pillar': str, 'gap': str, 'consequence': str, 'severity': 'high'|'medium'|'low'}]  (>=2 entries)
remediation:   [{'pillar': str, 'recommendation': str, 'priority': int}]  (>=2 entries)
```

Build them as actual values, not placeholders:

```python
def esc(v): return (str(v) if v is not None else '').replace("'", "''")

state_scores = {
    's':   {'score': final_s_score,   'reasoning': <2-4 sentence reasoning, not "...">},
    't':   {'score': final_t_score,   'reasoning': <...>},
    'a':   {'score': final_a_score,   'reasoning': <...>},
    'tol': {'score': final_tol_score, 'reasoning': <...>},
    'e':   {'score': final_e_score,   'reasoning': <...>},
}

# At least 2 gaps. Each must name the mechanism, evidence-backed consequence, severity.
gaps = [
    {'pillar': 'T', 'gap': <specific mechanism>, 'consequence': <production consequence with who notices/what costs>, 'severity': 'high'},
    {'pillar': 'S', 'gap': <...>, 'consequence': <...>, 'severity': 'high'},
]

# At least 2 remediation entries. Concrete — not "add logging."
remediation = [
    {'pillar': 'T', 'recommendation': <concrete field/schema/check>, 'priority': 1},
    {'pillar': 'S', 'recommendation': <...>, 'priority': 2},
]
```

#### Pre-Write Checklist (must pass before INSERT)

Run these assertions in the script. If any fail, fix the offending field — do NOT INSERT a draft that fails any gate:

```python
# Gate 1: state_scores has all 5 pillars with non-empty reasoning
for p in ('s','t','a','tol','e'):
    assert p in state_scores, f"missing pillar: {p}"
    assert state_scores[p]['score'] in (0,1,2), f"{p}: score must be 0/1/2"
    assert len(state_scores[p]['reasoning'].split()) >= 20, f"{p}: reasoning too short (need 2-4 sentences)"

# Gate 2: gaps array has >=2 fully-populated entries
assert len(gaps) >= 2, "need at least 2 gaps"
for i, g in enumerate(gaps):
    for k in ('pillar','gap','consequence','severity'):
        assert g.get(k), f"gap[{i}] missing or empty: {k}"
    assert g['severity'] in ('high','medium','low'), f"gap[{i}] bad severity"

# Gate 3: remediation array has >=2 fully-populated entries
assert len(remediation) >= 2, "need at least 2 remediation items"
for i, r in enumerate(remediation):
    for k in ('pillar','recommendation','priority'):
        assert r.get(k) not in (None,'',[]), f"remediation[{i}] missing or empty: {k}"

# Gate 4: full_content ends with the canonical /score CTA (lessons.md 2026-05-09)
assert '[Take the STATE assessment →](/score)' in full_content, \
    "full_content must end with the canonical /score CTA, not a series description"

# Gate 5: linkedin_post word count is 150-250
lp_words = len(linkedin_post.split())
assert 150 <= lp_words <= 250, f"linkedin_post is {lp_words} words; must be 150-250"
```

sql = f"""
    INSERT INTO pipeline.teardown_drafts
      (candidate_id, system_summary, state_scores, gaps, remediation,
       full_content, linkedin_post, post_angle, blog_slug, status, workflow_id, generation_log)
    VALUES (
      '{candidate['id']}',
      '{esc(candidate['description'])}',
      '{json.dumps(state_scores).replace("'","''")}'::jsonb,
      '{json.dumps(gaps).replace("'","''")}'::jsonb,
      '{json.dumps(remediation).replace("'","''")}'::jsonb,
      '{esc(full_content)}',
      '{esc(linkedin_post)}',
      '{esc(post_angle)}',
      '{esc(slug)}',
      'draft',
      '{WORKFLOW_ID}',
      '{json.dumps([{{"step": "generate", "model": "claude-sonnet-4-6", "output_summary": "full teardown generated"}}]).replace("'","''")}'::jsonb
    ) RETURNING id
"""
result = supabase_sql(sql)
draft_id = result[0]['id']
print(f"Draft written: {draft_id}")
```

### Step 5: Update candidate status

```python
supabase_sql(f"""
    UPDATE pipeline.teardown_candidates
    SET status = 'in_teardown', updated_at = now()
    WHERE id = '{candidate['id']}'
""")
```

### Step 6: Log and report

```python
supabase_sql(f"""
    INSERT INTO pipeline.logs (workflow_id, entity_id, step_name, stage, output_summary, model_version, status)
    VALUES ('{WORKFLOW_ID}', '{candidate['id']}', 'teardown_generated', 'complete',
            'Draft {draft_id} written for {candidate["name"]}', 'claude-sonnet-4-6', 'success')
""")
```

Print the full LinkedIn post and a 3-sentence summary of each gap so Simon can review immediately in the PR body.

---

## Output in PR Body

The PR body must include:
1. **LinkedIn post** (full text, ready to paste)
2. **Gap summary** (3 bullets: gap name + one-line consequence each)
3. **Blog slug** (the URL it will live at once published)
4. **Draft ID** in Supabase (for reference)

---

## STATE Compliance

- **S**: Draft stored as typed row with structured scores/gaps/remediation — not a free-form blob
- **T**: workflow_id on draft row and candidate update; logged to pipeline.logs
- **A**: generation_log captures model and output summary; state_scores.reasoning preserves decision chain
- **Tol**: INSERT is atomic; if run fails after insert, candidate status is not updated (safe to retry)
- **E**: No publish action taken — draft status only; Simon reviews before anything goes live
