# /editorial-planner — Weekly Editorial Planning Command

Compose the optimal 3–4 post lineup for the current ISO week. Answers: "What should I draft this week, in what order, and why?"

**Risk tier**: medium (LLM call + Airtable batch writes) → S + T + E required.
**No lock needed**: no single expensive operation to gate — the whole command is the unit.

> **Airtable**: Use MCP tools directly — no node scripts. All table IDs and field IDs are in `.claude/skills/airtable.md`. Always `typecast: true` on writes.

---

## STATE Init

```javascript
import { randomUUID } from "crypto";

const state = {
  workflowId: randomUUID(),
  stage: "init",
  entityType: "idea",
  entityId: "batch",
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString()
};
```

---

## Steps

### 1. Compute ISO week

```javascript
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
const plannedWeek = getISOWeek(new Date());  // e.g. "2026-W11"
```

Update state: `stage = "week_computed"`.

---

### 2. Idempotency check

Check the **posts** table (not ideas) — post stubs are the canonical record of a planned week.

```javascript
state.stage = "idempotency_check";
// MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs)
//   fieldIds: [fldViXirsiFl1j1w4] — filters: planned_week = plannedWeek (text field)
const existing = // result.records
if (existing.length > 0) {
  return `⚠ Editorial plan for ${plannedWeek} already exists (${existing.length} post stubs). Check Airtable before re-running.`;
}
```

---

### 3. Fetch candidates

```javascript
state.stage = "fetch_candidates";
// MCP: get_table_schema for Status "New" choice ID, then:
//   list_records_for_table(appgvQDqiFZ3ESigA, tblVKVojZscMG6gDk)
//   fieldIds: [fldMtlpG32VKE0WkN, fld9frOZF4oaf3r6V, fldQMArYmpP8s6VKb, fldBvV1FgpD1l2PG1,
//              fldF8BxXjbUiHCWIa, fldJatmYz453YGTyV, fldeYByfFx9xjFnnK, fldquN4wVbd6eLKYF, fldvw93lwpYEqD5nX]
//   filters: Status = "New" (choice ID) — sort: fldJatmYz453YGTyV desc
const candidates = // result.records
if (candidates.length < 3) {
  return `⚠ Only ${candidates.length} ideas with Status = "New" — need at least 3. Run /capture to add more.`;
}
```

---

### 4. Fetch pipeline context (in-flight intent distribution — background signal only)

This data is passed to the composer as awareness context. It is NOT the primary planning objective. The composer optimizes for authority density and practitioner resonance first; intent balance is a soft trailing constraint.

```javascript
state.stage = "fetch_pipeline_context";
// MCP: get_table_schema for Status choice IDs (Selected, Ready), then:
//   list_records_for_table(appgvQDqiFZ3ESigA, tblVKVojZscMG6gDk)
//   fieldIds: [fld9frOZF4oaf3r6V, fldF8BxXjbUiHCWIa]
//   filters: Status isAnyOf ["Selected", "Ready"] (choice IDs)
const inFlight = // result.records
const inFlightCounts = { authority: 0, education: 0, community: 0, virality: 0 };
inFlight.forEach(r => {
  const intent = r.fields?.intent;
  if (intent && inFlightCounts[intent] !== undefined) inFlightCounts[intent]++;
});
```

---

### 4b. Fetch rolling editorial history

