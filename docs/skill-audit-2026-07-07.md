# Full Skills-Estate Audit + Upgrade — 2026-07-07

> One-day deep audit of every skill, command, and agent profile, followed by a same-day upgrade pass.
> Four parallel audit agents (content skills / teardown+ops skills / Content-Engine layer / agent profiles),
> findings verified against the filesystem, lessons.md, and live services. This doc is the durable record;
> `scripts/skill-lint.sh` is the recurring enforcement (runs in /weekly-review).

## The design principle that came out of it

Across ~35 files and 30+ logged incidents, **zero failures came from the model being under-instructed on how to think** — every one came from a missing or drifted *constraint* (dead path, wrong schema, unseen enum, rule fixed in one file but not siblings). So skills are now written:

**High-level about process, ruthless about invariants.**
- Strip step-by-step reasoning scaffolding — it ages badly and strong models don't need it.
- Harden contracts: schemas, enum literals spelled out next to every LLM output schema, validation gates, canonical paths/tables/URLs, dated lessons.
- Reference-over-copy: a fact lives in exactly ONE file; everything else points. Inline copies only where the consumer provably runs without repo access, marked "file wins on conflict."
- Never hardcode: model ids in logs (the model that ACTUALLY ran), years (derive), ages (DOB + derive), prices (read the live page).

## Systemic diseases found (and their fixes)

| Disease | Evidence | Fix |
|---|---|---|
| Copies rot independently | Prohibitions in 4+ diverged copies; STATE rubric forked between teardown skills; 2026-07-05 path fix missed blog-writer + family | Canonical homes + pointers; `_shared/` references; skill-lint |
| Lessons don't propagate | Stat-provenance gate missing from write-post/editorial/research/blog-writer (the layers the Ramp 65% passed through); pkill rule absent from tech-support | Gates ported to every producing layer; shared `linkedin-gate.md` |
| STATE skills don't follow STATE | write-post 0/3 pillars despite DB writes; pattern-guardian (the STATE logger!) had no validation gate; every log hardcoded `claude-sonnet-4-6` | S+T+E added; validation gates in scripts; model-id rule |
| Riskiest work had no skill | Both July publishing near-misses came from ad-hoc `.tmp` scripts; `/end` ran ⅓ of the mandated close ritual | New skills: linkedin-publish (+`tools/postiz.mjs`), session-close, engage-replies |

## Decisions made (Simon, 2026-07-07)

1. **WAT pipeline → archive-lite.** Dormant since April; superseded by teardown→repurpose→Postiz. Moved to `projects/Content-Engine/archive/` (8 commands, 8 skills, 2 dead tools) with a KNOWN-BUGS list (8 latent bugs) any revival must fix first. Kept live: `supabase.md` (column registry) and `/score`. Content-Engine CLAUDE.md rewritten to current reality.
2. **Body links allowed on LinkedIn** (playbook's sourced 2026 finding wins over the old first-comment rule): max one bare URL, never in the hook, post must stand alone. Encoded in `linkedin-gate.md`.
3. **Three new skills built**: linkedin-publish, session-close, engage-replies. Newsletter deferred (needs strategy first).
4. **family.md privacy split**: sensitive content → gitignored `.personal/`; committed profile keeps logistics only. Git history still holds old content — rewrite is Simon's call.

## New canonical homes (edit HERE, point everywhere else)

| Fact | Canonical file |
|---|---|
| LinkedIn copy gate (mechanical + judgment, claim provenance, /score cadence, link rule) | `.claude/skills/repurpose/references/linkedin-gate.md` |
| LinkedIn platform mechanics | `.claude/skills/repurpose/references/linkedin-playbook.md` (re-verify by 2027-01) |
| Voice prohibitions, brand tests | `brand/brand-summary.md` |
| STATE spec (schemas, tiers, error format) | `brand/state-framework.md` |
| STATE 0/1/2 scoring rubric (teardowns) | `.claude/skills/_shared/state-scoring-rubric.md` |
| Supabase Management-API access (token order, UA workaround) | `.claude/skills/_shared/supabase-access.md` |
| pipeline.* column registry + data rules + averaging formulas | `projects/Content-Engine/.claude/skills/supabase.md` |
| Postiz operations (schedule/edit/cancel/upload) | `projects/Content-Engine/tools/postiz.mjs` via the `linkedin-publish` skill |
| Evidence tiers (T1 = verbatim sentence + primary URL) | `.claude/skills/research/SKILL.md` |

## Known follow-ups (not done today)

- **AIRTABLE_* env entries** in repo-root `.env` feed nothing — remove; rotate the PAT if still live.
- **Newsletter skill** — Phase 3.7 owned-distribution mechanic; needs a strategy session first.
- **Monthly rollup** over `weekly_reviews` once ≥4 rows exist.
- **popebot copies** of teardown skills (`agents/coo/skills/teardown-*` on the pope-agent side) remain unpatched — sync when next touched (lessons 2026-07-02).
- **family.md git history** contains pre-split content — history rewrite is Simon's call.
- Full audit detail lives in this session's four agent reports (session 2026-07-07); this doc records what matters going forward.
