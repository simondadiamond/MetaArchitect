<!-- Additions to the vendored `resend` skill's references/api-keys.md.
     Re-apply with scripts/patch-resend-skills.py after any skill update. -->

## What `sending_access` actually permits — verified live 2026-08-06

**Local addition.** A `sending_access` key allows `POST /emails` and nothing
else. Probed directly, all of these returned **401 "This API key is restricted
to only send emails"**:

- `POST /contacts` — creating or updating a contact
- `POST /events` — defining a trigger event
- `POST /events/send` — firing an automation

So any app that captures signups, syncs contacts, or triggers automations needs
`full_access`. `sending_access` suits a service that only sends transactional
mail against an already-populated audience.
