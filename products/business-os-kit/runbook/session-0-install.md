# Session 0 — install script (90 min, their machine)

Goal by the door: the owner has run three skills on their real work, watched the
workspace remember something, and knows what to do tomorrow morning. Not "set up":
**used.**

## Prep (before arriving, 15 min, off the clock)

- Discovery map filled; variant + 3 skills chosen; the output block ready to paste.
- Confirm Claude Code (or Claude Desktop equivalent) is installable on their machine
  and their subscription covers it; know the login they'll use.
- Bring: printed safety card (their language), printed first-week plan.

## The 90 minutes

**0:00–0:15 — install and hello world.** Claude Code running in an empty
`{{BUSINESS_NAME}}-os/` folder. Have THEM type the first message ("what can you do?").
Their hands on the keyboard from minute one; you never touch it except when invited.

**0:15–0:35 — the skeleton, from their words.** Copy in `template/` (folders +
CLAUDE.md + chosen variant). Fill every `{{TOKEN}}` by asking them out loud and typing
their answers. Then `operations/pricing.md` and `policies.md` from their real numbers.
If pricing wasn't in writing, this is the 20 extra minutes and it's the most valuable
file in the building; say so.

**0:35–1:05 — three skills, three real runs.** Install the chosen 3. Run each on real
work from this week: their actual inbox pile, an actual pending quote, this week's
actual review. Rough edges get fixed live (edit the skill, rerun). Each run ends with
them copying a real draft they'd actually send.

**1:05–1:20 — seed the memory.** Five memories from the discovery call, saved per
`memory/conventions.md`, read back to them. Then the demo that lands the whole offer:
open a fresh conversation and ask something only the memory knows. Watch their face.

**1:20–1:30 — handover of the day.** Walk the safety card. Tape the first-week plan
next to the screen. Book the next session before leaving. Last line, verbatim: "It
drafts, you decide. If it ever claims it sent something, it's wrong, and text me."

## After (same day, 20 min, off the clock)

- `grep -r "{{" <workspace>` on their machine before you leave — zero hits or you're
  not done.
- Session notes → Convert queue (client attributed) same evening; follow-up email goes
  out same day (the dispatcher drafts it from your notes).
- Anything you built or fixed live → flow-back rule: generalize into the kit this week.
- Log the session + hours in CC (Clients section once live; lead notes until then).
