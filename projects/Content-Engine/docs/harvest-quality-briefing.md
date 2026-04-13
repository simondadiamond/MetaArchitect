# Harvest Research Quality Briefing
**Date:** 2026-04-06  
**For:** Fix agent implementing research quality improvements  
**Produced by:** Analysis agent (read-only investigation)

---

## Executive Summary

- **What's working:** NLM gap-fill (Steps 5–9) produces full multi-source synthesis. Query 1 breadth test returned ~850 words, named 8 distinct sources, synthesized across all of them — this is genuine cross-notebook synthesis, not a skim.
- **What's broken:** Corpus mining (Step 0) passes a single synthetic 2–3 sentence observation to the Angle Extractor. The Angle Extractor receives no contrarian body and no multi-source context — producing 1 angle per idea from 1 observation. NLM gap-fill produces 2–3 angles from Q1 + Q2 (two full research bodies). That is the depth gap.
- **What's broken (stat):** The "17x error amplification" stat (idea `recr1VYiGQnAfrBXs`) is sourced exclusively from runcycles.io, a secondary blog. The NLM notebook confirms no direct URL or link to the original Google Research paper exists in any imported source. The UIF marks it `verified: false` but the pipeline has no gate that reads this flag.
- **Highest-impact fix:** Add a `verified: false` gate at `/draft` Step 8 (before `generateDraft`). Currently documented as `BACKLOG GAP-2` in draft.md with no enforcement — the writer skill receives the citation rules but nothing blocks a `verified: false` fact from becoming a standalone anchor claim.
- **Second fix:** Rephrase the `notebook_query` in `callNLMResearch` from the raw Perplexity query string to a synthesis-framed question. The current implementation passes `query` verbatim (e.g. "LangChain LangGraph production failure... 2025") to `notebook_query`. The contrarian query test (Query 2 breadth) returned ~700 words citing 5 distinct sources with strong synthesis — showing the NLM engine responds well to synthesis-framed prompts.
- **Open question:** The `source_tier` on the 17x stat is `tier2` in the UIF but `runcycles.io` is a blog — that is a `tier4` source. The tier was assigned to the attributed source (Google Research) rather than the actual source URL. The UIF schema does not prevent this; `validateUIF` does not check that `source_tier` matches `source_url` domain.

---

## Finding 1: Research Depth Per Angle

**Pipeline data flow (filled from SOP reads):**

```
Stage           | Input to Angle Extractor                         | Max angles | verified flag enforced downstream?
----------------|--------------------------------------------------|------------|------------------------------------
Corpus mining   | 1 synthetic observation (2–3 sentences + anchor) | 1–3*       | No — /draft and /review do not gate on verified
NLM gap-fill    | Q1 (facts/incidents) + Q2 (contrarian angles)    | 2–3        | No — same gap
/capture        | Q1 + Q2 + Q3 (3 full NLM research bodies)        | 3–5        | No — same gap
/draft          | reads Intelligence File (UIF)                    | n/a        | Soft only (writer.md citation rules, no code gate)
/review Pass 2  | reads draft_content inline                       | n/a        | No — fidelityReport checks brand/platform fit, not verified flags
```

*Corpus mining: `validateUIF` requires min 1 angle. The Angle Extractor prompt in researcher.md says "Extract 3–5 NEW facts" — but for corpus mining the input body is a single 2–3 sentence observation, which structurally cannot support 3–5 distinct facts or multiple angles. In practice: 1 angle per observation (confirmed by Airtable records — all 3 corpus-mined ideas have exactly 1 angle each).

**Current state:**

Corpus mining (Step 0d-iii) calls `runAngleExtractor` with:
- `perplexityFacts`: the synthetic observation string (`obs.observation + obs.anchor`)
- `perplexityContrarian`: empty string (`""`) — hardcoded in Step 0d

```javascript
// harvest.md Step 0d-iii:
const shallowUIF = await runAngleExtractor({
  perplexityFacts: { content: syntheticContent, citations: [] },
  perplexityContrarian: { content: "", citations: [] },  // ← empty, always
  contentBrief: strategistOutput,
  brand
});
```

NLM gap-fill (Step 9) passes both full research bodies:
```javascript
// harvest.md Step 9:
// Q1 (Facts/Incidents): {perplexityFacts.content}
// Q2 (Contrarian Angles): {perplexityContrarian.content}
```

The UIF Compiler (researcher.md Stage 3) uses Q1 + Q2 together to derive contrarian angles. With only Q1 and an empty Q2, corpus-mined ideas get no contrarian grounding — the contrarian_take is invented by the LLM from the observation alone.

