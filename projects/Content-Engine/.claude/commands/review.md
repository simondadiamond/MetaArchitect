# /review — Post Review Command

Display drafted posts for Simon's approval, revision, or rejection.
Each post is pre-processed through a 2–3 pass editorial optimization loop before display.
Simon sees the strongest candidate first and can approve, revert to original, or revise further.

---

## Precondition

Posts with `status = drafted`.

Risk tier: low for display, medium for approve/revise writes → S + T + E on writes.

> **Supabase**: All reads/writes go through `tools/supabase.mjs` — never call Supabase MCP from inside this command (token-conscious rule). Column registry: `.claude/skills/supabase.md`. All columns are snake_case.
> **Optimization cache**: No `.tmp/` files. Store the `optimization` object as an in-memory variable per post within the session. No file I/O.

```javascript
import {
  getRecords, getRecord, createRecord, patchRecord,
  logEntry, TABLES,
} from './tools/supabase.mjs';
```

---

## STATE Init

```javascript
const state = buildStateObject({
  stage: "init",
  entityType: "post",
  entityId: null   // set per post as reviewed
});
```

---

## Steps

### 1. Load drafted posts
```javascript
const posts = await getRecords(TABLES.POSTS,
  { status: 'drafted' },
  {
    fields: ['id','status','platform','intent','draft_content','hook_id','framework_id',
             'humanity_snippet_id','alt_snippet_ids','needs_snippet','drafted_at'],
    orderBy: { col: 'drafted_at', dir: 'asc' },
    limit: 50,
  });

if (posts.length === 0) {
  return "No posts with status = drafted. Run /draft first.";
}
```

### 2. Load linked records for each post

FK columns are now single uuid values (not arrays). `alt_snippet_ids` is `uuid[]`.

```javascript
const hook       = post.hook_id              ? await getRecord(TABLES.HOOKS, post.hook_id, ['id','hook_text','hook_type']) : null;
const framework  = post.framework_id         ? await getRecord(TABLES.FRAMEWORKS, post.framework_id, ['id','framework_name']) : null;
const snippet    = post.humanity_snippet_id  ? await getRecord(TABLES.SNIPPETS, post.humanity_snippet_id, ['id','snippet_text']) : null;
const altSnippets = (post.alt_snippet_ids ?? []).length > 0
  ? await getRecords(TABLES.SNIPPETS, { id: post.alt_snippet_ids }, { fields: ['id','snippet_text'], limit: post.alt_snippet_ids.length })
  : [];
const needsSnippet = post.needs_snippet === true;
```

### 2.5. Run editorial optimization loop (3-pass, inline — no external API calls)

Runs after linked records are loaded, before display. All three passes run inside Claude using
the `humanizer` skill and inline brand reasoning. No `callClaude()`, no external scripts.

**Do NOT write the optimized content to Supabase yet.** Show the before/after comparison in
Step 3 and wait for Simon's decision. Only write on approve (`a`).

