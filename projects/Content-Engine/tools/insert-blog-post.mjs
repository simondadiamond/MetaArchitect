/**
 * insert-blog-post.mjs — the write-post Step 7 validation gate + insert as one callable
 * script. Spec: .claude/skills/write-post/SKILL.md STEP 7 ("Validation Gate, then Insert").
 * Any failure -> error path, nothing written. Born 2026-07-13 (post-Fable gate build,
 * goal 3df3143e).
 *
 * CLI:
 *   node tools/insert-blog-post.mjs <payload.json>                  # validate, insert, verify
 *   node tools/insert-blog-post.mjs <payload.json> --validate-only  # offline: gate only, no network
 *   node tools/insert-blog-post.mjs <payload.json> --require-faq --idea <uuid>  # pipeline mode
 *   node tools/insert-blog-post.mjs --self-test                     # offline red-green harness
 *
 * Payload (field names = public.blog_posts columns, write-post Step 7 insert block):
 *   slug, title, excerpt, body_markdown, pillar, status ('draft'), seo_title,
 *   seo_description, cta_type, featured (bool), reading_time_minutes (int),
 *   linkedin_extract, tags (kebab-case string array),
 *   geo_citability — the Step 6 GEO check as an attestation object; every box must be true:
 *     { bluf_first_150, fact_blocks_open_h2s, question_headings_reviewed,
 *       named_failure_mode_defined, distinct_insights_5_to_7, entity_density,
 *       primary_keyword_placed }
 *     (named_failure_mode_defined may be "n/a" for non-failure_taxonomy pillars)
 *   post_type — 'article' | 'teardown', defaults to 'article' when omitted.
 *   canonical_url — must start with 'https://simonparis.ca/blog/'. Optional (but validated
 *     when present) unless --require-faq mode, where it's required.
 *   source_idea_id — uuid string, the pipeline.blog_ideas row this post came from. Optional
 *     (but validated as a uuid when present) unless --idea <uuid> is passed on the CLI, in
 *     which case it's required and must equal the --idea value.
 *
 * Pipeline (skill) callers pass --require-faq --idea <id>: the gate then also requires
 * canonical_url, source_idea_id (matching --idea), and a '## FAQ' section in body_markdown
 * with at least 3 questions. A "question" is a line matching either '### <text>' or a
 * standalone bold line ending in '?' ('**<text>?**') within the FAQ section (up to the next
 * '## ' heading or end of document) — matches the format blog-optimize/SKILL.md tells authors
 * to produce (3-5 ICP-phrased questions under a '## FAQ' heading). Legacy/manual callers that
 * omit --require-faq and --idea are unaffected — backward compatible.
 *
 * blog_posts lives in the PUBLIC schema (website data) — one-off client, never
 * tools/supabase.mjs (pipeline schema) and never the Management API (WAF blocks large
 * payloads). validatePayload() is exported for reuse.
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir, homedir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const PILLARS = ['failure_taxonomy', 'state_applied', 'defensive_arch', 'meta_layer', 'regulated_law25'];
export const CTA_TYPES = ['audit', 'subscribe'];
export const GEO_BOXES = [
  'bluf_first_150', 'fact_blocks_open_h2s', 'question_headings_reviewed',
  'named_failure_mode_defined', 'distinct_insights_5_to_7', 'entity_density',
  'primary_keyword_placed',
];
export const POST_TYPES = ['article', 'teardown'];
export const CANONICAL_URL_PREFIX = 'https://simonparis.ca/blog/';
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Count FAQ questions in body_markdown. Looks for a '## FAQ' heading (case-insensitive),
 * then counts lines within that section (up to the next '## ' heading or end of document)
 * that are either a '### ...' sub-heading or a standalone bold line ending in '?'
 * ('**...?**'). Returns -1 if no '## FAQ' heading is found.
 */
