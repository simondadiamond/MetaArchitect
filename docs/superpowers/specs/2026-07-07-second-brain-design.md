# Second Brain — Design Spec

**Date:** 2026-07-07
**Owner:** Simon Paris
**Status:** Approved (approach A: git-repo canonical, Supabase projection)

## Goal

One second brain covering Simon's whole business and personal life. Both AI (any Claude session on sterling) and humans (Simon, via Command Center) can reliably store and recall facts, notes, documents, and images. Retrieval is deterministic code first; the model is invoked once, at the end, with evidence attached.

Source principles: robonuggets "Build your own Second Brain" guide (`docs/Second Brain - Principles and Starter Prompts (3).pdf`) — research before build, steal from proven OSS memory systems, deterministic code before the model, one small always-true index, prove it with benchmarks.

Ideas adopted from the four referenced OSS projects:
- **Karpathy LLM wiki** — plain markdown the agent writes itself; one small index read first.
- **qmd** — semantic (embedding) search as a *fallback* lane only; phase 2, pgvector on Supabase, gated on benchmark evidence of fuzzy-recall misses.
- **gbrain** — answers cite sources (every `brain find` result prints file path + section); the brain cleans itself (`brain doctor`).
- **Graphify** — notes link with `[[slug]]`; the retrieval ladder follows one pointer hop.

## Requirements (from interview)

- **Human access:** ask Claude in any session + a searchable Command Center web page (Tailscale-only, phone browser OK). Direct file browsing is not a primary surface.
- **Capture channels (all four, day one):** Claude sessions auto-save durable facts; quick capture from phone; documents/images drop; one-time backfill of existing content.
- **Privacy:** one brain, domain tags (`business | content | infra | personal | family | health | finance`). Everything stays on sterling / Simon's private repos and Supabase project. No restricted zones.
- **Storage:** sterling + Supabase. **No dedicated vector DB.** Deterministic keyword scoring first; pgvector column is a phase-2 migration if benchmarks prove fuzzy-recall misses.
- **Images/PDFs:** intelligence at write time — one describe pass (extracted text + one-line description) when the file lands; afterwards it is plain text to search.

## Architecture

### 1. Store — `~/projects/brain/` (new private git repo)

```
brain/
  notes/           one note per file, kebab-case slug .md
  assets/          small images/files (≤ ~1 MB) referenced by notes
  inbox/           drop folder, swept by `brain inbox`
  tools/           the brain CLI (Node, no deps beyond stdlib where possible)
  bench/           benchmark question set + runner + results
  INDEX.md         one line per note: slug | domain | one-sentence description
  MAP.md           topic → owning big doc (brand docs, plans, repos) — pointers, no duplication
  CLAUDE.md        routing note for sessions opened inside the repo
```

- Note frontmatter: `slug, title, domain, tags[], created, source, description` (one line, mirrored in INDEX.md).
- Notes cross-link with `[[slug]]`.
- Large/binary files (> ~1 MB) go to Supabase Storage bucket `brain`; a pointer note holds the URL + extracted text/description.
- GitHub private remote (`gh` CLI auth, per house rules) for backup.

### 2. CLI — `brain` (Node, deterministic, zero model calls)

Installed on PATH (symlink into `~/bin` or `~/.local/bin`).

- `brain find "question"` — retrieval ladder, in order:
  1. strip question to keywords (stopword list, lowercase, dedupe)
  2. score every INDEX line + filename **without opening files** (keyword hits weighted: slug > description > domain/tags)
  3. open only the single top-scoring file
  4. extract only the section(s) containing keyword hits, not the whole file
  5. follow at most one `[[pointer]]` if the matching section is a pointer
  6. print evidence + source path(s) (citations). Exit 1 with "no confident match" if top score is below threshold — never guess.
