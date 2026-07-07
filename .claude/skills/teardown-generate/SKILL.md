---
name: teardown-generate
description: Use when Simon selects a candidate and says "teardown [name]", "generate the teardown", or asks to turn a pipeline.teardown_candidates row into a full teardown. Do NOT trigger for finding/scoring new candidates (teardown-research) or for making derivatives of an already-generated teardown (repurpose).
---

# /teardown-generate

## Purpose

Take a candidate from `pipeline.teardown_candidates`, do deep source research, and produce:
1. Full STATE scoring with per-pillar reasoning (not just 0/1/2 — the *why*)
2. 2–3 specific gaps with production consequences
3. Remediation recommendations (concrete, not generic) — including at least one real artifact snippet
4. A full blog post (~1,000–1,500 words) for `simonparis.ca/blog/<slug>`
5. A LinkedIn post (180–300 words, generated per the /repurpose skill's linkedin playbook — see LinkedIn Post Format below)
6. An outreach kit: personalizable DM template + 2–3 alternate LinkedIn hooks

The teardown has three conversion jobs: make the reader self-diagnose, prove the paid audit's
quality by sample, and produce outreach ammo. Every section serves one of those.

**Voice**: practitioner-to-practitioner. "I built this because I use it." No marketer-speak. No softening. If the system has a serious gap, name it specifically.

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

## STATE Scoring Reference

Canonical rubric: `.claude/skills/_shared/state-scoring-rubric.md` (repo root) — read it before
scoring; never fork a local variant.

Deltas specific to this skill:
- Score from the **Step 1 deep-research evidence**, not assumption — reconsider the research
  phase's preliminary scores in light of what you now know.
- Every final score carries **2–4 sentences of reasoning** (Gate 1 enforces this), preserving
  the evidence chain: what source says what, and what that implies.

---

## Pillar Framings & Self-Score Bank

Use the framing (adapted, 1–2 sentences — don't paste verbatim) to open the gap section for that
pillar; use the matching self-score question to close it. This is the same rubric as /readiness —
deliberately. The reader should recognize the paid instrument inside the free artifact.

| Pillar | Framing (adapt) | Self-score question |
|---|---|---|
| S | Production AI systems fail when they reconstruct business state from conversation history instead of carrying it as an explicit object. | If your agent crashed mid-workflow right now, what happens to the work in progress — and have you tested it? |
| T | When an LLM system misbehaves in production, the first question is: what exactly did it receive, what did it produce, and when? If you can't answer that after the fact, you're flying blind. | Could you reconstruct exactly what happened in any specific LLM call from the past 30 days? |
| A | In regulated environments, "the model did something unexpected" is not an acceptable explanation. | If a regulator asked what data drove one specific decision last month, could you answer in under 30 minutes? |
| Tol | A system that only works in the forward-motion state is a demo. Production systems fail at step 6 of 10. | If your workflow died at step 6 right now, does it resume from step 6 — or have you never tested it? |
| E | Every point where LLM output crosses into real-world action is a risk boundary. | Can your system take a high-risk action on LLM output alone, with no deterministic check or human gate in between? |

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

[STATE Index line — ONLY if ≥2 teardowns are already published (query pipeline.teardown_drafts
WHERE status = 'published'). One line: "STATE Index so far: [System A] X/10 · [System B] X/10 ·
[this system] X/10 — [full index →](/blog)". Skip entirely below the threshold —
a benchmark of one is an opinion.]

## What [System] Gets Right

[100–150 words. At least one strength, held to the SAME evidence standard as the gaps — cite the
doc/repo/post. Anchor to the highest-scoring pillar. If no pillar scores 2/2, say that plainly
("nothing here earns a 2 — and that's the story") instead of manufacturing praise. This section
is what makes the gaps read as diagnosis, not attack. Senior practitioners smell hit pieces.]

## Gap 1: [Name the Specific Gap — question-form H2 when natural, e.g. "Can It Resume From Step 6?"]

[Open with 1–2 sentences adapted from the pillar framing (Pillar Framings & Self-Score Bank above).
Then 200–300 words. Describe the gap precisely. Cite the evidence (blog post, GitHub, docs).
Explain the production consequence — what breaks, who notices first, what it costs.
Don't moralize — describe the mechanism.]

[LINKS — across the full post, required (lessons: Ramp teardown 2026-07-05 shipped 1,650 words
with zero hyperlinks): EVERY research source becomes a markdown link — first mention at minimum,
and again at later natural mentions (a source discussed in three sections gets an anchor in each).
Aim for 8–12 total links per post. Evidence name-dropped but not linked is off-brand — the whole
pitch is evidence over vibes, and outbound links are basic SEO/E-E-A-T. Also include ≥1 internal
link beyond the CTA lines (e.g. [teardown](/blog); once ≥2 teardowns are published, link the index).]

[STYLE — ration em dashes; dense em dashes read as generated text. Budget: roughly one per 150
words across the post (score-table pillar labels and verbatim quotes count against it, so prose
gets few). Prefer periods, colons, commas, and parentheses; save the em dash for the one or two
sentences per section that earn it.]

**Score yourself:** [The matching self-score question from the bank, addressed to the reader.]

## Gap 2: [Name the Second Gap]

[Same structure: framing opener → mechanism → evidence → consequence → **Score yourself:** close.]

## [Optional Gap 3 if warranted]

## What Good Looks Like

[150–200 words. Concrete remediation — not "add logging," but "add a workflowId to every
LLM call and store inputs/outputs to a structured log table with the session context."
Reference STATE pillars explicitly. Don't lecture — propose.

MUST include at least one real artifact in a fenced code block — a state object schema, a
decision-record row, a checkpoint pattern. This is a free sample of the paid audit deliverable;
it must be correct and production-quality, not pseudocode decoration.]

## The Generalizable Lesson

[100–150 words. What does this teardown teach beyond this one system?
This is the insight your ICP takes back to their team.
One clean principle, stated plainly.]

## FAQ

[Exactly 3 questions, phrased the way the ICP would ask an AI assistant — e.g. "Is [System] safe
for regulated data?", "Does [System] log LLM decisions?", "Does Law 25 apply to [category]?"
Each answer 2–4 sentences, self-contained and citable on its own (AEO). Across the full post,
at least 2 H2/H3 headings must be question-form.]

---

[FOUNDING CTA — include ONLY while the founding program copy is live on /work-with-me; omit
until then. Check the live page for the current slot count — don't hardcode a stale number:]
*I run this same scoring against interior evidence — logs, schemas, incidents — for founding
clients. [N] Production AI Audit slots at the founding rate; the slot count is real and lives
in a database I don't hand-edit. [See the founding program →](/work-with-me)*

*Want to know how your production AI system scores? [Take the STATE assessment →](/score)*
```

---

## LinkedIn Post Format

Generate and validate the LinkedIn post against the shared LinkedIn stack — read both files
before drafting; don't work from memory:

- **Playbook** (hook library, post anatomy, anti-slop checklist, platform mechanics):
  `.claude/skills/repurpose/references/linkedin-playbook.md`
- **Copy gate** (canonical validation for ALL LinkedIn producers — word count 180–300, link
  rule for the body, zero em dashes, claim provenance, `/score` CTA cadence):
  `.claude/skills/repurpose/references/linkedin-gate.md`

Every candidate passes the gate before being shown to Simon and re-passes it after any edit.
If a check needs to change, change it in the gate file — never fork a local variant here.
The gate's word count (180–300) is the rule; it replaces the old 250-word cap.

Teardown-specific deltas (the only LinkedIn rules that live in this skill):
- Draft 2–3 candidates on different angles (score/receipts, single-worst-gap,
  remediation-pattern), each using a different hook pattern from the playbook's hook library.
  Keep the strongest as `linkedin_post`; the runner-up hooks feed the outreach kit's
  `alt_hooks` (each angling a different pillar or gap, per the Outreach Kit Format).
- **Hybrid rule for the chosen `linkedin_post`** (Simon's call, 2026-07-06, after comparing
  the two Ramp posts): whichever angle wins, the final post must carry BOTH of these or it
  isn't the winner —
  1. a **save-worthy artifact**: the five-pillar scorecard with per-pillar 0–2 scores, or an
     equally referenceable checklist/field list pulled from the teardown;
  2. a **concrete failure-mechanism moment**: one passage stating what physically goes wrong
     mid-run and its consequence, at the caliber of "a timeout mid-approval means the approval
     is recorded and the side effects never happen, or something retries blind and the action
     happens twice" — not an abstract gap statement.
  A scorecard post without a visceral mechanism reads like a report card; a mechanism post
  without an artifact gets read and never saved. The published post needs both.
- The gate's zero-em-dash rule extends to the **DM template and every alt hook** — the gate
  only covers the post body; the outreach kit holds to the same bar.

The flow stays self-contained: the chosen post is still written to
`teardown_drafts.linkedin_post` in Step 4 below — only the generation guidance changed.

---

## Outreach Kit Format

Every teardown also produces sales ammo — this is half the point of the artifact.

**DM template** (40–80 words; keep `{name}` and `{their_pattern}` placeholders in — Simon
personalizes before sending, this is a template, not a send-as-is message):

```
{name}, I published a STATE teardown of [System]: X/10, sharpest gap is [gap in ~5 words].
Your {their_pattern} runs the same pattern. The public version works from public evidence
only; the interesting version of this scoring uses interior access. Teardown: [URL].
Worth 30 minutes?
```

**Alternate hooks** — 2–3 additional LinkedIn hook lines (first 1–2 lines only), each angling
a *different* pillar or gap, so one teardown feeds multiple posts on different days
(roadmap 3.6c: every blog post → 2–3 LinkedIn posts).

---

## Step-by-Step Protocol

### Step 0: Generate workflow_id and load candidate

```python
import re
from datetime import datetime
WORKFLOW_ID = f"teardown-generate-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}"
MODEL_ID    = '<the id of the model that actually ran>'  # set at runtime — never hardcode a model id

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
slug = re.sub(r'[^a-z0-9]+', '-', candidate['name'].lower()).strip('-')  # e.g. "intercom-fin-ai-engine"
print(f"Loaded: {candidate['name']} (ICP: {candidate['icp_relevance']}, Yield: {candidate['content_yield']}) → slug: {slug}")
```

### Step 1: Deep source research

Fetch the primary source URL and up to 3 additional sources from `candidate['sources']`. Look for:
- Architecture specifics not captured in the research phase
- Exact quotes or data points that can be cited
- Failure modes or incidents mentioned
- Engineering team's own words about trade-offs

Use WebFetch on each source. Take notes — you'll need specific evidence for Gap sections.
Keep every fetched URL in a `source_urls` list; the pre-write checklist (Gate 10b) asserts
each one appears as a markdown link in the post.

**Checkpoint (Tol):** before generation begins, persist the research notes (including
`source_urls`, key quotes with their URLs, and any preliminary score revisions) to
`projects/Content-Engine/.tmp/teardown-research-notes-<slug>.md`. If the session crashes
mid-generation, the rerun resumes from that file instead of re-fetching every source.

**Claim provenance (2026-07-07 lesson — the Ramp 65% + shadow-mode incident):** every
external-world claim in the article must be traceable to a **verbatim sentence you actually
fetched**. This covers three claim types, each of which failed that day:
1. **Numbers** (percentages, multipliers, counts — anything not Simon's own STATE scores):
   preserve the source's scope and qualifiers ("at Ramp itself", "more than 65%", "since
   deployment").
2. **Process/architecture narratives** ("ran in shadow mode against human ground truth until
   accuracy cleared a threshold"): do not sharpen what the source describes into a
   better-sounding industry pattern — Ramp's sources describe *suggestion mode*, and "shadow
   mode" was invented in the write-up, then propagated into the title, FAQ, and 3 LinkedIn posts.
3. **Attributed statements** ("ZenML says it plainly: …"): the named source must literally say
   it. Deriving a conclusion from a source's *silence* is fine — but attribute it to yourself
   ("crash recovery isn't described anywhere"), never to the source.
If a claim came from the research phase but you can't find it in any source you fetched in
Step 1, WebFetch until you find its primary source and add that URL to `source_urls` — or cut
the claim. An unsourced claim is a gate failure, not a style issue: derivatives inherit it and
it ends up on LinkedIn.

### Step 2: Generate the teardown

Using your research, produce:

1. **Final STATE scores** — reconsider the preliminary scores from research phase in light of what you now know. Each score needs a 2–4 sentence reasoning, not just the number.

2. **Gaps** — 2–3 specific, named gaps. Each needs:
   - The exact mechanism (what is happening architecturally)
   - The evidence (where you found it)
   - The production consequence (what breaks, who discovers it, what it costs)

3. **Full blog post** — follow the format above exactly. ~1,000–1,500 words. Includes: "What
   [System] Gets Right" section, pillar-framing openers + **Score yourself:** close on every gap,
   artifact snippet in "What Good Looks Like", 3-question FAQ, ≥2 question-form headings,
   conditional STATE Index line, conditional founding CTA, and the `/score` CTA.

4. **LinkedIn post** — follow the LinkedIn Post Format section above (repurpose playbook process: candidates, anatomy, anti-slop). 180–300 words. Distill the sharpest gap into the hook.

5. **Outreach kit** — DM template (40–80 words, placeholders intact) + 2–3 alternate hooks,
   per the Outreach Kit Format above.

6. **Post angle** — one sentence: "is there a post in this beyond the teardown itself?" (e.g., a follow-up angle for a different pillar, a series idea, a broader principle post)

### Step 3: Blog slug

Already computed in Step 0 (`slug`) — it also names the Step 1 checkpoint file. Reuse it here;
don't derive it twice.

### Step 4: Write draft to Supabase

#### Structured Output Contract (REQUIRED)

The draft row has both prose fields (`full_content`, `linkedin_post`) and structured JSONB fields (`state_scores`, `gaps`, `remediation`). **Both must be populated — narrativizing gaps inside the blog post does not satisfy the structured field requirement.** The admin panel and downstream automations read from the structured columns; empty `{}` there means the work is unusable even if the blog post is excellent.

Required JSONB shapes (all keys mandatory, all string values non-empty). Every enum-constrained
field shows its literal allowed values (lessons.md 2026-07-05) — `pillar` is always lowercase,
exactly one of `'s' | 't' | 'a' | 'tol' | 'e'`:

```
state_scores:  {'s'|'t'|'a'|'tol'|'e': {'score': int 0-2, 'reasoning': str 2-4 sentences}}  (all 5 pillars)
gaps:          [{'pillar': 's'|'t'|'a'|'tol'|'e', 'gap': str, 'consequence': str, 'severity': 'high'|'medium'|'low'}]  (>=2 entries)
remediation:   [{'pillar': 's'|'t'|'a'|'tol'|'e', 'recommendation': str, 'priority': int}]  (>=2 entries)
```

Any prompt/JSON schema shown to an LLM to produce these structures must spell out those same
literal pillar values — never `'pillar': str`.

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
# pillar: lowercase, one of 's'|'t'|'a'|'tol'|'e' (Gate 2b enforces).
gaps = [
    {'pillar': 't', 'gap': <specific mechanism>, 'consequence': <production consequence with who notices/what costs>, 'severity': 'high'},
    {'pillar': 's', 'gap': <...>, 'consequence': <...>, 'severity': 'high'},
]

# At least 2 remediation entries. Concrete — not "add logging."
remediation = [
    {'pillar': 't', 'recommendation': <concrete field/schema/check>, 'priority': 1},
    {'pillar': 's', 'recommendation': <...>, 'priority': 2},
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

# Gate 2b: pillar enum — normalize case, then require the literal allowed values
# (lessons.md 2026-07-05: every enum-constrained field must show its literal allowed values)
PILLARS = {'s','t','a','tol','e'}
for i, entry in enumerate(gaps + remediation):
    entry['pillar'] = str(entry['pillar']).lower()
    assert entry['pillar'] in PILLARS, \
        f"entry[{i}] bad pillar {entry['pillar']!r} — must be one of 's','t','a','tol','e'"

# Gate 3: remediation array has >=2 fully-populated entries
assert len(remediation) >= 2, "need at least 2 remediation items"
for i, r in enumerate(remediation):
    for k in ('pillar','recommendation','priority'):
        assert r.get(k) not in (None,'',[]), f"remediation[{i}] missing or empty: {k}"

# Gate 4: full_content ends with the canonical /score CTA (lessons.md 2026-05-09)
# (founding CTA above it is conditional — Gate 10b checks the live page at run time)
assert '[Take the STATE assessment →](/score)' in full_content, \
    "full_content must end with the canonical /score CTA, not a series description"

# Gate 5: linkedin_post word count is 180-300 (repurpose linkedin playbook, 2026-07-05)
lp_words = len(linkedin_post.split())
assert 180 <= lp_words <= 300, f"linkedin_post is {lp_words} words; must be 180-300"

# Gate 6: "Gets Right" section present (credibility gate — gaps must read as diagnosis, not attack)
assert 'Gets Right' in full_content, "missing 'What [System] Gets Right' section"

# Gate 7: every gap closes with a self-score question
assert full_content.count('**Score yourself:**') >= len(gaps), \
    "each gap section must close with a **Score yourself:** line"

# Gate 8: 'What Good Looks Like' section exists and contains a fenced artifact snippet
assert '## What Good Looks Like' in full_content, "missing '## What Good Looks Like' section"
wgll = full_content.split('## What Good Looks Like')[1].split('\n## ')[0]
assert '```' in wgll, "What Good Looks Like must include a fenced artifact snippet"

# Gate 9: FAQ section present
assert '## FAQ' in full_content, "missing 3-question FAQ section"

# Gate 10: >= 2 question-form H2/H3 headings (AEO)
import re as _re
_qh = [h for h in _re.findall(r'^#{2,3} (.+)$', full_content, _re.M) if h.strip().endswith('?')]
assert len(_qh) >= 2, f"need >= 2 question-form headings, found {len(_qh)}"

# Gate 10b: links (lessons: Ramp teardown 2026-07-05 shipped with zero hyperlinks)
_links = _re.findall(r'\[[^\]]*\]\((\S+?)\)', full_content)
for _src in source_urls:  # every research source must be linked
    assert f']({_src})' in full_content, f"source not linked: {_src}"
_int = [u for u in _links if u.startswith('/') and u not in ('/score', '/work-with-me')]
assert _int, "need an internal link beyond the CTA lines (e.g. [teardown](/blog))"

# Founding CTA — conditional on the LIVE page, checked at run time (a temporary condition
# must be code, not a comment). As of 2026-07-07: /work-with-me is 200, /audit 308-redirects
# to it — /work-with-me is the founding CTA target.
import urllib.request as _ur
try:
    _page = _ur.urlopen(_ur.Request('https://simonparis.ca/work-with-me',
                                    headers={'User-Agent': 'Mozilla/5.0'})).read().decode('utf-8', 'replace')
    founding_live = 'founding' in _page.lower()
except Exception:
    founding_live = False   # page unreachable/gone → treat the program as not live
if founding_live:
    assert '](/work-with-me)' in full_content, "founding program live: include the founding CTA"
else:
    assert '](/work-with-me)' not in full_content, \
        "founding program not live: drop the founding CTA (keep only the /score CTA)"

assert not _re.search(r'\[[^\]]*\]\(\S+?\)', linkedin_post), \
    "linkedin_post: no markdown links — LinkedIn strips markdown; if it carries a URL it is bare, max 1 (shared linkedin-gate rule)"

# Gate 10c: em-dash budget (dense em dashes read as generated text)
_w = len(full_content.split())
assert full_content.count('—') <= max(8, -(-_w // 150)), \
    f"{full_content.count('—')} em dashes in {_w} words — vary the punctuation"
# LinkedIn surfaces: ZERO em dashes (the ICP reads them as the ChatGPT signature)
assert '—' not in linkedin_post, "linkedin_post: zero em dashes"
assert '—' not in dm_template, "dm_template: zero em dashes"
assert all('—' not in h for h in alt_hooks), "alt_hooks: zero em dashes"

# Gate 11: outreach kit populated
assert 40 <= len(dm_template.split()) <= 80, f"dm_template is {len(dm_template.split())} words; must be 40-80"
assert '{name}' in dm_template and '{their_pattern}' in dm_template, "dm_template must keep personalization placeholders"
assert len(alt_hooks) >= 2, "need >= 2 alternate LinkedIn hooks"
```

#### Idempotent write (Tol — resume/replace, never duplicate)

The outreach kit lives in an `outreach` jsonb column (`{'dm_template': str, 'alt_hooks': [str]}`).
If the column doesn't exist yet, add it first (idempotent):
`ALTER TABLE pipeline.teardown_drafts ADD COLUMN IF NOT EXISTS outreach jsonb;`

Before writing, check for an existing non-archived draft for this candidate. A rerun after a
crash, or a deliberate regenerate, must UPDATE that row — a second row for the same candidate
is a bug, not a version.

```python
outreach = {'dm_template': dm_template, 'alt_hooks': alt_hooks}

log_entry = json.dumps({'step': 'generate', 'model': MODEL_ID,
                        'output_summary': 'full teardown generated',
                        'workflow_id': WORKFLOW_ID}).replace("'", "''")

existing = supabase_sql(f"""
    SELECT id, status FROM pipeline.teardown_drafts
    WHERE candidate_id = '{candidate['id']}' AND status != 'archived'
    ORDER BY created_at DESC LIMIT 1
""")

if existing:
    draft_id = existing[0]['id']
    print(f"Existing draft {draft_id} (status: {existing[0]['status']}) — replacing in place")
    supabase_sql(f"""
        UPDATE pipeline.teardown_drafts SET
          system_summary = '{esc(candidate['description'])}',
          state_scores   = '{json.dumps(state_scores).replace("'","''")}'::jsonb,
          gaps           = '{json.dumps(gaps).replace("'","''")}'::jsonb,
          remediation    = '{json.dumps(remediation).replace("'","''")}'::jsonb,
          full_content   = '{esc(full_content)}',
          linkedin_post  = '{esc(linkedin_post)}',
          outreach       = '{json.dumps(outreach).replace("'","''")}'::jsonb,
          post_angle     = '{esc(post_angle)}',
          blog_slug      = '{esc(slug)}',
          status         = 'draft',
          workflow_id    = '{WORKFLOW_ID}',
          generation_log = generation_log || '[{log_entry}]'::jsonb,
          updated_at     = now()
        WHERE id = '{draft_id}'
    """)
else:
    result = supabase_sql(f"""
        INSERT INTO pipeline.teardown_drafts
          (candidate_id, system_summary, state_scores, gaps, remediation,
           full_content, linkedin_post, outreach, post_angle, blog_slug, status, workflow_id, generation_log)
        VALUES (
          '{candidate['id']}',
          '{esc(candidate['description'])}',
          '{json.dumps(state_scores).replace("'","''")}'::jsonb,
          '{json.dumps(gaps).replace("'","''")}'::jsonb,
          '{json.dumps(remediation).replace("'","''")}'::jsonb,
          '{esc(full_content)}',
          '{esc(linkedin_post)}',
          '{json.dumps(outreach).replace("'","''")}'::jsonb,
          '{esc(post_angle)}',
          '{esc(slug)}',
          'draft',
          '{WORKFLOW_ID}',
          '[{log_entry}]'::jsonb
        ) RETURNING id
    """)
    draft_id = result[0]['id']

print(f"Draft written: {draft_id}")
```

### Step 4b: Save the post to pipeline.posts (with media)

Every teardown's chosen LinkedIn post ALSO lands in `pipeline.posts` so it flows through
`/review` → `/publish` with everything else (Simon's call, 2026-07-06 — no more posts living
only inside `teardown_drafts`).

The teardown card image is a **deterministic URL, not a stored asset** — same params, same
pixels. Build it from the scores (pillar digit order: S, T, A, Tol, E):

```python
from urllib.parse import quote
card_url = (f"https://simonparis.ca/api/og/teardown?name={quote(system_name)}"
            f"&score={total_score}"
            f"&pillars={s_score}{t_score}{a_score}{tol_score}{e_score}")
# optional: &n=<issue number> and &verdict=<one line, max 8 words, URL-encoded>
```

Insert (same `supabase_sql` mechanism):

```python
media = {'card_url': card_url, 'carousel_urls': None}  # carousel filled by the carousel builder later
sql = f"""
    INSERT INTO pipeline.posts
      (platform, status, intent, format, pillar, post_class,
       source_angle_name, thesis_angle, draft_content, drafted_at, media)
    VALUES ('linkedin', 'drafted', 'authority', 'image', 'STATE Framework Applied', 'teardown',
      '{esc(winning_hook_pattern)}', '{esc(winning_angle_rationale)}',
      '{esc(linkedin_post)}', now(), '{json.dumps(media).replace("'","''")}'::jsonb)
    RETURNING id
"""
```

- `format` is `'image'` because the post ships with the card attached (download the PNG from
  `card_url` at publish time and attach it; the first comment still carries the teardown link).
- **Preview rule (long parameterized URLs are a truncation hazard — lesson 2026-07-06):** never
  paste `card_url` into chat for Simon to preview. Download the PNG
  (`curl -s -o projects/Content-Engine/.tmp/teardown-card-<slug>.png "<card_url>"`) and present
  the image file directly. The URL itself only ever travels inside the `media` jsonb and logs.
- **If the insert fails with `column posts.media does not exist`**: the media-column migration
  (`ALTER TABLE pipeline.posts ADD COLUMN IF NOT EXISTS media jsonb NOT NULL DEFAULT '{}'::jsonb;`)
  hasn't been applied yet — apply it if you have Management API access, else insert WITHOUT the
  media field, put `card_url` in the log `output_summary`, and tell Simon explicitly. Never
  silently drop the card URL.
- Log the write: `step_name: 'teardown_post_saved'`, `entity_id` = the new posts row id,
  `output_summary` naming the source draft id and the card URL.

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
            'Draft {draft_id} written for {candidate["name"]}', '{MODEL_ID}', 'success')
""")
```

Then print the output contract below in chat — Simon reviews it there.

---

## Output Contract (print in chat)

This skill runs in interactive Sterling sessions; the review surface is the chat itself. Print:
1. **LinkedIn post** (full text, ready to paste)
2. **Gap summary** (one bullet per gap: gap name + one-line consequence)
3. **DM template** (ready to personalize — this is the founding-slot outreach ammo)
4. **Alternate hooks** (2–3, for repurposed posts on later days)
5. **Blog slug** (the URL it will live at once published)
6. **Draft ID** in Supabase (for reference)

---

## STATE Compliance

- **S**: Draft stored as typed row with structured scores/gaps/remediation — not a free-form blob
- **T**: workflow_id on draft row and candidate update; logged to pipeline.logs
- **A**: generation_log captures model and output summary; state_scores.reasoning preserves decision chain
- **Tol**: Step 1 notes persist to `.tmp/teardown-research-notes-<slug>.md` before generation (crash checkpoint); the Step 4 write is idempotent — an existing non-archived draft for the candidate is updated in place, never duplicated (safe to retry at any stage)
- **E**: No publish action taken — draft status only; Simon reviews before anything goes live
