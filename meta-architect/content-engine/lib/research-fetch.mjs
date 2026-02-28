/**
 * /research — fetch + clear lock for re-research run.
 * One-time override: targets Status = "New" (normally "selected").
 */
import { getRecords, patchRecord, TABLES } from './airtable.mjs';

// Brand context
const brands = await getRecords(TABLES.BRAND, null);
const brand = brands[0];
if (!brand) throw new Error("No brand record found");

// Target: oldest idea with a content_brief and Status = "New"
const ideas = await getRecords(TABLES.IDEAS, `AND({Status} = "New", {content_brief} != "")`, []);
if (ideas.length === 0) throw new Error("No ideas with Status=New and content_brief found");
const idea = ideas[0];

// Clear lock so pipeline can proceed
await patchRecord(TABLES.IDEAS, idea.id, {
  research_started_at: null
});

console.log(JSON.stringify({
  brand: {
    id: brand.id,
    main_guidelines: brand.fields?.main_guidelines ?? null,
    goals: brand.fields?.goals ?? null,
    icp_short: brand.fields?.icp_short ?? null,
  },
  idea: {
    id: idea.id,
    topic: idea.fields?.Topic,
    intent: idea.fields?.intent ?? null,
    content_brief: idea.fields?.content_brief,
  }
}, null, 2));
