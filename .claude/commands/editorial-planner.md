# /editorial-planner — Weekly Editorial Planning Command

Compose the optimal 3–4 post lineup for the current ISO week. Answers: "What should I draft this week, in what order, and why?"

**Risk tier**: medium (LLM call + Airtable batch writes) → S + T + E required.
**No lock needed**: no single expensive operation to gate — the whole command is the unit.

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
const existing = await getRecords(
  TABLES.POSTS,
  `{planned_week} = "${plannedWeek}"`
);
if (existing.length > 0) {
  return `⚠ Editorial plan for ${plannedWeek} already exists (${existing.length} post stubs). Check Airtable before re-running.`;
}
```

---

### 3. Fetch candidates

```javascript
state.stage = "fetch_candidates";
const candidates = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `{Status} = "New"`,
  [{ field: "score_overall", direction: "desc" }]
);
if (candidates.length < 3) {
  return `⚠ Only ${candidates.length} ideas with Status = "New" — need at least 3. Run /capture to add more.`;
}
```

---

### 4. Fetch pipeline context (in-flight intent distribution)

```javascript
state.stage = "fetch_pipeline_context";
const inFlight = await getRecords(
  process.env.AIRTABLE_TABLE_IDEAS,
  `OR({Status} = "Selected", {Status} = "Researching", {Status} = "Ready")`
);
const inFlightCounts = { authority: 0, education: 0, community: 0, virality: 0 };
inFlight.forEach(r => {
  const intent = r.fields?.intent;
  if (intent && inFlightCounts[intent] !== undefined) inFlightCounts[intent]++;
});
```

---

### 5. Fetch brand context

```javascript
state.stage = "fetch_brand";
const brandRecords = await getRecords(
  process.env.AIRTABLE_TABLE_BRAND,
  `{name} = "metaArchitect"`
);
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
  await logEntry({ workflow_id: state.workflowId, entity_id: "batch", step_name: "editorial_composer", stage: state.stage, output_summary: `JSON parse failed: ${e.message}`, model_version: "claude-sonnet-4-6", status: "error" });
  return `❌ /editorial-planner failed at validation — JSON parse error: ${e.message} — safe to retry`;
}

const validation = validateEditorialPlan(plan, candidates);
if (!validation.valid) {
  await logEntry({ workflow_id: state.workflowId, entity_id: "batch", step_name: "editorial_composer", stage: state.stage, output_summary: `Validation failed: ${validation.errors.join("; ")}`, model_version: "claude-sonnet-4-6", status: "error" });
  return `❌ /editorial-planner failed at validation — ${validation.errors.join("; ")} — safe to retry`;
}
```

---

### 9. Log LLM call

```javascript
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
    // Create post stub
    const postStub = await createRecord(TABLES.POSTS, {
      idea_id: [post.idea_id],
      planned_week: plannedWeek,
      planned_order: post.order,
      narrative_role: post.narrative_role,
      angle_index: post.angle_index,
      series_id: post.series_id ?? null,
      series_part: post.series_part ?? null,
      series_total: post.series_total ?? null,
      selection_reason: post.why_selected,
      status: "planned"
    });

    // Mark idea Selected + copy planning metadata for Airtable visibility
    await patchRecord(TABLES.IDEAS, post.idea_id, {
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

Run /research to begin deep research on the first post stub.
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