**Gap:**

- Corpus mining: 1 angle per idea, 1 fact per idea, contrarian body empty → angle contrarian_take is purely LLM-synthesized
- NLM gap-fill: 2–3 angles per idea (confirmed by NLM responses showing multi-source synthesis), Q1 + Q2 both non-empty
- /capture: 3 queries → potentially 3–5 angles

The corpus-mined ideas in the test batch (3 ideas, 1 angle each) reflect this directly. Each has exactly 1 fact and 1 angle. The NLM gap-fill path for the same session's notebook would produce 2–3 angles with 3–5 facts.

**notebook_query synthesis quality:**

**Verdict: Full synthesis** for both queries.

Query 1 (breadth): ~850 words, 8 distinct source IDs named in citations, synthesized across all 8. Named specific tools (LangGraph, SagaLLM, PowerDAG, MCP, MAESTRO, Amazon Bedrock AgentCore), named statistics (17x, 84.2%, 41–87%, 6.4x), named incidents (Replit, OpenAI Operator, GitHub Copilot CVE-2025-53773). Draws from source `f1bf9b1c` (runcycles.io), `4d39a18a`, `ee2a5242`, `6f5a3c95`, `2dc2e386`, `e503377e`, `388797fb`, `8cc2119f` — 8 of the ~9 imported sources.

