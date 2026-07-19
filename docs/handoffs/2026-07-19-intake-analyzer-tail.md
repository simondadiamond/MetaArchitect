# Handoff — intake analyzer tail (2026-07-19)

> The analyzer + auto-run chain is SHIPPED and live-verified end-to-end (goal a528feab done; MetaArchitect PRs #28/#29/#31/#33 merged). This note covers only the open tail. Read before touching anything intake-related.

## Open items

1. **Dry-run row purge — waits on Simon's word.** `public.state_readiness_diagnostic` row `b735d842-bd5f-4bf4-83c4-6d8c52d9fbf2` ("DisputeBot (Dry Run)") is synthetic test data parked so Simon can review the artifacts/transcript tab first. On "purge": delete the row **AND its `pipeline.logs` rows** (`entity_id=eq.b735d842…` — includes the `watch_dispatch` attempt-once marker; leaving it would block re-analysis if the same id ever reappeared). Folder `~/engagements/disputebot-dry-run-b735d842/` stays or goes per Simon — it's the demo content for the /engagements page.
2. **Story `78d41a4e`** (command-center, sitemaster): "Intake Transcript" tab on the /engagements detail view. Self-serve through the pipeline; nothing to do unless it fails.
3. **Last unexercised seam:** a real browser submission through simonparis.ca/readiness (the client-side React flow + MailerLite subscribe route). The Supabase insert path underneath it is verified byte-faithfully (`scripts/insert-test-intake.mjs`); only the UI + MailerLite hop remains — Simon's dry run.

## Decided — do not re-litigate

- **Auto-run, attempt-once, manual rerun after failure.** Watcher `tools/intake-watch.mjs`, CC schedule `ff2c2f3c` (*/15). A row with ANY `pipeline.logs` entry is never auto-retried; failed rows are rerun by hand (`--row <uuid> --model claude-sonnet-5`). Human re-judgment stays mandatory (runbook Day 0).
- **The analyzer owns decoding; Command Center only renders files.** The /engagements page never reads the intake table or duplicates index→label decode. New data for the viewer = new artifact file from the analyzer.
- **Model pinned for engagement runs** (`--model claude-sonnet-5`) — headless default can resolve to Haiku (lessons.md 2026-07-17).
- **Artifacts live in `~/engagements/`, never the repo** (client-sensitive; destruction clause in audit/evidence-request-checklist.md).

## Verified this session (don't re-prove)

- Form-shaped anon insert works; anon reading content back is denied (column-scoped RLS — test faithfully or you get a false outage, see `scripts/insert-test-intake.mjs` header).
- Scheduled cron → dispatch → Sonnet analyzer → 4 artifacts → ntfy → /engagements listing: all live.
- Calibration ±1 on 5/5 pillars; over-confident fixture flags 5/5; FR end-to-end French.