```javascript
state.stage = "fetch_editorial_history";

// Proper ISO week decrement — handles year boundaries and 53-week years correctly
function getPriorWeeks(currentWeek, count) {
  const [yearStr, weekStr] = currentWeek.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);

  // Jan 4 is always in ISO week 1 — use as anchor to find Monday of any ISO week
  function isoWeekToMonday(y, w) {
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const dow = jan4.getUTCDay() || 7; // 1=Mon … 7=Sun
    const d = new Date(jan4);
    d.setUTCDate(jan4.getUTCDate() - (dow - 1) + (w - 1) * 7);
    return d;
  }

  function dateToISOWeekStr(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dow = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dow); // shift to Thursday of the same ISO week
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  const currentMonday = isoWeekToMonday(year, week);
  const result = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(currentMonday);
    d.setUTCDate(currentMonday.getUTCDate() - i * 7);
    result.push(dateToISOWeekStr(d));
  }
  return result;
}

const priorWeeks = getPriorWeeks(plannedWeek, 4);
// MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblz0nikoZ89MHHTs)
//   fieldIds: [fldViXirsiFl1j1w4, fldoszwWyI2UBIIzu, fldDNwByEQkXdq4lV, fldlGGDwqp6Hy17jT,
//              fldw3GtLHQeFtN9xl, fldrhO25vUB5CDjgt, fldps8GeW62IjxTze]
//   filters: planned_week isAnyOf priorWeeks (text field — use OR with multiple "=" operands)
const recentPosts = // result.records

// Group by week for consecutive-week checks
const recentByWeek = {};
recentPosts.forEach(p => {
  const w = p.fields?.planned_week ?? "unknown";
  if (!recentByWeek[w]) recentByWeek[w] = [];
  recentByWeek[w].push(p.fields);
});

const priorWeekPosts = recentByWeek[priorWeeks[0]] ?? [];

// Build frequency counts — required for >60% pillar and 3+ territory rules
function buildCounts(values) {
  return values.reduce((acc, v) => {
    if (v) acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

// Conservative territory matching — only matches near-duplicate slugs, not conceptually related ones.
// Excludes generic domain tokens that appear in almost every AI reliability territory.
// Two conditions, either of which triggers a match (both require meaningful token overlap ≥3):
//   Rule 1 — ≥3 shared meaningful tokens anywhere in both slugs
//   Rule 2 — first 2 non-generic tokens match in order AND ≥1 additional shared token (total ≥3)
// When uncertain, returns false. This is a soft memory aid, not a clustering system.
const GENERIC_TERRITORY_TOKENS = new Set([
  // Generic domain terms (appear in almost every AI reliability territory)
  "state", "framework", "architecture", "reliability", "system",
  "model", "agent", "llm", "ai", "production", "based", "driven",
  // Structural suffix vocabulary (process/outcome words, not subject discriminators)
  "error", "errors", "failure", "failures", "handling",
  "pattern", "patterns", "detection", "strategy", "strategies"
]);

function territoriesMatch(keyA, keyB) {
  if (!keyA || !keyB) return false;
  if (keyA === keyB) return true;

  // Extract meaningful tokens: length > 3 AND not a generic domain term
  function meaningful(key) {
    return key.split("_").filter(t => t.length > 3 && !GENERIC_TERRITORY_TOKENS.has(t));
  }

  const tokensA = meaningful(keyA);
  const tokensB = meaningful(keyB);
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  // Count shared meaningful tokens
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared++;

  // Rule 1: ≥3 shared meaningful tokens → near-duplicate
  if (shared >= 3) return true;

  // Rule 2: first 2 non-generic tokens match in order + ≥1 additional shared token
  // (total shared ≥ 3 — the ordering constraint adds confidence)
  if (tokensA.length >= 2 && tokensB.length >= 2 &&
      tokensA[0] === tokensB[0] && tokensA[1] === tokensB[1] &&
      shared >= 3) return true;

  // When uncertain: prefer NOT matching
  return false;
}

// Aggregate territory keys by similarity — groups near-duplicate slugs under their first-seen canonical form.
// e.g. if "json_parsing_failures_llm" (×2) and "json_parse_failure_in_llm" (×1) match → count=3
// Only aggregates conservative matches — distinct territories are never collapsed.
function aggregateTerritories(keys) {
  const groups = []; // [{ canonical: string, count: number }]
  for (const k of keys.filter(Boolean)) {
    const existing = groups.find(g => territoriesMatch(g.canonical, k));
    if (existing) existing.count++;
    else groups.push({ canonical: k, count: 1 });
  }
  return Object.fromEntries(groups.map(g => [g.canonical, g.count]));
}

// NOTE: territoriesMatch is also used in inferPostClass (Step 10) for territory_deepening detection.
}

const recentHistory = {
  weeks_sampled:        priorWeeks,
  total_posts:          recentPosts.length,
  // Distinct arrays — for set-membership checks
  pillars_used:         [...new Set(recentPosts.map(p => p.fields?.pillar).filter(Boolean))],
  narrative_roles_used: [...new Set(recentPosts.map(p => p.fields?.narrative_role).filter(Boolean))],
  idea_ids_used:        [...new Set(recentPosts.map(p => p.fields?.idea_id?.[0]).filter(Boolean))],
  post_classes_used:    [...new Set(recentPosts.map(p => p.fields?.post_class).filter(Boolean))],
  territory_keys_used:  [...new Set(recentPosts.map(p => p.fields?.territory_key).filter(Boolean))],
  // Counts — required for percentage and frequency rules
  pillar_counts:         buildCounts(recentPosts.map(p => p.fields?.pillar)),
  narrative_role_counts: buildCounts(recentPosts.map(p => p.fields?.narrative_role)),
  post_class_counts:     buildCounts(recentPosts.map(p => p.fields?.post_class)),
  territory_key_counts:  aggregateTerritories(recentPosts.map(p => p.fields?.territory_key)),
  // Prior week only — for back-to-back checks
  prior_week_idea_ids:       priorWeekPosts.map(p => p.idea_id?.[0]).filter(Boolean),
  prior_week_post_classes:   priorWeekPosts.map(p => p.post_class).filter(Boolean),
  prior_week_territory_keys: priorWeekPosts.map(p => p.territory_key).filter(Boolean),
};

// Safe when no history exists yet — empty arrays/objects, planner ignores constraints
```

