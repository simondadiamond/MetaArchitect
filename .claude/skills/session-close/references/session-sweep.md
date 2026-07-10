# Session sweep — daily harvest of transcripts that never got a session-close

Executed by the CC schedule **"Session sweep (daily)"** (prompt kind, working dir
`~/projects/MetaArchitect`). One mechanism with the interactive close: same lanes
(`harvest-lanes.md`, same directory), same digest script, same processed ledger, same
proposal queue. The sweep NEVER executes writes — it emits human-gated proposals only;
Simon approves in the CC `/brain` Approvals tab or via "apply proposals" in any session.

## 1. Candidates

- `~/.claude/projects/*/` top-level `*.jsonl` files (skip subdirectories like `tasks/`).
- Skip any path already in `~/projects/brain/.reconciler/processed.json` — unless its
  last-line timestamp has advanced since it was recorded (session resumed → re-harvest).
- Read the LAST line's `timestamp` field for last activity (append-only JSONL — file
  mtimes are unreliable, never use them). Harvest only transcripts quiet for **>24 hours**
  (grace period — younger sessions may still be live or get a proper interactive close).
- Backlog cap: the 10 oldest candidates per run; the rest wait for tomorrow.

## 2. Digest

`node scripts/session-digest.mjs <transcript> --max-bytes 30000` — deterministic, text
turns + bash commands + files written, tool results stripped. Digest fails on a file →
note it in the run log, mark it processed anyway (a transcript with no extractable text
turns has nothing to harvest), continue with the next.

## 3. Harvest

Judge each digest against ALL lanes in `harvest-lanes.md` — identical quality bars to the
interactive close. Sweep-specific notes:

- **Lane 6 (brain)**: run the `brain find` contradiction pre-check per candidate — same
  drop/update/correct logic.
- **Lane 10 (hygiene)**: the sweep can't clean up asynchronously — findings become
  proposals too ("test row X from session Y still live in pipeline.posts").
- **Lane 1 (goals)**: propose the exact PATCH; never apply it.
- An empty harvest is a valid outcome for any transcript — most short sessions yield nothing.

## 4. Emit proposals

Append to `~/projects/brain/.reconciler/proposals.json` (never clobber pending entries;
full schema in `~/projects/brain/RECONCILER.md`). Kinds:

- brain fact → `kind: "save"` + ready-to-run `argv` (the only kind the Approvals tab executes directly)
- brain note correction → `kind: "edit"` + `edit: {target_slug, instruction}`
- every other lane → `kind: "task"` + `lane` + `summary` + `detail` carrying the EXACT
  action (the goal PATCH body, the `git mv`, the story POST body, the handoff outline) —
  approval queues it `approved_pending_apply`; the next interactive session executes it.

Every proposal: `id` (uuidgen), `created` (ISO), `lane`, `detail` citing which transcript
it came from.

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
