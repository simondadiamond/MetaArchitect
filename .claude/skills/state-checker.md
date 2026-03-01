# State Checker Skill

All validation functions return `{ valid: boolean, errors: string[], stage: string }`.

---

## validateUIF(json)

Validates a UIF v3.0 object before writing to `ideas.intelligence_file`.

```javascript
function validateUIF(json) {
  const errors = [];

  // Required top-level keys
  if (!json.meta) errors.push("Missing: meta");
  if (!json.core_knowledge) errors.push("Missing: core_knowledge");
  if (!Array.isArray(json.angles)) errors.push("Missing or invalid: angles (must be array)");

  if (json.meta) {
    if (!json.meta.topic || json.meta.topic.trim() === "") errors.push("meta.topic is empty");
    if (!json.meta.research_date || json.meta.research_date.trim() === "") errors.push("meta.research_date is empty");
    if (!json.meta.provenance_log || json.meta.provenance_log.trim() === "") errors.push("meta.provenance_log is empty");
  }

  if (json.core_knowledge) {
    if (!Array.isArray(json.core_knowledge.facts) || json.core_knowledge.facts.length < 1) {
      errors.push("core_knowledge.facts must be an array with at least 1 item");
    } else {
      json.core_knowledge.facts.forEach((f, i) => {
        if (!f.statement || f.statement.trim() === "") errors.push(`facts[${i}].statement is empty`);
        if (!f.source_url || f.source_url.trim() === "") errors.push(`facts[${i}].source_url is empty`);
      });
    }
  }

  const validPillars = [
    "Production Failure Taxonomy",
    "STATE Framework Applied",
    "Defensive Architecture",
    "The Meta Layer",
    "Regulated AI & Law 25"
  ];

  if (Array.isArray(json.angles)) {
    if (json.angles.length < 1) errors.push("angles must have at least 1 item");
    let hasBrandSpecific = false;
    json.angles.forEach((a, i) => {
      if (!a.angle_name || a.angle_name.trim() === "") errors.push(`angles[${i}].angle_name is empty`);
      if (!a.contrarian_take || a.contrarian_take.trim() === "") errors.push(`angles[${i}].contrarian_take is empty`);
      // pillar_connection required
      if (!a.pillar_connection || a.pillar_connection.trim() === "") {
        errors.push(`angles[${i}].pillar_connection is missing`);
      } else {
        const namedPillar = validPillars.find(p => a.pillar_connection.includes(p));
        if (!namedPillar) errors.push(`angles[${i}].pillar_connection must name one of the 5 content pillars`);
      }
      // brand_specific_angle required boolean
      if (typeof a.brand_specific_angle !== "boolean") {
        errors.push(`angles[${i}].brand_specific_angle must be a boolean`);
      } else if (a.brand_specific_angle === true) {
        hasBrandSpecific = true;
      }
      // Validate supporting_facts indices are in bounds
      if (Array.isArray(a.supporting_facts) && json.core_knowledge?.facts) {
        const maxIdx = json.core_knowledge.facts.length - 1;
        a.supporting_facts.forEach((idx, j) => {
          if (!Number.isInteger(idx)) errors.push(`angles[${i}].supporting_facts[${j}] is not an integer`);
          else if (idx < 0 || idx > maxIdx) errors.push(`angles[${i}].supporting_facts[${j}] = ${idx} out of bounds (max: ${maxIdx})`);
        });
      }
    });
    if (!hasBrandSpecific) errors.push("angles: at least 1 angle must have brand_specific_angle = true");
  }

  // humanity_snippets required array
  if (!Array.isArray(json.humanity_snippets)) {
    errors.push("humanity_snippets must be an array (may be empty)");
  } else {
    json.humanity_snippets.forEach((s, i) => {
      if (!Array.isArray(s.suggested_tags)) errors.push(`humanity_snippets[${i}].suggested_tags must be an array`);
      if (!s.relevance_note || s.relevance_note.trim() === "") errors.push(`humanity_snippets[${i}].relevance_note is empty`);
    });
  }

  // distribution_formats items must be strings (not objects)
  if (json.distribution_formats) {
    const df = json.distribution_formats;
    if (df.linkedin_post && !Array.isArray(df.linkedin_post)) errors.push("distribution_formats.linkedin_post must be an array");
    if (Array.isArray(df.linkedin_post)) {
      df.linkedin_post.forEach((item, i) => {
        if (typeof item !== "string") errors.push(`distribution_formats.linkedin_post[${i}] must be a string, not an object`);
      });
    }
    if (df.twitter_thread && !Array.isArray(df.twitter_thread)) errors.push("distribution_formats.twitter_thread must be an array");
    if (Array.isArray(df.twitter_thread)) {
      df.twitter_thread.forEach((item, i) => {
        if (typeof item !== "string") errors.push(`distribution_formats.twitter_thread[${i}] must be a string`);
        else if (item.length > 280) errors.push(`distribution_formats.twitter_thread[${i}] exceeds 280 chars`);
      });
    }
    if (df.youtube_angle && typeof df.youtube_angle !== "string") errors.push("distribution_formats.youtube_angle must be a string");
  }

  return { valid: errors.length === 0, errors, stage: "uif_validation" };
}
```

---

## validatePost(draft)

Validates a post draft before creating a `posts` record.

