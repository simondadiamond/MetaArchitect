# Memory conventions

The workspace only compounds if what it learns survives the conversation. These rules are
how.

## The rules

1. **One durable fact per file**, in `memory/`, named in kebab-case after the fact:
   `marie-tremblay-prefers-text.md`, `deposit-rule-custom-orders.md`.
2. **A memory is 1–4 sentences.** The fact, plus why it matters if that isn't obvious.
   Not a diary, not a transcript. If it takes a page, it's a document; file it in the
   right folder and write a one-line memory pointing to it.
3. **Every new memory gets a line in `MEMORY.md`** (the index): `- [Title](file.md) — hook`.
   The index is what gets read at session start; keep each line short enough to scan.
4. **Update beats duplicate.** Before saving, check the index; if a file already covers
   the topic, edit it. A wrong memory gets fixed or deleted the moment it's caught.
5. **What qualifies:** customer preferences and history, supplier terms, pricing
   decisions and their reasons, policies the owner stated, lessons ("the market stall
   needs the square terminal charged by 7am"). What doesn't: anything already in
   `operations/` files, one-off details, sensitive personal data (see CLAUDE.md rules).
6. **Customer facts go in both places when both exist:** the durable preference in
   `memory/`, the running story in `customers/<name>/notes.md`.

## Seed set (install day)

Session 0 creates the first five memories with the owner, from their own words. Good
seeds: the busiest day of the week and why, the one customer type to always say yes to,
the discount rule, the supplier quirk, the task they hate most (that's the next skill).
