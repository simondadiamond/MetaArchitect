# Interview Guides — Production AI Audit

> Question tracks for the 3–5 engineer interviews (45 min each). The interviews exist to gather evidence for `state-scoring-rubric.md` — every answer is an evidence pointer or it's chatter.
> Part of the Production AI Audit kit — prices per `../pricing-pinned.md`.

---

## How to use these guides

- **Three tracks, one per role.** Book at minimum: the builder, the on-call engineer, the platform/compliance-adjacent lead. If the team is bigger, add a second on-call — the divergence test (Track B) gets stronger with each independent answer.
- **Interview order matters:** Builder first (they know where the bodies are), on-call second (they know which bodies smell), compliance lead last (by then you know which regulatory questions have teeth).
- **You're scoring the rubric, not filling a transcript.** Each question carries a `[Tell: ...]` — the answer shape that signals a state failure. When you hear a tell, probe it until you have an evidence pointer (file, trace ID, table name, or a verbatim quote you can corroborate later). Rubric rule 3: an uncorroborated interview claim caps the pillar at 1.
- **Live tests are embedded** where they naturally run in conversation. They're marked ▶ LIVE TEST with the rubric section they feed. A failed live test caps the pillar at 1 (rubric rule 4).
- 45 minutes is tight. The pillar questions are ordered by evidence value — if you're running long, cut from the bottom of each pillar block, never the live tests.

---

## Interview hygiene (read before every interview)

1. Ask recording consent on the call, before anything else. No consent = notes only, and say so out loud: "No recording then — I'll take notes."
2. Notes format: every claim gets a pointer slot — `[claim] → [where I can verify: file / trace / table / "quote-only"]`. Quote-only claims go on the corroboration list for the codebase/telemetry review.
3. Verbatim quotes: ask in the moment — "Can I use that line, anonymized, in the findings doc?" Mark permission in the notes: `[V]` verbatim-ok, `[P]` paraphrase-only.
4. Quotes are anonymized by default in the findings doc. Role, never name. Say this in the opening framing — it changes what people tell you.
5. Never coach mid-interview. "You should add a lock there" costs you the evidence and moves the score mid-engagement (rubric calibration note: score at evidence-collection time). Write the fix in your notes; it belongs in the roadmap.
6. Never react to a bad answer. "Interesting" is the strongest word you're allowed. The moment they feel judged, the tells dry up.
7. When two interviews conflict, that's not noise — it's evidence (usually for Tolerant or Structured). Record both versions with attribution by role.
8. Time-box live tests visibly: "I'm going to time this — it's part of the method, not a trick." Clock in the notes: `[T live test: 14 min — FAIL >10]`.
9. Close every interview with: "What did I not ask about that I should have?" The last five minutes routinely produce the best finding in the doc.
10. Same-day write-up, no exceptions. Tells decay overnight.

---

## Track A — The engineer who built it

*Target: the person (or lead) who architected the scored workflow. Usually the most defensive interview and the richest one.*

### Opening framing (say this, roughly)

> "This isn't a review of you or your code quality. I audit the system-level properties — what survives a crash, what's reconstructable after the fact — and honestly, the gaps I find are almost always organizational: nobody was ever given time to build the boring parts. Findings are reported at the system level, quotes are anonymized by default, and nothing you say gets attributed to you by name. The more candid you are about what's held together with tape, the more useful the roadmap is to your team — you're the one who'll benefit from the backlog this produces."

Then: "Walk me through the workflow end to end, trigger to effect, in five minutes. I'll interrupt a lot."

### S — Structured

1. **"Where does the workflow's position live while a run is in flight? Show me the schema."**
   [Tell: "It's in the agent's context" / "the framework handles it" = position lives in the prompt window → S=0 territory. "There's a status column" → probe whether code enforces the shape and whether status matches reality.]