```javascript
updateStage(state, "editorial_optimizing");

// Tolerant: optimization stored in-memory per post. Within a session, if this post was
// already optimized (e.g. after a revision), reuse the existing variable — don't re-run.
let optimization = null; // set per-post — persists in-session only

if (!optimization) {
  let editorialError = null;

  // Pass 1 — Humanizer skill (generic AI-tell removal)
  // Invoke Skill("humanizer") with post.draft_content as input.
  // The humanizer runs its own 3-step process internally:
  //   draft rewrite → anti-AI audit ("what makes this still AI-generated?") → final version
  // humanizedCandidate = the final version output by the skill.
  // If the skill fails or produces no output, fall back to original (set humanizedCandidate = null).
  let humanizedCandidate;
  try {
    humanizedCandidate = await invokeSkill("humanizer", post.draft_content);
    // invokeSkill = Skill tool call with the draft as input; capture the final output text
  } catch (err) {
    editorialError = `Pass 1 failed: ${err.message}`;
    humanizedCandidate = null;
  }

  // Pass 2 — Brand fidelity check (inline reasoning against editorial.md criteria)
  // Compare original vs humanizedCandidate. Check all dimensions from editorial.md:
  //   core_thesis, technical_mechanism, named_tools, compliance_signal,
  //   credibility_signals, practitioner_voice, word_count, post_anatomy.
  // ALSO check: em dashes — flag any remaining em dashes as a repair target.
  //   Em dashes are an AI writing tell. Remove or replace with period/comma unless
  //   a specific instance is structurally irreplaceable (rare — default to removing).
  // Engagement checks — flag as repair targets if failing:
  //   Hook (Line 1): Does it make an ICP practitioner think "this is about my problem"?
  //     Test: could this hook apply to any industry/profession? If yes → too generic, flag.
  //   Closing line (Line 10 if question): Is it specific enough that someone paged at 2am has a direct answer?
  //     Test: is it answerable with "yes", "no", or "it depends"? If yes → too vague, flag.
  //     Generic fails: "Have you run into this?" "What do you think?" "Do you agree?"
  //     Strong passes: names a specific tool, failure mode, or architectural decision.
  // Output a fidelityReport object:
  let fidelityReport = null;
  if (humanizedCandidate) {
    // Inline reasoning — no API call. Produce the report as structured analysis:
    fidelityReport = {
      recommendation: "accept_optimized" | "repair_needed" | "prefer_original",
      brand_fit_score: 0-10,
      platform_fit_score: 0-10,
      improved_aspects: [],   // what the humanizer actually fixed
      preserved_aspects: [],  // what was correctly kept
      repair_targets: [],     // only populated if recommendation = "repair_needed"
                              // each entry is a specific element to restore or fix
      engagement_flags: []    // "hook_too_generic" | "closing_question_too_vague"
                              // each is added as a repair_target if populated
    };
    // If humanizer made no meaningful improvement → prefer_original
    // If humanizer improved but lost something essential → repair_needed + list targets
    // If humanizer is clearly better with nothing lost → accept_optimized
  } else {
    // Pass 1 failed — show original, note error
    fidelityReport = {
      recommendation: "accept_optimized",
      brand_fit_score: null, platform_fit_score: null,
      improved_aspects: [], preserved_aspects: [], repair_targets: []
    };
  }

  // Pass 3 — Repair (conditional, inline reasoning)
  // Only runs if fidelityReport.recommendation === "repair_needed".
  // Apply each repair_target to humanizedCandidate — restore lost elements without
  // reverting to the original's weaknesses. Keep the humanizer's improved rhythm.
  // One precise repair per target is better than a full rewrite.
  let winner = humanizedCandidate ?? post.draft_content;
  let repairRun = false;
  let preferOriginal = !humanizedCandidate;

  if (fidelityReport?.recommendation === "repair_needed") {
    // Inline repair reasoning — apply repair_targets to humanizedCandidate
    winner = applyRepairs(humanizedCandidate, fidelityReport.repair_targets);
    repairRun = true;
  } else if (fidelityReport?.recommendation === "prefer_original") {
    preferOriginal = true;
    winner = post.draft_content;
  }

  // Store in-memory (no file write until Simon approves)
  optimization = {
    postId: post.id,
    originalContent: post.draft_content,
    winnerContent: winner,
    fidelityReport,
    repairRun,
    preferOriginal,
    editorialError,
    createdAt: new Date().toISOString()
  };

  // Log the editorial loop run
  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      post.id,
    step_name:      "editorial_loop",
    stage:          "editorial_optimizing",
    output_summary: `editorial loop: brand_fit=${fidelityReport?.brand_fit_score ?? "n/a"}/10, platform_fit=${fidelityReport?.platform_fit_score ?? "n/a"}/10, repair=${repairRun}, recommendation=${fidelityReport?.recommendation ?? "fallback"}${editorialError ? `, error=${editorialError}` : ""}`,
    model_version:  "claude-sonnet-4-6",
    status:         editorialError ? "error" : "success",
  });
}
```

### 3. Display each post

Always show the optimized version. If the content changed from the original, show a brief
before/after analysis — what the humanizer fixed and what was preserved — so Simon can make
an informed decision. **Never write the optimized content to Supabase until Simon types `a`.**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Post [N] of [Total]
Platform: [linkedin/twitter] | Intent: [authority/education/community/virality]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Full optimization.winnerContent]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  EDITORIAL  Brand: [X]/10 | Platform: [X]/10 | Repair: [yes/no]
  [⚠ Optimization flagged: prefer original — use ? to compare]   ← only if preferOriginal
  [⚠ Optimization unavailable: [editorialError]]                  ← only if editorialError
  Fixed:     [fidelityReport.improved_aspects joined by ", "]
  Kept:      [fidelityReport.preserved_aspects joined by ", "]
  Analysis:  [1–2 sentence plain-language verdict — is this better copy? why?]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hook used:      [hook_text] ([hook_type])
Framework used: [framework_name]
Snippet used:   [snippet_text first 80 chars...] | [⚠ needs_snippet — no snippet matched]
  Alt 1:        [alt_snippet_1 first 80 chars...] (or "none")
  Alt 2:        [alt_snippet_2 first 80 chars...] (or "none")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
  a          — approve (writes optimized content + sets status=approved)
  ao         — approve original (bypasses optimization)
  r [notes]  — revise optimized version (max 3 passes)
  ro [notes] — revise original instead
  x          — reject
  ?          — show full original for comparison
  s1 / s2    — swap to alternate snippet 1 or 2
  sf [1-5]   — rate snippet fit
  sn [text]  — save a new snippet candidate

