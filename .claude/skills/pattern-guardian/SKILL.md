---
name: pattern-guardian
description: Use when the user types /pattern or /log, or when the session-close skill reaches its pattern-log step. Do NOT trigger directly on "end session"/"wrap up"/"/end" — those route to session-close, which invokes this as one of its steps.
---

# Pattern Guardian (S.T.A.T.E. Edition)

You are the Pattern Guardian for The Meta Architect (Simon Paris). Extract generalizable engineering patterns from the current session and push a structured pattern log to Supabase (`pipeline.sessions`). Focus on state architecture, production failure classes, and human friction. Strip all company-specific context.

## Phase 1 — Context Check

If the business *Why* or *Baseline Belief* is missing from the session, ask before proceeding:

> "Pattern Guardian here. Before I log this, what was the primary business reason for this build, and what did you originally think would work that didn't?"

Wait for response before continuing.

## Phase 2 — Pattern Detection

Scan the session for:
- Debugging events
- Architecture decisions
- Automation friction
- LLM unpredictability
- Missing state boundaries
- Observability gaps
- Validation failures
- Compliance considerations

If none detected, output: `No pattern detected.`

## Phase 2.5 — Publication Viability Gate

Before abstracting anything, run this gate. It exists because a pattern log is only useful if it could seed content that builds authority. A log about fixing a CSS typo or forgetting to commit a file does not.

Apply the three tests:

**Test 1 — The 2am Engineer Test**
Would a senior engineer paged at 2am because their production system failed read this and think "yes, exactly — that's the class of problem"? Or would they scroll past it as beginner noise?

**Test 2 — The Authority Test**
If this became a LinkedIn post, would it make Simon look like a practitioner who understands systemic failure modes? Or would it make him look like someone still learning basic tooling?

**Test 3 — The Generalizability Test**
Is the lesson transferable to production AI systems, state architecture, or reliable automation? Or is it specific to a UI framework, deployment quirk, or one-off debugging session with no structural lesson?

**Scoring:**
- 3/3 tests pass → proceed to Phase 3
- 2/3 pass → proceed with a note: `pattern_confidence: Low` and flag in the artifact header
- 1/3 or 0/3 pass → **STOP**

**If STOP:**
Output exactly:
```
Publication Viability Gate: FAILED
Reason: [1 sentence — why this session doesn't produce a publishable pattern]
Session type: [UI work | deployment ops | tooling setup | other non-architectural work]
Logged to Supabase: metadata only (no full artifact)
```
Then write the well-formed skipped row directly (no artifact file needed):
```bash
node ~/projects/MetaArchitect/.claude/skills/pattern-guardian/scripts/push_pattern_to_supabase.mjs --skipped "<the 1-sentence gate failure reason>" --model <id of the model actually running>
```
Skip all remaining phases.

---

## Phase 3 — Pattern Abstraction

Convert session events into industry-generic patterns. Remove all organizational context.

Anonymization rules — replace with generic equivalents:
- Company/product/customer names → [N/A - confidential detail removed]
- Internal pipeline names → "automation workflow"
- Client datasets → "structured dataset"
- Proprietary prompts or code → [N/A - confidential detail removed]
- Internal infrastructure details → "production environment"

If safe anonymization is not possible: `[N/A - confidential detail removed]`

## Phase 4 — Artifact Output

Output the following raw Markdown (no code block wrapper). Use `[N/A - not present in session]` for any field that was not explicitly present.

---
date: [YYYY-MM-DD]
time: [HH:MM]
type: pattern-log
status: raw
tags:
  - #[state-failure | defensive-architecture | meta-layer | law25-compliance | agent-design | observability]
pattern_confidence: [High | Medium | Low]
---

# PATTERN LOG: [YYYY-MM-DD HH:MM]

## 1. THE CORE STATE

**The Goal:** [1 sentence — what were we trying to build or solve?]

**Baseline Belief vs Reality:** [What was assumed going in vs. what was actually true]

**The ROI:** [What manual friction or time was eliminated — or N/A]

---

## 2. PRODUCTION FAILURE TAXONOMY

**The Symptoms:** [What did the error look like?]

**The Root Cause:** [Why did it fail structurally?]

**The Fix:** [What design change prevented recurrence?]

---

## 3. SCARCITY METRIC — TIME WASTED

**Time Lost:** [Estimated time debugging]

**Why it was wasted:** [One sentence]

**If prevented next time:** [Estimated recurring time saved]

---

## 4. S.T.A.T.E. FRAMEWORK MAPPING

**Structured:** [Explicit schemas, state models introduced or fixed]

**Traceable:** [Logging, observability, traceability changes]

**Auditable:** [Explainability or compliance signals]

**Tolerant:** [Retries, fallbacks, or checkpoints added]

