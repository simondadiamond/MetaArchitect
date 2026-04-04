# Lessons Log — The Meta Architect

> Lightweight anti-recurrence file. When something breaks, add a row.
> Rule: one entry per failure class. Fix the SOP in the relevant command/tool. Log the pattern here.

---

## 2026-03-17 — Fabricated Airtable writes on context resumption

**What happened:** /harvest resumed from a compacted context and wrote 5 records to Airtable using data that was in memory from a prior session — not from live Perplexity calls.

**Root cause:** No gate checking whether pipeline outputs were produced in the current session vs. recalled from context.

**Fix applied:** `session_verified` flag in harvest.md — each slot initializes as `false`, only set `true` after a live Perplexity call succeeds. Write gate aborts if `false`.

**Where documented:** `session_verified` pattern in `.claude/commands/harvest.md` (Session Integrity Rule section).

---

## 2026-03-17 — Generic harvest queries produce generic ideas

**What happened:** Harvest run #1 queries had no named entities (tools, surveys, orgs). Perplexity returned generic overviews. Ideas were vague and below production quality.

**Root cause:** Query generator prompt had no specificity constraint.

**Fix applied:** Named Entity Requirement added to harvest.md Step 5 — every query must name a specific tool, org, survey, or regulation. Self-check rule added: "Would the first 3 Google results contain a specific number or named org?" If no → rewrite.

**Where documented:** `harvest.md` Step 5, "Named Entity Requirement" and "Self-Check" sections.

---

## 2026-03-19 — Airtable `typecast` must be in JSON body, not query param

**What happened:** `typecast=true` passed as a URL query param was silently ignored by Airtable. Returned "Insufficient permissions to create new select option."

**Root cause:** Airtable API docs are ambiguous. `typecast` only works in the JSON body of POST/PATCH requests.

**Fix applied:** All MCP Airtable calls now pass `typecast: true` as a field in the request body. Pattern documented.

**Where documented:** `projects/Content-Engine/CLAUDE.md` (Airtable section), `harvest.md` Step 10.

---

## 2026-03-19 — Airtable PAT "all permissions" ≠ `schema.bases:write` scope

**What happened:** Account was base owner with "all permissions" on the table — still got "Insufficient permissions." Two separate auth dimensions conflated.

**Root cause:** Airtable has two independent permission axes: (1) access grants (which tables the token can touch) and (2) operational scopes (what actions the token can perform, e.g., `schema.bases:write`). Owning the base doesn't automatically grant all scopes to a PAT.

**Fix applied:** Regenerate PAT with explicit `schema.bases:write` scope when typecast is needed.

**Where documented:** This file. Reminder: when a PAT fails on permissions, check scopes before checking access.

---

## 2026-03-23 — Snippet tag overlap always zero — `String()` on Airtable multipleSelects objects

**What happened:** `/draft` set `needs_snippet = true` for a Law 25 post despite a matching snippet existing in the bank with tags `traceable / observability / logs / authority`.

**Root cause:** `improver.md` computed tag overlap with `String(s.fields.tags ?? "").split(",")`. Airtable MCP returns `multipleSelects` as an array of `{id, name, color}` objects — `String([{...},...])` produces `"[object Object],[object Object]"`, making `tagOverlap` always 0 for every snippet. Only `textOverlap` remained, which was insufficient to pass the `tagOverlap > 0 || textOverlap > 0` filter.

**Fix applied:** `improver.md` line 186 — extract `.name` from each tag object before lowercasing. Array.isArray guard added for safety.

**Where documented:** `.claude/skills/improver.md` — Humanity Snippet Query for /draft section.

---

## 2026-03-31 — Shallow research query in /capture defaulted to 2025 anchor

**What happened:** `/capture` shallow research step constructed `overviewQuery` from `topic + core_angle` with no year. The Perplexity query included "2025" as a general reference, returning year-old data when we're in Q2 2026.

**Root cause:** The `overviewQuery` construction in step 6.5 of `capture.md` has no year-anchor requirement. The year-anchor rule lives in `feedback_harvest_query_quality.md` for `/harvest` but was never applied to `/capture`.

**Fix applied:** Step 6.5 overviewQuery now appends the current year: `` `${strategistOutput.topic} — ${strategistOutput.core_angle} — ${new Date().getFullYear()}` ``

**Where documented:** `.claude/commands/capture.md` Step 6.5.

---

## Template for new entries

```
## YYYY-MM-DD — [Short failure description]

**What happened:** [1–2 sentences]

**Root cause:** [The structural reason, not the surface symptom]

**Fix applied:** [What changed]

**Where documented:** [File/section where the fix lives]
```
