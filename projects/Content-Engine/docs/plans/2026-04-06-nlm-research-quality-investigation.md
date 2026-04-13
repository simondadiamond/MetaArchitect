# NLM Research Quality Investigation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce a structured briefing document that answers whether the pipeline is extracting the best possible research per angle, and diagnoses both stat-verification gaps, so a fix agent can act on concrete findings.

**Architecture:** Read-only analysis agent — reads SOP files, queries Airtable, queries NLM notebooks, compares outputs. Produces `docs/harvest-quality-briefing.md` as the deliverable. No writes to production data.

**Tech Stack:** MCP Airtable tools, notebooklm-mcp tools, direct file reads. No code execution required.

---

## Context for the Agent

Three issues were surfaced during the harvest NLM integration test (2026-04-05):

1. **Research depth per angle** — Corpus-mined ideas get 1 angle from 1 extracted observation. Full NLM research slots (gap-fill path) get 2–3 angles from a dual-query (facts + contrarian). It's unknown whether `notebook_query` is fully synthesizing all 10 imported sources or just surface-skimming. If it's skimming, the angles are weaker than they could be.

2. **Stat verification gap (unverified source)** — A corpus-mined idea contains the "17x error amplification" stat attributed to Google Research (January 2026) but sourced only from a secondary blog (runcycles.io). The UIF marks it `verified: false` but nothing in the pipeline blocks or flags it before `/draft` runs.

3. **Stat verification gap (systemic)** — The UIF schema has a `verified` flag per angle but no SOP step checks it. A post could be drafted with unverified statistics and reach approval without anyone reviewing the source chain.

---

## Task 1: Read and Map the Full Pipeline SOPs

**Files to read:**
- `projects/Content-Engine/.claude/commands/harvest.md` — Step 0 (corpus mining), Steps 5–9 (NLM research + Strategist/Scorer/Angle Extractor)
- `projects/Content-Engine/.claude/skills/researcher.md` — Angle Extractor prompt and UIF schema
- `projects/Content-Engine/.claude/skills/writer.md` — Strategist and Scorer prompts
- `projects/Content-Engine/.claude/commands/draft.md` — Does it check `verified` flags? Does it gate on research depth?
- `projects/Content-Engine/.claude/commands/review.md` — Does Pass 2 fidelityReport check `verified` flags?

**Step 1: Read all 5 files**

Read each in sequence. For each file, note:
- What inputs feed the Angle Extractor (how many research results, what format)?
- What does the Angle Extractor output schema look like — is `verified` a required field?
- Does any downstream command (draft, review) check `verified: false` and act on it?

**Step 2: Map the data flow**

Draw a text table in the briefing:

```
Stage           | Input to Angle Extractor          | Max angles output | verified flag checked?
----------------|-----------------------------------|-------------------|----------------------
Corpus mining   | 1 observation (synthetic content) | 1                 | ?
NLM gap-fill    | Q1 (facts) + Q2 (contrarian)      | 2–3               | ?
/capture        | Q1 + Q2 + Q3 (3 queries)          | 3+                | ?
/draft          | reads Intelligence File            | n/a               | ?
/review         | reads draft_content                | n/a               | ?
```

Fill in every `?` from reading the SOPs.

**Step 3: Answer Q1 — Is the Angle Extractor getting the best possible input?**

Specifically:
- Does the NLM gap-fill path pass the full `nlmFacts.content` + `nlmContrarian.content` to the extractor, or just a truncated version?
- Does the Angle Extractor prompt ask for 1 angle or as many as the content supports?
- Does corpus mining pass both a facts AND a contrarian body, or only one observation?

---

## Task 2: Probe the NLM Notebook Synthesis Quality

**Goal:** Determine whether `notebook_query` actually synthesizes across all 10 imported sources, or just returns a shallow summary of the first few.

**Step 1: Query the seeded test notebook with a broad question**

The test notebook ID is `c1c40153-c24d-458b-804d-9c80b969e1a5` (created 2026-04-05, topic: LLM state corruption in concurrent production requests, 9–10 sources imported).

Call `mcp__notebooklm-mcp__notebook_query` with:
```
query: "What are all the specific failure modes, named tools, statistics, and production incidents described across all sources in this notebook?"
```

Record the full answer length and whether it references multiple distinct sources by name.

**Step 2: Query the same notebook with a targeted contrarian question**

```
query: "What do practitioners consistently get wrong about preventing LLM state corruption, and what does the evidence suggest actually works?"
```

Record the answer. Note whether it synthesizes across sources or repeats a single source.

**Step 3: Compare to what harvest.md Step 6 actually queries**

Find the exact query string passed to `notebook_query` in `callNLMResearch` — is it the original Perplexity query verbatim, or is it reformulated for synthesis?

**Step 4: Answer Q2 — Is the notebook_query getting full synthesis?**

Criteria:
- Answer references ≥3 distinct sources by name → full synthesis
- Answer references 1–2 sources or is generic → surface skim
- Answer is shorter than 500 words → likely shallow

---

## Task 3: Investigate the Unverified Stat Chain

**Goal:** Determine what the actual primary source is for the 17x stat, and whether a better source is accessible through NLM or web search.

**Step 1: Read the Intelligence File of the affected idea**

Fetch from Airtable ideas table (`tblVKVojZscMG6gDk`) — filter by `workflow_id = "hrv_scenario_b_test_20260405"`. Find the idea that references "17x" or "DeepMind" in its Intelligence File. Read the full JSON. Note:
- The exact claim text
- The `source_url` on that angle
- The `verified` value
- Any `source_tier` field

**Step 2: Query the notebook for the primary source**

