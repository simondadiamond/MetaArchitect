---
name: editorial
description: Use when Simon asks to edit, review, or improve a blog draft or a specific section — or when write-post hands off a completed draft for quality control. Contract - does NOT add new content or change the argument, only improves execution. Do NOT trigger for writing a new post (write-post) or for LinkedIn copy (the shared gate in repurpose/references covers that).
---

## Editorial Loop — Three Passes

**Risk tier: low — deliberately exempt.** Read-only: no DB writes, no external API calls. No state object, no pipeline logging; the calling skill (write-post) carries the STATE obligations for the run.

Do not skip a pass. Do not batch them. Output discipline: Pass 2's score block is always shown in full; Passes 1 and 3 present a change summary (or diff) and the final text respectively — never re-print the whole draft between passes.

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

Present a compact summary of what changed (bullets or a diff) — not the full draft.

---

### PASS 2 — Fidelity Check

**Mechanical greps first**: write the draft to a temp file and run `bash scripts/linkedin-gate.sh --blog <file>` (blog mode: prohibitions + AI-tells only; no word-count or link checks, and **em dashes are allowed** — the zero-em-dash rule is LinkedIn-scoped). The spec behind the script is `.claude/skills/repurpose/references/linkedin-gate.md`.

```bash
grep -inE "excited to share|thrilled to announce|game.chang|revolutionary|groundbreaking|transformational|cutting.edge|state.of.the.art|in today's fast|in the age of ai" draft.md   # must be 0 — brand prohibitions
grep -inE "it'?s not [^.]{1,60}, (it'?s|it is)" draft.md   # AI-tell shape — flag every hit; acceptable only as the brand's own plumbing line, used deliberately in body prose — never in the title or opening hook
```

Then score each dimension 0–10. Anything below 7 is flagged for repair.

| # | Dimension | Question to ask |
|---|---|---|
| 1 | **Burned practitioner** | Would someone paged at 2am because their LLM hallucinated a SQL query feel understood? |
| 2 | **Specificity** | Could you replace the failure mode / mechanism / number with a generic placeholder and lose nothing? (If yes → too vague) |
| 3 | **Thesis alignment** | Does the post connect, explicitly or implicitly, to "state beats intelligence"? |
| 4 | **Pillar alignment** | Does it clearly sit in the declared pillar? |
| 5 | **Voice match** | Practitioner-to-practitioner, not guru-to-student? No talked-down-to feeling? |
| 6 | **Prohibition check** | Zero banned phrases per `brand/brand-summary.md` Prohibitions? The grep above catches the fixed strings; judgment catches the rest (hedged thesis, vague lessons without mechanism, passive-voice diagnostics). |
| 7 | **Hook strength** | Would a burned SRE keep reading after the first paragraph — or skim past it? |
| 8 | **CTA alignment** | Does the natural next action at the end of the post match the declared CTA type? |
| 9 | **Stat provenance** | Does every external number, process narrative, or attributed statement trace to a verbatim primary-source sentence whose URL is linked in the draft — scope qualifiers ("more than", "at X itself") intact? (The Ramp 65% passed through editorial unchallenged — lessons.md 2026-07-07.) |

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
9. Stat provenance:      [X]/10

FLAGS (scores < 7): [list]
GREP HITS: [none | list line numbers + phrase]
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
