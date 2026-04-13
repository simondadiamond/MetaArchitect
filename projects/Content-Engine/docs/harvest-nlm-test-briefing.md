# Harvest NLM Integration — Test Briefing

**For:** Testing agent  
**Working dir:** `C:\repos\MetaArchitect\projects\Content-Engine`  
**Date written:** 2026-04-05

---

## What Was Changed

The `/harvest` command was redesigned from Perplexity-based to a corpus-first NLM architecture. Here is the new execution order:

1. **Step 0 (new)**: Mine existing NLM notebooks from the `ideas` table (ideas with `notebook_id` + `mined_at IS NULL`)
2. **Steps 1–3**: Load harvest memory, fetch brand context, compute pillar selection rates (unchanged)
3. **Step 4 (modified)**: Build query plan for gap pillars only (pillars not covered by Step 0)
4. **Steps 5–9**: Generate queries, run NLM research (NOT Perplexity), run Strategist/Scorer/UIF (Steps 7–9 unchanged)
5. **Steps 10–13**: Write to Airtable, prune stale ideas, update memory, report (mostly unchanged)

**Files modified:**
- `.claude/commands/harvest.md` — major changes (Steps 0, 4, 6, 12, 13)
- `.claude/skills/airtable.md` — `mined_at` field added to registry
- `.claude/skills/writer.md` — Line 10 closing question strengthened
- `.claude/commands/review.md` — engagement flags added to Pass 2

---

## Pre-Test Setup

### 1. Confirm there is at least one idea with a notebook_id

```
Check Airtable: ideas table (tblVKVojZscMG6gDk)
- Find at least 1 record with: notebook_id non-empty, Status = "Ready" or "Completed", mined_at = null/empty
- Note the record ID (recXXX) and the notebook_id value
```

If no such record exists, the corpus mining phase will be a no-op (which is valid — confirm it falls through cleanly to NLM research for all 5 pillars).

### 2. Confirm NLM auth is active

Run in terminal: `nlm login` — confirm no errors. The MCP server must be authenticated.

### 3. Confirm .env has required vars

```
AIRTABLE_PAT=...
AIRTABLE_BASE_ID=appgvQDqiFZ3ESigA
ANTHROPIC_API_KEY=...
```

`PERPLEXITY_API_KEY` is no longer needed for harvest. Its absence should not cause errors.

---

## Test Scenarios

Run each scenario and verify the expected outcomes below.

---

### Scenario A: First run — `mined_at` field does not exist in Airtable

**Setup:** Run harvest when the `mined_at` field has never been created.

**Expected behavior:**
1. Step 0a calls `list_tables_for_base` — field not found
2. Step 0a calls `create_field` on `tblVKVojZscMG6gDk` with name `mined_at`, type `dateTime`
3. Airtable returns a new field ID — stored in `MINED_AT_FIELD_ID`
4. Harvest continues normally

**Confirm:**
- [ ] Airtable ideas table now has a `mined_at` dateTime field (visible in Airtable UI)
- [ ] No crash at Step 0a
- [ ] `MINED_AT_FIELD_ID` is used for all subsequent read/write operations in this run

---

### Scenario B: Corpus mining — unmined notebooks exist

**Setup:** At least 1 idea in the ideas table has `notebook_id` set + `mined_at` null + Status = Ready or Completed.

**Expected behavior:**
1. Step 0b fetches these ideas
2. Step 0c queries each notebook via `mcp__notebooklm_mcp__notebook_query`
3. For each valid observation: Strategist → Scorer → UIF → Airtable write
4. After processing each notebook: `mined_at` is set on the source idea record
5. `minedPillarCoverage` is populated with counts per pillar

**Confirm:**
- [ ] Source idea record in Airtable has `mined_at` populated (ISO timestamp)
- [ ] New idea record(s) appear in Airtable with:
  - `Status = "New"`
  - `source_type = "harvest"`
  - `research_depth = "shallow"`
  - `raw_input` starts with `corpus_mine:` followed by the notebook_id
- [ ] Logs table has entries with `step_name = "corpus_mining_nlm_query"` (status: success)
- [ ] Logs table has entries with `step_name = "corpus_angle_extractor"` for written ideas
- [ ] Logs table has entry `step_name = "corpus_mining_complete"` with summary of counts

**Check the corpus mining complete log message:**
```
output_summary should contain:
  "Notebooks mined: N | Ideas written: N | Gap pillars: ..."
```

---

### Scenario C: Pillar gap fill — NLM research fires for uncovered pillars

