/**
 * /research — execute 3 Perplexity queries and log each to LOGS table.
 * Args: workflowId ideaId
 */
import { createRecord, TABLES } from './airtable.mjs';

const [workflowId, ideaId] = process.argv.slice(2);
if (!workflowId || !ideaId) throw new Error("Usage: node research-perplexity.mjs <workflowId> <ideaId>");

const queries = [
  "senior engineers developers meta-cognition problem framing AI tools leverage 2024 2025 practitioner accounts case studies",
  "AI productivity gains experienced vs junior developers skill level differential 2025 research data",
  "what skill succeeds prompt engineering 2025 context engineering problem formulation LLMOps practitioners evolution"
];

async function callPerplexity(query) {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: query }]
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(`Perplexity error: ${JSON.stringify(data.error)}`);
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    citations: data.citations ?? []
  };
}

const results = [];
for (let i = 0; i < queries.length; i++) {
  const qNum = i + 1;
  process.stderr.write(`Calling Perplexity Q${qNum}...\n`);
  const r = await callPerplexity(queries[i]);
  const log = await createRecord(TABLES.LOGS, {
    workflow_id: workflowId,
    entity_id: ideaId,
    step_name: `perplexity_q${qNum}`,
    stage: "researching",
    timestamp: new Date().toISOString(),
    output_summary: `Q${qNum}: ${r.content.slice(0, 300)}... Citations: ${r.citations.length}`,
    model_version: "sonar-pro",
    status: "success"
  });
  process.stderr.write(`Q${qNum} done — ${r.citations.length} citations, logId: ${log.id}\n`);
  results.push({ logId: log.id, content: r.content, citations: r.citations });
}

console.log(JSON.stringify(results, null, 2));
