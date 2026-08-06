<!-- Additions to the vendored `resend` skill's references/contacts.md.
     Re-apply with scripts/patch-resend-skills.py after any skill update. -->

## Topics on create — verified live 2026-08-06

**Local addition.** Topics must be `[{ id, subscription }]` objects using real
topic UUIDs. Passing bare names:

```json
{ "email": "a@b.com", "topics": ["newsletter"] }
```

returns **201 Created** and the topic assignment is **silently discarded** — the
contact keeps each topic's `default_subscription`. With topics created as
`opt_out`, that contact is subscribed to nothing and will never receive a
broadcast or automation email. Nothing errors, and the contact looks fine in the
dashboard. Verify with `GET /contacts/{id}/topics` after any create that sets them.

`properties` keys must already exist (`POST /contact-properties`) or the entire
create fails 422 "One or more properties do not exist".
