<!-- Additions to the vendored `resend` skill's references/automations.md.
     Re-apply with scripts/patch-resend-skills.py after any skill update. -->

### Step Variables (send_email) — verified live 2026-08-06

**This section is a local addition.** The upstream skill documents step types and
connections but never how a `send_email` step gets its template variables, which
is the single most expensive gap in it: every wrong guess fails *silently*.

A variable value is a **structured reference object**, not a mustache string:

```json
{
  "key": "email1",
  "type": "send_email",
  "config": {
    "template": {
      "id": "score-welcome-1-en",
      "variables": {
        "SCORE":          { "var": "contact.properties.quiz_score" },
        "WEAKEST_PILLAR": { "var": "contact.properties.weakest_pillar" },
        "ORDER_ID":       { "var": "event.order_id" },
        "SUPPORT_EMAIL":  "help@example.com"
      }
    }
  }
}
```

| Form | Resolves to |
|------|-------------|
| `{ "var": "contact.<field>" }` | a field on the contact record |
| `{ "var": "contact.properties.<key>" }` | a custom contact property |
| `{ "var": "event.<field>" }` | a field from the triggering event payload |
| `{ "var": "wait_events.<event>.<field>" }` | a payload from a preceding `wait_for_event` |
| `"a plain string"` | passed to the template as-is |

**The trap.** `"{{x}}"`, `"{{{x}}}"`, `"{{event.x}}"` in this position are treated
as static strings and reach the template as literal text. The run completes, the
email delivers, and the subject reads `Your score is {{event.quiz_score}}/25`.
Nothing errors. If a variable renders as its fallback or as raw braces, this is
why.

Variable keys must exist in the referenced template and match exactly.

**Prefer `contact.properties.*` over `event.*` for anything a delayed step
renders.** A step after a `delay` still resolves contact scope correctly with no
dependence on the original payload — verified by firing a trigger with an empty
payload and getting a fully personalized send three steps later. Any property
referenced this way must first be created via `POST /contact-properties`, or the
contact create fails with 422 "One or more properties do not exist".

### Editing an enabled automation

`PATCH` on an enabled automation returns 422 *"This automation is enabled and
cannot be edited. Duplicate it to make changes, or disable it first — in-flight
runs will keep executing the current version."* Any sync tool must disable →
patch → restore the previous status.

### Debugging a run

`GET /automations/{id}/runs` then `GET /automations/{id}/runs/{runId}` returns
per-step `status` and `error`. This is where a bad variable surfaces, e.g.
`{"code":"STEP_EXECUTION_ERROR","message":"Variable \"SCORE\" must be a `number`."}`
— which is what a mustache string looks like when the template expects a number.

