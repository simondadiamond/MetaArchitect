# Researcher Skill

Executes the three-stage research pipeline: query generation → Perplexity calls → UIF compilation + hook extraction.

---

## Stage 1: Research Architect

**Input**: `content_brief` JSON (from `ideas.content_brief` field)

**Prompt** (system):
```
You are the Research Architect for The Meta Architect content brand.
Your role: take a content brief and generate exactly 3 targeted research queries.

Brand guidelines: {brand.fields?.main_guidelines}
Brand goals: {brand.fields?.goals}
ICP: {brand.fields?.icp_short}

Output JSON with this exact schema — no other text:
{
  "queries": [
    { "query": string, "intent": "facts_context", "what_to_find": string },
    { "query": string, "intent": "statistics_data", "what_to_find": string },
    { "query": string, "intent": "contrarian_angles", "what_to_find": string }
  ]
}

Query 1 (facts_context): Target foundational facts, real-world examples, key definitions, current state of the problem.
Query 2 (statistics_data): Target quantitative data, research findings, trend numbers, failure rates, adoption metrics.
Query 3 (contrarian_angles): Target opposing views, underexplored angles, common myths to debunk, nuances practitioners miss.

Rules:
- Each query must be specific enough to return useful results (not "AI reliability" — "LLM production failure rates 2024")
- what_to_find describes what a successful result looks like for this query
- All 3 queries must relate to the same topic/angle from the brief
- Never generate more or fewer than 3 queries

Source metadata requirement:
Every query must be constructed so Perplexity is prompted to return, alongside each fact or statistic:
- The publication or organization name (not just a URL)
- Whether the source is peer-reviewed, a named survey with stated methodology, or a secondary source
- If a study is cited: sample size and study type in one line (e.g. "RCT, n=42" or "longitudinal survey, n=1,200")

Append this instruction to every query string:
"For each finding, state: (1) publication or organization name, (2) whether peer-reviewed / named survey with methodology / secondary source, (3) if a study: sample size and study type in one line."
```

**User prompt**:
```
Content brief:
{JSON.stringify(content_brief, null, 2)}

Generate 3 research queries.
```

**Validation** (before proceeding):
```javascript
function validateResearchPlan(output) {
  if (!output.queries || output.queries.length !== 3) return false;
  return output.queries.every(q => q.query && q.intent && q.what_to_find);
}
```

---

## Stage 2: Perplexity API Calls

Execute queries sequentially (Q1 → Q2 → Q3). Log each to `logs` table.

**Request pattern**:
```javascript
async function callPerplexity(query) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: query }]
    })
  });
  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    citations: data.citations ?? []
  };
}
```

**Log each call**:
```javascript
{
  step_name: "perplexity_q1",  // or q2, q3
  stage: "researching",
  output_summary: `Q1 response: ${response.content.slice(0, 200)}... Citations: ${response.citations.length}`,
  model_version: "sonar-pro",
  status: "success"
}
```

---

## Stage 3: UIF Compiler

**Input**: Research Architect output + 3 Perplexity responses + `content_brief`