Enter choice:
```

### 4. Handle Simon's input

#### Approve optimized (`a`)
```javascript
updateStage(state, "approving");

// Single atomic write — content (if changed) + status + approved_at
const fields = {
  status:      "approved",
  approved_at: new Date().toISOString(),
};
if (!optimization.preferOriginal && optimization.winnerContent !== optimization.originalContent) {
  fields.draft_content = optimization.winnerContent;
}
await patchRecord(TABLES.POSTS, post.id, fields);

await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      post.id,
  step_name:      "review_approved",
  stage:          "approving",
  output_summary: `Post approved (${optimization.preferOriginal ? "original" : "optimized"}): ${post.platform}`,
  model_version:  "n/a",
  status:         "success",
});

// Clear in-memory optimization cache for this post
optimization = null;
console.log("✅ Approved. Run /publish when ready.");
```

#### Approve original (`ao`)
```javascript
updateStage(state, "approving");

const fields = {
  status:      "approved",
  approved_at: new Date().toISOString(),
};
if (optimization.winnerContent !== optimization.originalContent) {
  fields.draft_content = optimization.originalContent;
}
await patchRecord(TABLES.POSTS, post.id, fields);

await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      post.id,
  step_name:      "review_approved",
  stage:          "approving",
  output_summary: `Post approved (original override): ${post.platform}`,
  model_version:  "n/a",
  status:         "success",
});

// Clear in-memory optimization cache for this post
optimization = null;
console.log("✅ Approved (original). Run /publish when ready.");
```

#### Show full original (`?`)
```javascript
// Print original inline — no state change, no Supabase write
console.log("\nORIGINAL DRAFT:\n");
console.log(optimization.originalContent);
console.log("\n[End of original — return to options above]\n");
// Redisplay options for this post
```

#### Revise optimized (`r [notes]`)
```javascript
// revisionCount tracks revisions per post — max 3
updateStage(state, "revising");
const notes = input.replace(/^r\s*/i, "").trim();
// Call writer skill with revision prompt using winnerContent as base:
// "Apply these revision notes to the post: [notes]"
// Run validatePost on result
// Display revised post
// If revisionCount >= 3: "Max revisions reached. Approve or reject."
// Delete .tmp checkpoint so next pass re-checks fidelity
// Clear in-memory optimization cache for this post
optimization = null;
```

**Revision prompt** for writer skill (same as existing, but starts from optimized):
```
Revise this LinkedIn post based on the following notes.
Keep all structural rules (10-line anatomy, word count 150-250, voice prohibitions).

Current post:
[optimization.winnerContent]

Revision notes:
[notes]

