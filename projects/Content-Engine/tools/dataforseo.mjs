// tools/dataforseo.mjs — keyword search volumes via DataForSEO (Basic auth from .env).
// Contract: NEVER throws — pipeline degrades to "unverified" on any failure.
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Walk up from this script to find .env (Content-Engine root).
{
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const p = resolve(dir, '.env');
    if (existsSync(p)) { config({ path: p, quiet: true }); break; }
    dir = resolve(dir, '..');
  }
}

export async function keywordVolumes(keywords, { locationCode = 2124, languageCode = 'en' } = {}) {
  const login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return { ok: false, error: 'DATAFORSEO_LOGIN/PASSWORD not set' };
  try {
    const res = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ keywords, location_code: locationCode, language_code: languageCode }]),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    const items = json?.tasks?.[0]?.result ?? [];
    const volumes = Object.fromEntries(keywords.map(k => [k, null]));
    for (const it of items) if (it?.keyword in volumes) volumes[it.keyword] = it.search_volume ?? null;
    return { ok: true, volumes };
  } catch (e) { return { ok: false, error: String(e?.message ?? e) }; }
}

if (process.argv[1]?.endsWith('dataforseo.mjs')) {
  const kws = process.argv.slice(2);
  if (!kws.length) { console.error('usage: node tools/dataforseo.mjs <keyword> [...]'); process.exit(2); }
  const r = await keywordVolumes(kws);
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1);
}