**Setup:** After corpus mining, at least 1 pillar has `minedPillarCoverage[p] === 0` (either no notebooks existed, or notebooks didn't produce ideas for that pillar).

**Expected behavior:**
1. Step 4 builds `queryPlan` with only the gap pillars (NOT all 5)
2. Step 5 generates NLM queries for each gap pillar
3. Step 6 calls `mcp__notebooklm_mcp__research_start` for each query
4. Step 6 polls `mcp__notebooklm_mcp__research_status` until `status === "completed"`
5. Research result flows into Strategist → Scorer → UIF → Airtable (unchanged from old pipeline)

**Confirm:**
- [ ] `queryPlan.length` equals `gapPillars.length` (NOT 5 or 8)
- [ ] Logs table has entries with `step_name = "harvest_nlm_facts"` and `step_name = "harvest_nlm_contrarian"`
- [ ] NO log entries with `step_name = "harvest_perplexity_facts"` (Perplexity is gone)
- [ ] New idea records from NLM research have `raw_input` set to the query string (not `corpus_mine:`)

---

### Scenario D: Corpus covers all 5 pillars — NLM research skipped

**Setup:** After corpus mining, `minedPillarCoverage` has at least 1 idea for every pillar (all 5 covered).

**Expected behavior:**
1. `gapPillars = []`
2. `queryPlan = []`
3. Steps 5–6 are skipped entirely — no NLM research calls fire

**Confirm:**
- [ ] No `harvest_nlm_facts` or `harvest_nlm_contrarian` log entries this run
- [ ] No `harvest_query_generator` log entries this run
- [ ] Harvest report shows: `Queries run: 0` and `Gap pillars filled by NLM research (0): None — corpus covered all pillars`

---

### Scenario E: NLM research timeout

**Setup:** Simulate a slow/hanging NLM research call by checking behavior when `research_status` never returns `completed` within 5 minutes.

**Expected behavior:**
1. `callNLMResearch` throws: `NLM research timed out after 5 min for query: "..."`
2. Error is caught per-slot: log entry with `status: "error"`, `ideas_generated: 0` for that slot
3. Harvest continues to next slot — does NOT abort the full run
4. No Perplexity fallback fires

**Confirm:**
- [ ] Error log entry exists for the timed-out slot
- [ ] Other slots still processed (harvest report shows remaining ideas if any passed)
- [ ] No crash, no Perplexity calls

---

### Scenario F: `mined_at` field already exists (second run)

**Setup:** Run harvest a second time after `mined_at` was created in Scenario A.

**Expected behavior:**
1. Step 0a calls `list_tables_for_base` — field found, ID read from schema
2. No `create_field` call fires
3. Ideas already mined (`mined_at != null`) are NOT re-queried

**Confirm:**
- [ ] Previously mined idea's `mined_at` is unchanged (same timestamp as first run)
- [ ] No duplicate idea records created from the same notebook
- [ ] No error about duplicate field creation

---

### Scenario G: Engagement checks in /review

**Setup:** Run `/draft` then `/review` on any drafted post. Manually check the display.

**Confirm in review.md Pass 2:**
- [ ] `engagement_flags` field appears in fidelityReport object
- [ ] If Line 1 is generic (could apply to any industry): `"hook_too_generic"` appears in `engagement_flags` and `repair_targets`
- [ ] If Line 10 question is answerable with "yes/no/it depends": `"closing_question_too_vague"` appears in `engagement_flags` and `repair_targets`
- [ ] If both pass: `engagement_flags = []`

**Confirm in writer.md system prompt:**
- [ ] Line 10 instruction says closing questions cannot be yes/no/it depends answerable

---

### Scenario H: Harvest report format

After any successful run, verify the harvest report output matches the new format.

**Expected report:**
```
🌾 Harvest complete — YYYY-MM-DD

Run:             #N
Notebooks mined: N (corpus-first)
Queries run:     N (gap-fill NLM research)
Ideas written:   N (N corpus | N NLM research)
Ideas pruned:    N

Pillar coverage:
  ...

Gap pillars filled by NLM research (N):
  — [pillar names]  OR  None — corpus covered all pillars

Topics avoided this run (N):
  ...

New ideas added:
  → [PILLAR_ABBREV] topic (score: X.X)
```

**Confirm:**
- [ ] `Notebooks mined` line is present
- [ ] `Ideas written` line shows the `(N corpus | N NLM research)` breakdown
- [ ] `Gap pillars filled by NLM research` section is present
- [ ] No mention of Perplexity anywhere in the report

---

## What a 100% Pass Looks Like

| Check | Pass condition |
|-------|----------------|
| `mined_at` field auto-created | Field exists in Airtable after first run |
| Corpus mining fires | Ideas with notebook_id get mined, `mined_at` stamped |
| Gap pillar logic | `queryPlan.length == gapPillars.length` |
| Perplexity gone | Zero `harvest_perplexity_*` log entries, no PERPLEXITY_API_KEY calls |
| NLM research fires | `harvest_nlm_facts` + `harvest_nlm_contrarian` log entries present for gap pillars |
| session_verified gate holds | No Airtable writes from sessions where NLM returned empty content |
| Error tolerance | Single NLM timeout doesn't abort full run |
| No re-mining | Second run doesn't re-process already-mined notebooks |
| Report format | New corpus/research breakdown visible |
| Engagement checks | `engagement_flags` in fidelityReport, repair targets fire correctly |

---

## Red Flags (stop and report)

- Perplexity API called at any point
- `mined_at` written to a wrong field (check field ID vs. schema)
- Corpus-mined ideas missing `raw_input: "corpus_mine:..."` 
- NLM timeout causes full harvest to abort (should be per-slot error only)
- `mined_at` reset to null or overwritten on second run for already-mined ideas
- `queryPlan` built for all 5 pillars when corpus covered some (pillar coverage check broken)
- Any Airtable write without `session_verified = true`
