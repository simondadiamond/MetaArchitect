# scripts/prospecting — segment prospect-list builder

Builds a reviewable cold-email prospect list for one ICP test segment from public
directory listings and the firms' own websites. Born 2026-08-16 for the bookkeeper
segment test (goal `520c1928`); the trades segment is the queued second run.

It reads public pages only. It sends nothing, and it writes nothing to `public.leads`
or any CRM — the output is a CSV for Simon to review first.

## Pipeline

Run in order from this directory. Each stage writes its JSON next to itself and the
next stage reads it, so a stage can be re-run without redoing the one before it.

| stage | script | what it does |
|---|---|---|
| 1 | `yp-harvest.py` | Yellow Pages Canada listings across ~40 cities → firm name, city, province, website. Dedupes by domain. |
| 2 | `enrich.py` | Fetches each firm's homepage + discovered nav pages → public emails, practice-management/ledger signals. Slow stage (~15 min for 800 firms). |
| 3 | `shortlist.py` | Keeps rows that look like an owner-operated practice with a real public email; spreads picks across provinces so the list isn't 70% Toronto. |
| 4 | `deep.py` | Re-fetches the shortlist including every client-portal / login link, so `pm_tool = no` means "we looked at the portal surface", not "we read the homepage". |
| 4b | `retry.py` | Second look at firms whose sites yielded < 3 readable pages (JS-only homepages), via sitemap + conventional paths. Cuts the `unknown` rate roughly in half. |
| 5 | `build-csv.py` | Classifies and writes the CSV to `funnel/setup-offer/prospects/`. Verifies every website resolves before writing the row. |
| 6 | `validate.py` | Re-resolves every URL live, MX-checks every email domain, re-checks the per-row rules. Exit 1 on any violation. |

Output lands in `funnel/setup-offer/prospects/` — **gitignored on purpose**: scraped
contact data stays on the box.

## pm_tool classification

The question the column answers is "does this firm already run something that chases
clients for their documents", because those firms are not addressable.

- `yes` — a named practice-management platform: TaxDome, Karbon, Canopy, Financial
  Cents, Jetpack Workflow, Liscio, Client Hub, Pixie, Ignition, CCH iFirm, Onvio.
- `no` — ≥3 public pages scanned with none of the above found. A file-transfer-only
  portal (ShareFile, SmartVault, FileCenter, Hubdoc, Dext, a custom upload page)
  counts as `no`: it stores documents, it does not chase anyone for them.
- `unknown` — too little of the site was readable to judge. **Unknowns stay in the
  list** — they get emailed and the answer is recorded on reply. Dropping them would
  understate segment size, and segment size matters as much as reply rate.

`pm_evidence` always names the URL or signal that decided it, so any row can be
disagreed with individually.

## Re-running for a different segment (e.g. trades)

Three things are bookkeeping-specific and must change first — the rest is generic:

1. `yp-harvest.py` → `CITIES` (fine as-is) and the search heading in `main()`
   (currently `Bookkeeping`).
2. `shortlist.py` → `PRACTICE` / `NOT_PRACTICE` / `CHAINS` regexes, which decide what
   counts as a real firm in the segment.
3. `deep.py` + `build-csv.py` → `PM_TOOLS` / `PM_URL` / `FILE_ONLY_URL`, which are the
   accounting-profession tool list. Trades run different software (Jobber,
   ServiceTitan, Housecall Pro), so this list is the real work of a new segment.

Nothing else assumes the segment.

## Known limits

- Yellow Pages is the only source. It skews toward firms that buy listings; the
  newest and the most referral-only practices are missing.
- `staff_estimate` is only filled when a team page names real people — roughly a
  quarter of rows. The rest are honestly `unknown` rather than guessed.
- `owner_name` is only filled when a named person ties to the firm name, the team
  page has exactly one person, or the listing text says so. A wrong name in a cold
  email is worse than no name, so the bar is deliberately high.
- No email is ever pattern-guessed. Every address was found on the firm's own site.