---

### 5. Fetch brand context

```javascript
state.stage = "fetch_brand";
// MCP: list_records_for_table(appgvQDqiFZ3ESigA, tblwfU5EpDgOKUF7f)
//   fieldIds: all brand fields — filters: name = "metaArchitect"
const brandRecords = // result.records
const brand = brandRecords[0]?.fields ?? {};
```

---

### 6. Build composer input

Extract the `angles` array from each candidate's `Intelligence File` UIF JSON. If a candidate has no UIF or an empty angles array, fall back to a single synthetic angle built from `content_brief.core_angle` — this prevents the planner from crashing on pre-migration ideas.

```javascript
state.stage = "build_composer_input";
const composerInput = {
  planned_week: plannedWeek,
  in_flight_counts: inFlightCounts,
  target_ratios: { authority: 0.50, education: 0.30, community: 0.15, virality: 0.05 },
  recent_history: recentHistory,
  candidates: candidates.map(r => {
    let angles = [];
    try {
      const uif = JSON.parse(r.fields?.["Intelligence File"] ?? "{}");
      angles = (uif.angles ?? []).map((a, i) => ({
        index: i,
        angle_name: a.angle_name,
        contrarian_take: a.contrarian_take,
        pillar_connection: a.pillar_connection,
        brand_specific_angle: a.brand_specific_angle
      }));
    } catch (_) {}

    // Fallback for older ideas without UIF / empty angles
    if (angles.length === 0) {
      let fallbackAngle = null;
      try {
        const brief = JSON.parse(r.fields?.content_brief ?? "{}");
        fallbackAngle = brief.core_angle ?? null;
      } catch (_) {}
      angles = [{
        index: 0,
        angle_name: fallbackAngle ?? r.fields?.Topic ?? "unknown",
        contrarian_take: "",
        pillar_connection: null,
        brand_specific_angle: false
      }];
    }

    // Note: the planner prefers idea diversity (1 post per idea when quality allows)
    // but permits up to 2 from the same idea when it materially strengthens the arc.
    // Multiple posts may reference the same idea_id with different narrative_roles.
    // Internal heuristics (authority_weight, arc pattern, gravity post) are used by
    // the planner during reasoning and do not appear in the output JSON.
    // This map provides all available angles as raw material only.
    return {
      idea_id: r.id,
      topic: r.fields?.Topic ?? "",
      score_overall: r.fields?.score_overall ?? null,
      score_brand_fit: r.fields?.score_brand_fit ?? null,
      score_originality: r.fields?.score_originality ?? null,
      score_virality: r.fields?.score_virality ?? null,
      intent: r.fields?.intent ?? null,
      angles
    };
  })
};
```

