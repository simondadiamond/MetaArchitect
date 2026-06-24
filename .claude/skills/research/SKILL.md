---
name: research
description: Deep research on a topic for The Meta Architect blog. Trigger when Simon asks to research a topic, when write-post needs research for a new post, or when Simon wants angles/hooks without committing to a full draft. Uses NotebookLM for grounded research and Supabase for brand context (humanity snippets, hooks library, existing posts).
---

## Research Process

### PHASE 1 — NotebookLM Deep Dive

Use the `notebooklm` skill. Create a notebook named `[topic] — Blog Research [YYYY-MM-DD]`.

Add any sources Simon provided. Then query with practitioner-angle questions:

1. **Failure modes** — What are the concrete, specific ways this breaks in production? Not theoretical — what actually goes wrong?
2. **The common wrong assumption** — What do most engineers believe about this that turns out to be false or incomplete?
3. **The reframe** — What's the architecture insight that changes how you'd approach this?
4. **STATE connection** — Which pillar of STATE does this connect to (Structured / Traceable / Auditable / Tolerant / Explicit)? How?
5. **Production specifics** — Any real incidents, patterns, or mechanisms that anchor this in production reality?
6. **Regulatory angle** — Does this touch Law 25, OSFI, or EU AI Act? If so, how?

Capture the answers. Note the evidence tier for each finding:
- **T1**: Named entity + specific metric + verifiable source → can use as primary claim
- **T2**: Named failure pattern + mechanism → can use as primary claim
- **T3**: General principle with specificity → supporting color only
- **T4**: Inference → never cite as fact

---

### PHASE 2 — Supabase Context Pull

```bash
export PATH="$HOME/.local/bin:$PATH"
cd /app/data/projects/simonparis-website
```

Pull brand context from the database:

```sql
-- Humanity snippets — personal operational moments Simon has lived
-- Look for ones that connect to the topic
SELECT content, tags FROM humanity_snippets LIMIT 15;

-- Hook library — proven opening lines
-- Use as starting points, never copy verbatim
SELECT hook_text, hook_type FROM hooks_library ORDER BY created_at DESC LIMIT 20;

-- Existing posts — see what's already covered, avoid overlap
SELECT slug, title, pillar, status FROM blog_posts ORDER BY created_at DESC LIMIT 20;
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
  T[1|2]: [specific failure mode + mechanism]
  T[1|2]: [specific failure mode + mechanism]
  T[3]:   [supporting context]

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
  [any T3/T4 findings that need a caveat]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If this research was triggered by `write-post`, hand the summary back to that skill's Step 3 (Outline). If it was a standalone request, present the summary to Simon and wait for direction.
