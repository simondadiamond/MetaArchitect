# Review Editorial Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade `/review` from a simple approval stage into a 2–3 pass editorial optimization loop that improves each draft toward "masterful" before Simon sees it — without losing technical specificity, STATE spine, or brand voice.

**Architecture:** Pre-process each drafted post through a house humanizer → fidelity check → conditional repair chain before display. The optimized version is shown first; Simon can approve it, approve the original, or revise further. A custom `editorial.md` skill holds all three prompts, keeping `review.md` clean. Optimization state is checkpointed to `.tmp/` so the loop is resumable.

**Tech Stack:** Claude LLM calls (claude-sonnet-4-6), existing Airtable client, `.tmp/` JSON state files, existing logs table pattern.

---

## Design Decisions

### Why automatic, not opt-in
Running the loop before display means Simon always sees the best candidate first. Opt-in means he'd have to remember to trigger it and wouldn't have a comparison. The `ao` escape hatch covers cases where the optimized version is worse.

### Why a house humanizer, not blader/humanizer
The public humanizer has no knowledge of STATE vocabulary. It would strip "typed state object", "validation gate", "frontier model" as jargon. The house version is tuned to the brand's technical register and knows what to preserve.

### Why `.tmp/` for state, not a new Airtable field
Avoids a schema change. The `.tmp/` pattern already exists in the pipeline (research uses it). The optimization report is stored in the logs table instead — consistent with existing observability pattern.

### Why embed brand audit inside the fidelity check
Saves one LLM call. The fidelity check already evaluates every dimension the brand audit would cover (spine, voice, pillar, anatomy, word count). A separate brand audit pass would be redundant.

### Why 2–3 LLM passes, not 1
One pass (humanize + check at the same time) doesn't give the model a separate critical evaluation step. Two-step (humanize → check) lets the fidelity check be adversarial about what the humanizer touched. The repair pass is conditional — only runs when the check flags losses.

---

## Pass Flow (Plain English)

```
For each drafted post in /review:

  PASS 1 — House Humanizer
    Input:  original draft_content
    Goal:   improve cadence, rhythm, remove AI-isms
    Rules:  never touch technical vocab, STATE thesis, Law 25,
            named tools, specific failure mechanisms, humanity snippets
    Output: humanized_candidate (string)

  PASS 2 — Fidelity Check
    Input:  original + humanized_candidate
    Goal:   detect if anything essential was lost or weakened
    Checks: core thesis, technical mechanism, named tools,
            compliance signal, credibility signals, practitioner voice,
            word count, post anatomy
    Output: fidelity_report JSON
            {
              dimensions: { [key]: { status, note } },
              brand_fit_score: 0-10,
              platform_fit_score: 0-10,
              recommendation: "accept_optimized" | "repair_needed" | "prefer_original",
              repair_targets: []
            }

  PASS 3 — Repair (only if recommendation = "repair_needed")
    Input:  humanized_candidate + repair_targets list
    Goal:   restore specific lost elements into the optimized version
            without reverting to original's weaknesses
    Output: repaired_candidate (string)

  SELECT WINNER
    - "accept_optimized" → winner = humanized_candidate
    - "repair_needed"    → winner = repaired_candidate
    - "prefer_original"  → winner = original, flag to Simon

  CHECKPOINT
    Write .tmp/.review_optimization_<postId>.json
    Log to logs table (step_name: "editorial_loop")

  DISPLAY to Simon
    Show winner + editorial report summary
    Options: a (approve winner) | ao (approve original) | ? (show full original) | r / x / snippets
```

---

## Task 1: Create `.claude/skills/editorial.md`

**Files:**
- Create: `c:/repos/MetaArchitect/.claude/skills/editorial.md`

Contains three prompts used by the editorial loop in `/review`:

1. **House Humanizer** — the main editorial pass
2. **Fidelity Check** — comparison and loss detection (returns JSON)
3. **Repair** — targeted restoration (only runs when fidelity check flags losses)

The prompts are designed as system+user prompt pairs, matching the writer.md pattern.

---

## Task 2: Modify `.claude/commands/review.md`

**Files:**
- Modify: `c:/repos/MetaArchitect/.claude/commands/review.md`

### Changes:

**Add Step 2.5 — Editorial Optimization Loop** (runs after linked records are loaded, before display):

