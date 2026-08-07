# Session sweep — daily harvest of transcripts that never got a session-close

Executed by the CC schedule **"Session sweep (daily)"** (prompt kind, working dir
`~/projects/MetaArchitect`). One mechanism with the interactive close: same lanes
(`harvest-lanes.md`, same directory), same digest script, same processed ledger, same
proposal queue. The sweep NEVER executes writes — it emits human-gated proposals only;
Simon approves in the CC `/brain` Approvals tab or via "apply proposals" in any session.

## 1. Candidates

- `~/.claude/projects/*/` top-level `*.jsonl` files (skip subdirectories like `tasks/`).
- **Skip story-pipeline transcript dirs** — any project dir whose name contains
  `story-worktrees` (e.g. `-home-diamond--story-worktrees-*`). Their outcomes are already
  recorded by the story board, `story_events`, and PRs; the pipeline's own audit trail IS the
  harvest (v2 intake, 2026-07-16). Mark them processed without digesting.
- **Skip schedule-fired transcripts** — any transcript whose first user turn is a known CC
  schedule prompt (`/blog-pipeline-dispatch`, `/convert-dispatch`, `/call-prep`,
  `/session-recap`, `/weekly-brief`, `/repurpose --auto`, or similar dispatcher commands).
  Their outcomes live in `/runs` and Supabase, same rationale as story-worktrees. Mark
  processed without digesting — this class was ~87% of the backlog on 2026-07-28.
- **Dedupe resume-forks** — skip a candidate whose FIRST-line timestamp matches an
  already-processed transcript (a resume writes a new file with the full replayed
  history). Re-harvest only if NEW user turns exist after the recorded last-line
  timestamp — a session-close stamps the ledger seconds before its own final turns land,
  so closed sessions can legitimately re-qualify.
- Skip any path already in `~/projects/brain/.reconciler/processed.json` — unless its
  last-line timestamp has advanced since it was recorded (session resumed → re-harvest).
- Read the last line that **has** a `timestamp` field (append-only JSONL — file mtimes are
  unreliable, never use them for a timestamped transcript). If NO line anywhere has a
  timestamp (metadata-only stub, e.g. an `ai-title`/`agent-name` trailer with zero real
  turns), mark it processed using the file's mtime instead of calling
  `mark-session-closed.sh` (which correctly refuses no-timestamp input — that refusal is a
  floor for real transcripts, not a signal to retry). Note it as a stub with nothing to
  harvest. Process each transcript independently — one failure must never abort marking
  the rest of the batch (2026-07-24: 7 null-timestamp stubs in one run silently blocked
  25 unrelated successful writes; lessons.md same date).
- Harvest only transcripts quiet for **>24 hours** (grace period — younger sessions may
  still be live or get a proper interactive close).
- Backlog cap: the 10 oldest candidates per run; the rest wait for tomorrow.

## 2. Digest

`node scripts/session-digest.mjs <transcript> --max-bytes 30000 --tail-bytes 6000` —
deterministic, text turns + bash commands + files written, tool results stripped. The
`--tail-bytes` reservation keeps the transcript's close-out/outcome in the digest even on
long sessions — a forward-only truncation drops it entirely (2026-08-06: a 2.8MB
transcript digested only its first ~15%, and the outcome never reached the harvester).
Digest fails on a file → note it in the run log, mark it processed anyway (a transcript
with no extractable text turns has nothing to harvest), continue with the next.

## 3. Harvest

Judge each digest against ALL lanes in `harvest-lanes.md` — identical quality bars to the
interactive close. Sweep-specific notes:

- **Lane 6 (brain)**: facts that clear the lane-6 extraction contract are saved DIRECTLY —
  `brain save "<fact>" --domain <d> --status evidence --source sweep:<transcript-id-8>
  --snippet "<quote>"` — never queued. Run the `brain find` contradiction pre-check per
  candidate first; only corrections to confirmed notes become proposals (`kind: "edit"`).
  Zero facts from a session is the expected outcome, not a failure.
- **Lane 10 (hygiene)**: the sweep can't clean up asynchronously — findings become
  proposals too ("test row X from session Y still live in pipeline.posts").
- **Lane 1 (goals)**: propose the exact PATCH; never apply it.
- An empty harvest is a valid outcome for any transcript — most short sessions yield nothing.

## 4. Emit proposals

Append to `~/projects/brain/.reconciler/proposals.json` (never clobber pending entries;
full schema in `~/projects/brain/RECONCILER.md`). Kinds:

- brain fact → **not a proposal** (v2 intake): saved directly as an evidence note, see §3
- brain note correction (confirmed notes only) → `kind: "edit"` + `edit: {target_slug, instruction}`
- every other lane → `kind: "task"` + `lane` + `summary` + `detail` carrying the EXACT
  action (the goal PATCH body, the `git mv`, the story POST body, the handoff outline) —
  approval queues it `approved_pending_apply`; the next interactive session executes it.

**Proposal format v2 — the proposal is the action, not a write-up.** Simon reviews these on
his phone; each must be a 3-second decision:
- `summary` ≤ 100 chars, the action in words Simon would recognize from the session.
- `detail` ≤ 500 chars, action-first. Provenance is ONE trailing token —
  `[src: <transcript-id-8> <date>]` — never a sentence, never pre-check narration.
- Never inline full documents (lessons.md entries, SQL bodies, multi-step trios) into
  `detail` — carry the 2–3 sentence essence; the applying session writes the full artifact.

Every proposal: `id` (uuidgen), `created` (ISO), `lane`.

## 5. Close out

- Mark every swept transcript in `processed.json` (path + last-line timestamp) EVEN IF it
  yielded nothing; reprocess later only if its last-line timestamp advances.
- Proposals added → ntfy ping (`NTFY_URL` from `~/projects/MetaArchitect/projects/command-center/.env`):
  `session sweep: <n> proposal(s) from <m> session(s) — approve at http://100.105.85.5:3737/brain`.
  Nothing added → no ping.
- Either way, append one line to `~/projects/brain/.log/brain.jsonl`
  (`{"cmd":"session-sweep","stage":"done",...counts}`).
- Token frugality: total model input per run stays in the tens of KB — the digest cap and
  the 10-transcript cap enforce this; never raise both in the same run.
