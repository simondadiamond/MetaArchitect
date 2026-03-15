# /review — Post Review Command

Display drafted posts for Simon's approval, revision, or rejection.
Each post is pre-processed through a 2–3 pass editorial optimization loop before display.
Simon sees the strongest candidate first and can approve, revert to original, or revise further.

---

## Precondition

Posts with `status = drafted`.

Risk tier: low for display, medium for approve/revise writes → S + T + E on writes.

> **Airtable**: Use MCP tools directly — no node scripts. See `.claude/skills/airtable.md` for field IDs. Always `typecast: true` on writes.
> **Optimization cache**: No `.tmp/` files. Store the `optimization` object as an in-memory variable per post within the session. No file I/O.

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
// MCP: get_table_schema for status "drafted" choice ID, then:
//   mcp__claude_ai_Airtable__list_records_for_table
//   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs"
//   fieldIds: [fldlC1PMzRw0z6cTR, fldgVwvcXFDA7RCxf, fldztvQenFV0pW44l,
//              fldps8GeW62IjxTze, fldRHUQer2GFyLieS, fldk046kLs4yG2p1Y,
//              fldNQw5L5KBFpFt5a, fldmmLHwgsBpa6KP6, fldcQe7vI0lE6qqwQ,
//              fld9OwHI6Z2Al3p7T, flde3pQnFHI8shfyX]
//   filters: status = "drafted" (choice ID) — sort: flde3pQnFHI8shfyX asc
const posts = // result.records

if (posts.length === 0) {
  return "No posts with status = drafted. Run /draft first.";
}
```

### 2. Load linked records for each post
For each post, fetch via MCP:
- `hook_id` → `list_records_for_table(appgvQDqiFZ3ESigA, tblWuQNSJ25bs18DZ, recordIds: [hookId])` — fieldIds: `[fldSIjqzsFuxWOaYb, fldOvWxj7O0x51aIX]`
- `framework_id` → `list_records_for_table(appgvQDqiFZ3ESigA, tblYsys2ydvryVtmf, recordIds: [frameworkId])` — fieldIds: `[fldcFJnXRemmm2PqU]`
- `humanity_snippet_id` → `list_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF, recordIds: [snippetId])` — fieldIds: `[fldaWegy2OyWpA28D]`
- `alt_snippet_ids` → same table, recordIds: array from alt_snippet_ids field
- `needs_snippet` flag from `fldcQe7vI0lE6qqwQ`

### 2.5. Run editorial optimization loop

This runs after linked records are loaded, before display. See `editorial.md` for the three prompts.

```javascript
updateStage(state, "editorial_optimizing");

// Tolerant: optimization is stored as an in-memory variable (no .tmp files).
// Within a session, if this post was already optimized (e.g. after a revision), reuse
// the existing `optimization` variable rather than re-running the editorial loop.
let optimization = null; // set per-post — persists in-session only

