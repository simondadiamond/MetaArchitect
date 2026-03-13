/**
 * Dev utility — fetch ready ideas + library context for /draft agent step
 */
import { getRecords, TABLES } from './airtable.mjs';

const ideas = await getRecords(
  TABLES.IDEAS,
  `AND({Status} = "Ready", {research_completed_at} != "")`,
  [{ field: 'research_completed_at', direction: 'asc' }]
);
console.log('READY IDEAS:', ideas.length);

if (!ideas.length) { console.log('None ready.'); process.exit(0); }

const idea = ideas[0];
const f = idea.fields;
console.log('\nID:', idea.id);
console.log('Topic:', f.Topic);
console.log('Intent:', f.intent);
console.log('research_completed_at:', f.research_completed_at);

const uif = f['Intelligence File'] ? JSON.parse(f['Intelligence File']) : null;
if (uif) {
  console.log('\nANGLES:', uif.angles.length);
  uif.angles.forEach((a, i) => {
    const facts = (a.supporting_facts || []).map(idx => uif.core_knowledge.facts[idx]?.statement?.slice(0,80)).filter(Boolean);
    console.log(`\n  [${i}] ${a.angle_name}`);
    console.log(`      pillar: ${a.pillar_connection}`);
    console.log(`      take: ${a.contrarian_take}`);
    console.log(`      brand_specific: ${a.brand_specific_angle}`);
    console.log(`      facts: ${facts.join(' | ')}`);
  });
  console.log('\nFACTS:');
  uif.core_knowledge.facts.forEach((fact, i) => {
    console.log(`  [${i}] [${fact.source_tier}|verified:${fact.verified}] ${fact.statement.slice(0,120)}`);
  });
  console.log('\nHUMANITY SNIPPETS (in UIF):', uif.humanity_snippets?.length ?? 0);
}

const brief = f.content_brief ? JSON.parse(f.content_brief) : null;
if (brief) {
  console.log('\nBRIEF distribution_platforms:', brief.distribution_platforms);
  console.log('BRIEF intent:', brief.intent);
}

// Fetch frameworks
console.log('\n── FRAMEWORKS ──');
const frameworks = await getRecords(TABLES.FRAMEWORKS, `{status} != "retired"`);
frameworks.forEach(fw => console.log(`  [${fw.id}] ${fw.fields.framework_name} | best_for: ${fw.fields.best_for} | pattern: ${fw.fields.pattern_type}`));

// Fetch hooks
console.log('\n── HOOKS ──');
const hooks = await getRecords(TABLES.HOOKS, `{status} != "retired"`);
hooks.sort((a, b) => {
  const o = { proven: 0, candidate: 1 };
  const sd = (o[a.fields.status] ?? 1) - (o[b.fields.status] ?? 1);
  if (sd !== 0) return sd;
  return (b.fields.avg_score ?? 0) - (a.fields.avg_score ?? 0);
});
hooks.forEach(h => console.log(`  [${h.id}] [${h.fields.hook_type}|${h.fields.intent}|${h.fields.status}] ${h.fields.hook_text?.slice(0,80)}`));

// Fetch snippets
console.log('\n── SNIPPETS ──');
const snippets = await getRecords(TABLES.SNIPPETS, `{status} != "retired"`);
snippets.forEach(s => console.log(`  [${s.id}] tags:"${s.fields.tags}" | ${s.fields.snippet_text?.slice(0,80)}`));
