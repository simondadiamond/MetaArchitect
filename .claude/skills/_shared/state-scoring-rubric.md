# STATE Pillar Scoring Rubric — 0/1/2 (canonical)

> **Single canonical copy — both teardown skills point here.** The two skills previously carried
> divergent local copies of this rubric; this file replaces both. Edit HERE, never fork a
> skill-local variant. Skill-specific deltas (what evidence base to score from) stay in each skill.

Score each pillar 0, 1, or 2 based on evidence — not assumption. The diagnostic question is the
lens; the anchors decide the number.

**S — Structured**: Does an explicit state schema exist? If the system crashed right now, could
you look at the last saved state and know exactly where it stopped without reading conversation
history?
- 0 = stateless or ad-hoc; no evidence of typed state objects
- 1 = some state management implied but no explicit schema
- 2 = typed state objects with workflow stages documented

**T — Traceable**: Can you pull a trace right now showing every LLM call, input, output, and tool
call for a specific user session from last week?
- 0 = no mention of tracing, logging, or observability
- 1 = general logging present but not LLM-call-level trace replay
- 2 = full trace capability (inputs/outputs/tools/session-level) documented

**A — Auditable**: If a regulator asked today what data was used and the principal factors behind
a specific decision from last month — could you answer in under 30 minutes?
- 0 = no audit capability; decisions are unrecoverable; no compliance story
- 1 = access logs exist but not decision records
- 2 = decision records, explainability, or regulatory compliance documented

**Tol — Tolerant**: If the workflow crashes at step 6 of 10 right now — does it resume from
step 6 or restart from step 1?
- 0 = crash-and-restart; no checkpoint or resume
- 1 = basic retries but no mid-workflow resume
- 2 = explicit checkpoint/resume, idempotency, or distributed lock documented

**E — Explicit**: For every LLM call in this workflow — what is the worst thing it could output,
and what stops that output from becoming a real-world action?
- 0 = LLM outputs directly trigger actions without intermediate gates
- 1 = some content filtering or confidence thresholds mentioned
- 2 = explicit validation gates, human-in-the-loop checkpoints, or output schemas

**Unscored stays NULL.** A pillar the evidence doesn't reach is not scored — a missing score must
never be invented (no silent defaults to 0 or 1).