**Prompt** (system):
```
You are the UIF Compiler for The Meta Architect content brand.
Your role: synthesize research findings into a Universal Intelligence File (UIF v3.0).

Brand guidelines: {brand.fields?.main_guidelines}
Brand goals: {brand.fields?.goals}
ICP: {brand.fields?.icp_short}

Output JSON matching UIF v3.0 schema EXACTLY — no other text.

UIF v3.0 SCHEMA:
{
  "meta": {
    "topic": string (required),
    "research_date": string ISO date (required),
    "provenance_log": string comma-separated log IDs (required),
    "strategic_intent": string (optional)
  },
  "core_knowledge": {
    "facts": [                         (required, min 1 item)
      {
        "statement": string (required),
        "source_url": string (required),
        "source_tier": "tier1"|"tier2"|"tier3"|"tier4" (required),
        "verified": boolean (required),
        "context": string (optional)
      }
    ]
  },
  "angles": [                          (required, min 1 item)
    {
      "angle_name": string (required),
      "contrarian_take": string (required),
      "pillar_connection": string (required — name one of the 5 content pillars, then one sentence on how this angle serves it),
      "brand_specific_angle": boolean (required — TRUE only if this angle would not work published by anyone other than The Meta Architect specifically),
      "target_persona": string (optional),
      "supporting_facts": integer[] (optional — ZERO-BASED indices into core_knowledge.facts[])
    }
  ],
  "humanity_snippets": [               (required — array, may be empty)
    {
      "suggested_tags": string[],      (tags to query the snippet bank with at draft time — e.g. ["production-incident", "late-night", "client-demo"])
      "relevance_note": string         (one sentence: what kind of personal moment would land here and why)
    }
  ],
  "distribution_formats": {            (optional object)
    "linkedin_post": string[] (opening line candidates only — NOT full posts),
    "twitter_thread": string[] (first tweet only — NOT full threads),
    "youtube_angle": string (1-2 sentences only — NOT a script)
  }
}

CRITICAL RULES:
1. distribution_formats.linkedin_post = array of opening LINE candidates only. One sentence each. Not full posts.
2. distribution_formats.twitter_thread = array of first-tweet candidates only. ≤280 chars each. Not full threads.
3. distribution_formats.youtube_angle = 1-2 sentences max. Not a script or outline.
4. supporting_facts values are ZERO-BASED INTEGER INDICES into the facts array.
   Count your facts from 0. If you have 5 facts (indices 0-4), only reference 0, 1, 2, 3, or 4.
   Never reference an index that doesn't exist.
5. No content_outline, no hooks[] per angle, no content_brief_summary in meta. This is UIF v3.0, not v2.0.
6. All string values must be non-empty.
7. INVERSION TEST — before finalizing each angle, ask: does the source data actually support this contrarian_take, or does it contradict it? If the research finding says the opposite of what you're claiming, do not use it as support. Find a different angle or leave that supporting_facts slot empty. Never invert a source's conclusion to fit a predetermined take.
8. SOURCE TIER & VERIFICATION — assign two separate fields to every fact:
   source_tier (based on source type only — never penalize for sample size; note sample size in context instead):
   - "tier1" = Peer-reviewed academic journal (PMC, Science, Nature, Frontiers, etc.) — regardless of sample size
   - "tier2" = Research org study with named methodology, government data, major named industry survey (Stack Overflow, McKinsey, Gartner, Deloitte, etc.)
   - "tier3" = Established industry publication, named analyst firm report, recognized professional body
   - "tier4" = Blog, newsletter, Substack, secondary source, or any source that summarizes another source without adding methodology
   verified (based solely on whether methodology is traceable at the source URL):
   - true = methodology is findable at the source URL
   - false = stat is a round number, no methodology link, or source is summarizing a claim from elsewhere without citing the original study
   Any fact with verified: false MUST have this exact text appended to its context field: "UNVERIFIED — do not use as a primary citation in published content without locating the original study."
9. PILLAR CONNECTION — valid pillar names are exactly: "Production Failure Taxonomy", "STATE Framework Applied", "Defensive Architecture", "The Meta Layer", "Regulated AI & Law 25". Every angle must name one and explain in one sentence how this angle serves it. If none of the 5 pillars fit, the angle is off-brand and must be replaced.
10. BRAND SPECIFIC ANGLE — set to TRUE only if this angle depends on Simon Paris's specific positioning, experience, or the STATE framework by name. A generic AI/developer take that any commentator could write = FALSE. At least 1 angle per UIF must be TRUE.
11. HUMANITY SNIPPETS — output one entry per angle that would be meaningfully improved by a personal moment. Use tags that a practitioner's story bank would be indexed by (e.g. "production-incident", "late-night", "client-demo", "debugging", "wrong-model", "hallucination", "compliance", "origin-story"). If the angle is purely data-driven and a personal moment would not add value, omit it. If no angles need a snippet, output an empty array — but this should be rare.
```

**User prompt**:
```
Content brief:
{JSON.stringify(content_brief, null, 2)}

Research findings:
Q1 (Facts/Context): {q1_response}
Q2 (Statistics): {q2_response}
Q3 (Contrarian Angles): {q3_response}

Compile the UIF v3.0.
```

---

## Stage 4: Hook Extraction

After UIF is validated, extract hooks from angles and write to `hooks_library`.

**Hook generation prompt** (per angle):
```
For this content angle, generate 1-2 scroll-stopping opening lines (hooks) for LinkedIn.

Angle: {angle.angle_name}
Contrarian take: {angle.contrarian_take}
Supporting facts: {angle.supporting_facts.map(i => uif.core_knowledge.facts[i].statement)}

For each hook, classify the type:
- contrarian: challenges a common belief
- stat_lead: opens with a specific number or data point
- question: opens with a genuine question the reader needs answered
- story_open: opens in a specific moment (scene-setting)
- provocative_claim: makes a strong claim without hedging

Output JSON array:
[{ "hook_text": string, "hook_type": "contrarian"|"stat_lead"|"question"|"story_open"|"provocative_claim" }]
```

**Write to hooks_library** (one record per hook):
```javascript
{
  hook_text: hook.hook_text,
  hook_type: hook.hook_type,
  source_idea: [ideaRecordId],   // linked record — array
  angle_name: angle.angle_name,
  intent: idea.intent,
  status: "candidate",
  use_count: 0,
  avg_score: null
}
```

---

## UIF v3.0 Validation (via state-checker)

The state-checker `validateUIF()` function is the gate before any Airtable write.
See `state-checker.md` for the full validation function.

Required checks before proceeding:
- `meta.topic`, `meta.research_date`, `meta.provenance_log` — non-empty strings
- `core_knowledge.facts` — array, min 1 item, each with `statement` and `source_url`
- `angles` — array, min 1 item, each with `angle_name` and `contrarian_take`
- `supporting_facts` indices — all integers, all in bounds of facts array
- `distribution_formats` items — strings if present, not objects
