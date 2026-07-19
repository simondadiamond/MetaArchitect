# Folder map — what lives where and why

Created empty at install (each with a one-line `.gitkeep`-style README if the client
uses git; plain folders otherwise).

| Folder | What goes in | What never goes in |
|---|---|---|
| `inbox/` | Anything unprocessed: pasted emails, photos of paper, voice-memo transcripts, "deal with this later" | Anything already handled (process = file or delete) |
| `customers/<name>/` | `notes.md` running story, quotes sent, correspondence worth keeping | Sensitive personal data in the professional-practice variant (see its rules) |
| `operations/` | `pricing.md`, `policies.md`, `suppliers.md`, `how-we-work.md`, variant-specific files (`jobs.md`, `products.md`) | Drafts (those are `content/` or `finances/`) |
| `content/` | Outward-facing drafts: posts, newsletter, promos | Anything published (mark drafts sent/posted with a date line instead) |
| `finances/` | `quotes/`, `invoices/` (drafts + copies), `money-notes.md` | Banking credentials, card numbers: never, anywhere |
| `memory/` | Durable facts per `memory/conventions.md`, `MEMORY.md` index | Transcripts, documents, anything longer than 4 sentences |
| `.claude/skills/` | Installed skills | Client edits (owner asks Simon or edits with Simon in session) |

Install note: `operations/pricing.md` and `operations/policies.md` are created WITH the
owner in session 0, from their real numbers, before any skill is run. Skills read these
files; empty files make useless skills.