2. **"When a run finishes step 3, what exactly gets written, and by which code path? Is there more than one code path that writes that state?"**
   [Tell: hesitation, or "well, there's also the quick-fix path..." = two shapes to one column — the rubric's classic S=1. Get the file paths of both writers.]
3. **"What happens to in-flight runs on deploy?"**
   [Tell: "we deploy when nothing's running" / "we try to drain first" = restart means start over → state isn't load-bearing. "They pick up where they were" → ask how, get the mechanism.]
4. ▶ **LIVE TEST (rubric §S):** "Pick a run that's mid-flight right now — or the most recent crashed one. Using only persisted state — no transcript, no logs — tell me which step it stopped at and what it had produced. I'm timing."
   [Pass fast and specific = supports S=2–3. Any detour into logs or chat history = the state doesn't answer the question → cap at 1.]

### T — Traceable

5. **"When a run misbehaves, what do you personally open first?"**
   [Tell: "the app logs and grep" = uncorrelated fragments → T≤1. A tracing tool by name → probe: every call? tool calls? model version recorded? the batch path too?]
6. **"Is there one ID that ties together every LLM call and tool call of a single execution?"**
   [Tell: "you can usually line them up by timestamp" = no correlation ID → T=1 ceiling. Yes → ask for the field name and where it's minted; that's your evidence pointer.]
7. **"Which parts of the workflow produce no trace at all?"**
   [Tell: "none, everything's traced" answered instantly = suspicious — nobody knows their dark paths that confidently; schedule the T live test (Track B) against their claim. A named dark path = honest, and a named gap for the findings doc.]

### A — Auditable *(skip if pillar is N/A per rubric rule 5 — confirm no personal data / no individual decisions first: "Does anything in this workflow read personal data or end in an outcome for a specific person?")*

8. **"Which outputs of this workflow are automated decisions in the legal sense — Law 25's sense? Has anyone written that list down?"**
   [Tell: "that's more of a legal question" = engineering has never seen the inventory → the inventory probably doesn't exist. Its absence is itself a finding (rubric §A evidence sources).]
9. **"For a specific decision made last month — could you tell me which prompt version ran? Where is the prompt versioned?"**
   [Tell: "the prompt's in the code, so... git?" = version pinned to the codebase, not the decision → A≤1. Decision records with model+prompt version = A=2 territory; ask to see one.]

### Tol — Tolerant

10. ▶ **LIVE TEST, part 1 of 2 (rubric §Tol, paper form):** "It crashes at step 6 of 10 — mid-write, worst moment. Walk me through exactly what happens next, step by step: what's in the data, who notices, what runs on restart."
    [Record the answer verbatim — you will ask the on-call engineer the identical question in Track B. Divergent answers = fail. Tell within this answer: "you'd just re-run it" → "and the work from steps 1–5?" — "it redoes it" = no resume; "it double-writes unless..." = idempotency by luck.]
11. **"Show me what a stuck run looks like in the data. Who un-sticks it, and how often?"**
    [Tell: "there's a script Marc runs" / "I reset the rows by hand most weeks" = the weekly un-wedging ritual, rubric's Tol=1 anchor — and a heroic-engineer flag (calibration note: property carried by one head caps at 1).]
12. **"Has anyone ever actually killed it mid-run on purpose to watch the recovery?"**
    [Tell: "no, but it should be fine" = reboot test never executed — rubric names this exact gap as the 2-vs-3 line. "Yes" → when, where's the record, is it repeated or a one-time stunt?]

### E — Explicit

13. ▶ **LIVE TEST (rubric §E, the boundary walk):** "Enumerate every point where LLM output becomes a write or an action. Take your time — I want the full list."
    [No enumeration possible = fail, cap at 1. If they produce a list: for each boundary — "what's the worst thing the model could emit here, and what stops it?" Then pick one and ask to be shown the actual validation code (screen-share or file path for later). Tell: "the model's pretty reliable on that one" = nothing stops it.]
14. **"When output fails validation, what happens — every time, on every boundary?"**
    [Tell: "depends on the call" = inconsistent handling → E=1 anchor verbatim. "Dead-letter + alert" → ask when that alert last fired and who saw it.]
15. **"Would schema-valid nonsense get through? A well-formed policy number that doesn't exist?"**
    [Tell: a pause, then "...yes" = gates check shape, not content — the rubric's named E 2-vs-3 gap. Write it down with the boundary name.]

### Remediation appetite (last 5 minutes — feeds the retainer conversation)

16. **"If you got two uninterrupted weeks to fix anything in this system, what would you fix first — and what's stopped that from happening already?"**
    [Listens for: is the blocker knowledge, or headcount/priority? "We know exactly what to do, no one gets the time" = execution-capacity gap → fractional-retainer shaped. "We're not sure what right looks like" = expertise gap → also retainer-shaped, different pitch.]
17. **"When this findings doc lands with a 90-day roadmap — who inside the team actually has bandwidth to execute it?"**
    [Silence or a laugh here is the single strongest retainer signal you will collect all engagement. Note it verbatim.]

---

## Track B — The on-call / support-adjacent engineer

*Target: whoever gets paged, watches the queue, or fields "the AI did something weird" tickets. They hold the ground truth the builder's mental model has drifted from.*

### Opening framing (say this, roughly)

> "You have the most honest view in the building — you see what the system actually does at 2am, not what the architecture diagram says. Nothing here is a performance review and nothing gets attributed to you by name; findings are system-level and quotes are anonymized by default. War stories are exactly what I'm here for. The worse the story, the better the roadmap your team gets out of this."

Then start with the question that opens everything:

### The incident walk (feeds T, S, Tol at once)

1. **"Walk me through the last time it broke. Who noticed first?"**
   [Tell: "a user told us" / "someone in the business Slack" = no detection, failure absorbed downstream → T gap (traces written but not watched, or absent). "We saw the alert" → probe: which alert, alerting on what signal, who owns it? "It didn't page — I just check the queue every morning" = human polling standing in for observability.]
2. **"In that incident — how long from 'something's wrong' to 'we know which step and which call'?"**
   [Tell: hours, or "we never fully figured it out; the model did something weird" = the blind-debugging failure mode verbatim → T≤1. Minutes with a trace open = T=2+; get the trace tooling and an example trace ID.]
3. **"How much of that run's work had to be redone by hand?"**
   [Tell: "we re-ran the whole thing and deleted the duplicates" = Tol=0 anchor, word for word. Capture as verbatim quote candidate — this is the kind of line that carries a findings chapter.]

### T — Traceable

4. ▶ **LIVE TEST (rubric §T):** "Let's pick an execution from last week — I'll pick one from your volume, not you. Show me the complete trace: every LLM call, every tool call, inputs, outputs, model version. I'm timing — this is the method, not a trap."
   [Under 10 minutes = pass. An afternoon-of-grep answer = T=1 no matter what tooling is installed (calibration note: "they have Langfuse" is not a T score). Record elapsed time in the notes.]
5. **"When a trace is missing or half-empty — how do you find out?"**
   [Tell: "when I go looking and it's not there" = trace completeness unmonitored → the T 2-vs-3 line. An alert on dark paths = rare, verify it.]

### S — Structured

6. **"When you get paged, how do you find out where the run is in the process?"**
   [Tell: "I read the conversation / the logs from the top" = position not persisted → S≤1. "I look at the state row" → good: "does the status field ever lie to you?"]
7. **"Any rows sitting in 'processing' right now for runs that are actually dead?"**
   [Tell: a knowing laugh = the persisted position lies → S=1 anchor. Ask to see one — screenshot or row ID is your evidence pointer.]

### Tol — Tolerant

8. ▶ **LIVE TEST, part 2 of 2 (rubric §Tol — divergence test):** "It crashes at step 6 of 10, mid-write. Walk me through exactly what happens next." *Ask cold — do not mention you asked the builder.*
   [Score the divergence, not just the answer: builder says "it resumes from the checkpoint," on-call says "I reset the lock column and re-run it" = fail, and the delta itself goes in the findings doc — the system's recovery story lives in individual heads, not in the system.]
9. **"What's the most annoying recurring un-sticking ritual in your week?"**
   [Tell: any ritual named without hesitation = Tol=1 anchor (the weekly un-wedging). Get frequency and minutes-per-week — that number goes straight into the findings doc's blast-radius line.]
10. **"If you're on vacation, who does that ritual?"
    [Tell: "...good question" = heroic-engineer cap, rubric calibration note. Property held by one head scores ad-hoc.]

### E — Explicit

11. **"What's the worst garbage you've personally seen the model emit — and how far did it get before something stopped it?"**
    [Tell: "it made it to the customer / into the database" = boundary unguarded, and you now have the concrete scenario for a named risk. "The parser died and the pipeline said success" = the silent-swallow anchor, E=0 territory.]
12. **"When validation rejects something, do you hear about it — or does it just quietly retry?"**
    [Tell: "I don't think I've ever seen a validation alert" against a builder claim of gated boundaries = corroboration failure; the gate may exist but the error path is dark.]

### A — Auditable *(one question — on-call rarely owns this, but they know the truth about retrieval)*

13. **"Has anyone — legal, a customer, an auditor — ever asked you to reconstruct why the system did something to a specific person? How did that go?"**
    [Tell: "legal asked us that once and it took two weeks" = A=1 anchor verbatim. Capture the story; it's the opening paragraph of the Auditable section.]

### Remediation appetite (last 5 minutes)

14. **"What's the fix you've been asking for that never gets prioritized?"**
    [The answer is usually a quick-win candidate for the roadmap's first 30 days — and evidence that the backlog exists but capacity doesn't.]
15. **"If an outside engineer showed up one day a week just to burn down reliability debt — what would you hand them in week one?"**
    [A concrete answer = the retainer scoped in the client's own words. Quote it back at the readout.]

---

## Track C — The platform / compliance-adjacent lead

*Target: platform lead, engineering manager, or whoever fields risk/legal's questions. Often the audit's sponsor. They own the gap between what engineering built and what the org must be able to answer.*

### Opening framing (say this, roughly)

> "This conversation is about what the organization can answer, not what any individual did. I've already talked to the engineers about how it's built — with you I care about the questions that arrive from outside: regulators, risk, legal, customers. Findings are system-level, quotes anonymized by default. The useful outcome for you is a defensible written answer to 'are we exposed?' — with evidence, not vibes."

### A — Auditable (their home turf — spend half the interview here)

1. **"Does an inventory exist of which outputs of this workflow are automated decisions in Law 25's sense? Who owns it?"**
   [Tell: "we'd have to pull legal in" = no inventory, no owner → A≤1, and the absence is a documented finding. An inventory produced on screen = ask when it was last updated and against what.]
2. ▶ **LIVE TEST (rubric §A, the 30-minute drill):** "Pick one real automated decision that affected an individual — a triaged claim, a flagged transaction, a generated recommendation. Starting now: what personal data was used, what were the principal factors, what model and prompt version ran, and who reviews it if the person asks? You have 30 minutes and any system you want."
   [Run it for real if access allows; if it can't be run, mark "untested — score provisional" per rubric rule 4 and say so in the findings doc. Tell during the drill: answers assembled from memory rather than records = the exact exposure Law 25 §12.1 creates.]
3. **"Law 25 gives individuals the right to submit observations for human review of an automated decision. Where does that request land today, and what's the procedure?"**
   [Tell: "it would come through support, I guess" = route designed nowhere → the named A=2 gap at best. A written runbook with a named owner = A=3 territory; ask to see it.]
4. **"What's the retention policy on decision-relevant records — and does it survive your incident cycle and a regulator's look-back window?"**
   [Tell: "whatever the logging default is" = retention by accident. Get the number; compare against their own incident history from Track B.]
5. **"Penalties under Law 25 run to C$10M or 2% of global revenue administrative, C$25M or 4% penal. Whose name is on the answer if the CAI asks about this workflow?"**
   [Tell: no named owner = the finding writes itself. This question also calibrates how seriously the org takes the exposure — watch whether they flinch or shrug; both go in your notes.]

### T — Traceable (governance angle)

6. **"When an incident post-mortem happens, does it end with a root cause — or with 'the model did something weird'?"**
   [Tell: the latter, verbatim from their own mouth = blind-debugging culture confirmed at management level, corroborating Track B.]
7. **"Who actually looks at traces in a normal week — and would anyone be alerted if a whole path stopped producing them?"**
   [Tell: "the engineers, when something breaks" = traces written, not watched → T=2 ceiling. Nobody = tooling theater.]

### S / Tol — the management view (two questions, corroboration only)

8. **"If the engineer who built this left tomorrow, what breaks first?"**
   [Tell: a specific name and a specific fear = heroic-engineer confirmation across pillars; caps whatever that person carries at ad-hoc. "Nothing, it's documented and tested" → cross-check against Tracks A/B before believing it.]
9. **"How much re-work after failures is the team quietly absorbing? Would it show up anywhere if it doubled?"**
   [Tell: "it wouldn't show up anywhere" = failure cost invisible to management → supports both the Tol finding and the exec-summary framing.]

### E — Explicit (one question, exposure framing)

10. **"What's the worst thing this workflow could do to a customer before a human noticed? Has anyone written that scenario down?"**
    [Tell: scenario never enumerated at leadership level = the boundary walk's absence has an organizational twin. If Track A's boundary walk also failed, this becomes a named risk with management's own words as the scenario.]

### Remediation appetite (last 10 minutes — this track decides the retainer)

11. **"When the findings doc lands with a prioritized 90-day roadmap — what happens to it? Who owns execution, and what's their current load?"**
    [Tell: "we'll fit it into the sprint" with no named owner = the roadmap dies in the backlog, and they usually know it. Follow with silence; let them say it.]
12. **"Would you rather build this capability in-house over two quarters, or buy a day a week of someone who's done it until your team runs it themselves?"**
    [Ask it exactly this plainly. The answer scopes the readout's final slide: quarterly check-ins vs. the fractional retainer (day-block framing, prices per `../pricing-pinned.md` — never quoted in the interview itself; the pitch belongs at audit delivery, not here).]
