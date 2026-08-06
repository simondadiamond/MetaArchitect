<!-- Additions to the vendored `resend` skill's references/templates.md.
     Re-apply with scripts/patch-resend-skills.py after any skill update. -->

### Hard limits worth knowing before designing an email — verified live 2026-08-06

**Local addition.**

- **2,000 characters per variable value.** Exceeding it returns 422 "The
  `template, variables, value` field has a 2,000 character limit per value."
  Triple mustache is *unescaped*, so a variable may carry HTML — but a single
  variable cannot hold a long dynamic body. For conditional blocks, use one
  variable per block and pass an empty string to omit it.
- **No control flow at all.** No `{% if %}`, `{{#if}}`, `{{#each}}`. Porting a
  MailerLite/Mailchimp template that uses conditionals requires restructuring to
  one-variable-per-block.
- Double braces are rejected at create time: 422 "The 'html' field contains
  improperly formatted variables. Please use the correct syntax: {{{VARIABLE_NAME}}}".
- **Reserved does not mean auto-filled.** `{{{FIRST_NAME}}}` rendered *empty* in
  an automation send against a contact that had `first_name` set. Contact data
  reaches a template only through an explicit step-level
  `{ "var": "contact.<field>" }` reference (see the resend skill's automations.md).