```javascript
// Check for existing optimization checkpoint (Tolerant — skip if already done)
const optimizationCachePath = `projects/Content-Engine/.tmp/.review_optimization_${post.id}.json`;
let optimization = loadTmpJson(optimizationCachePath); // returns null if file not found

if (!optimization) {
  updateStage(state, "editorial_optimizing");

  // Pass 1: House Humanizer
  const humanizedCandidate = await callClaude(
    editorialSkill.househummanizerPrompt(post.fields.draft_content),
    "claude-sonnet-4-6"
  );

  // Pass 2: Fidelity Check
  const fidelityRaw = await callClaude(
    editorialSkill.fidelityCheckPrompt(post.fields.draft_content, humanizedCandidate),
    "claude-sonnet-4-6"
  );
  const fidelityReport = JSON.parse(fidelityRaw); // E — explicit gate

  // Pass 3: Repair (conditional)
  let winner = humanizedCandidate;
  let repairRun = false;
  if (fidelityReport.recommendation === "repair_needed") {
    winner = await callClaude(
      editorialSkill.repairPrompt(humanizedCandidate, fidelityReport.repair_targets),
      "claude-sonnet-4-6"
    );
    repairRun = true;
  }
  const preferOriginal = fidelityReport.recommendation === "prefer_original";

  // Checkpoint to .tmp/
  optimization = {
    postId: post.id,
    originalContent: post.fields.draft_content,
    winnerContent: winner,
    fidelityReport,
    repairRun,
    preferOriginal,
    createdAt: new Date().toISOString()
  };
  writeTmpJson(optimizationCachePath, optimization);

  // Log to logs table
  await createRecord(TABLES.LOGS, {
    workflow_id: state.workflowId,
    entity_id: post.id,
    step_name: "editorial_loop",
    stage: "editorial_optimizing",
    timestamp: new Date().toISOString(),
    output_summary: `editorial loop: brand_fit=${fidelityReport.brand_fit_score}/10, platform_fit=${fidelityReport.platform_fit_score}/10, repair=${repairRun}, recommendation=${fidelityReport.recommendation}`,
    model_version: "claude-sonnet-4-6",
    status: "success"
  });
}
```

**Update Step 3 — Display format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Post [N] of [Total]
Platform: [linkedin/twitter] | Intent: [authority/education/community/virality]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Full winner content]  ← optimized version (or original if prefer_original)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EDITORIAL  Brand: [X]/10 | Platform: [X]/10 | Repair: [yes/no]
  [⚠ Optimization flagged: prefer original — see ? for details]  ← only if prefer_original
  Improved:  [comma-separated list of what got better]
  Preserved: [comma-separated list of what was explicitly kept]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hook used:      [hook_text] ([hook_type])
Framework used: [framework_name]
Snippet used:   [snippet_text first 80 chars...] | [⚠ needs_snippet]
  Alt 1:        [alt_snippet_1 first 80 chars...] (or "none")
  Alt 2:        [alt_snippet_2 first 80 chars...] (or "none")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
  a         — approve [optimized/original]
  ao        — approve original (bypass optimization)
  r [notes] — revise optimized version (e.g., "r make the hook more direct")
  ro [notes] — revise original instead
  x         — reject
  ?         — show full original for comparison
  s1 / s2   — swap snippet
  sf [1-5]  — rate snippet fit
  sn [text] — save new snippet candidate

Enter choice:
```

**Update Step 4 — Handle input:**

- `a` → if `preferOriginal`: approve `originalContent`; else: write `winnerContent` to `draft_content` first, then approve
- `ao` → approve `originalContent` (new option; same Airtable flow as current `a`)
- `r [notes]` → revise `winnerContent` with notes (existing revision loop, revisionCount applies)
- `ro [notes]` → revise `originalContent` with notes (new option; same revision flow but starts from original)
- `?` → print full `originalContent` inline, return to options (no state change)
- All snippet options → unchanged

**Approve with optimized version** (new write path for `a` when not `preferOriginal`):
```javascript
// Write optimized content to draft_content before approving
await patchRecord(TABLES.POSTS, post.id, {
  draft_content: optimization.winnerContent
});
// Then proceed with existing approve flow (status: "approved", approved_at: now())
```

**Update Writes table** to document the new `draft_content` write-on-approve path.

**Delete the `.tmp` file on approve or reject** (cleanup):
```javascript
deleteTmpFile(optimizationCachePath); // removes .review_optimization_<postId>.json
```

---

## Schema / Output Changes

| What | Change |
|------|--------|
| `posts.draft_content` | May be written during approval (when optimized version is approved) — new write path, same field |
| `logs` | New entry per post: `step_name = "editorial_loop"` |
| `.tmp/` | New file per post during review: `.review_optimization_<postId>.json` — deleted after approve/reject |
| Display | Added `EDITORIAL` section showing scores + what improved/preserved |
| Options | Added `ao`, `ro`, `?` |

No new Airtable tables or fields required.

---

## Risks and Tradeoffs

| Risk | Severity | Mitigation |
|------|----------|-----------|
| 2–3 extra LLM calls per post adds latency (~5–10s per post) | Medium | Acceptable given quality gain. Checkpoint means re-opening review for same post is instant. |
| Fidelity check may be overly sensitive → unnecessary repair pass | Low | repair_targets is a specific list; repair is surgical, not a full rewrite |
| Optimized version worse than original | Low | `prefer_original` recommendation + `ao` option gives Simon full control |
| Fidelity check JSON parse fails | Low | Explicit gate: parse error → fall back to displaying original with warning, no crash |
| `.tmp` file left behind if session crashes mid-loop | Low | Tolerant: next run loads checkpoint and skips re-optimization. Simon can delete `.tmp/` to force re-run. |

---

## Files Changed

1. **Create**: `c:/repos/MetaArchitect/.claude/skills/editorial.md`
2. **Modify**: `c:/repos/MetaArchitect/.claude/commands/review.md`
