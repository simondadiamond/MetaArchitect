import { createRecord, deleteRecord, TABLES } from './airtable.mjs';

const candidates = [
  ['Post Status', 'drafted'],
  ['post status', 'drafted'],
  ['Review Status', 'drafted'],
  ['Stage', 'drafted'],
  ['state', 'drafted'],
  ['approved_at', new Date().toISOString()],
  ['published_at', new Date().toISOString()],
  ['performance_score', 80],
  ['score_source', 'manual'],
];

for (const [key, val] of candidates) {
  try {
    const r = await createRecord(TABLES.POSTS, { draft_content: '__probe__', [key]: val });
    console.log(`✅ "${key}" = valid`);
    await deleteRecord(TABLES.POSTS, r.id);
  } catch (e) {
    const msg = e.message.includes('UNKNOWN_FIELD') ? 'INVALID FIELD'
      : e.message.includes('INVALID_VALUE') ? 'INVALID VALUE (field exists)'
      : e.message.slice(0, 80);
    console.log(`❌ "${key}" = ${msg}`);
  }
}
