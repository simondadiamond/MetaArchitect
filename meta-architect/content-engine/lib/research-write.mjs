/**
 * /research — validate UIF v3.0 and write to Airtable.
 * Also logs the uif_compiler step and sets research_completed_at.
 * Args: workflowId ideaId q1LogId q2LogId q3LogId
 */
import { patchRecord, createRecord, TABLES } from './airtable.mjs';

const [workflowId, ideaId, q1LogId, q2LogId, q3LogId] = process.argv.slice(2);
if (!workflowId || !ideaId) throw new Error("Usage: node research-write.mjs <workflowId> <ideaId> <q1LogId> <q2LogId> <q3LogId>");

// ─── UIF v3.0 (compiled by UIF Compiler above) ─────────────────────────────
const uif = {
  "meta": {
    "topic": "The meta-skill of knowing what to ask: why question architecture determines AI productivity, not model quality",
    "research_date": "2026-02-28",
    "provenance_log": [q1LogId, q2LogId, q3LogId].join(","),
    "strategic_intent": "Pin-worthy origin story post establishing The Meta Architect brand through a personal narrative that demonstrates the Meta Layer pillar live — every subsequent post points back to this"
  },
  "core_knowledge": {
    "facts": [
      {
        "statement": "Developers with 6+ years of experience showed measurable productivity gains (commit rate increases) with AI tools; developers with less experience showed no gain — the multiplier is the expertise practitioners bring to the question, not the tool itself.",
        "source_url": "https://www.science.org/doi/10.1126/science.aef5239",
        "credibility": "high",
        "context": "Published in Science journal. The experience threshold is the key finding: AI amplifies what you already know about your problem domain. Those who lack domain expertise cannot use AI to compensate."
      },
      {
        "statement": "In a 2025-2026 METR RCT (n=16 experienced open-source developers), AI tools increased task completion time by 19% — the opposite of the 24% speedup developers predicted. Experienced practitioners slow down when the problem is not clearly framed before engaging AI.",
        "source_url": "https://metr.org/blog/2026-02-24-uplift-update/",
        "credibility": "medium",
        "context": "Research org study, small sample (n=16), not yet peer-reviewed. The perception-reality gap is the key finding: even experienced developers overestimate AI's benefit by ~40% when engaging AI without a clear problem frame."
      },
      {
        "statement": "Practitioners who use AI most effectively treat it as a cognitive mirror — using it to refine the problem frame before prompting, not as an answer engine for pre-formed questions.",
        "source_url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12653222/",
        "credibility": "high",
        "context": "PubMed Central peer-reviewed study on metacognition and AI effectiveness. Practitioners who reflect on what they are asking — and why — consistently outperform reactive prompters."
      },
      {
        "statement": "Studies of AI impact on cognitive performance show outcomes depend critically on whether practitioners apply metacognitive strategies before prompting: those who decompose and frame the problem first consistently outperform reactive prompters.",
        "source_url": "https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1697554/full",
        "credibility": "high",
        "context": "Frontiers in Education peer-reviewed study. The structural intervention — framing the problem architecture before engaging AI — is the differentiator, not the prompt itself."
      },
      {
        "statement": "Context engineering — managing full interaction contexts including workflow patterns, governance rules, and stakeholder-specific formats — is emerging as the successor practice to prompt engineering for production AI teams.",
        "source_url": "https://www.edstellar.com/blog/prompt-engineer-skills",
        "credibility": "low",
        "context": "Industry blog, not peer-reviewed. Concept is consistent with practitioner consensus but this source is a secondary blog. Do not cite in published content without finding a primary source."
      }
    ]
  },
  "angles": [
    {
      "angle_name": "AI widens the skill gap — it doesn't close it",
      "contrarian_take": "Everyone assumed AI tools would democratize expertise. The data says the opposite. Junior developers get zero productivity lift. Experienced developers only get gains when they already understand what they're building. The model isn't the variable. Your ability to frame the problem is.",
      "pillar_connection": "The Meta Layer — demonstrates the meta layer thesis that AI amplifies what you bring to the question, not the question itself. Shows why practitioners thinking upstream of prompting extract real leverage while others get noise.",
      "brand_specific_angle": false,
      "target_persona": "LLMOps Engineer who has watched junior team members adopt AI tools with no measurable improvement and is trying to understand why",
      "supporting_facts": [0, 1]
    },
    {
      "angle_name": "Even experienced engineers slow down when they don't know what they're building",
      "contrarian_take": "The METR study is a gut punch. Experienced developers with full access to Claude and Cursor took 19% longer than without AI — while predicting a 24% speedup. They overestimated their own clarity. The bottleneck wasn't the model. It was the absence of a clear problem frame going in. This is the S in STATE: structure the problem before anything else.",
      "pillar_connection": "STATE Framework Applied — the S in STATE is Structured: explicit problem schema before any work begins. The METR finding is a live example of what happens when experienced practitioners skip structured problem framing and go straight to prompting. STATE as architecture, demonstrated through research data.",
      "brand_specific_angle": true,
      "target_persona": "Senior AI practitioner who has felt the drag of AI tooling on a complex task and attributed it to the model when the actual issue was undefined problem architecture",
      "supporting_facts": [1, 2, 3]
    },
    {
      "angle_name": "The Meta Architect origin: I asked an AI what question I should be asking",
      "contrarian_take": "I didn't know what I wanted to build. So instead of prompting for an answer, I asked an AI what question I should be asking first. The answer became the brand name, the thesis, and the entire positioning. The meta skill isn't prompting. It's knowing what to ask before you open the chat window.",
      "pillar_connection": "The Meta Layer — this is the meta layer pillar demonstrated live as an origin story. Simon used AI to architect the question, not just answer it. This post exists to make that pillar concrete through personal narrative that establishes the brand's founding principle.",
      "brand_specific_angle": true,
      "target_persona": "Technical practitioner who uses AI daily but hasn't used it to clarify what they should be building — using a reasoning engine as a search engine",
      "supporting_facts": [2, 0]
    },
    {
      "angle_name": "The skill that replaces prompt engineering is problem architecture",
      "contrarian_take": "Prompt engineering is fading because better models make individual prompts less sensitive. What replaces it isn't context engineering — it's problem architecture. The practitioners still ahead in three years will be those who learned to frame the problem upstream of the chat window, not those who got better at crafting prompts.",
      "pillar_connection": "Defensive Architecture — problem framing before AI engagement is a defensive architectural discipline that reduces LLM failure rates by construction, analogous to the validation gates and state schemas that make agent systems reliable.",
      "brand_specific_angle": false,
      "target_persona": "Senior AI practitioner hitting diminishing returns from prompt optimization who suspects the leverage is upstream but hasn't articulated where",
      "supporting_facts": [3, 4, 0]
    }
  ],
  "humanity_snippets": [
    {
      "suggested_tags": ["origin-story", "brand-building", "meta-layer", "question-framing"],
      "relevance_note": "Angle 3 (the origin story) requires the specific moment Simon asked an AI what question to ask and the answer that emerged — without this lived detail the hook reads as generic and the post loses its pin-worthy quality."
    },
    {
      "suggested_tags": ["production-incident", "debugging", "ai-tools", "problem-unclear", "wasted-time"],
      "relevance_note": "Angle 2 (experienced engineers slow down) lands harder with a specific moment: a time Simon engaged AI on a vague problem and ended up slower — the 'I blamed the model but the problem was my problem frame' realization."
    }
  ],
  "distribution_formats": {
    "linkedin_post": [
      "I didn't know what I wanted to build. So I asked an AI what question I should be asking.",
      "Experienced developers with AI tools took 19% longer on tasks they didn't understand. That's not a model problem.",
      "The METR study found experienced engineers slowed down with AI. The Science journal found juniors got zero lift. Both failures have the same root cause.",
      "Most people use AI to get answers. The leverage is one layer up."
    ],
    "twitter_thread": [
      "Experienced devs with AI tools took 19% longer. Juniors got zero lift. The model isn't the variable.",
      "I asked an AI what question I should be asking. The answer became my brand.",
      "Prompt engineering is fading. What replaces it isn't better prompts. It's problem architecture."
    ],
    "youtube_angle": "Why experienced developers slow down with AI tools — and what the METR and Science journal data reveal about where the actual leverage is: the question architecture, not the prompt."
  }
};