---

### 7. Call Editorial Composer

Load the `planner.md` skill as the system prompt. Call `claude-sonnet-4-6`.

```javascript
state.stage = "composer_call";

const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  system: PLANNER_SYSTEM_PROMPT,  // loaded from .claude/skills/planner.md
  messages: [{ role: "user", content: JSON.stringify(composerInput) }]
});
const rawOutput = response.content[0].text;
```

---

### 8. E gate — parse + validate

Pass the full `candidates` array (not just IDs) so the validator can check `angle_index` bounds.

```javascript
state.stage = "validation";

let plan;
try {
  plan = JSON.parse(rawOutput);
} catch (e) {
  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await logEntry({ workflow_id: state.workflowId, entity_id: "batch", step_name: "editorial_composer", stage: state.stage, output_summary: `JSON parse failed: ${e.message}`, model_version: "claude-sonnet-4-6", status: "error" });
  return `❌ /editorial-planner failed at validation — JSON parse error: ${e.message} — safe to retry`;
}

const validation = validateEditorialPlan(plan, candidates);
if (!validation.valid) {
  // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await logEntry({ workflow_id: state.workflowId, entity_id: "batch", step_name: "editorial_composer", stage: state.stage, output_summary: `Validation failed: ${validation.errors.join("; ")}`, model_version: "claude-sonnet-4-6", status: "error" });
  return `❌ /editorial-planner failed at validation — ${validation.errors.join("; ")} — safe to retry`;
}
```

---

### 9. Log LLM call

```javascript
// MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await logEntry({
  workflow_id: state.workflowId,
  entity_id: "batch",
  step_name: "editorial_composer",
  stage: "validation",
  timestamp: new Date().toISOString(),
  output_summary: `Composed ${plan.post_count}-post plan for ${plannedWeek}. Theme: ${plan.theme ?? "none"}`,
  model_version: "claude-sonnet-4-6",
  status: "success"
});
```

---

### 10. Write to Airtable

Create a **post stub** in the posts table for each planned post, then mark the idea `Selected` on the ideas table (for human visibility in Airtable). Posts table is canonical for pipeline operations.

Track written stubs for partial-failure reporting.

