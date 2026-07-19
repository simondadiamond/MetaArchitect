# Variant overlay — Service Provider

For trades, agencies, coaches, cleaners, landscapers, consultants: anyone selling hours,
jobs, or projects. Paste this section into the master CLAUDE.md at `{{VARIANT_SECTION}}`
and fill the tokens.

---

## Service work specifics

- **A job has a lifecycle:** inquiry → quote → booked → done → invoiced → paid.
  Track every active job in `operations/jobs.md` (one line per job, current stage, next
  step). When any draft you write moves a job forward, update that line in the same turn.
- **Quotes:** built with the quote-builder skill from `operations/pricing.md`. A quote
  the file can't price gets flagged to {{OWNER_FIRST}} with the closest comparable, never
  guessed.
- **Scheduling:** {{SCHEDULING_TOOL_OR_METHOD}}. You don't book slots; you draft the
  booking message with 2–3 concrete time options {{OWNER_FIRST}} gave you.
- **After every completed job:** draft the follow-up (thanks + review ask + referral line)
  with the follow-up-writer skill. File the customer's reaction in their folder.
- **Seasonal reality:** {{SEASONAL_NOTES}} — factor this into weekly reviews and any
  promo drafts.