// ─── Validate ────────────────────────────────────────────────────────────────
const validPillars = [
  "Production Failure Taxonomy", "STATE Framework Applied",
  "Defensive Architecture", "The Meta Layer", "Regulated AI & Law 25"
];
const errors = [];

if (!uif.meta?.topic) errors.push("meta.topic missing");
if (!uif.meta?.research_date) errors.push("meta.research_date missing");
if (!uif.meta?.provenance_log) errors.push("meta.provenance_log missing");
if (!Array.isArray(uif.core_knowledge?.facts) || uif.core_knowledge.facts.length < 1) errors.push("facts missing");
uif.core_knowledge?.facts?.forEach((f, i) => {
  if (!f.statement) errors.push(`facts[${i}].statement empty`);
  if (!f.source_url) errors.push(`facts[${i}].source_url empty`);
});
if (!Array.isArray(uif.angles) || uif.angles.length < 1) errors.push("angles missing");
let hasBrandSpecific = false;
uif.angles?.forEach((a, i) => {
  if (!a.angle_name) errors.push(`angles[${i}].angle_name empty`);
  if (!a.contrarian_take) errors.push(`angles[${i}].contrarian_take empty`);
  if (!a.pillar_connection) errors.push(`angles[${i}].pillar_connection missing`);
  else if (!validPillars.find(p => a.pillar_connection.includes(p))) errors.push(`angles[${i}].pillar_connection doesn't name a valid pillar`);
  if (typeof a.brand_specific_angle !== "boolean") errors.push(`angles[${i}].brand_specific_angle not boolean`);
  if (a.brand_specific_angle === true) hasBrandSpecific = true;
  if (Array.isArray(a.supporting_facts)) {
    const maxIdx = uif.core_knowledge.facts.length - 1;
    a.supporting_facts.forEach((idx, j) => {
      if (!Number.isInteger(idx) || idx < 0 || idx > maxIdx)
        errors.push(`angles[${i}].supporting_facts[${j}]=${idx} out of bounds`);
    });
  }
});
if (!hasBrandSpecific) errors.push("No angle has brand_specific_angle=true");
if (!Array.isArray(uif.humanity_snippets)) errors.push("humanity_snippets missing");
uif.humanity_snippets?.forEach((s, i) => {
  if (!Array.isArray(s.suggested_tags)) errors.push(`humanity_snippets[${i}].suggested_tags not array`);
  if (!s.relevance_note) errors.push(`humanity_snippets[${i}].relevance_note empty`);
});