```javascript
state.stage = "writing";
const written = [];
const selected_at = new Date().toISOString();

for (const post of plan.posts) {
  try {
    // Derive source_angle_name from the candidates array
    const candidateRecord = composerInput.candidates.find(c => c.idea_id === post.idea_id);
    const selectedAngle = candidateRecord?.angles?.[post.angle_index];
    const sourceAngleName = selectedAngle?.angle_name ?? null;

    // Derive territory_key: stable slug, prefers angle name > thesis > topic
    function deriveTerritory(p, sourceName) {
      const base = sourceName ?? p.thesis_angle ?? p.topic ?? "unknown";
      return base.toLowerCase().replace(/[^a-z0-9\s_-]/g, "").replace(/\s+/g, "_").slice(0, 80);
    }
    const territoryKey = deriveTerritory(post, sourceAngleName);

    // Infer post_class conservatively
    // research_commentary role does NOT auto-trigger trend_commentary
    // Use combined signal: topic + thesis_angle + sourceAngleName
    function inferPostClass(p, srcAngle, tKey, history) {
      const combined = [p.topic, p.thesis_angle, srcAngle]
        .filter(Boolean).join(" ").toLowerCase();

      const trendKeywords = [
        "trend", "prediction", "forecast", "state of the industry",
        "field is moving", "industry shift", "what's changing",
        "2024 report", "2025 report", "2026 report",
        "survey says", "benchmark report", "state of ai"
      ];
      const productKeywords = [
        "vs ", "compared to", "is overrated", "is underrated",
        "gpt-4", "gpt-5", "claude 3", "claude 4", "gemini ",
        "copilot", "cursor ai", "just launched", "just released",
        "product analysis", "tool review", "model review"
      ];

      if (trendKeywords.some(k => combined.includes(k)))   return "trend_commentary";
      if (productKeywords.some(k => combined.includes(k))) return "product_commentary";

      // territory_deepening: territory overlaps with a known territory from last 4 weeks
      // Uses conservative token-overlap match (territoriesMatch) — prefers false negative over false positive
      const knownTerritories = history?.territory_keys_used ?? [];
      if (tKey && knownTerritories.some(k => k === tKey || territoriesMatch(k, tKey))) return "territory_deepening";

      return "practitioner_core";
    }
    const postClass = inferPostClass(post, sourceAngleName, territoryKey, recentHistory);

    // MCP: mcp__claude_ai_Airtable__create_records_for_table
    //   baseId: "appgvQDqiFZ3ESigA", tableId: "tblz0nikoZ89MHHTs", typecast: true
    //   Use field IDs from airtable.md for all fields below
    const postStub = await createRecord(POSTS, {
      idea_id: [post.idea_id],
      planned_week: plannedWeek,
      planned_order: post.order,
      narrative_role: post.narrative_role,
      angle_index: post.angle_index,
      series_id: post.series_id ?? null,
      series_part: post.series_part ?? null,
      series_total: post.series_total ?? null,
      selection_reason: post.why_selected,
      status: "planned",
      // editorial memory fields
      pillar:            post.pillar,
      thesis_angle:      post.thesis_angle,
      source_angle_name: sourceAngleName,
      territory_key:     territoryKey,
      post_class:        postClass,
    });

    // MCP: update_records_for_table(appgvQDqiFZ3ESigA, tblVKVojZscMG6gDk, typecast: true)
    //   fields: fld9frOZF4oaf3r6V (Status), fldx3QLe3tKPmU88U (selected_at), etc.
    await patchRecord(IDEAS, post.idea_id, {
      Status: "Selected",
      selected_at,
      planned_week: plannedWeek,
      planned_order: post.order,      // last-write wins if multi-post — acceptable for display
      narrative_role: post.narrative_role,
      series_id: post.series_id ?? null,
      series_part: post.series_part ?? null,
      series_total: post.series_total ?? null,
      selection_reason: post.why_selected
    });

    written.push(postStub.id);

    // MCP: create_records_for_table(appgvQDqiFZ3ESigA, tblzT4NBJ2Q6zm3Qf, typecast: true)
await logEntry({
      workflow_id: state.workflowId,
      entity_id: postStub.id,
      step_name: "post_stub_created",
      stage: "writing",
      timestamp: new Date().toISOString(),
      output_summary: `Post stub created: order ${post.order} / angle_index ${post.angle_index} / ${post.narrative_role} for ${plannedWeek}`,
      model_version: "n/a",
      status: "success"
    });
  } catch (e) {
    const writtenList = written.length > 0 ? ` Already written stubs: ${written.join(", ")}` : "";
    return `❌ /editorial-planner failed at writing (idea ${post.idea_id}) — ${e.message}${writtenList} — check Airtable before retrying`;
  }
}
```

---

