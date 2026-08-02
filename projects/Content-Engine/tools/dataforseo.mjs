// tools/dataforseo.mjs — keyword research via DataForSEO (Basic auth from .env).
// keywordVolumes (Google Ads) + Labs: searchIntent, keywordDifficulty, keywordSuggestions, rankedKeywords.
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

// Shared POST helper for DataForSEO Labs endpoints. Same never-throw contract.
async function labsRequest(path, payload) {
  const login = process.env.DATAFORSEO_LOGIN, password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return { ok: false, error: 'DATAFORSEO_LOGIN/PASSWORD not set' };
  try {
    const res = await fetch(`https://api.dataforseo.com/v3/dataforseo_labs/google/${path}/live`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${login}:${password}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([payload]),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: true, items: json?.tasks?.[0]?.result?.[0]?.items ?? [] };
  } catch (e) { return { ok: false, error: String(e?.message ?? e) }; }
}

// { ok, intents: { [keyword]: { label, probability } | null } }
export async function searchIntent(keywords, { languageCode = 'en' } = {}) {
  const r = await labsRequest('search_intent', { keywords, language_code: languageCode });
  if (!r.ok) return r;
  const intents = Object.fromEntries(keywords.map(k => [k, null]));
  for (const it of r.items) {
    if (it?.keyword in intents && it.keyword_intent) {
      intents[it.keyword] = { label: it.keyword_intent.label, probability: it.keyword_intent.probability };
    }
  }
  return { ok: true, intents };
}

// { ok, difficulties: { [keyword]: 0-100 | null } } — higher = harder to rank
export async function keywordDifficulty(keywords, { locationCode = 2840, languageCode = 'en' } = {}) {
  const r = await labsRequest('bulk_keyword_difficulty', { keywords, location_code: locationCode, language_code: languageCode });
  if (!r.ok) return r;
  const difficulties = Object.fromEntries(keywords.map(k => [k, null]));
  for (const it of r.items) if (it?.keyword in difficulties) difficulties[it.keyword] = it.keyword_difficulty ?? null;
  return { ok: true, difficulties };
}

// { ok, suggestions: [{ keyword, volume, difficulty, intent }] } — long-tail expansions of a seed term
export async function keywordSuggestions(keyword, { locationCode = 2840, languageCode = 'en', limit = 20 } = {}) {
  const r = await labsRequest('keyword_suggestions', { keyword, location_code: locationCode, language_code: languageCode, limit, include_seed_keyword: false });
  if (!r.ok) return r;
  const suggestions = r.items.map(it => ({
    keyword: it?.keyword ?? null,
    volume: it?.keyword_info?.search_volume ?? null,
    difficulty: it?.keyword_properties?.keyword_difficulty ?? null,
    intent: it?.search_intent_info?.main_intent ?? null,
  })).filter(s => s.keyword);
  return { ok: true, suggestions };
}

// { ok, ranked: [{ keyword, position, volume, url }] } — what a domain already ranks for
export async function rankedKeywords(domain, { locationCode = 2840, languageCode = 'en', limit = 50 } = {}) {
  const r = await labsRequest('ranked_keywords', { target: domain, location_code: locationCode, language_code: languageCode, limit });
  if (!r.ok) return r;
  const ranked = r.items.map(it => ({
    keyword: it?.keyword_data?.keyword ?? null,
    position: it?.ranked_serp_element?.serp_item?.rank_absolute ?? null,
    volume: it?.keyword_data?.keyword_info?.search_volume ?? null,
    url: it?.ranked_serp_element?.serp_item?.url ?? null,
  })).filter(k => k.keyword);
  return { ok: true, ranked };
}

if (process.argv[1]?.endsWith('dataforseo.mjs')) {
  const [cmd, ...args] = process.argv.slice(2);
  const usage = 'usage: node tools/dataforseo.mjs <volumes|intent|difficulty|suggest|ranked> <keyword|domain> [...]';
  if (!cmd || !args.length) { console.error(usage); process.exit(2); }
  const run = {
    volumes: () => keywordVolumes(args),
    intent: () => searchIntent(args),
    difficulty: () => keywordDifficulty(args),
    suggest: () => keywordSuggestions(args[0]),
    ranked: () => rankedKeywords(args[0]),
  }[cmd] ?? (() => keywordVolumes([cmd, ...args]));  // bare keywords → volumes (backward compatible)
  const r = await run();
  console.log(JSON.stringify(r, null, 2)); process.exit(r.ok ? 0 : 1);
}
