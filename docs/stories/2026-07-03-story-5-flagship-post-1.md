# Story 5 — Flagship Blog Post 1: STATE Framework Applied

> Owner: Simon Paris · Executor: blog-writer agent, with the `research` skill (NotebookLM) mandatory before drafting
> Status: queued — not started
> Kind: content — **NOT eligible for the command-center story pipeline** (posts live in Supabase `blog_posts`, not as repo files; the code pipeline's test/verify stages have nothing to judge). Run via the blog-writer agent / `write-post` skill.
> Linked goal: `564fcc1a-8efe-4f3c-90f2-0da0087a77a3` ("Post 1 — flagship STATE piece", p1). Parent: "First 3 blog posts in 3 weeks" (in_progress, behind schedule — 1 of 3 shipped, target window long past).

---

## 1. Purpose & Constraint

This is the evergreen anchor of the content engine. Everything downstream repurposes from it: 2–3 LinkedIn posts, a candidate teardown angle, comment ammunition for the daily cadence, and the first run of the repurposing-workflow template (goals row "Template blog→LinkedIn repurposing workflow" explicitly waits on this post). The quality bar this post sets is the bar the whole engine inherits — which is why it runs on the deep model with real research, not from memory.

**Pillar**: STATE Framework Applied (most evergreen of the five).
**Shape** (from the goals spec): ~1,500 words. Real production failure → frame it with **one** STATE pillar → walk the remediation pattern → close with the principle. Ends with CTA → `simonparis.ca/score`.

## 2. Research Phase — NotebookLM, mandatory, before any outline

Run the `research` skill. Do not draft from training data; the burned-practitioner audience smells secondhand war stories instantly.

1. **Create or reuse a NotebookLM notebook** for this post (the research skill handles notebook lifecycle; reuse an existing STATE/reliability notebook if one exists rather than creating a duplicate).
2. **Seed it with grounded sources on ONE real, documented production LLM failure.** Candidate hunting grounds, in priority order:
   - The `pipeline.teardown_candidates` rows already researched (Ramp, Morgan Stanley, Glean, Intercom) — the Intercom token-burn incident or the Morgan Stanley zero-retention/zero-audit trade are both documented and buyer-shaped. **Do not fully spend the Intercom angle if the teardown (separate story) will cover it — pick a different facet or a different system.**
   - ZenML LLMOps database entries, public post-mortems, engineering blogs with named companies and named failure modes.
   - Reject any source where the failure is vague ("the model hallucinated") — the specificity test requires a named mechanism.
3. **Query the notebook** for: the failure mechanism, the detection story (who noticed, in which layer, how late), what the fix actually was, and any numbers that survive redaction.
4. **Pull brand context from Supabase** (per the research skill): `pipeline.humanity_snippets` (verified snippets only — fabricated anecdotes are prohibited), `pipeline.hooks_library`, and existing `blog_posts` to avoid overlapping the live post (`/blog/ai-told-the-truth-that-was-the-problem`).
5. Research output: 3 candidate angles with hooks, each tagged with which single STATE pillar it demonstrates. Pick the one that passes the burned-practitioner test hardest; log the other two to `pipeline.blog_ideas`.

## 3. Draft Phase

- Follow the `write-post` skill pipeline: outline → draft → three-pass `editorial` loop → Supabase insert as **draft** (never published directly).
- Voice per `brand/brand-summary.md`, enforced hard:
  - Hook = specific failure or contrarian claim, first line, no wind-up.
  - Diagnostic statements in active voice. Short sentences for emphasis.
  - Zero prohibited phrases (no "excited", "game-changing", "in the age of AI", no hedging the thesis).
  - Every lesson names the mechanism — "what broke and why", never "testing matters".
- The post must explicitly land on **State Beats Intelligence** — this is a spine post.
- One STATE pillar only. Depth over coverage; the other pillars get their own posts.
- CTA block: audit CTA → `/score` (never `/readiness` — that convention is a logged lesson).

## 4. Repurposing (same story, do not defer)

Per the repurposing-template goal, this post is the template's first run:
- Derive **2–3 LinkedIn post drafts** (different hooks, same insight, 180–300 words, post-anatomy format from brand-summary; mechanics per `.claude/skills/repurpose/references/linkedin-playbook.md`).
- Note **1 candidate teardown angle** if the researched system qualifies → `pipeline.teardown_candidates` or flag for the teardown-research skill.
- Document the steps taken as the workflow template while doing it (that's the "Template blog→LinkedIn repurposing workflow" goal, agent_target blog-writer — close both with one run).

## 5. Acceptance Criteria

- [ ] NotebookLM research ran first; the draft cites a real, named (or deliberately redacted-but-verifiable) production failure — not a composite, not invented.
- [ ] ~1,500 words (±20%), single STATE pillar, remediation walk-through concrete enough for a practitioner to apply.
- [ ] Passes all three voice tests: burned-practitioner, specificity (no placeholder-able claims), thesis alignment.
- [ ] Zero prohibited phrases; any humanity snippet used is verified from `pipeline.humanity_snippets`.
- [ ] Does not overlap the live post's territory or pre-spend the first teardown's core angle.
- [ ] Ends with CTA → `/score`.
- [ ] Inserted into Supabase `blog_posts` with status **draft**; Simon notified for review — no auto-publish.
- [ ] 2–3 LinkedIn repurpose drafts delivered alongside; goal `564fcc1a…` flipped to in_progress at start (done only after Simon approves).

## 6. Constraints

- STATE compliance for the pipeline itself (medium risk, S+T+E): workflow state object, every LLM/NotebookLM/Supabase call logged to `pipeline.logs`, all output validated before any write.
- If NotebookLM auth fails: `nlm login` per MCP instructions; do not fall back to memory-only research — pause and report instead.