### 11. Print terminal output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEEKLY EDITORIAL PLAN — Week [NN], [YYYY]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Theme: [plan.theme or "none"]
[N] posts this week | [N] post stubs created

POST [N] — [narrative_role label]
  Topic:       [topic]
  Angle [N]:   [angle_name]
  Pillar:      [pillar]
  Hook:        [hook_style]
  Thesis:      [thesis_angle]
  Why:         [why_selected]
  Sets up:     [sets_up_next or omit if null]

[repeat for each post]

Rationale: [plan.rationale]

Run /research to begin deep research on post stubs (oldest planned first by default).
Each post stub targets one angle — the same idea may have multiple stubs this week.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Narrative role display labels:
- `authority_anchor` → `Authority Anchor`
- `resonance_story` → `Resonance / Story`
- `diagnostic_teardown` → `Diagnostic / Teardown`
- `framework_playbook` → `Framework / Playbook`
- `tactical_support` → `Tactical Support`
- `contrarian_reframe` → `Contrarian Reframe`
- `research_commentary` → `Research Commentary`

---

## Writes

| Table | Field | Value |
|-------|-------|-------|
| `posts` | `idea_id` | linked record array `["recXXX"]` |
| `posts` | `planned_week` | `"YYYY-WNN"` |
| `posts` | `planned_order` | `1–4` |
| `posts` | `narrative_role` | single select value |
| `posts` | `angle_index` | 0-based index into UIF angles array |
| `posts` | `series_id` | text or null |
| `posts` | `series_part` | number or null |
| `posts` | `series_total` | number or null |
| `posts` | `selection_reason` | long text |
| `posts` | `status` | `"planned"` |
| `posts` | `pillar` | from planner output |
| `posts` | `thesis_angle` | from planner output |
| `posts` | `source_angle_name` | looked up from candidates array via `idea_id` + `angle_index` |
| `posts` | `territory_key` | derived slug: angle name → thesis → topic |
| `posts` | `post_class` | inferred: `practitioner_core` / `territory_deepening` / `trend_commentary` / `product_commentary` |
| `ideas` | `Status` | `"Selected"` |
| `ideas` | `selected_at` | `now()` |
| `ideas` | `planned_week` | `"YYYY-WNN"` (display only) |
| `ideas` | `planned_order` | `1–4` (display only, last-write wins) |
| `ideas` | `narrative_role` | single select (display only) |
| `ideas` | `series_id` | text or null (display only) |
| `ideas` | `series_part` | number or null (display only) |
| `ideas` | `series_total` | number or null (display only) |
| `ideas` | `selection_reason` | long text (display only) |
| `logs` | all fields | per LLM call + per post stub written |

---

## Error Path

No lock to clear. On any failure:
1. Log error to `TABLES.LOGS`
2. If failure occurs mid-write (step 10), include already-written stub IDs in error message
3. Return formatted error: `❌ /editorial-planner failed at [stage] — [message] — safe to retry`

Manual recovery: inspect Airtable posts table for partially-written stubs and delete them, then reset idea `Status` back to `"New"` before retrying.

---

## Airtable Schema Requirements

### `posts` table — new fields required before running:

| Field | Type | Notes |
|-------|------|-------|
| `planned_week` | text | e.g. `"2026-W11"` |
| `planned_order` | number | 1–4 |
| `narrative_role` | single select | same 7 options as ideas table |
| `angle_index` | number | 0-based index into UIF angles array |
| `series_id` | text | nullable |
| `series_part` | number | nullable |
| `series_total` | number | nullable |
| `selection_reason` | long text | — |
| `research_started_at` | text | ISO datetime, used as lock by /research |
| `research_completed_at` | text | ISO datetime |
| `status` options | single select | add `planned`, `researching`, `research_ready` to existing options |

### `ideas` table — 1 new field required:

| Field | Type | Notes |
|-------|------|-------|
| `research_depth` | single select | options: `shallow`, `deep` |
