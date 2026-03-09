/**
 * /research — init script
 * Fetches brand context and oldest selected idea. Does NOT lock yet.
 * Output: JSON with brand fields + idea record.
 */
import { getRecords, TABLES } from './airtable.mjs';

const brands = await getRecords(TABLES.BRAND, null);
const brand = brands[0] ?? null;
if (!brand) throw new Error("No brand record found in AIRTABLE_TABLE_BRAND");

// Try Status = "selected" (pipeline canonical) and also show all statuses for visibility
const selectedIdeas = await getRecords(
  TABLES.IDEAS,
  `AND({Status} = "selected", {research_started_at} = "")`,
  [{ field: "captured_at", direction: "asc" }]
);

// Fallback: show all ideas with statuses if nothing found
if (selectedIdeas.length === 0) {
  const all = await getRecords(TABLES.IDEAS, null);
  console.error("NO_SELECTED_IDEAS");
  console.error(JSON.stringify(all.map(r => ({
    id: r.id,
    topic: r.fields?.Topic ?? r.fields?.title,
    status: r.fields?.Status ?? r.fields?.status,
    research_started_at: r.fields?.research_started_at ?? null,
    has_content_brief: !!r.fields?.content_brief
  })), null, 2));
  process.exit(1);
}

const idea = selectedIdeas[0];

console.log(JSON.stringify({
  brand: {
    id: brand.id,
    main_guidelines: brand.fields?.main_guidelines ?? brand.fields?.["Main Guidelines"] ?? null,
    goals: brand.fields?.goals ?? brand.fields?.Goals ?? null,
    icp_short: brand.fields?.icp_short ?? brand.fields?.["ICP Short"] ?? null,
  },
  idea: {
    id: idea.id,
    topic: idea.fields?.Topic ?? idea.fields?.title,
    status: idea.fields?.Status ?? idea.fields?.status,
    intent: idea.fields?.intent,
    content_brief: idea.fields?.content_brief ?? null,
    research_started_at: idea.fields?.research_started_at ?? null,
  }
}, null, 2));