Output the revised post only. No explanation.
```

After revision: update `draft_content` immediately and log:
```javascript
await patchRecord(TABLES.POSTS, post.id, {
  draft_content: revisedContent,
});
await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      post.id,
  step_name:      "review_revised",
  stage:          "revising",
  output_summary: `Post revised (pass ${revisionCount}): ${notes.slice(0, 100)}`,
  model_version:  "claude-sonnet-4-6",
  status:         "success",
});
```

#### Revise original (`ro [notes]`)
```javascript
// Same as revise, but starts from optimization.originalContent instead of winnerContent
// Useful when the editorial loop moved in the wrong direction entirely
updateStage(state, "revising");
const notes = input.replace(/^ro\s*/i, "").trim();
// Same revision flow, same max 3, same log pattern
// Base content: optimization.originalContent
// Clear in-memory optimization cache for this post
optimization = null;
```

#### Reject (`x`)
```javascript
updateStage(state, "rejecting");
await patchRecord(TABLES.POSTS, post.id, { status: "rejected" });
await logEntry({
  workflow_id:    state.workflowId,
  entity_id:      post.id,
  step_name:      "review_rejected",
  stage:          "rejecting",
  output_summary: "Post rejected",
  model_version:  "n/a",
  status:         "success",
});
// Clear in-memory optimization cache for this post
optimization = null;
console.log("Post rejected.");
```

#### Swap snippet (`s1` / `s2`)
```javascript
// s1 → altSnippets[0], s2 → altSnippets[1]
const swapTarget = input === "s1" ? altSnippets[0] : altSnippets[1];
if (!swapTarget) {
  console.log("⚠ No alternate snippet available for that slot.");
  // Re-display options
} else {
  updateStage(state, "snippet_swap");
  // humanity_snippet_id is a single uuid FK (not an array).
  await patchRecord(TABLES.POSTS, post.id, {
    humanity_snippet_id: swapTarget.id,
  });
  currentSnippet = swapTarget;
  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      post.id,
    step_name:      "review_snippet_swapped",
    stage:          "snippet_swap",
    output_summary: `Snippet swapped to alt ${input === "s1" ? "1" : "2"}: [${swapTarget.id}] ${swapTarget.snippet_text?.slice(0, 80)}`,
    model_version:  "n/a",
    status:         "success",
  });
  console.log(`✅ Snippet swapped. Re-review post with new snippet.`);
  // Redisplay post — loop back to step 3
}
```

#### Rate snippet fit (`sf [1-5]`)
```javascript
const fitScore = parseInt(input.replace(/^sf\s*/i, "").trim());
if (isNaN(fitScore) || fitScore < 1 || fitScore > 5) {
  console.log("⚠ Enter a number 1–5 (1 = poor fit, 5 = perfect).");
} else {
  updateStage(state, "snippet_rating");
  await patchRecord(TABLES.POSTS, post.id, { snippet_fit_score: fitScore });
  await logEntry({
    workflow_id:    state.workflowId,
    entity_id:      post.id,
    step_name:      "review_snippet_rated",
    stage:          "snippet_rating",
    output_summary: `Snippet fit scored ${fitScore}/5 for post [${post.id}], snippet [${currentSnippet?.id}]`,
    model_version:  "n/a",
    status:         "success",
  });
  console.log(`✅ Snippet fit: ${fitScore}/5 saved.`);
  // Return to options for this post
}
```

#### Save new snippet candidate (`sn [text]`)
```javascript
const candidateText = input.replace(/^sn\s*/i, "").trim();
if (candidateText.length < 20) {
  console.log("⚠ Snippet text too short — minimum 20 characters.");
} else {
  const extractionPrompt = `
Evaluate whether this text qualifies as a humanity snippet for a LinkedIn content post.
A valid humanity snippet is: first-person or clearly lived experience, specific (names a moment/detail), short enough to weave in naturally, NOT generic advice.

Text: "${candidateText}"

Respond with JSON only:
{ "is_valid": true/false, "reason": "one sentence", "cleaned_text": "text cleaned up if valid, else null", "tags": ["tag1","tag2"] }
`;
  const result = await callClaude(extractionPrompt, "claude-sonnet-4-6");
  const parsed = JSON.parse(result);

  if (!parsed.is_valid) {
    console.log(`⚠ Not saved — ${parsed.reason}. Revise and try again with sn.`);
  } else {
    updateStage(state, "snippet_create");
    const newSnippet = await createRecord(TABLES.SNIPPETS, {
      snippet_text: parsed.cleaned_text,
      tags:         parsed.tags.join(", "),
      status:       "candidate",
    }, ['id']);
    await logEntry({
      workflow_id:    state.workflowId,
      entity_id:      post.id,
      step_name:      "review_snippet_created",
      stage:          "snippet_create",
      output_summary: `Snippet candidate created: [${newSnippet.id}] ${parsed.cleaned_text.slice(0, 120)}`,
      model_version:  "claude-sonnet-4-6",
      status:         "success",
    });
    console.log(`✅ Snippet candidate saved: "${parsed.cleaned_text.slice(0, 80)}..."`);
    // Return to options for this post
  }
}
```

### 5. Continue to next post until all reviewed

After all posts:
```
Review complete: [N] approved, [N] revised+approved, [N] rejected.
Approved posts are ready to publish. Run /publish.
```

---

## Writes

| Table | Column | Value | When |
|---|---|---|---|
| `pipeline.posts` | `status` | `approved` \| `rejected` | on decision |
| `pipeline.posts` | `approved_at` | `now()` | approve only |
| `pipeline.posts` | `draft_content` | optimized content | approve `a` when content differs |
| `pipeline.posts` | `draft_content` | original content | approve `ao` when content differs |
| `pipeline.posts` | `draft_content` | updated content | revise (`r` / `ro`) |
| `pipeline.posts` | `humanity_snippet_id` | uuid FK (single value) | snippet swap (`s1` / `s2`) |
| `pipeline.posts` | `snippet_fit_score` | 1–5 | snippet rating (`sf`) |
| `pipeline.humanity_snippets` | `snippet_text`, `tags`, `status` | new candidate row | `sn` |
| `pipeline.logs` | multiple | one per editorial loop pass, one per decision, swap, rating, new snippet |  |
| in-memory | `optimization` variable | editorial optimization result | set per post during session, cleared on approve/reject |

---

## Error Path

If editorial loop fails entirely (all passes error):
```
⚠ Editorial optimization unavailable for post [id] — [error]. Showing original draft.
```
Review continues with original `draft_content`. Simon can still approve, revise, or reject.

If a single write fails for a post:
```
❌ Failed to save decision for post [id] — [error]. Status unchanged. Re-enter choice.
```
