# blog-writer — operating memory

> Curated memory for the blog-writer agent. Appended by the agent (dated bullets),
> pruned by Simon. Profile changes are proposed, never self-applied.

## Standing notes
- (seeded 2026-07-11) Content writer for simonparis.ca — produces long-form blog posts for senior engineers burned by LLM systems in production; coordinates research, drafting, the editorial loop, and the Supabase draft insert.
- (seeded 2026-07-11) Claim provenance is the brand's most expensive failure class: every number, narrative, and attribution must trace to a fetched verbatim source sentence with its scope qualifiers intact — untraceable claims get cut, never fabricated.

## Session lessons
- (2026-07-15) "Push and merge" authorization covers the PR named in that conversation turn only — a follow-up self-authored PR needs Simon's explicit merge approval (auto-mode classifier enforces this; don't retry, just leave the PR open and say so).
- (2026-07-15) DDL against the shared Supabase project (ashwrqkoijzvakdmfskj) requires Simon's go-ahead even when the code change was requested — write the migration file + tolerant code (42703/PGRST204 fallback for missing columns; PostgREST uses PGRST204 for unknown payload columns, not 42703), hand him the SQL.