if (errors.length > 0) {
  // UIF invalid — clear lock and fail
  await patchRecord(TABLES.IDEAS, ideaId, {
    research_started_at: null,
    Status: "Research_failed",
  });
  await createRecord(TABLES.LOGS, {
    workflow_id: workflowId, entity_id: ideaId,
    step_name: "error", stage: "uif_validation",
    timestamp: new Date().toISOString(),
    output_summary: `UIF validation failed: ${errors.join("; ")}`,
    model_version: "n/a", status: "error"
  });
  console.error("UIF VALIDATION FAILED:\n" + errors.join("\n"));
  process.exit(1);
}

console.error("UIF validation passed.");

// ─── Write to Airtable ───────────────────────────────────────────────────────
try {
  const now = new Date().toISOString();

  const uifLog = await createRecord(TABLES.LOGS, {
    workflow_id: workflowId,
    entity_id: ideaId,
    step_name: "uif_compiler",
    stage: "uif_compiler",
    timestamp: now,
    output_summary: `UIF compiled: ${uif.angles.length} angles, ${uif.core_knowledge.facts.length} facts, ${uif.humanity_snippets.length} snippet entries. brand_specific: ${uif.angles.filter(a=>a.brand_specific_angle).length} angle(s).`,
    model_version: "claude-sonnet-4-6",
    status: "success"
  });
  console.error("uif_compiler logged:", uifLog.id);

  await patchRecord(TABLES.IDEAS, ideaId, {
    "Intelligence File": JSON.stringify(uif),
    research_completed_at: now,
    Status: "Ready",
  });
  console.error("intelligence_file written, Status=Ready.");

  await createRecord(TABLES.LOGS, {
    workflow_id: workflowId, entity_id: ideaId,
    step_name: "complete", stage: "complete",
    timestamp: now,
    output_summary: `Research complete: ${uif.meta.topic} — ${uif.angles.length} angles, ${uif.core_knowledge.facts.length} facts`,
    model_version: "n/a", status: "success"
  });

  console.log(JSON.stringify({ success: true, uifLogId: uifLog.id, anglesCount: uif.angles.length, factsCount: uif.core_knowledge.facts.length }));

} catch (err) {
  // Clear lock and mark failed so the run is retryable
  await patchRecord(TABLES.IDEAS, ideaId, {
    research_started_at: null,
    Status: "Research_failed",
  });
  await createRecord(TABLES.LOGS, {
    workflow_id: workflowId, entity_id: ideaId,
    step_name: "error", stage: "writing",
    timestamp: new Date().toISOString(),
    output_summary: `Write failed: ${err.message}`,
    model_version: "n/a", status: "error"
  });
  console.error(`❌ Research failed at writing — ${err.message} — lock reset, safe to retry`);
  process.exit(1);
}
