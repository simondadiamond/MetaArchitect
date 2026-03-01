# Seed Frameworks — Initial framework_library Records

Six framework records to create in Airtable before first `/draft` run.
All start with `status = candidate`, `use_count = 0`, `avg_score = null`.

To seed: create these records manually in Airtable, or use the Airtable API via airtable.md patterns.

---

## Record 1: Before/After Architecture

| Field | Value |
|---|---|
| `framework_name` | Before/After Architecture |
| `pattern_type` | before_after |
| `best_for` | STATE Framework Applied, Defensive Architecture |
| `status` | candidate |
| `use_count` | 0 |
| `avg_score` | (null) |

**`template`**:
Open by naming the broken state: what the system does today and what it costs. Pivot to the specific architectural change. Show the after state with concrete outcomes. Close by naming the principle behind the change.

---

## Record 2: Failure Autopsy

| Field | Value |
|---|---|
| `framework_name` | Failure Autopsy |
| `pattern_type` | problem_solution |
| `best_for` | Production Failure Taxonomy |
| `status` | candidate |
| `use_count` | 0 |
| `avg_score` | (null) |

**`template`**:
Name the failure type and the moment it became visible. Diagnose the root cause (architectural, not model). Show the chain of events that made it inevitable. Prescribe the specific defensive change. Close by naming the failure mode for future reference.

---

## Record 3: The Reframe

| Field | Value |
|---|---|
| `framework_name` | The Reframe |
| `pattern_type` | contrarian |
| `best_for` | Production Failure Taxonomy, STATE Framework Applied |
| `status` | candidate |
| `use_count` | 0 |
| `avg_score` | (null) |

**`template`**:
Open by stating the conventional belief — what everyone thinks is causing the problem. Declare the reframe: the actual cause is different and architectural. Prove it with one specific production example. Land the implication: what this means for how you build.

---

## Record 4: Stat + So What

| Field | Value |
|---|---|
| `framework_name` | Stat + So What |
| `pattern_type` | stat_lead |
| `best_for` | Production Failure Taxonomy, Regulated AI & Law 25 |
| `status` | candidate |
| `use_count` | 0 |
| `avg_score` | (null) |

**`template`**:
Lead with the statistic — specific number, specific context. One sentence on why most people hear this stat and shrug. The architectural implication: what has to be true about your system for this stat not to apply to you.

---

## Record 5: The Meta Play

| Field | Value |
|---|---|
| `framework_name` | The Meta Play |
| `pattern_type` | story_arc |
| `best_for` | The Meta Layer |
| `status` | candidate |
| `use_count` | 0 |
| `avg_score` | (null) |

**`template`**:
Open on the specific moment the system behaved unexpectedly. Name what it revealed about the system-building process. Draw the meta-lesson: what building AI systems teaches you about AI systems. Close with the question this opens for the reader.

---

## Record 6: The 5-Minute Audit

| Field | Value |
|---|---|
| `framework_name` | The 5-Minute Audit |
| `pattern_type` | case_study |
| `best_for` | Defensive Architecture, STATE Framework Applied |
| `status` | candidate |
| `use_count` | 0 |
| `avg_score` | (null) |

**`template`**:
Present the audit prompt: one question that exposes a specific failure mode. Show what a passing system looks like. Show what a failing system looks like (specific, not hypothetical). Name the architectural property that separates them.

---

## Airtable API Seed Script

To create these records via API (uses airtable.md patterns):

```javascript
const frameworks = [
  {
    framework_name: "Before/After Architecture",
    pattern_type: "before_after",
    best_for: "STATE Framework Applied, Defensive Architecture",
    template: "Open by naming the broken state: what the system does today and what it costs. Pivot to the specific architectural change. Show the after state with concrete outcomes. Close by naming the principle behind the change.",
    status: "candidate",
    use_count: 0
  },
  {
    framework_name: "Failure Autopsy",
    pattern_type: "problem_solution",
    best_for: "Production Failure Taxonomy",
    template: "Name the failure type and the moment it became visible. Diagnose the root cause (architectural, not model). Show the chain of events that made it inevitable. Prescribe the specific defensive change. Close by naming the failure mode for future reference.",
    status: "candidate",
    use_count: 0
  },
  {
    framework_name: "The Reframe",
    pattern_type: "contrarian",
    best_for: "Production Failure Taxonomy, STATE Framework Applied",
    template: "Open by stating the conventional belief — what everyone thinks is causing the problem. Declare the reframe: the actual cause is different and architectural. Prove it with one specific production example. Land the implication: what this means for how you build.",
    status: "candidate",
    use_count: 0
  },
  {
    framework_name: "Stat + So What",
    pattern_type: "stat_lead",
    best_for: "Production Failure Taxonomy, Regulated AI & Law 25",
    template: "Lead with the statistic — specific number, specific context. One sentence on why most people hear this stat and shrug. The architectural implication: what has to be true about your system for this stat not to apply to you.",
    status: "candidate",
    use_count: 0
  },
  {
    framework_name: "The Meta Play",
    pattern_type: "story_arc",
    best_for: "The Meta Layer",
    template: "Open on the specific moment the system behaved unexpectedly. Name what it revealed about the system-building process. Draw the meta-lesson: what building AI systems teaches you about AI systems. Close with the question this opens for the reader.",
    status: "candidate",
    use_count: 0
  },
  {
    framework_name: "The 5-Minute Audit",
    pattern_type: "case_study",
    best_for: "Defensive Architecture, STATE Framework Applied",
    template: "Present the audit prompt: one question that exposes a specific failure mode. Show what a passing system looks like. Show what a failing system looks like (specific, not hypothetical). Name the architectural property that separates them.",
    status: "candidate",
    use_count: 0
  }
];

for (const f of frameworks) {
  await createRecord(process.env.AIRTABLE_TABLE_FRAMEWORKS, f);
  console.log(`Created: ${f.framework_name}`);
}
```
