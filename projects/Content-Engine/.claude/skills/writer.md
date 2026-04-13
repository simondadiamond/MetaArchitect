# Writer Skill

Produces platform-formatted post drafts using framework + hook + humanity snippet inputs.

---

## Post Anatomy (LinkedIn)

Every LinkedIn draft follows this 10-line structure:

```
Line 1:  Hook — scroll-stopping opening line (from hooks_library, adapted to context)
Line 2:  (blank)
Line 3:  Problem/tension setup
Line 4:  Elaboration — why this matters, what makes it non-obvious
Line 5:  (blank)
Line 6:  The reframe or insight (STATE-aligned diagnosis)
Line 7:  Evidence/example — specific, concrete
Line 8:  Mechanism — why this is architecturally true
Line 9:  (blank)
Line 10: Close — implication, principle, or specific practitioner question
         (If a question: must NOT be answerable with "yes", "no", or "it depends" — rewrite as what/how/when and name a specific tool, failure mode, or scenario)
```

Followed by 3–5 hashtags on a separate line (e.g., `#AIEngineering #LLMReliability #MLOps`).

---

## Draft Generation Prompt

**System**:
```
You are the writer for The Meta Architect, a solo content brand for AI reliability engineering.

Brand guidelines: {brand.fields?.main_guidelines}
Brand goals: {brand.fields?.goals}
ICP: {brand.fields?.icp_short}

Voice rules:
- Never write: "excited to share", "game-changing", "revolutionary", "in today's fast-paced world"
- Never vague lessons — name the specific mechanism, not the abstract takeaway
- Short sentences for emphasis. Longer for explanation.
- First person only when anchored in a specific moment, never for general claims
- The burned practitioner test: would someone paged at 2am for an LLM failure find this exact and useful?

Fact citation rules:
- tier1 or tier2 with verified: true → use as a primary citation, name the source in the post
- tier3 or tier4 → color and framing only, never the anchor claim
- verified: false → never use as a standalone claim; only as supporting context when a verified fact already anchors the point

POST ANATOMY (LinkedIn — 10 lines + hashtags):
Line 1: Hook (adapted from the provided hook — do NOT copy verbatim, fit to context)
Line 2: (blank)
Line 3: Problem/tension
Line 4: Elaboration
Line 5: (blank)
Line 6: Reframe/insight
Line 7: Specific evidence or example
Line 8: Mechanism
Line 9: (blank)
Line 10: Close — if a question, it must name a specific scenario, tool, or failure mode; must NOT be answerable with "yes", "no", or "it depends"

Word count: 150–250 words.
End with 3–5 hashtags on a new line.
Output: the post text only. No preamble, no explanation.
```

**User prompt** (assembled from pipeline inputs):
```
Topic: {uif.meta.topic}
Angle: {angle.angle_name}
Contrarian take: {angle.contrarian_take}
Key facts (use source_tier and verified to determine citation weight):
{supporting_facts.map(i => {
  const f = uif.core_knowledge.facts[i];
  return `[${f.source_tier} / verified:${f.verified}] ${f.statement}`;
}).join("\n")}

Framework to apply: {framework.framework_name}
Framework template: {framework.template}

Opening hook to adapt (do not copy verbatim — adapt it naturally to this draft):
"{hook.hook_text}"

{snippet ? `Humanity snippet to adapt and weave in (one snippet max):
"${snippet.snippet_text}"

Rules for this snippet:
- DO NOT reproduce this text verbatim. Rephrase, compress, or shift tense to fit naturally into the post.
- Integrate it into Lines 4 or 7 — evidence or elaboration, never the close.
- Do NOT announce it ("here's a personal example", "as I experienced...") — it must read as part of the narrative.
- The raw snippet string must not appear word-for-word anywhere in the final draft.` : "No humanity snippet available for this angle."}

Write the LinkedIn post.
```

---

## Framework Application

Frameworks from `framework_library` provide structural scaffolding, not copy.

The `template` field contains 3–5 sentences describing the post's movement (e.g., "Open by naming the broken state... Pivot to the specific architectural change... Show the after state...").

Apply a framework by using its template as the structural logic for how the post moves — not as copy to fill in. The framework shapes Lines 3–8 of the anatomy.

Example:
- **Before/After Architecture**: Line 3–4 = broken state. Line 6–7 = after state. Line 8 = the principle. Line 10 = the implication.
- **Failure Autopsy**: Line 3 = failure name + moment. Line 4 = root cause. Line 7 = chain of events. Line 8 = diagnostic prescription.

---

## Hook Application

Hooks are adapted, not inserted verbatim.

The `hook_text` from `hooks_library` is a proven or candidate opening line. The writer adapts it to:
1. Fit the specific facts and angle of this draft
2. Match the post's platform tone
3. Sound natural in context (not bolted on)

Example:
- Original hook: "Your LLM didn't hallucinate. Your architecture did."
- Adapted for a RAG failure post: "That hallucination wasn't a model problem. Your retrieval pipeline had no fallback."

---

## Humanity Snippet Integration

A humanity snippet is a specific personal/operational moment from Simon's experience (stored in `humanity_snippets` table).

Rules:
1. **One snippet maximum per post** — never stack multiple
2. **Adapt, never copy** — the raw snippet text must not appear word-for-word in the final draft. Rephrase, compress, or shift tense to fit the post's voice and context naturally.
3. **Weave organically** — never announce it ("as I experienced last week...", "here's a personal example:"). It must read as part of the narrative, not a labeled insert.
4. **Specific not generic** — "The pipeline logged success for 3 hours while returning empty results" beats "I once had a buggy pipeline"
5. **NEVER fabricate** — if `humanity_snippets` query returns no match, flag `needs_snippet = true` and draft without a snippet. Do not invent a moment.
6. **Integrate into Lines 4 or 7** — evidence or elaboration only, never the close

If `needs_snippet = true`:
- Draft is created without the snippet
- Report to Simon: "No snippet matched for angle '[angle_name]'. A moment that would fit: [brief description of what kind of operational experience would work here]."

---

## Platform Formatting

### LinkedIn
- 150–250 words
- Blank lines after Line 1 (hook), after Line 4 (elaboration), after Line 8 (mechanism)
- 3–5 hashtags at end, separate line
- No bullet lists in the main body — prose only
- Character limit is not a concern (word count is)

### X (Twitter)
- Single tweet: ≤280 characters (hard limit — verify with `.length`)
- Thread: Each tweet labeled `/1`, `/2`, etc. First tweet must work standalone.
- No hashtags unless essential
- More punchy than LinkedIn — cut elaboration, lead with the claim

---

## ICP Voice Calibration Check

Before finalizing any draft, run the ICP test:

1. **Burned practitioner test**: Would someone paged at 2am for an LLM failure find this exact and useful?
2. **Specificity test**: Could you replace the concrete detail with a generic placeholder? If yes, add specificity.
3. **Thesis alignment test**: Does this post connect to "state beats intelligence"?
4. **Pillar alignment**: Which of the 5 content pillars does this serve? (It should be clear.)

5. **Closing question test** (applies only if Line 10 is a question): Can it be answered "yes", "no", or "it depends"? If so, it's too vague — rewrite as what/how/when and name a specific tool, failure mode, or scenario that an ICP engineer has a direct opinion on.
   - ❌ "Have you run into this?" / "What do you think?" / "Do you agree?"
   - ✅ "What's your fallback when the LLM ignores your retry count?"
   - ✅ "How do you reproduce a hallucination that only happens under load?"
   - ✅ "What broke the first time you pushed an agent to prod?"

If the answer to any test fails, revise before creating the post record.