Call `mcp__notebooklm-mcp__notebook_query` on `c1c40153-c24d-458b-804d-9c80b969e1a5`:
```
query: "What is the exact source for the 17x error amplification statistic? Is there a direct link to the original Google Research paper or blog post from January 2026?"
```

Record full answer.

**Step 3: Check the other 2 corpus-mined ideas for unverified stats**

Fetch all 3 ideas from `workflow_id = "hrv_scenario_b_test_20260405"`. For each angle in each idea's Intelligence File, list:
- Claim text
- `verified` value
- `source_url`

Count: how many angles have `verified: false`? How many have no `source_url`?

**Step 4: Check prior harvest ideas for the same pattern**

Fetch 5 ideas with `source_type = harvest` (choice ID `sel5h40HUz6JnB5O5`) from earlier runs. Do any have `verified: false` angles? Do any have `verified` field at all? (Early runs may predate the field.)

**Step 5: Answer Q3 — How systemic is the unverified stat problem?**

- What % of angles across sampled ideas have `verified: false`?
- Does the UIF schema always include a `verified` field, or is it sometimes absent?
- Is there any SOP step (draft, review) that reads `verified` and acts on it?

---

## Task 4: Identify Optimization Opportunities

Based on Tasks 1–3, evaluate each of these specific opportunities:

**Opportunity A: Corpus mining — extract multiple observations**

The current NLM Mining Prompt (harvest.md Step 0c) asks for "1–3 specific observations" but only one may be returned. Does the Angle Extractor then produce 1 angle per observation, or 1 angle total?

Check: if 3 observations were returned, would the pipeline write 3 angles on one idea, or 3 separate ideas?

**Opportunity B: Richer notebook_query prompting**

The current query to `notebook_query` in `callNLMResearch` is the same string as the original research query. A better approach would reframe it as a synthesis question. Example:

> "Based on all sources in this notebook about [query topic], what are the 2–3 most specific failure patterns with named tools, quantified rates, or named enforcement cases? Also identify the strongest contrarian finding — what do practitioners assume that the evidence contradicts?"

Would this produce more angles per NLM call?

**Opportunity C: Dual-pass corpus mining**

Currently corpus mining fires one `notebook_query` per notebook. A second pass with a contrarian-targeted query could extract the `Q2 contrarian` angle that the main gap-fill path gets from a separate Perplexity query. This would bring corpus-mined idea depth closer to NLM gap-fill depth.

**Opportunity D: Verified flag gate at /draft**

Add a check in `draft.md` that reads `verified: false` angles and either:
- Flags them in the draft for human review
- Refuses to use that angle as the primary hook without a `verified: true` alternative

**Opportunity E: Source-tier requirement in UIF validation**

The `validateUIF` function (in researcher.md or wherever it lives) could require `source_url` to be non-empty for any angle with `verified: false`. Empty source + unverified = discard the angle.

---

## Task 5: Write the Briefing Document

Save to `C:\repos\MetaArchitect\projects\Content-Engine\docs\harvest-quality-briefing.md`

Structure:

```markdown
# Harvest Research Quality Briefing
**Date:** 2026-04-06
**For:** Fix agent implementing research quality improvements

---

## Executive Summary
[3–5 bullet points: what's broken, what's working, what's the highest-impact fix]

---

## Finding 1: Research Depth Per Angle
**Current state:** [what the pipeline actually does]
**Gap:** [what's missing vs. what's possible]
**Evidence:** [specific quotes from SOPs, Airtable field values, notebook_query answers]
**Recommendation:** [Opportunity A/B/C — which to implement, in what order]

---

## Finding 2: Unverified Stat — 17x DeepMind
**Claim:** [verbatim from UIF]
**Current source chain:** [secondary → ??? → primary]
**Primary source found?** [yes/no + URL if found]
**Recommendation:** [replace / flag / discard]

---

## Finding 3: Systemic Stat Verification Gap
**Scope:** [% of angles with verified: false across sampled ideas]
**Pipeline gap:** [which SOP steps read verified and act on it — likely none]
**Recommendation:** [Opportunity D/E — which is higher priority]

---

## Fix Priority Order
| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | [highest] | [low/med/high] | [low/med/high] |
| 2 | ... | | |
| 3 | ... | | |

---

## Airtable Reference (for fix agent)
[Copy the field ID table from airtable.md for fields touched by fixes]

---

## SOP Files to Modify (for fix agent)
[Exact file paths and which sections need changes for each fix]
```

---

## Airtable Reference

```
BASE_ID:    appgvQDqiFZ3ESigA
IDEAS:      tblVKVojZscMG6gDk
LOGS:       tblzT4NBJ2Q6zm3Qf

Key field IDs:
  Topic:             fldMtlpG32VKE0WkN
  Status:            fld9frOZF4oaf3r6V
  Intelligence File: fldQMArYmpP8s6VKb  ← UIF JSON, primary field for this analysis
  source_type:       fldBkIqNugXb4M5Fk  (harvest choice: sel5h40HUz6JnB5O5)
  raw_input:         fldrQ3CDTEDuIhEsy
  research_depth:    fldAwyDJrDdoyPmtR
  workflow_id:       fldoREHCHsCU6pXuE
  captured_at:       fldYU3CKk5HZAfrWo
  score_overall:     fldJatmYz453YGTyV
```

---

## Output Contract

The agent MUST produce `docs/harvest-quality-briefing.md` before returning. The briefing must answer all three questions (research depth, 17x stat, systemic gap) with evidence from files and Airtable — not inference.

If the Airtable MCP is unavailable, read Airtable field data from any cached tool results in the conversation. If NLM MCP is unavailable, note it and skip Tasks 2 and the notebook_query steps in Task 3 — answer what's possible from file reads alone.