- `brain save "fact" --domain X [--tags a,b] [--title t] [--file path]` — writes note file + INDEX line + git commit as **one atomic step**; on any failure, rolls back (no half-writes). `--file` copies to `assets/` or uploads to Supabase Storage by size, and stubs the describe step.
- `brain sync` — mirrors INDEX/frontmatter to Supabase table `brain.entries` (upsert by slug), uploads pending assets, `git push`.
- `brain doctor` — INDEX ↔ notes drift check (missing lines, orphan lines, broken `[[links]]`, stubs awaiting describe); `--fix` repairs mechanical drift.
- `brain inbox` — sweeps `inbox/`: files each item via the save path, queues describe stubs.
- `brain describe <slug>` — the ONLY model-touching command: runs one Claude call (headless `claude -p` or API) on an attached image/PDF to produce extracted text + one-line description, written into the note + INDEX. Logged.

**STATE (medium, S+T+E):** every command initializes a state object (workflowId, stage, entity), appends one JSON line per stage to `~/projects/brain/.log/brain.jsonl`, validates all output before any write, and error format is `❌ brain <cmd> failed at <stage> — <msg> — no partial writes`.

### 3. Session integration

- Routing note in **global** `~/.claude/CLAUDE.md`: second brain lives at `~/projects/brain`; recall = `brain find` before manual searching; store durable facts = `brain save`; check INDEX first, open files second.
- One line per agent profile (family, health, coo, tech-support, blog-writer, sitemaster) naming its default `--domain`.
- Boundary: Claude auto-memory dirs keep "how Claude should operate" facts; the brain owns Simon's knowledge/life/business records.

### 4. Command Center surface (command-center repo — worktree, house rules apply)

- `/brain` page: search over `brain.entries` (Postgres full-text on description+title+tags), domain filter chips, entry view renders note markdown + asset preview (signed Storage URLs).
- `POST /api/brain/capture`: accepts text and/or file upload; shells out to `brain save` on sterling (CC runs on sterling) so phone capture uses the same atomic path. Returns slug. Phone flow = CC in phone browser (Tailscale), add-to-home-screen.
- Read model only — the UI never writes notes directly to Supabase; the repo is canonical, `brain sync` is the only writer of `brain.entries`. Capture goes through the CLI.

### 5. Ingest & backfill

- Describe-at-write for images/PDFs (see `brain describe`). Capture endpoints/inbox create stub notes immediately; describe fills them in (run inline when quick, else queued and swept).
- One-time curated backfill (~50 entries, not a dump): `docs/lessons.md` entries, meta-architect-plans summaries, key Supabase pattern logs (`pipeline.sessions`), MAP.md pointers into brand docs and repos, plus any Drive docs Simon flags during review.

### 6. Prove it — `bench/`

- Fixed question set (~15 real questions across domains, including buried-fact and two-file questions).
- Runner compares: fresh default Claude session (manual search) vs `brain find` path — tokens, wall time, answer correctness.
- Pass line: brain clearly cheaper and faster on buried-fact questions with correct answers; if not, optimize and rerun. Results table committed to `bench/results.md`; prompts stay rerunnable.

## Error handling

- CLI: fail whole, never half-write; atomic save (temp-write then rename + single git commit; INDEX line and note in the same commit). Non-zero exit + stage-named error.
- Capture API: validate (size cap, MIME allowlist, required fields) before touching the CLI; CLI failure → 502 with stage message, nothing persisted.
- `brain find` below-threshold → explicit "no confident match", never a guess.

## Testing

- Unit tests: keyword stripper, index scorer, section extractor, pointer-hop, atomic save/rollback, doctor checks (Node built-in test runner).
- Integration: save→find round-trip on a fixture repo; inbox sweep; sync upsert against Supabase (mocked or test schema).
- CC page/endpoint: story-pipeline-style verify (drive the running app) since it lives in command-center.
- Benchmarks (section 6) as the end-to-end acceptance gate.

## Build order

1. Repo scaffold + CLI core (`save`, `find`, `doctor`, INDEX/MAP) — usable same day
2. Session integration (routing notes, agent lines)
3. Supabase: `brain.entries` table + Storage bucket + `brain sync`
4. Describe + inbox + backfill
5. Command Center `/brain` page + capture endpoint (worktree in command-center)
6. Bench suite + optimize until it wins

## Out of scope (phase 2+)

- pgvector semantic fallback (gated on bench evidence)
- Scheduled inbox sweeps / recurring jobs (only if Simon asks)
- Restricted-visibility zones, multi-user access
- Auto-capture hooks that write to the brain without a session deciding to
