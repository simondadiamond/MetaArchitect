---
name: convert-dispatch
description: Use when the Command Center schedule fires '/convert-dispatch' (~every 30 min), or when Simon asks to "process the convert queue" / "run the converter". Claims the single oldest queued row from public.conversions and turns it into pipeline.posts drafts (+ X variants, + a blog_ideas candidate, + a follow-up email for session notes). Do NOT trigger for interactive drafting from notes Simon pastes in chat (build-story), deriving posts from published long-form (repurpose), or writing blog posts (write-post).
---

# Convert Dispatch — queued source material → drafts

**Risk tier: medium (S + T + E)** — writes to `pipeline.posts`, `public.blog_ideas`, and PATCHes the conversion row; every LLM output passes its gate before any write. On any failure:

```
❌ convert-dispatch failed at [stage] — [error message] — conversion marked error, safe to retry after reset to queued
```

This is the **scheduled path** of the build-story flywheel: the /convert page (Command Center, Business OS section) queues raw material; this skill converts it unattended. All drafting judgment comes from `build-story` and `repurpose` — this file wires them to the queue, it does not restate their gates. Read both before drafting:

- `.claude/skills/build-story/SKILL.md` — provenance, stories-not-tutorials, CTA routing, client anonymity, zero em dashes in post copy.
- `.claude/skills/repurpose/SKILL.md` — Step 7 Save mechanics (row shape, captured ids, non-atomic loop, test hygiene) and the Scheduled Mode contract.

---

## Hard rules

1. **Process exactly ONE conversion per invocation, then stop.** Fires every ~30 minutes on Sterling (~8GB headroom); overlapping fires must never double-work. Never loop to a second row.
2. **No interactive approval** — this is the scheduled path. Same contract as `/repurpose --auto` Scheduled Mode: every candidate that passes the full gate is saved as `status: 'drafted'`; a candidate failing the gate gets ONE rewrite + re-gate; still failing → drop it and note it in the result. **Never lower the bar to hit the count.** Simon's approval moves downstream: he reviews drafts in Command Center → Content.
3. Nothing in this skill schedules, publishes, or touches Postiz.

---

## STEP 0 — STATE init

```javascript
const state = {
  workflowId: crypto.randomUUID(),
  stage: "init",
  entityType: "conversion",
  entityId: null,           // set at claim
  startedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
};
```

Run node snippets from `projects/Content-Engine/` (deps + `.env` resolve there). Log every stage transition and every save to `pipeline.logs` via `logEntry` from `./tools/supabase.mjs` with `step_name: 'convert_dispatch'`, `entity_id: <conversion id>`.

---

## Protocol

### 1. Claim

```bash
curl -s -o /tmp/claim.json -w "%{http_code}" -X POST http://100.105.85.5:3737/api/conversions/claim
```

- `204` → print `convert queue: empty`, log it (`output_summary: 'queue empty'`), stop.
- `200` → the body's `conversion` is the row: `{id, title, source_type, raw_content, targets, ...}`. Set `state.entityId`. The claim already flipped it to `processing` — never SELECT or claim a second row.
- Any other status → report the error and stop (nothing was claimed; nothing to roll back).

From here on, every failure path MUST end with the error PATCH in step 6 — never leave a row stuck in `processing`.

### 2. Read the gates

Read `build-story/SKILL.md`, `repurpose/SKILL.md` (Step 7 + Scheduled Mode), and `.claude/skills/repurpose/references/linkedin-playbook.md`. All their gates apply to every candidate here. Provenance rule verbatim: every event, number, and quote must trace to `raw_content` — no fabrication, no composite clients, anonymized by default.

### 3. Draft per target

**`linkedin`** — draft 1–2 build-story candidates (different angles, different hook patterns), gate each, save survivors one row at a time with the repurpose Step 7 mechanics: `createRecord(TABLES.POSTS, {...})` with `post_class: 'repurposed'`, `platform: 'linkedin'`, `status: 'drafted'`, `drafted_at` now, first comment on the row. Source provenance in the `pipeline.logs` `output_summary`: `conversion <id>: <title>`. **Capture every returned row id** — they go in the result and any recovery uses them, never an attribute re-query.