if (!optimization) {
  let editorialError = null;

  // Pass 1 — House Humanizer
  let humanizedCandidate;
  try {
    humanizedCandidate = await callClaude({
      system: EDITORIAL_HUMANIZER_SYSTEM,
      user: post.fields.draft_content,
      model: "claude-sonnet-4-6"
    });
  } catch (err) {
    editorialError = `Pass 1 failed: ${err.message}`;
    humanizedCandidate = null;
  }

  // Pass 2 — Fidelity Check (only if Pass 1 succeeded)
  let fidelityReport = null;
  if (humanizedCandidate) {
    try {
      const fidelityRaw = await callClaude({
        system: EDITORIAL_FIDELITY_SYSTEM,
        user: `ORIGINAL:\n${post.fields.draft_content}\n\nOPTIMIZED:\n${humanizedCandidate}`,
        model: "claude-sonnet-4-6"
      });
      fidelityReport = JSON.parse(fidelityRaw); // E gate
    } catch (err) {
      editorialError = `Pass 2 failed: ${err.message}`;
      // Treat as accept_optimized with null scores — don't block review
      fidelityReport = {
        recommendation: "accept_optimized",
        brand_fit_score: null,
        platform_fit_score: null,
        improved_aspects: [],
        preserved_aspects: [],
        repair_targets: []
      };
    }
  }

  // Pass 3 — Repair (conditional)
  let winner = humanizedCandidate ?? post.fields.draft_content;
  let repairRun = false;
  let preferOriginal = !humanizedCandidate; // fallback to original if Pass 1 failed

  if (fidelityReport?.recommendation === "repair_needed") {
    try {
      const repairTargetsList = fidelityReport.repair_targets
        .map((t, i) => `${i + 1}. ${t}`)
        .join("\n");
      winner = await callClaude({
        system: EDITORIAL_REPAIR_SYSTEM,
        user: `OPTIMIZED VERSION:\n${humanizedCandidate}\n\nREPAIR TARGETS:\n${repairTargetsList}`,
        model: "claude-sonnet-4-6"
      });
      repairRun = true;
    } catch (err) {
      editorialError = `Pass 3 failed: ${err.message}`;
      winner = humanizedCandidate; // fall back to unrepaired optimized
    }
  } else if (fidelityReport?.recommendation === "prefer_original") {
    preferOriginal = true;
    winner = post.fields.draft_content;
  }

  // Store in-memory (no file write)
  optimization = {
    postId: post.id,
    originalContent: post.fields.draft_content,
    winnerContent: winner,
    fidelityReport,
    repairRun,
    preferOriginal,
    editorialError,
    createdAt: new Date().toISOString()
  };
  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
  await createRecord(LOGS, {
    workflow_id: state.workflowId,
    entity_id: post.id,
    step_name: "editorial_loop",
    stage: "editorial_optimizing",
    timestamp: new Date().toISOString(),
    output_summary: `editorial loop: brand_fit=${fidelityReport?.brand_fit_score ?? "n/a"}/10, platform_fit=${fidelityReport?.platform_fit_score ?? "n/a"}/10, repair=${repairRun}, recommendation=${fidelityReport?.recommendation ?? "fallback"}${editorialError ? `, error=${editorialError}` : ""}`,
    model_version: "claude-sonnet-4-6",
    status: editorialError ? "error" : "success"
  });
}
```

### 3. Display each post

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
  Improved:  [fidelityReport.improved_aspects joined by ", "]
  Preserved: [fidelityReport.preserved_aspects joined by ", "]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hook used:      [hook_text] ([hook_type])
Framework used: [framework_name]
Snippet used:   [snippet_text first 80 chars...] | [⚠ needs_snippet — no snippet matched]
  Alt 1:        [alt_snippet_1 first 80 chars...] (or "none")
  Alt 2:        [alt_snippet_2 first 80 chars...] (or "none")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Options:
  a         — approve [optimized/original]
  ao        — approve original (bypass optimization)
  r [notes] — revise optimized version (e.g., "r tighten the close")
  ro [notes] — revise original instead
  x         — reject
  ?         — show full original for comparison
  s1 / s2   — swap to alternate snippet 1 or 2
  sf [1-5]  — rate snippet fit
  sn [text] — save a new snippet candidate

Enter choice:
```

### 4. Handle Simon's input

#### Approve optimized (`a`)
```javascript
updateStage(state, "approving");

// If preferOriginal, approve original as-is; otherwise write optimized content first
if (!optimization.preferOriginal && optimization.winnerContent !== optimization.originalContent) {
  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
    draft_content: optimization.winnerContent
  });
}

// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
  status: "approved",
  approved_at: new Date().toISOString()
});
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_approved",
  stage: "approving",
  timestamp: new Date().toISOString(),
  output_summary: `Post approved (${optimization.preferOriginal ? "original" : "optimized"}): ${post.fields?.platform}`,
  model_version: "n/a",
  status: "success"
});

// Clear in-memory optimization cache for this post
optimization = null;
console.log("✅ Approved. Run /publish when ready.");
```

#### Approve original (`ao`)
```javascript
updateStage(state, "approving");

// Write original content back if the optimized version was different
if (optimization.winnerContent !== optimization.originalContent) {
  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
    draft_content: optimization.originalContent
  });
}

// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
  status: "approved",
  approved_at: new Date().toISOString()
});
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_approved",
  stage: "approving",
  timestamp: new Date().toISOString(),
  output_summary: `Post approved (original override): ${post.fields?.platform}`,
  model_version: "n/a",
  status: "success"
});

// Clear in-memory optimization cache for this post
optimization = null;
console.log("✅ Approved (original). Run /publish when ready.");
```

