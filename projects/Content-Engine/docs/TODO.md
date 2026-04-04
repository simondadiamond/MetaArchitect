# Content Engine — TODO / Fix List

> Prioritized backlog of known gaps, broken behaviors, and design improvements.
> Cross-ref: `docs/roadmap.md` for phase-level work. This file is for pipeline-specific engineering debt.

---

## P0 — Actively broken (fix before next pipeline run)

- [x] **Run `/score` on the W12 story_arc post** (`recxClKHG0SrHXu7b`, published 2026-03-17) — ✅ DONE (already scored)
  - Verified 2026-03-23: post is `status=scored`, `performance_score=0`, `impressions=179`
  - Snippet `recHpuwsPTcnC9srP`: `last_used_at=2026-03-17T14:15:00Z` (actual publish date ✓), `used_count=1` ✓
  - Note: `performance_score=0` means 0 engagements were recorded. If the post had any actual likes/comments/shares/saves, rescore manually via override.

---

## P1 — Design gaps (will ship a bad outcome if left unfixed)

- [ ] **Snippet cooldown gate** — ✅ FIXED 2026-03-22
  - `improver.md` now filters out snippets used in the last 28 days before scoring
  - `last_used_at` field (`fldfqHyUlwn7JqBFn`) added to MCP fieldIds in `querySnippets()`

- [x] **Humanity snippets used verbatim instead of woven in** — ✅ FIXED 2026-03-22
  - Symptom: draft output contains the exact snippet text copy-pasted rather than adapted into the post's voice and context
  - Brand guidelines rule: "One snippet per post maximum. Woven in organically — not announced."
  - Fix: add an explicit instruction to `draft.md` that the snippet must be *adapted*, not reproduced — rephrase to fit the sentence, tense, and context. The raw snippet text should never appear word-for-word in the final draft.
  - Also add a check in `/review` to flag if the draft contains an exact substring match to any snippet bank entry

- [ ] **No compliance/legal-tagged snippets in bank** — coverage gap for Regulated AI pillar posts
  - Symptom: Law 25 posts fall back to observability/logging snippets, wrong thematic fit
  - Fix: next time Simon has a real compliance/legal moment (stakeholder asks "why did the AI do that?" with no answer), add it to `humanity_snippets` with tags: `compliance`, `legal-team`, `regulated-industry`
  - Suggested tags for the entry: `["compliance", "legal-team", "regulated-industry", "production-incident"]`

- [ ] **BACKLOG GAP-2: Draft fact citation gate is LLM-soft, not enforced**
  - Location: `draft.md` lines 152–161
  - Current: citation rules are in the system prompt; a `verified:false` fact used as a standalone anchor claim won't be caught
  - Fix: post-generation check that rejects drafts where a `verified:false` fact appears without a `verified:true` anchor already present in the post
  - Trigger: revisit when post volume exceeds what manual /review can catch, or after first bad citation ships

---

## P2 — Quality signal gaps (data gets stale over time)

- [ ] **`ideas.recommended_next_action` never refreshes after scoring**
  - Set once at `/capture`, never updated even after posts publish and score
  - Location: `score.md` TODO block lines 339–343
  - Fix: after scoring a post, write a fresh recommendation to the idea (e.g. "2 angles remain — plan for W14" or "all angles posted — consider archiving")
  - Effort: low. High Airtable-visibility value.

- [ ] **`ideas.score_overall` diverges from actual post performance**
  - Static capture scores vs. real performance data — strong ideas that perform poorly stay "strong"
  - Location: `score.md` TODO block lines 345–352
  - Fix: after ≥3 scored posts from one idea, flag divergence if `avg(performance_score) ± 2.0` from `score_overall`. Nudge or flag; don't auto-overwrite.
  - Caution: don't punish ideas with only 1 weak post

---

## P3 — Nice to have

- [x] **Token optimization audit** — ✅ DONE 2026-03-23
  - **Brand @imports**: replaced 3 full brand files (~1,600 lines) with `brand/brand-summary.md` (~300 lines) in `CLAUDE.md`. Full files kept for reference. Saves ~75% on brand context per session.
  - **Airtable brand fetches**: `draft.md`, `research.md`, `editorial-planner.md`, `harvest.md` now fetch only pipeline-relevant fields (name, goals, icp_short, main_guidelines). Removes colors, typography, icp_long from all content pipeline calls. Updated `airtable.md` with pipeline vs. design fetch patterns.
  - **Snippet fieldIds**: `draft.md` Step 7 comment was missing `fldfqHyUlwn7JqBFn` (last_used_at) — corrected. Comment now matches what `querySnippets()` actually fetches in `improver.md`.
  - Not pursued: caching system prompts (planner/strategist/researcher) — effort > benefit; draft storage split — complicates data model.


- [ ] **Add `post_type` field to posts table** — BI signal for format performance
  - Single select: `text_only`, `image`, `carousel`, `video`, `document`
  - Collect in `/score` Step 2 prompt (or optionally at `/publish`)
  - No analysis needed now — just capture the data so format-vs-performance correlation is possible at 20+ posts

- [ ] **Save post creative assets alongside scoring** — format BI
  - Store image/carousel/video filename or Drive link on the post record (new field: `creative_asset_url`)
  - Enables retroactive format analysis and content repurposing
  - Low urgency — do when post_type field is added

- [ ] **Track `profile_views` per post in scoring** — conversion-intent signal
  - LinkedIn Analytics surfaces this per post (typically 0–5 for most posts, spikes on high-conversion content)
  - Requires: new `profile_views` field on `posts` table + collect it in `/score` Step 2 prompt + write in Step 4
  - Value: posts that drive profile visits are outliers worth identifying; correlates with CTA/consulting intent
  - Low urgency until we have 20+ scored posts to compare against


- [ ] **Snippet bank has no `retire` lifecycle** — unlike hooks/frameworks, snippets never age out
  - Promote/retire logic exists in `score.md` (lines 305–311) but threshold is `use_count >= 3 && avg < 4.0`
  - No action needed until post volume is high enough for 3+ uses per snippet

- [ ] **Hook `used_count` has no cooldown either** — same pattern as snippets, lower urgency
  - Hooks are more interchangeable (any hook can open any post); reuse is less jarring than a repeated personal story
  - Revisit if the same hook appears on back-to-back published posts

---

## Reference: Field IDs for snippet cooldown fields

| Field | ID | Type |
|-------|-----|------|
| `last_used_at` | `fldfqHyUlwn7JqBFn` | dateTime |
| `used_count` | `fldZ6ifFD4OW0PDOt` | number |
| `avg_score` | `fldiAFNJJZUcqhr7C` | number |
| `status` | `fld90hLmFbyPWvy59` | singleSelect |
