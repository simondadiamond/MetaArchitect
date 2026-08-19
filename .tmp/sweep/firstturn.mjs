import { readFileSync } from 'node:fs';
const paths = process.argv.slice(2);
for (const p of paths) {
  let first = '';
  try {
    const lines = readFileSync(p, 'utf8').split('\n');
    for (const l of lines) {
      if (!l) continue;
      let o; try { o = JSON.parse(l); } catch { continue; }
      if (o.type !== 'user') continue;
      const c = o.message?.content;
      let txt = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(x => x.type === 'text').map(x => x.text).join(' ') : '';
      txt = txt.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!txt) continue;
      first = txt.slice(0, 160); break;
    }
  } catch (e) { first = 'ERR ' + e.message; }
  console.log(p.split('/').pop().slice(0,8) + ' | ' + first);
}
