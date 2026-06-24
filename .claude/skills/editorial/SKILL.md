---
name: editorial
description: Three-pass editorial loop for The Meta Architect blog content. Trigger when Simon asks to edit, review, or improve a draft — or when write-post hands off a completed draft for quality control. Can run on a full post or a specific section. Does NOT add new content or change the argument — only improves execution.
---

## Editorial Loop — Three Passes

Do not skip a pass. Do not batch them. Run in order and show output between passes so Simon can see what changed.

---

### PASS 1 — Humanizer

Goal: improve rhythm and remove crutch language without touching the argument or credibility signals.

**What to do:**
- Alternate sentence length — short punchy sentences (under 10 words) following longer explanatory ones. No five consecutive long sentences.
- Remove hedging words: "somewhat", "rather", "quite", "perhaps", "it's worth noting", "it's important to", "one might argue"
- Remove crutch transitions: "Additionally", "Furthermore", "Moreover", "In conclusion", "To summarize", "Moving on to", "It's also worth mentioning"
- Fix passive voice in diagnostic statements: "the error is thrown" → "the agent throws the error"
- Tighten any paragraph over 5 sentences — break or cut

**What NOT to do:**
- Do not soften diagnostic statements
- Do not remove specific technical language (it's credibility, not jargon)
- Do not alter the argument structure

Present the humanized draft.

---

### PASS 2 — Fidelity Check

Score each dimension 0–10. Anything below 7 is flagged for repair.

| # | Dimension | Question to ask |
|---|---|---|
| 1 | **Burned practitioner** | Would someone paged at 2am because their LLM hallucinated a SQL query feel understood? |
| 2 | **Specificity** | Could you replace the failure mode / mechanism / number with a generic placeholder and lose nothing? (If yes → too vague) |
| 3 | **Thesis alignment** | Does the post connect, explicitly or implicitly, to "state beats intelligence"? |
| 4 | **Pillar alignment** | Does it clearly sit in the declared pillar? |
| 5 | **Voice match** | Practitioner-to-practitioner, not guru-to-student? No talked-down-to feeling? |
| 6 | **Prohibition check** | Zero banned phrases? (excited to share / game-changing / in today's fast-paced world / etc.) |
| 7 | **Hook strength** | Would a burned SRE keep reading after the first paragraph — or skim past it? |
| 8 | **CTA alignment** | Does the natural next action at the end of the post match the declared CTA type? |

Report the scores:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━
FIDELITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Burned practitioner:  [X]/10
2. Specificity:          [X]/10
3. Thesis alignment:     [X]/10
4. Pillar alignment:     [X]/10
5. Voice match:          [X]/10
6. Prohibition check:    [X]/10
7. Hook strength:        [X]/10
8. CTA alignment:        [X]/10

FLAGS (scores < 7): [list]
━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### PASS 3 — Repair

If any dimension scored below 7, fix it now.

For each flagged dimension, state:
- **What was wrong**
- **What you changed**
- **Why it scores higher now**

If everything scored 7+: declare "Editorial: clean — no repairs needed." and present the final draft.

Present the final post after Pass 3 is complete.
