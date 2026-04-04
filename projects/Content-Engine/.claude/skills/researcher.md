# Researcher Skill

Executes the research pipeline: NLM deep research → grounded angle extraction → UIF compilation + hook extraction.

---

## Stage 1: Query Derivation (deterministic)

**Input**: `contentBrief` + `targetAngle` + current year

No LLM call needed. Derive the NLM research query from existing data:

```javascript
const currentYear = new Date().getFullYear();
const researchQuery = `${contentBrief.topic} — ${targetAngle.contrarian_take} — ${currentYear}`;

// Year-anchor gate (required — same rule as /capture)
if (!researchQuery.includes(String(currentYear))) {
  throw new Error(`/research aborted: query missing ${currentYear} year anchor`);
}
```

The query combines topic + contrarian_take to direct NLM toward the specific angle being deepened, not a broad overview (shallow research already covered that).

---

## Stage 2: NotebookLM Deep Research

Four sequential MCP calls. Log each to `logs` table.

**2a. Start research**
```javascript
// MCP: mcp__notebooklm-mcp__research_start
//   query: researchQuery
//   source: "web"
//   mode: "deep"   ← ~5 min, ~40 sources
//   title: `Research: ${contentBrief.topic} — ${new Date().toISOString().slice(0,10)}`
// Returns: { task_id, notebook_id }
```

**2b. Poll for completion**
```javascript
// MCP: mcp__notebooklm-mcp__research_status
//   notebook_id, task_id
//   poll_interval: 30      ← seconds between polls
//   max_wait: 360          ← 6 min max
//   compact: false         ← get full source list
// Returns: { status: "completed"|"error", sources_found: N, sources: [...] }
// Gate: if status !== "completed" → throw error
```

**2c. Import top web sources**
```javascript
// MCP: mcp__notebooklm-mcp__research_import
//   notebook_id, task_id
//   source_indices: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
//   NOTE: skip index 0 (result_type=5, deep_report) — it's internal to the notebook
//         and automatically informs queries; importing it as a source adds no value
// Returns: { imported_count, imported_sources: [{ id, title }] }
```

**2d. Query notebook — extract grounded angle facts**
```javascript
// MCP: mcp__notebooklm-mcp__notebook_query
//   notebook_id
//   query: <angle extractor prompt below>
// Returns: { answer, sources_used, citations, conversation_id }
// Gate: if answer is empty → throw error
```

**Angle extractor prompt** (used in 2d):
```
You are the Angle Extractor for The Meta Architect brand (AI Reliability Engineering, "State Beats Intelligence" thesis).

Target angle to deepen:
- angle_name: {targetAngle.angle_name}
- contrarian_take: {targetAngle.contrarian_take}
- pillar_connection: {targetAngle.pillar_connection}

ICP context: The practitioner reading this has been paged at 2am because an LLM hallucinated.
Their reality: non-deterministic outputs, no stack trace, compliance asking "can we log why the agent did this?",
leadership demanding GenAI yesterday. Their language: "debugging is a game of chance" /
"clever demo duct-taped into production" / "prompt whack-a-mole" / "it's not about the model — it's about the plumbing."

Existing facts already in the UIF (do not repeat these):
{existingUIF.core_knowledge.facts.map((f,i) => `[${i}] ${f.statement}`).join('\n')}

Extract 3-5 NEW facts from the sources that deepen the target angle above.
For each fact:
- grounding_quote: exact sentence from the source (not a paraphrase)
- source_name: publication or organization name
- source_url: URL
- source_tier: "tier1"|"tier2"|"tier3"|"tier4" (same rules as UIF schema)
- verified: true if methodology traceable at source URL, false if secondary/round number
- stat: specific number/percentage if available

Self-check per fact (cut any that fail):
✓ Can you quote a specific sentence from the source? If not → cut it.
✓ Does it directly support the contrarian_take above?
✓ Is it new — not already in the existing facts list?

Output JSON array of fact objects only. No preamble.
```

**Log entries**:
```javascript
// 2a: step_name: "nlm_research_start", model_version: "notebooklm-deep"
// 2c: step_name: "nlm_research_import", model_version: "notebooklm-deep"
// 2d: step_name: "nlm_angle_query",    model_version: "notebooklm-deep"
```

---

## Stage 3: UIF Compiler

**Input**: NLM `notebook_query` answer (grounded facts JSON array) + `existingUIF` + `angleIndex` + `content_brief`

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

Existing UIF (deepen angle at index {angleIndex} only — do not modify other angles):
{JSON.stringify(existingUIF, null, 2)}

New facts from NotebookLM deep research (grounded, cited):
{nlmQueryResult.answer}

Merge the new facts into existingUIF.core_knowledge.facts (append, no duplicates).
Update existingUIF.angles[{angleIndex}].supporting_facts with the indices of newly added facts.
Return the full updated UIF v3.0 object.
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
