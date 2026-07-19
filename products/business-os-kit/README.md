# Business OS Kit — the client workspace in a box

**What this is:** the versioned template Simon installs at every Business OS client. Folder
layout, CLAUDE.md templates by business type, a starter skill library, memory conventions,
and EN/FR handover materials. One battle-tested foundation instead of a from-scratch build
per client.

**Why it exists:** the $6,500 setup promise is only good business if delivery takes days,
not weeks. The kit is the margin. It is also the floor of quality every client gets on
day one, and every improvement made for one client flows back here for the next.

## Rules of the kit

1. **Install by copy, never by clone.** Client machines never see this repo. Copy
   `template/` + chosen skills, then personalize. The client owns their workspace outright.
2. **Personalize every placeholder before leaving.** `{{TOKENS}}` left in a client
   workspace are a delivery defect. `grep -r "{{" <workspace>` must return nothing at handover.
3. **Flow-back rule:** anything built ad hoc at a client that took real thought gets
   generalized back into this kit (strip client specifics first) in the same week. The kit
   only compounds if this happens.
4. **AI-assisted, never AI-generated.** The workspace drafts; the owner decides and sends.
   Every skill in this kit ends at a draft or a checklist, never at an outbound action.
   This is the credibility answer for non-technical clients and it is non-negotiable.
5. **Versioning:** bump `KIT_VERSION` below on any meaningful change; note it in the
   changelog. Write the version into the client's CLAUDE.md at install so future sessions
   know what vintage they're upgrading.

`KIT_VERSION: 1.0.0` (2026-07-19)

## Layout

```
runbook/      — Simon-facing: discovery mapping, session-0 install script, handover script
template/     — the workspace skeleton: CLAUDE.md master + business-type variants,
                folder map, memory conventions
skills/       — starter skills, personalized at install (each is a SKILL.md)
handover/     — client-facing: owner's guide, first-week plan, safety card (EN + FR)
```

## Delivery flow (summary — full scripts in runbook/)

1. **Discovery call** → fill `runbook/discovery-map.md` answers → pick variant + first 3 skills.
2. **Session 0 (90 min, their machine):** install template, personalize CLAUDE.md, install
   3 skills, run each once on real work, seed 5 memory files. They leave with something working.
3. **Between sessions:** owner uses it; friction notes accumulate in their `inbox/`.
4. **Later sessions:** clear friction, add skills, deepen memory. Each session's notes go
   into the Convert queue (client attributed) for the content flywheel.
5. **Handover:** run `runbook/handover.md`; the owner passes the driving test; leave the
   safety card printed on their desk.

## Changelog

- 1.0.0 (2026-07-19) — initial kit: 3 variants, 6 starter skills, EN/FR handover set.