**FR twin (mandatory for every saved LinkedIn draft):** also save a French twin row — proper Québec French, NOT a literal translation; the same gates apply in French; zero em dashes. `pipeline.posts` has no language column, so the marker is `source_angle_name` prefixed `[FR] ` (the /content table titles rows by their first content line, which reads French anyway). Same save mechanics, own captured id. Simon approves EN and FR independently in /content.

**`x`** — for each saved EN LinkedIn draft, write one cross-post variant (≤ 280 chars, or a 2–4 tweet thread for bigger stories). Always store the variants in the conversion's `result.x_variants`. Then check the feature flag: `node tools/postiz.mjs channels` (from `projects/Content-Engine/`) — if `xConnected` is true, ALSO save each variant as a `pipeline.posts` row (`platform: 'x'`, `status: 'drafted'`, same save mechanics and captured ids as the LinkedIn rows) so Simon can review and schedule it via the linkedin-publish tooling (`postiz.mjs` routes `platform: 'x'` rows to the X integration). While `xConnected` is false, the result jsonb is the only home — never create X rows that can't be scheduled. This skill itself never schedules or publishes either way; X volume stays modest (same automation-risk posture as LinkedIn).

**`blog`** — only when `raw_content` carries ≥ ~600 words of real substance (mechanisms, events, numbers — not padding). Insert ONE row into `public.blog_ideas` exactly as the staged pipeline expects (same shape as command-center `lib/db/blog-ideas.ts` promote):

```javascript
// from projects/Content-Engine/, public schema client (see tools/blog-artifacts.mjs header)
{ title_working: <working title>, notes: <2–5 line brief: angle, key events, source = conversion <id>>,
  pillar: <one of failure_taxonomy|state_applied|defensive_arch|meta_layer|regulated_law25>,
  post_type: 'article', stage: 'candidate', status: 'candidate', capture_id: null }
```

`stage: 'candidate'` is the point: the row enters the staged pipeline behind its human gates — **never** a direct blog draft, never a later stage. Capture the id. Source too thin → skip the target and say so in the result (`blog_idea_id: null`).

**Follow-up email (only when `source_type = 'session_notes'`):** generate the same-day follow-up email from the acquisition playbook template (`funnel/setup-offer/acquisition-playbook.md`, "Follow-up email"): three concrete session-specific items traced to the notes (two from the session, one small solo next step), where we stopped, what's next. Store the full email in `result.follow_up_email`. After the PATCH in step 6, ping: `await ntfy('Follow-up email ready to send today — <conversion title> — CC /convert')` (a false return gets one log line, nothing more).

### 4. Validate before writing (E gate)

Before ANY write: post copy passes the linkedin-playbook checks (anatomy, hook, no engagement bait, save-worthy element, zero em dashes, no AI-tell shapes); the blog_ideas insert matches the shape above exactly; the follow-up email contains three items that each trace to the notes. Invalid output → error path, never silent continue.

### 5. Assemble result

```javascript
{ post_ids: [<all pipeline.posts ids, EN + FR>], x_variants: [<strings>],
  blog_idea_id: <uuid or null>, follow_up_email: <string, session_notes only> }
```

Plus a `dropped` note in the log output_summary when any candidate failed its re-gate.

### 6. Close the conversion

```bash
curl -s -X PATCH http://100.105.85.5:3737/api/conversions/<id> \
  -H 'content-type: application/json' \
  -d '{"status":"done","result":<result json>}'
```

On any failure at any stage instead: `{"status":"error","last_error":"<stage>: <message>"}` — and if `pipeline.posts` rows were already saved, list their captured ids in `last_error` so nothing is orphaned. Log the final outcome (`output_summary: 'conversion <id> done: <n> posts (<m> FR), <k> x variants, blog idea <id|none>, follow-up <yes|no>'`) and **stop**.

---

## Test hygiene

Any manual/test run that writes to `pipeline.posts` ends by marking its rows `status: 'rejected'` (captured ids) and deleting any test `blog_ideas` row before the session moves on. Test conversions get deleted from `public.conversions`, not left `done`.
