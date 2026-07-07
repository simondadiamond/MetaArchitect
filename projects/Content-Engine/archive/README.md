# Archive — WAT Weekly-LinkedIn Pipeline (dormant)

This is the original WAT-framework content pipeline for original-idea LinkedIn posts:
`/capture → /editorial-planner → /research → /draft → /review → /publish` (plus `/harvest` for idea mining and `/week` as the consolidated runner), backed by the skills in `skills/`.

- **Dormant since**: April 2026 (last real run)
- **Archived**: 2026-07-07, per Simon's call ("archive-lite")
- **Superseded by**: the live flow — `teardown-research → teardown-generate → /repurpose → Postiz scheduling`

## Why archived, not deleted

The pipeline is revivable if original-idea posting (ideas → UIF → drafted posts) ever returns. The data layer it wrote to (`pipeline.ideas`, `pipeline.posts`, `pipeline.hooks_library`, etc.) is still live and documented in `.claude/skills/supabase.md`.

## What was archived

| Location | Contents |
|----------|----------|
| `commands/` | capture.md, draft.md, editorial-planner.md, harvest.md, publish.md, research.md, review.md, week.md |
| `skills/` | writer.md, editorial.md, planner.md, researcher.md, strategist.md, improver.md, fetcher.md, state-checker.md |
| `tools-deprecated/` | airtable.mjs (Airtable data layer, superseded by tools/supabase.mjs), _draft_check.mjs (legacy Airtable field probe) |

**Still live, NOT archived**: `.claude/commands/score.md` (the only thing that writes `performance_score`), `.claude/skills/supabase.md` (the pipeline.posts column registry), and everything else in `tools/`. Note: `tools/research-perplexity.mjs` still imports `./airtable.mjs` — that import is now broken (file moved here); it was only called by the archived `/harvest`.

## KNOWN BUGS — any revival MUST fix these first

1. harvest.md Step 7 uses strategist.md Stage 1's output schema, but state-checker's validateBrief expects the capture.md Step 5 schema — every harvest brief fails validation. Also strategist allows intent "engagement" which validateBrief rejects.
2. review.md Step 2.5 invokes Skill("humanizer") — no such skill exists anywhere; Pass 1 is a no-op. week.md Phase 4 inherits this.
3. review.md `sn` handler writes tags as a joined string; schema says text[].
4. harvest.md Step 9 references a Q1/Q2/Q3 UIF-compiler prompt shape researcher.md no longer has.
5. planner.md tiebreak #2 needs score_authority, which editorial-planner Step 3 never selects.
6. capture.md/harvest.md write status values ("processing_failed", "Archived") missing from supabase.md's ideas status registry.
7. improver.md is fully Airtable-era (MCP calls, .fields accessors, base/table ids) — its 3 scoring functions need porting to Supabase before any use.
8. capture.md's angle-extractor still feeds the "it's not about the model — it's about the plumbing" phrase as language to emulate — banned from hooks (AI-tell shape).

## Revival notes

- `score.md` remains live at `.claude/commands/score.md` — do not duplicate it here.
- If revived, posts hand off at status `approved` to Postiz scheduling. publish.md's manual copy-paste flow is obsolete — see the Postiz rule in `.claude/skills/supabase.md` (pipeline.posts is canonical, Postiz is delivery-only).