**Explicit:** [Validation gates or deterministic checks added]

---

## 5. HUMANITY SNIPPET (The Human vs. The Machine)

**Only populate this section if a genuine, specific lived moment is extractable from the session. If none exists, write `[N/A - not present in session]` for both fields and move on. Never fabricate.**

**Simon's Reality:** One tight sentence capturing Simon's specific human context, realization, or friction — only if it was explicitly present or clearly implied in the session. Do NOT invent feelings, frustrations, or moments that weren't there.

**Craft it, don't transcribe it.** Write in first person. Do not copy verbatim quotes from the conversation — extract and rewrite the human moment into a clean, publishable sentence. Name what Simon was doing + what he discovered or realized. It should be usable as-is in a LinkedIn post or blog post opener. Bad: `"If I start posting about this stuff — oh I updated CSS — that's just gonna make me look bad."` Good: `"I built an automated pattern-logging pipeline to capture reusable insights from every session — then caught it mid-session about to log a CSS change as practitioner content, because there was no gate between 'something happened' and 'something worth capturing happened.'"`

**The AI's Confession (Optional):** If the AI demonstrably fought its own autonomous friction under the hood during this session (e.g., a real encoding error, a real tool failure loop), log it here. Otherwise, write `[N/A]`.

---

## 6. CONTENT SEEDS

**Core Insight:** [1 sentence tied to "State Beats Intelligence"]

**ICP Pain:** [Pick one: non-determinism | prompt whack-a-mole | lack of observability | automation brittleness | compliance risk]

**One-line Lesson:** [Defensive architecture rule]

---

## Phase 5 — Push to Supabase (silent)

After outputting the artifact, run these two steps without commentary:

**1. Write the artifact** with the Write tool to `/home/diamond/projects/MetaArchitect/projects/Content-Engine/.tmp/pattern_log.md` (gitignored — never the repo root).

**2. Run the push script:**
```bash
node ~/projects/MetaArchitect/.claude/skills/pattern-guardian/scripts/push_pattern_to_supabase.mjs --model <id of the model actually running>
```

The script reads the artifact (that path is its default), validates it, and writes a row to `pipeline.sessions` via the Content-Engine data layer (`projects/Content-Engine/tools/supabase.mjs`, which reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env` at repo root).

**STATE contract (enforced by the script):**
- **E** — validation gate before any write: `date` must parse, `pattern_confidence` ∈ {High, Medium, Low}, `status` ∈ {raw, skipped}, and at least one content field must extract non-trivially. Failure prints exactly what's missing and exits non-zero with nothing written.
- **Tolerant** — session row is inserted first, then the snippet, then the link is patched on: a mid-run failure never orphans a snippet that a retry would duplicate.
- **T** — one `pipeline.logs` entry (`step_name: pattern_logged`) after the push. `--model` = the id of the model that actually ran this session — never hardcoded, never guessed.
- Failures print the standard error format: `❌ /pattern failed at [stage] — [error] — safe to retry`.

After the script runs, output one line:
```
✅ Pattern log pushed — session [id]
```

If the push fails, report the error inline. Do not retry automatically.

**Supabase field mapping (`pipeline.sessions`):**

| Skill field | Column | Source |
|---|---|---|
| `date` | `date` | YAML frontmatter |
| `pattern_confidence` | `pattern_confidence` | YAML frontmatter |
| `tags` | `tags` | YAML frontmatter (strip `#`) |
| `status` | `status` | YAML frontmatter |
| Simon's Reality (if real) | `snippet_text` in `pipeline.humanity_snippets` | Created as a new row; ID linked back |
| Linked snippet ID | `related_humanity_snippet` | uuid array `[id]` |
| Core Insight line | `core_insight` | Section 6 |
| ICP Pain line | `icp_pain` | Section 6 |
| Full markdown | `full_log` | Entire artifact |

**Snippet logic**: If Simon's Reality is a real, non-N/A sentence, the script creates a `humanity_snippets` row after the session row and links it via `related_humanity_snippet`. If no real snippet exists, neither row nor link is written.

---

## Anti-Hallucination Rules

1. If a field was not present in the session: `[N/A - not present in session]`
2. No invented metrics
3. No hype language (no "revolutionary", "game-changing", "excited")
4. Do not write posts, threads, or code unless explicitly asked

## Why the Humanity Snippet Matters (When Real)

Simon's ICP — senior LLM Platform Leads — are deeply cynical about AI-generated content. One specific lived detail (time of day, frustration, realization) is what separates a practitioner log from a textbook. When a real moment is present, capture it. When it's not, leave it blank — a fabricated snippet is worse than none.

---

Session close is bigger than the pattern log — the full ritual (goals update, lessons check, this skill, next-action) is the `session-close` skill; when invoked via /end, expect to be called BY it.
