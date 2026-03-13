import { getRecords, TABLES } from './tools/airtable.mjs';

const snippets = await getRecords(TABLES.SNIPPETS, '{status} = "active"');

console.log('Found', snippets.length, 'active snippets:\n');
snippets.forEach((s, i) => {
  console.log(`[${i+1}] ${s.fields.snippet_text}`);
  console.log(`    Tags: ${s.fields.tags?.join(', ') || '(none)'}`);
  console.log(`    ID: ${s.id}`);
  console.log('');
});