#### Show full original (`?`)
```javascript
// Print original inline — no state change, no Airtable write
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

After revision: update `draft_content` in Airtable immediately and log:
```javascript
// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
  draft_content: revisedContent
});
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_revised",
  stage: "revising",
  timestamp: new Date().toISOString(),
  output_summary: `Post revised (pass ${revisionCount}): ${notes.slice(0, 100)}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
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
// MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
  status: "rejected"
});
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
  workflow_id: state.workflowId,
  entity_id: post.id,
  step_name: "review_rejected",
  stage: "rejecting",
  timestamp: new Date().toISOString(),
  output_summary: "Post rejected",
  model_version: "n/a",
  status: "success"
});
// Clear in-memory optimization cache for this post
optimization = null;
console.log("Post rejected.");
```

#### Swap snippet (`s1` / `s2`)
```javascript
// s1 → alternateSnippets[0], s2 → alternateSnippets[1]
const swapTarget = input === "s1" ? altSnippets[0] : altSnippets[1];
if (!swapTarget) {
  console.log("⚠ No alternate snippet available for that slot.");
  // Re-display options
} else {
  updateStage(state, "snippet_swap");
  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
    humanity_snippet_id: [swapTarget.id]
  });
  currentSnippet = swapTarget;
  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
    workflow_id: state.workflowId,
    entity_id: post.id,
    step_name: "review_snippet_swapped",
    stage: "snippet_swap",
    timestamp: new Date().toISOString(),
    output_summary: `Snippet swapped to alt ${input === "s1" ? "1" : "2"}: [${swapTarget.id}] ${swapTarget.fields?.snippet_text?.slice(0, 80)}`,
    model_version: "n/a",
    status: "success"
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
  // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs, typecast: true)
await patchRecord(POSTS, post.id, {
    snippet_fit_score: fitScore
  });
  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
    workflow_id: state.workflowId,
    entity_id: post.id,
    step_name: "review_snippet_rated",
    stage: "snippet_rating",
    timestamp: new Date().toISOString(),
    output_summary: `Snippet fit scored ${fitScore}/5 for post [${post.id}], snippet [${currentSnippet?.id}]`,
    model_version: "n/a",
    status: "success"
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
    // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblk8QpMOBOs6BMbF, typecast: true)
    //   fields: fldaWegy2OyWpA28D (snippet_text), fldZFO5xKMiqBuUMY (tags), fld90hLmFbyPWvy59 (status)
    const newSnippet = await createRecord(SNIPPETS, {
      snippet_text: parsed.cleaned_text,
      tags: parsed.tags.join(", "),
      status: "candidate"
    });
    // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await createRecord(LOGS, {
      workflow_id: state.workflowId,
      entity_id: post.id,
      step_name: "review_snippet_created",
      stage: "snippet_create",
      timestamp: new Date().toISOString(),
      output_summary: `Snippet candidate created: [${newSnippet.id}] ${parsed.cleaned_text.slice(0, 120)}`,
      model_version: "claude-sonnet-4-6",
      status: "success"
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

## Editorial Prompt Constants

The system prompts from `editorial.md` are referenced as named constants here for clarity.
When implementing, embed or import the text from `.claude/skills/editorial.md`.

| Constant | Purpose |
|---|---|
| `EDITORIAL_HUMANIZER_SYSTEM` | Pass 1 — House Humanizer system prompt |
| `EDITORIAL_FIDELITY_SYSTEM` | Pass 2 — Fidelity Check system prompt |
| `EDITORIAL_REPAIR_SYSTEM` | Pass 3 — Repair system prompt |

---

## Writes

| Table | Field | Value | When |
|---|---|---|---|
| `posts` | `status` | `approved` \| `rejected` | on decision |
| `posts` | `approved_at` | `now()` | approve only |
| `posts` | `draft_content` | optimized content | approve `a` when content differs |
| `posts` | `draft_content` | original content | approve `ao` when content differs |
| `posts` | `draft_content` | updated content | revise (`r` / `ro`) |
| `posts` | `humanity_snippet_id` | updated | snippet swap (`s1` / `s2`) |
| `posts` | `snippet_fit_score` | 1–5 | snippet rating (`sf`) |
| `humanity_snippets` | `snippet_text`, `tags`, `status` | new candidate record | `sn` |
| `logs` | multiple | one per editorial loop pass, one per decision, swap, rating, new snippet |  |
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