```javascript
function validatePost(draft) {
  const errors = [];
  const lines = draft.draft_content?.split("\n") ?? [];
  const words = draft.draft_content?.split(/\s+/).filter(Boolean) ?? [];

  // Hook: Line 1 must be non-empty
  if (!lines[0] || lines[0].trim() === "") errors.push("Line 1 (hook) is empty");

  // Lesson section: Lines 7-9 non-empty (0-indexed: 6, 7, 8)
  // Using blank-line anatomy: line 1 hook, line 2 blank, lines 3-4 setup, line 5 blank, lines 6-8 insight, line 9 blank, line 10 close
  const nonBlankLines = lines.filter(l => l.trim() !== "");
  if (nonBlankLines.length < 5) errors.push("Post body too short — missing sections");

  // Close: last non-empty line must exist
  const lastLine = nonBlankLines[nonBlankLines.length - 1];
  if (!lastLine || lastLine.trim() === "") errors.push("Last line (close) is empty");

  // Platform-specific
  if (draft.platform === "linkedin") {
    if (words.length < 150) errors.push(`Word count ${words.length} below minimum (150)`);
    if (words.length > 250) errors.push(`Word count ${words.length} exceeds maximum (250)`);
  }

  if (draft.platform === "twitter") {
    if (draft.draft_content.length > 280) errors.push(`Character count ${draft.draft_content.length} exceeds 280`);
  }

  return { valid: errors.length === 0, errors, stage: "post_validation" };
}
```

---

## validateScore(scoreObj)

Validates a performance score entry before writing to `posts`.

```javascript
function validateScore(scoreObj) {
  const errors = [];

  // performance_score only — NOT score_audience_relevance
  if (scoreObj.performance_score === undefined || scoreObj.performance_score === null) {
    errors.push("performance_score is required");
  } else {
    const s = Number(scoreObj.performance_score);
    if (isNaN(s)) errors.push("performance_score must be numeric");
    else if (s < 0 || s > 10) errors.push(`performance_score ${s} out of range (0-10)`);
  }

  return { valid: errors.length === 0, errors, stage: "score_validation" };
}
```

---

## checkDraftCompleteness(postRecord)

Flags posts that are missing a humanity snippet.

```javascript
function checkDraftCompleteness(postRecord) {
  const needsSnippet = !postRecord.fields?.humanity_snippet_id ||
    postRecord.fields.humanity_snippet_id.length === 0;
  return {
    needs_snippet: needsSnippet,
    stage: "draft_completeness"
  };
}
```

---

## validateBrief(brief)

Validates the content brief generated by the Brand Strategist.

```javascript
function validateBrief(brief) {
  const errors = [];
  
  const required = [
    "working_title", "topic", "strategic_intent", "intent", "target_persona",
    "core_angle", "angle_hypotheses", "content_format", "key_messages", 
    "brand_alignment_rationale"
  ];
  const validIntents = ["authority", "virality", "community", "education", "engagement"];

  for (const f of required) {
    if (!brief[f]) errors.push(`Missing: ${f}`);
  }

  if (brief.intent && !validIntents.includes(brief.intent)) {
    errors.push(`Invalid intent: ${brief.intent}. Must be one of: ${validIntents.join(", ")}`);
  }

  return { valid: errors.length === 0, errors, stage: "brief_validation" };
}
```

---

## validateCaptureScores(scores)

Validates the scores and rationales generated by the Brand Scorer.

```javascript
function validateCaptureScores(scores) {
  const errors = [];
  const scoreFields = [
    "score_brand_fit", "score_audience_relevance", "score_originality", 
    "score_monetization", "score_production_effort", "score_virality", "score_authority"
  ];

  for (const f of scoreFields) {
    const v = scores[f];
    if (typeof v !== "number") errors.push(`${f} must be a numeric score.`);
    else if (v < 1 || v > 10) errors.push(`${f} score ${v} out of range (1-10)`);
  }

  if (!scores.recommended_next_action || scores.recommended_next_action.trim() === "") {
    errors.push("Missing recommended_next_action");
  }

  return { valid: errors.length === 0, errors, stage: "capture_scores_validation" };
}
```

---

## riskTier(operationType)

Returns the required STATE pillars for a given operation type.

```javascript
function riskTier(operationType) {
  const tiers = {
    "read_only":       { tier: "low",    pillars: ["S", "T"] },
    "airtable_write":  { tier: "medium", pillars: ["S", "T", "E"] },
    "llm_call":        { tier: "medium", pillars: ["S", "T", "E"] },
    "external_api":    { tier: "medium", pillars: ["S", "T", "E"] },
    "personal_data":   { tier: "high",   pillars: ["S", "T", "A", "T2", "E"] }
  };
  return tiers[operationType] ?? { tier: "medium", pillars: ["S", "T", "E"] };
}
```

---

## buildStateObject(params)

Initializes the STATE object at the start of any medium/high risk command.

```javascript
function buildStateObject({ stage, entityType, entityId }) {
  const now = new Date().toISOString();
  return {
    workflowId: crypto.randomUUID(),
    stage,
    entityType,
    entityId,
    startedAt: now,
    lastUpdatedAt: now
  };
}

// Update stage as command progresses:
function updateStage(state, newStage) {
  state.stage = newStage;
  state.lastUpdatedAt = new Date().toISOString();
  return state;
}
```

---

## Error Report Format

All commands use this format when reporting failures:

```javascript
function formatError(command, stage, error, lockReset = true) {
  return `❌ ${command} failed at ${stage} — ${error}${lockReset ? " — lock reset, safe to retry" : ""}`;
}
```

Example output:
```
❌ Research failed at uif_compiler — UIF validation: angles[0].contrarian_take is empty — lock reset, safe to retry
```
