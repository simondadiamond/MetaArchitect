# Variant overlay — Professional Practice

For clinics, therapists, accountants, legal, financial services: anyone whose client data
is sensitive by law. Paste this section into the master CLAUDE.md at `{{VARIANT_SECTION}}`
and fill the tokens. **This variant adds hard rules; install it whenever in doubt.**

---

## Practice specifics

- **Confidentiality is structural, not polite.** Client files in `customers/` use first
  name + initial only. Full identity, health, financial, or legal details stay in
  {{SYSTEM_OF_RECORD}}, never in this workspace. If pasted input contains them, use what
  the task needs, then tell {{OWNER_FIRST}} exactly which file to clean.
- **Quebec Law 25 note:** this workspace must be able to answer "what personal
  information do we hold here and why." Keeping sensitive data out of it is how it
  answers well. Anything automated that affects an individual client (a decision, a
  recommendation) is drafted with its reasons written out, so {{OWNER_FIRST}} can explain
  it later.
- **Appointments:** you draft confirmations and reminders; {{SCHEDULING_TOOL_OR_METHOD}}
  is the actual calendar. No clinical/professional advice in drafts beyond what
  {{OWNER_FIRST}} explicitly wrote; you handle logistics and wording, not judgment calls
  in their profession.
- **Intake:** new-client intake drafts use the template in `operations/intake-template.md`.
- **Billing:** invoices via invoice-draft from `operations/pricing.md`; insurance or
  receipt specifics ({{RECEIPT_RULES}}) come from `operations/policies.md`.