export function faqQuestionCount(body) {
  if (typeof body !== 'string') return -1;
  const lines = body.split('\n');
  const start = lines.findIndex((l) => /^##\s+FAQ\s*$/i.test(l.trim()));
  if (start === -1) return -1;
  let count = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^##\s+/.test(line)) break; // next H2 section ends the FAQ block
    if (/^###\s+\S.*$/.test(line)) count++;
    else if (/^\*\*.+\?\*\*$/.test(line)) count++;
  }
  return count;
}

function gatePath() {
  for (const p of [resolve(HERE, '../../../scripts/linkedin-gate.sh'),
                   join(homedir(), 'projects/MetaArchitect/scripts/linkedin-gate.sh')]) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Run the shared LinkedIn gate (scripts/linkedin-gate.sh) on the extract text. */
export function runLinkedinGate(text) {
  const gate = gatePath();
  if (!gate) return { ok: false, output: 'scripts/linkedin-gate.sh not found' };
  const dir = mkdtempSync(join(tmpdir(), 'li-extract-'));
  try {
    const f = join(dir, 'extract.txt');
    writeFileSync(f, text);
    const r = spawnSync('bash', [gate, f], { encoding: 'utf8', timeout: 30_000 });
    return { ok: r.status === 0, output: (r.stdout ?? '') + (r.stderr ?? '') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * The Step 7 mechanical gate. Returns { errors: [] } — empty array = safe to insert.
 * Pure except for the linkedin_extract sub-gate (spawns scripts/linkedin-gate.sh, still offline).
 */
export function validatePayload(p, { skipExtractGate = false, requireFaq = false, ideaId } = {}) {
  const errors = [];
  const err = (m) => errors.push(m);

  // pillar / cta enums — the Step 1 table is the enum; no other value exists
  if (!PILLARS.includes(p.pillar)) err(`pillar ${JSON.stringify(p.pillar)} — must be one of: ${PILLARS.join(' | ')}`);
  if (!CTA_TYPES.includes(p.cta_type)) err(`cta_type ${JSON.stringify(p.cta_type)} — must be audit | subscribe`);

  // post_type — defaults to 'article' when omitted
  const postType = p.post_type ?? 'article';
  if (!POST_TYPES.includes(postType)) err(`post_type ${JSON.stringify(p.post_type)} — must be one of: ${POST_TYPES.join(' | ')}`);

  // canonical_url — required + domain-checked in --require-faq mode; optional-but-validated otherwise
  if (requireFaq || p.canonical_url !== undefined) {
    if (typeof p.canonical_url !== 'string' || !p.canonical_url.trim()) {
      err(`canonical_url missing or empty${requireFaq ? ' (required in --require-faq mode)' : ''}`);
    } else if (!p.canonical_url.startsWith(CANONICAL_URL_PREFIX)) {
      err(`canonical_url ${JSON.stringify(p.canonical_url)} must start with ${CANONICAL_URL_PREFIX}`);
    }
  }

  // source_idea_id — uuid; required + must equal --idea when the CLI passed one
  if (ideaId) {
    if (typeof p.source_idea_id !== 'string' || !p.source_idea_id.trim()) {
      err('source_idea_id missing or empty (required when --idea is passed)');
    } else if (!UUID_RE.test(p.source_idea_id)) {
      err(`source_idea_id ${JSON.stringify(p.source_idea_id)} is not a valid uuid`);
    } else if (p.source_idea_id !== ideaId) {
      err(`source_idea_id ${JSON.stringify(p.source_idea_id)} does not match --idea ${JSON.stringify(ideaId)}`);
    }
  } else if (p.source_idea_id !== undefined) {
    if (typeof p.source_idea_id !== 'string' || !UUID_RE.test(p.source_idea_id)) {
      err(`source_idea_id ${JSON.stringify(p.source_idea_id)} is not a valid uuid`);
    }
  }

  // FAQ — '## FAQ' heading with >=3 questions, required only in --require-faq mode
  if (requireFaq) {
    const n = faqQuestionCount(p.body_markdown);
    if (n === -1) err('body_markdown missing a "## FAQ" section (required in --require-faq mode)');
    else if (n < 3) err(`body_markdown FAQ section has ${n} question(s) — needs >=3 ("### question" or "**question?**" lines)`);
  }

  // tags: non-empty array of kebab-case strings
  if (!Array.isArray(p.tags) || p.tags.length === 0) err('tags must be a non-empty array');
  else for (const t of p.tags) if (typeof t !== 'string' || !KEBAB.test(t)) err(`tag ${JSON.stringify(t)} is not kebab-case`);

  // slug kebab-case, <=60 chars; status = 'draft'
  if (typeof p.slug !== 'string' || !KEBAB.test(p.slug)) err(`slug ${JSON.stringify(p.slug)} is not kebab-case`);
  else if (p.slug.length > 60) err(`slug is ${p.slug.length} chars; must be <=60`);
  if ((p.status ?? 'draft') !== 'draft') err(`status must be 'draft' (got ${JSON.stringify(p.status)}) — publishing is a separate, human step`);

  // required content fields
  for (const k of ['title', 'excerpt', 'body_markdown', 'seo_title', 'seo_description']) {
    if (typeof p[k] !== 'string' || !p[k].trim()) err(`${k} missing or empty`);
  }
  if (!Number.isInteger(p.reading_time_minutes) || p.reading_time_minutes < 1) err('reading_time_minutes must be a positive integer');
  if (typeof p.featured !== 'boolean') err('featured must be boolean (true only if Simon explicitly says so)');

  // GEO citability check (Step 6) — every box ticked, as an explicit attestation object
  const geo = p.geo_citability;
  if (!geo || typeof geo !== 'object') err('geo_citability object missing — the Step 6 GEO check must be run and attested');
  else for (const box of GEO_BOXES) {
    const v = geo[box];
    const na_ok = box === 'named_failure_mode_defined' && v === 'n/a' && p.pillar !== 'failure_taxonomy';
    if (v !== true && !na_ok) err(`geo_citability.${box} is ${JSON.stringify(v)} — every GEO box must be true before insert`);
  }

  // linkedin_extract present + passed the shared gate (Step 6)
  if (typeof p.linkedin_extract !== 'string' || !p.linkedin_extract.trim()) {
    err('linkedin_extract missing or empty');
  } else if (!skipExtractGate) {
    const g = runLinkedinGate(p.linkedin_extract);
    if (!g.ok) err(`linkedin_extract failed the shared gate:\n${g.output.split('\n').filter(l => l.startsWith('FAIL')).join('\n')}`);
  }

  return { errors };
}

async function insert(p) {
  // Lazy imports so --validate-only / --self-test stay dependency-free and offline.
  const { createClient } = await import('@supabase/supabase-js');
  const { config } = await import('dotenv');
  // Env walk-up (same pattern as tools/supabase.mjs), with the command-center .env as fallback.
  let dir = HERE;
  for (let i = 0; i < 6; i++) {
    const f = resolve(dir, '.env');
    if (existsSync(f)) { config({ path: f, quiet: true }); break; }
    dir = resolve(dir, '..');
  }
  const ccEnv = join(homedir(), 'projects/MetaArchitect/projects/command-center/.env');
  if (!process.env.SUPABASE_URL && existsSync(ccEnv)) config({ path: ccEnv, quiet: true });
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');

  const pub = createClient(url, key,
    { db: { schema: 'public' }, auth: { persistSession: false, autoRefreshToken: false } });
  const insertRow = {
    slug: p.slug, title: p.title, excerpt: p.excerpt, body_markdown: p.body_markdown,
    pillar: p.pillar, status: 'draft', seo_title: p.seo_title, seo_description: p.seo_description,
    cta_type: p.cta_type, featured: p.featured, reading_time_minutes: p.reading_time_minutes,
    linkedin_extract: p.linkedin_extract, tags: p.tags, post_type: p.post_type ?? 'article',
  };
  if (p.canonical_url !== undefined) insertRow.canonical_url = p.canonical_url;
  if (p.source_idea_id !== undefined) insertRow.source_idea_id = p.source_idea_id;
  const { data, error } = await pub.from('blog_posts').insert(insertRow).select('id, slug, status').single();
  if (error) throw new Error(`insert failed: ${error.message} (slug conflict -> adjust the slug and retry)`);

  // Verify by reading the row back with the same client (Step 7).
  const { data: row, error: e2 } = await pub.from('blog_posts')
    .select('id, slug, title, status, pillar, cta_type').eq('slug', p.slug).single();
  if (e2 || !row || row.id !== data.id) throw new Error(`post-insert verify failed: ${e2?.message ?? 'row mismatch'}`);
  return row;
}

// ------------------------------------------------------------------ self-test
function goodPayload() {
  const extract = 'Your agent failed at 2am and the logs show nothing.\n\n'
    + Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ');
  return {
    slug: 'state-beats-intelligence-in-production',
    title: 'State Beats Intelligence in Production',
    excerpt: 'Why a mid-tier model with proper state management beats a frontier model running stateless, with the failure mechanism named.',
    body_markdown: '## Why does the agent fail?\n\nBody text here.',
    pillar: 'state_applied',
    status: 'draft',
    seo_title: 'State Beats Intelligence | The Meta Architect',
    seo_description: 'The failure mechanism behind stateless LLM systems in production, and the architecture that fixes it, for reliability leads.',
    cta_type: 'subscribe',
    featured: false,
    reading_time_minutes: 6,
    linkedin_extract: extract,
    tags: ['state-beats-intelligence', 'llmops', 'production-ai'],
    geo_citability: {
      bluf_first_150: true, fact_blocks_open_h2s: true, question_headings_reviewed: true,
      named_failure_mode_defined: 'n/a', distinct_insights_5_to_7: true,
      entity_density: true, primary_keyword_placed: true,
    },
  };
}

const TEST_IDEA_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_IDEA_ID = '22222222-2222-4222-8222-222222222222';

/** A payload shaped the way pipeline callers (--require-faq --idea <id>) will send it. */
function goodPipelinePayload() {
  return {
    ...goodPayload(),
    post_type: 'article',
    canonical_url: 'https://simonparis.ca/blog/state-beats-intelligence-in-production',
    source_idea_id: TEST_IDEA_ID,
    body_markdown: '## Why does the agent fail?\n\nBody text here.\n\n'
      + '## FAQ\n\n'
      + '### What breaks first when an agent has no state?\n\nAnswer text about state.\n\n'
      + '### How do I add tracing without a rewrite?\n\nAnswer text about tracing.\n\n'
      + '**Why does this matter for compliance?**\n\nAnswer text about compliance.\n',
  };
}

function selfTest() {
  let pass = 0, fail = 0;
  const expect = (name, payload, wantOk, wantErrMatch, opts) => {
    const { errors } = validatePayload(payload, opts);
    const ok = errors.length === 0;
    const matched = wantErrMatch ? errors.some(e => e.includes(wantErrMatch)) : true;
    if (ok === wantOk && matched) { console.log(`PASS self-test: ${name}`); pass++; }
    else { console.log(`FAIL self-test: ${name} — errors: ${JSON.stringify(errors)}`); fail++; }
  };

  expect('good payload passes', goodPayload(), true);
  expect('bad pillar fails', { ...goodPayload(), pillar: 'hot_takes' }, false, 'pillar');
  expect('bad cta_type fails', { ...goodPayload(), cta_type: 'buy_now' }, false, 'cta_type');
  expect('non-kebab tag fails', { ...goodPayload(), tags: ['Production AI'] }, false, 'kebab');
  expect('empty tags fails', { ...goodPayload(), tags: [] }, false, 'tags');
  expect('long slug fails', { ...goodPayload(), slug: 'x'.repeat(61) }, false, 'slug');
  expect('non-kebab slug fails', { ...goodPayload(), slug: 'Bad_Slug' }, false, 'slug');
  expect("status!=draft fails", { ...goodPayload(), status: 'published' }, false, 'draft');
  expect('missing geo attestation fails', { ...goodPayload(), geo_citability: undefined }, false, 'geo_citability');
  { const p = goodPayload(); p.geo_citability.bluf_first_150 = false;
    expect('unticked GEO box fails', p, false, 'bluf_first_150'); }
  { const p = goodPayload(); p.pillar = 'failure_taxonomy'; p.cta_type = 'audit'; p.geo_citability.named_failure_mode_defined = 'n/a';
    expect('n/a failure mode on failure_taxonomy fails', p, false, 'named_failure_mode_defined'); }
  expect('missing extract fails', { ...goodPayload(), linkedin_extract: '' }, false, 'linkedin_extract');
  { const p = goodPayload(); p.linkedin_extract = 'Too short — and with an em dash.';
    expect('extract failing shared gate fails', p, false, 'shared gate'); }
  expect('missing excerpt fails', { ...goodPayload(), excerpt: '' }, false, 'excerpt');

  // --- post_type (default article; article|teardown) ---
  expect('default post_type (article) passes', goodPayload(), true);
  expect('post_type teardown passes', { ...goodPayload(), post_type: 'teardown' }, true);
  expect('bad post_type fails', { ...goodPayload(), post_type: 'listicle' }, false, 'post_type');

  // --- canonical_url (optional unless --require-faq; validated whenever present) ---
  expect('canonical_url absent ok when not --require-faq', goodPayload(), true);
  expect('canonical_url wrong domain fails even when optional', { ...goodPayload(), canonical_url: 'https://example.com/blog/foo' }, false, 'canonical_url');
  expect('missing canonical_url fails under --require-faq', { ...goodPipelinePayload(), canonical_url: undefined }, false, 'canonical_url', { requireFaq: true, ideaId: TEST_IDEA_ID });
  expect('canonical_url wrong domain fails under --require-faq', { ...goodPipelinePayload(), canonical_url: 'https://example.com/blog/foo' }, false, 'canonical_url', { requireFaq: true, ideaId: TEST_IDEA_ID });
  expect('good pipeline payload passes --require-faq --idea', goodPipelinePayload(), true, undefined, { requireFaq: true, ideaId: TEST_IDEA_ID });

  // --- source_idea_id (uuid; required + must match --idea when passed) ---
  expect('source_idea_id bad uuid format fails', { ...goodPayload(), source_idea_id: 'not-a-uuid' }, false, 'source_idea_id');
  expect('missing source_idea_id fails when --idea passed', { ...goodPipelinePayload(), source_idea_id: undefined }, false, 'source_idea_id', { ideaId: TEST_IDEA_ID });
  expect('source_idea_id mismatch fails when --idea passed', { ...goodPipelinePayload(), source_idea_id: OTHER_IDEA_ID }, false, 'source_idea_id', { ideaId: TEST_IDEA_ID });

  // --- FAQ (## FAQ heading with >=3 questions, required only under --require-faq) ---
  { const p = goodPipelinePayload(); p.body_markdown = goodPayload().body_markdown;
    expect('FAQ-less body fails under --require-faq', p, false, 'FAQ', { requireFaq: true, ideaId: TEST_IDEA_ID }); }
  { const p = goodPipelinePayload();
    p.body_markdown = '## Why does the agent fail?\n\nBody text here.\n\n## FAQ\n\n'
      + '### What breaks first when an agent has no state?\n\nAnswer text about state.\n\n'
      + '**Why does this matter for compliance?**\n\nAnswer text about compliance.\n';
    expect('FAQ with <3 questions fails under --require-faq', p, false, 'FAQ', { requireFaq: true, ideaId: TEST_IDEA_ID }); }

  console.log(`\ninsert-blog-post self-test: ${pass} pass, ${fail} fail`);
  return fail === 0;
}

// ---- CLI ----
const argv = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}`) {
  if (argv[0] === '--self-test') {
    process.exit(selfTest() ? 0 : 1);
  }
  const validateOnly = argv.includes('--validate-only');
  const requireFaq = argv.includes('--require-faq');
  const ideaIdx = argv.indexOf('--idea');
  const ideaId = ideaIdx !== -1 ? argv[ideaIdx + 1] : undefined;
  const ideaValueIdx = ideaIdx !== -1 ? ideaIdx + 1 : -1;
  const file = argv.find((a, i) => i !== ideaValueIdx && !a.startsWith('-'));
  if (!file) { console.error('usage: insert-blog-post.mjs <payload.json> [--validate-only] [--require-faq] [--idea <uuid>] | --self-test'); process.exit(2); }
  const payload = JSON.parse(readFileSync(file, 'utf8'));
  const { errors } = validatePayload(payload, { requireFaq, ideaId });
  if (errors.length) {
    for (const e of errors) console.error(`FAIL ${e}`);
    console.error('\n❌ insert-blog-post failed at insert_gate — nothing written');
    process.exit(1);
  }
  console.log('PASS validation gate — all Step 7 checks hold');
  if (validateOnly) process.exit(0);
  const row = await insert(payload);
  console.log(JSON.stringify({ inserted: row, publish_hint: `UPDATE blog_posts SET status='published', published_at=NOW() WHERE slug='${row.slug}';` }, null, 2));
}