Query 2 (contrarian): ~700 words, 5 distinct source IDs. Synthesized across academic papers (SagaLLM, PowerDAG), practitioner blog (distributed system builder), and enterprise architecture post. Provided actionable contrarian structure (what's wrong → what works) rather than summarising one source.

**Comparison to harvest.md Step 6:** The `callNLMResearch` function passes the original query string verbatim to `notebook_query`:

```javascript
// harvest.md lines 681–684:
const queryResult = await mcp__notebooklm_mcp__notebook_query({
  notebook_id: notebookId,
  query: query  // ← the raw Perplexity query string, not reformulated
});
```

This means a query like `"LangSmith LangFuse production debugging LLM agent tracing failure root cause practitioners 2025"` is passed directly to NotebookLM's `notebook_query` endpoint. The NLM notebook_query tool description states it "asks AI about EXISTING sources already in notebook" — it accepts natural language questions about the notebook's content, not keyword search strings. Passing keyword-style queries instead of synthesis-framed questions likely underutilises the notebook's cross-source synthesis capability, though the NLM engine is robust enough to still synthesise (as evidenced by Query 1 returning full synthesis even on a keyword-style topic).

**Recommendations (ordered by impact):**

- **Opportunity B (medium-high impact): Rephrase notebook_query to synthesis-framed question.** The current raw query may work but leaves synthesis depth to chance. A reformulated query would be deterministically better. Recommended template:
  ```
  Based on all sources in this notebook about [topic], what are the 2–3 most specific failure patterns, named tools, or quantified rates that practitioners get wrong? What is the strongest evidence-backed contrarian finding?
  ```
  Apply this reformulation in `callNLMResearch` before the `notebook_query` call. This closes the gap between what the NLM engine is capable of (full synthesis) and what it's asked to do (keyword retrieval mode).

- **Opportunity C (medium impact): Add a second contrarian-targeted `notebook_query` for corpus mining.** Currently corpus mining fires one query per notebook. Adding a second `notebook_query` targeted at "what do practitioners consistently get wrong about [obs.anchor]?" would bring corpus-mined ideas closer to NLM gap-fill depth — providing a non-empty contrarian body to the Angle Extractor. This would require adding a second MCP call in Step 0d and passing the result as `perplexityContrarian`.

- **Opportunity A (low-medium impact): Multiple observations already handled correctly.** The NLM mining prompt (Step 0c) asks for "1–3 specific observations." Step 0d iterates `for (const obs of observations)` — each observation runs its own Strategist → Scorer → Angle Extractor pipeline independently. The pipeline already handles multiple observations: if NLM returns 3 observations, 3 ideas are written. This is not a gap. The actual issue is that each individual observation feeds only 1 angle with an empty contrarian body.

---

## Finding 2: Unverified Stat — 17x DeepMind

**Claim (verbatim from UIF):**
> "Google DeepMind research found that multi-agent networks amplify errors by 17x: a 95% per-agent reliability rate yields only 36% overall reliability in a 20-step chain."

**Current source chain:**

- `source_url`: `https://runcycles.io/blog/state-of-ai-agent-incidents-2026`
- `source_tier`: `tier2` (assigned as if the source were Google Research — incorrect; runcycles.io is a blog = tier4)
- `verified`: `false`
- `context`: "UNVERIFIED — do not use as a primary citation in published content without locating the original study. Original source: Google Research, January 2026."

The runcycles.io source (confirmed in NLM notebook) attributes the stat to "Google Research, January 2026" in a table row. It provides no direct URL to the original paper or blog post. The NLM sources_used for the 17x stat query (`f1bf9b1c`) is the runcycles.io document only — no other notebook source contains this data.

**notebook_query result:**

Query: "What is the exact source for the 17x error amplification statistic? Is there a direct link to the original Google Research paper or blog post from January 2026? What does the runcycles.io source actually say about the origin of this number?"

NLM answer (verbatim key passage from response): *"While the sources explicitly identify 'Google Research, January 2026' as the origin, they do not provide a direct URL or hyperlink to the original paper or blog post."* Sources used: only `f1bf9b1c` (runcycles.io). No other source in the notebook corroborates or links the stat.

**Verdict:** No primary source found in the notebook. The stat exists in the pipeline with `verified: false` and `source_tier: tier2` (incorrect — should be `tier4` since the actual URL is a blog). No pipeline step between Airtable write and `/draft` reads the `verified` flag to block its use.

**Recommendation:** Flag this idea (`recr1VYiGQnAfrBXs`) for source remediation before drafting. Two options:

1. **Replace:** Run a targeted NLM research query for "Google DeepMind multi-agent reliability error amplification 2025 2026" to find the primary source (paper or official blog post). If found, update the UIF fact with the primary URL and set `verified: true`.
2. **Downgrade:** If no primary source is found, change `source_tier` from `tier2` to `tier4` (matching the actual source URL) and restrict to supporting color only — never a standalone claim in the draft. The draft gate (Opportunity D) would then block this fact from anchoring Line 1, 3, or 7 without a verified primary alongside it.

The `source_tier: tier2` assignment on the 17x stat is a UIF schema enforcement gap: tier is being assigned to the attributed source (Google Research) rather than the actual `source_url` domain. `validateUIF` does not cross-check these fields.

---

## Finding 3: Systemic Stat Verification Gap

**Scope across sampled ideas:**

Corpus-mined ideas (3 ideas, workflow `hrv_scenario_b_test_20260405`):
- Total angles: 3 (1 per idea)
- Total facts: 3 (1 per idea)
- Facts with `verified: false`: 2 (`recUm5jjlHqj7heL8` — TOCTOU overrun stat; `recr1VYiGQnAfrBXs` — 17x DeepMind)
- Facts with `verified: true`: 1 (`recuHuaF8h9HnVAao` — LangGraph official docs)
- Facts with no `source_url`: 0 (all 3 have source URLs)
- `verified` field present in all 3 UIFs: yes

Prior harvest ideas (last 3 by `captured_at` desc, source_type = "harvest"):
- The Airtable query for the last 3 harvest ideas returned the same 3 records from `hrv_scenario_b_test_20260405` (they are the 3 most recent). There are 23 total harvest records. The test run records dominate the top of the sort. Without fetching page 2, the prior-harvest sample is the same batch — no distinct pre-test data is confirmed in this session.
- However: the UIF schema with `verified` field is a recent addition (researcher.md Rule 8 defines it as required). Earlier harvest runs likely predated this rule and may have UIFs without `verified` fields in facts. This cannot be confirmed from the 3 records available.

**Pipeline gap:**

No SOP step reads `verified` and acts on it between Airtable write and publication:

- `validateUIF` (state-checker.md): does **not** check `verified` on any fact. Checks presence of `statement` and `source_url` only.
- `/draft` Step 8 (`generateDraft`): passes `supporting_facts` to writer skill with tier/verified labels inline. The writer.md system prompt says `verified: false → never use as a standalone claim` — but this is an instruction to the LLM, not a code gate. The draft is generated first, then `validatePost` runs — `validatePost` checks word count and structure, not citation quality.
- `/draft` Step 8 contains a `BACKLOG GAP-2` comment explicitly documenting this: *"A verified:false fact used as a standalone anchor claim will not be caught."*
- `/review` Pass 2 (fidelityReport): checks brand_fit, platform_fit, em dashes, hook genericity, closing question quality. Does not read the UIF or check `verified` flags. The optimization loop works on `draft_content` text only.

**Recommendations (ordered by impact):**

- **Opportunity D (high impact): Add `verified: false` gate at `/draft` Step 8, before `generateDraft` call.** Insert a pre-draft check: for each `supporting_facts` index in the assigned angle, read `uif.core_knowledge.facts[i].verified`. If any fact with `verified: false` is the **only** supporting fact for the angle (`supporting_facts.length === 1` AND `verified: false`), flag it as a `needs_source_review` warning and proceed with a constrained writer prompt that explicitly removes it from primary citation candidates. Do not block draft creation — block the unverified stat from being used as an anchor claim. This closes `BACKLOG GAP-2`. The exact location: `draft.md` Step 8 comment block, before `generateDraft` is called.

- **Opportunity E (medium impact): Add `source_url` non-empty requirement for `verified: false` facts in `validateUIF`.** Currently `validateUIF` requires `source_url` to be non-empty for all facts regardless of `verified`. This is already enforced — `facts[i].source_url is empty` is a current error. So Opportunity E as originally scoped is already partially implemented. The actual gap is different: `validateUIF` does not check that `source_tier` is consistent with `source_url`. A fact that has `verified: false` and `source_tier: tier2` but `source_url` pointing to a blog should fail. Add a check: if `source_tier` is `tier1` or `tier2` AND `verified: false`, append a warning to `errors` (or add as a separate `warnings` array) — the tier is likely assigned to the attributed source, not the actual URL. This would have caught the 17x stat's incorrect `tier2` assignment. Location: `state-checker.md` `validateUIF` function, after the `source_url` empty check.

---

## Fix Priority Order

| Priority | Fix | File to modify | Section | Effort | Impact |
|----------|-----|----------------|---------|--------|--------|
| 1 | Add `verified: false` draft gate (close BACKLOG GAP-2) | `.claude/commands/draft.md` | Step 8 — before `generateDraft` | Low (add pre-check + constrained prompt variant) | High — blocks unverified stats from becoming anchor claims |
| 2 | Rephrase `callNLMResearch` query to synthesis-framed question | `.claude/commands/harvest.md` | Step 6 `callNLMResearch` function, `notebook_query` call | Low (reformulate query string before passing) | Medium-High — deterministically improves angle quality across all gap-fill slots |
| 3 | Add second contrarian `notebook_query` for corpus mining | `.claude/commands/harvest.md` | Step 0d-iii `runAngleExtractor` call | Medium (add MCP call, pass result as `perplexityContrarian`) | Medium — brings corpus-mined depth closer to NLM gap-fill |
| 4 | Add `source_tier` / `verified` consistency check in `validateUIF` | `.claude/skills/state-checker.md` | `validateUIF` function, after `source_url` check | Low (add 3-line check) | Medium — catches tier misassignment before Airtable write |
| 5 | Flag 17x stat idea for source remediation | Airtable: ideas `recr1VYiGQnAfrBXs` | Intelligence File field | Low (targeted NLM research query or tier downgrade) | Low-Medium — fixes one idea, prevents one bad post |

---

## Airtable Field Reference (for fix agent)

```
BASE_ID:    appgvQDqiFZ3ESigA
IDEAS:      tblVKVojZscMG6gDk

Field IDs (confirmed from SOP and live queries):
  Topic:              fldMtlpG32VKE0WkN
  Intelligence File:  fldQMArYmpP8s6VKb  ← UIF JSON, primary field
  source_type:        fldBkIqNugXb4M5Fk  (harvest choice ID: sel5h40HUz6JnB5O5)
  workflow_id:        fldoREHCHsCU6pXuE
  captured_at:        fldYU3CKk5HZAfrWo
  score_overall:      fldJatmYz453YGTyV
  research_depth:     fldAwyDJrDdoyPmtR
  Status:             fld9frOZF4oaf3r6V
  notebook_id:        fld6IEXqxWqwZtHow

Affected records (test run hrv_scenario_b_test_20260405):
  recUm5jjlHqj7heL8  — "Your Budget Counter Isn't Atomic"       verified:false  score:8.2
  recr1VYiGQnAfrBXs  — "95% Reliable Agents, 36% Reliable System" verified:false  score:8.5  ← 17x stat
  recuHuaF8h9HnVAao  — "LangGraph INVALID_CONCURRENT_GRAPH_UPDATE" verified:true   score:7.8

NLM test notebook:
  c1c40153-c24d-458b-804d-9c80b969e1a5  (topic: LLM state corruption in concurrent production requests)
  Sources imported: 8 confirmed active in query responses
  17x stat source: f1bf9b1c-04ae-4f50-8ce2-4f8e2a9ac59c (runcycles.io only)
```

---

## SOP Sections to Modify (for fix agent)

**Priority 1 — Close BACKLOG GAP-2 (draft fact citation gate)**

- File: `.claude/commands/draft.md`
- Section: Step 8 — Generate draft (writer skill)
- Current behaviour: Supporting facts are passed to the writer with tier/verified labels as inline text. The LLM is instructed not to use `verified: false` as standalone claims, but no code gate enforces this. `BACKLOG GAP-2` comment acknowledges the gap explicitly.
- Required change: Before calling `generateDraft`, iterate over `angle.supporting_facts`. Check if all facts in the angle are `verified: false`. If yes: (a) log a warning entry to `logs` table with `step_name: "draft_unverified_fact_warning"`, (b) add to the writer system prompt: "CRITICAL: All supporting facts for this angle are unverified. Do NOT use any stat as a standalone anchor claim. Use only as supporting context if a verified framing is established first." Remove the `BACKLOG GAP-2` comment after implementing.

**Priority 2 — Rephrase callNLMResearch notebook_query**

- File: `.claude/commands/harvest.md`
- Section: Step 6 `callNLMResearch` implementation — `notebook_query` call (around line 681)
- Current behaviour: Passes the raw Perplexity query string directly: `query: query`
- Required change: Reformulate the query before the `notebook_query` call:
  ```javascript
  const synthesisQuery = `Based on all sources in this notebook about the following topic, identify the 2–3 most specific failure patterns, named tools, or quantified rates that a practitioner would find immediately actionable. Also identify the strongest contrarian finding — what conventional wisdom gets wrong. Topic: ${query}`;
  const queryResult = await mcp__notebooklm_mcp__notebook_query({
    notebook_id: notebookId,
    query: synthesisQuery
  });
  ```

**Priority 3 — Add contrarian notebook_query for corpus mining**

- File: `.claude/commands/harvest.md`
- Section: Step 0d-iii — Angle Extractor call in corpus mining loop
- Current behaviour: `runAngleExtractor` called with `perplexityContrarian: { content: "", citations: [] }` (empty, hardcoded). Only the synthetic observation is passed.
- Required change: Before calling `runAngleExtractor`, fire a second `notebook_query` on the same notebook:
  ```javascript
  const contrarianQuery = await mcp__notebooklm_mcp__notebook_query({
    notebook_id: notebookId,
    query: `What do practitioners consistently get wrong about "${obs.anchor}"? What does the evidence in this notebook actually show works instead?`
  });
  const contrarianContent = contrarianQuery?.answer ?? "";
  // Then pass to runAngleExtractor:
  perplexityContrarian: { content: contrarianContent, citations: [] }
  ```
  This adds one MCP call per observation per notebook. For a notebook with 3 observations, this is 3 additional calls. Log each as `step_name: "corpus_mining_contrarian_query"`.

**Priority 4 — Add source_tier / verified consistency check in validateUIF**

- File: `.claude/skills/state-checker.md`
- Section: `validateUIF` function — after `facts[i].source_url` empty check
- Current behaviour: Validates `statement` non-empty and `source_url` non-empty. Does not validate consistency between `source_tier` and `verified`.
- Required change: Add after the `source_url` check:
  ```javascript
  // Tier/verified consistency: tier1/tier2 + verified:false = likely misassignment
  if ((f.source_tier === "tier1" || f.source_tier === "tier2") && f.verified === false) {
    errors.push(`facts[${i}]: source_tier "${f.source_tier}" with verified:false is likely a misassignment — tier reflects the attributed source, not the actual source_url. Downgrade to tier3/tier4 or locate the primary source.`);
  }
  ```

**Priority 5 — Remediate 17x stat in idea recr1VYiGQnAfrBXs**

- Record: Airtable ideas table, `recr1VYiGQnAfrBXs`
- Section: `Intelligence File` field (`fldQMArYmpP8s6VKb`)
- Current behaviour: UIF has `source_tier: tier2`, `verified: false`, `source_url: runcycles.io`. NLM notebook confirms no primary Google Research URL exists in any imported source.
- Required change: Option A — run a targeted NLM research query for the primary source ("Google DeepMind multi-agent error amplification reliability 2025 2026 original paper") and update UIF if found. Option B — downgrade `source_tier` from `tier2` to `tier4` in the UIF JSON to match the actual source URL, and ensure the fact context explicitly states tier4 status. Patch via MCP: `update_records_for_table` on ideas `recr1VYiGQnAfrBXs` with updated `fldQMArYmpP8s6VKb` JSON.
