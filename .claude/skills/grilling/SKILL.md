---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, brief a goal, or uses any 'grill' trigger phrases. For goals and specs, the first question is always the outcome sentence — no technology in it.
---

<!--
Vendored from https://github.com/mattpocock/skills (MIT)
Path: skills/productivity/grilling · Commit: 84fdeffd12f2ee307994d1eb6feb48173b6e0502 · Vendored: 2026-08-11
Modified — see "Modified from upstream" at the bottom before "fixing"
anything back toward upstream.
-->

# Grilling

Interview the user relentlessly until you reach a shared understanding. Map
this as a **design tree**: every decision branches into the decisions that
hang off it.

**When the subject is a goal, spec, or anything that might get built,
automated, or queued as recurring work, question one is ALWAYS the
outcome-sentence gate (Simon's gate #8):**

> ❓ **Q1** - **Outcome sentence**: In one sentence with no technology in
> it, what should happen without you?

Do not proceed to solutioning — no slicing, no design questions, no tool
talk — until that sentence exists. Can't write it → not ready to build;
say so and stop. The sentence becomes line one of the goal's
`acceptance_criteria` when the briefing publishes (see `to-tickets`).

Work the tree in **rounds**. The **frontier** is every decision whose
prerequisites are already settled — the questions you can ask _now_ without
guessing at answers you haven't heard yet. Ask the whole frontier in one
round: number each question and give your recommended answer. Then wait for
the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree — settled decisions push the
frontier outward and unblock questions that depended on them. Recompute the
frontier and ask the next round. A question whose answer depends on another
question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question
needs a fact from the environment (filesystem, tables, running app),
dispatch a sub-agent to find it — don't ask the user for anything you could
look up yourself, and never spend one of the user's answers on a question
whose premise you haven't checked (lessons.md 2026-07-31). Don't block on
it: a running exploration is an unsettled prerequisite, so only the
questions downstream of it wait for the sub-agent to report — ask the rest
of the frontier now. The _decisions_ are the user's — put each to them and
wait.

The session is done when the frontier is empty: every branch of the design
tree visited, nothing left silently assumed. Do not act on it until the
user confirms you have reached a shared understanding.

## Modified from upstream

Deliberate delta from `mattpocock/skills` `grilling` — do not "fix" it
back:

1. **Outcome-sentence gate hard-coded as question one** for any goal/spec
   grilling. This is Simon's gate #8 (CLAUDE.md): if the outcome can't be
   written as one sentence with no technology in it, it isn't ready to
   automate — the gate is also the project-stacking guard, and the sentence
   feeds `acceptance_criteria` line one downstream in `to-tickets`. Upstream
   has no such gate; here it is the point of the interview.
