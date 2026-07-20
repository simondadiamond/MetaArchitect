#!/usr/bin/env node
// prospect-mine.mjs — mine LinkedIn comment sections of "AI for business"
// creators for /setup-venture prospects (business owners asking AI questions),
// score them, and land the qualified slice in the Command Center CRM.
//
// Pipeline: creators (prospect-mine-sources.json) → recent posts (harvestapi
// posts actor, pay-per-result, cookie-free) → comments on the busiest posts
// (harvestapi comments actor) → filter to owner/founder headlines, exclude
// AI-sellers → score curiosity signals → dedupe vs CRM → insert via the
// :3737 clients API (status=new, channel=linkedin_dm) with the mined comment
// as a timeline note. Full pool (incl. below-threshold) → CSV backlog.
//
// STATE: each Apify stage caches its raw output under
// funnel/setup-offer/prospects/ (gitignored — scraped PII stays local);
// re-runs the same day reuse the cache instead of re-spending. --dry-run
// does everything except CRM inserts. --fresh ignores today's cache.
//
// Usage: node scripts/prospect-mine.mjs [--dry-run] [--fresh]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CC_ENV = join(ROOT, "projects/command-center/.env");
const OUT_DIR = join(ROOT, "funnel/setup-offer/prospects");
const SOURCES = join(ROOT, "scripts/prospect-mine-sources.json");
const CC_API = "http://100.105.85.5:3737";

const dryRun = process.argv.includes("--dry-run");
const fresh = process.argv.includes("--fresh");
const today = new Date().toISOString().slice(0, 10);

// Spend guards — sized for a $5/mo Apify plan: ~100 posts ($0.15) + ≤800
// comments ($1.60) keeps a full run under ~$2 at harvestapi's ~$1.50-2/1k rates.
const MAX_POSTS_PER_CREATOR = 10;
const POSTS_MIN_COMMENTS = 8;
const MAX_POSTS_TO_MINE = 10;
const COMMENTS_PER_POST = 80;
const MAX_CRM_INSERTS = 50;

function env(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
const ENV = env(CC_ENV);
if (!ENV.APIFY_TOKEN) {
  console.error("prospect-mine: APIFY_TOKEN missing in command-center .env");
  process.exit(1);
}

async function runActor(actorId, input, label) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${ENV.APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(290_000),
    },
  );
  if (!res.ok) {
    throw new Error(`Apify ${label} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const items = await res.json();
  if (!Array.isArray(items)) throw new Error(`Apify ${label}: non-array response`);
  return items;
}

function cached(name, producer) {
  const file = join(OUT_DIR, `${name}-${today}.json`);
  if (!fresh && existsSync(file)) {
    console.log(`[cache] reusing ${file}`);
    return Promise.resolve(JSON.parse(readFileSync(file, "utf8")));
  }
  return producer().then((data) => {
    writeFileSync(file, JSON.stringify(data, null, 2));
    return data;
  });
}

// ---- field mappers (same shapes as worker/engage/scraper.ts) ----
const str = (v) => (typeof v === "string" && v.trim() ? v : null);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function mapPost(raw, creator) {
  if (!raw || typeof raw !== "object") return null;
  const post_url = str(raw.linkedinUrl) ?? str(raw.url);
  const text = str(raw.content) ?? str(raw.text);
  if (!post_url || !text) return null;
  const eng = raw.engagement ?? {};
  return {
    creator,
    post_url,
    text,
    comments: num(eng.comments) ?? 0,
    reactions: num(eng.likes) ?? num(eng.reactions) ?? 0,
  };
}

function mapComment(raw) {
  if (!raw || typeof raw !== "object") return null;
  const actor = raw.actor ?? raw.author ?? {};
  const text = str(raw.commentary) ?? str(raw.text);
  const name = str(actor.name);
  const profile = str(actor.linkedinUrl) ?? str(actor.url);
  if (!text || !name || !profile) return null;
  return {
    name,
    profile,
    headline: str(actor.position) ?? str(actor.headline) ?? "",
    text,
    comment_url: str(raw.linkedinUrl) ?? str(raw.url) ?? "",
  };
}

// ---- scoring ----
const OWNER_RE =
  /\b(founder|co-?founder|owner|ceo|president|managing director|managing partner|principal|fondat(eur|rice)|propri[ée]taire|pdg|pr[ée]sident(e)?|g[ée]rant(e)?)\b/i;
const EXCLUDE_RE =
  /\b(ai (consultant|coach|strategist|expert|educator|trainer|agency)|prompt|automation agency|ghost ?writ\w*|linkedin (coach|strategist|expert)|growth (hacker|marketer|partner)|helping (you|founders|business(es)? owners?|companies|coaches|creators)|i (help|build|grow|scale)\b|software engineer|data scientist|ml engineer|web developer|full[- ]stack|devrel|student|aspiring|open to work|looking for (work|opportunities)|keynote|speaker on ai|futurist|gtm|go[- ]to[- ]market|outbound|cold email|lead gen\w*|personal brand\w*|marketing strategist|content strategist|clarity architect|ecosystem thinker|transformation specialist|done[- ]for[- ]you)\b/i;
const CURIOUS_RE =
  /\b(how (do|would|can|did)|what tool|which tool|where do i start|where to start|any recommendation|does (this|it) work|trying to|struggl\w*|overwhelm\w*|no idea|help me|curious|beginner|getting started|comment (faire|on)|par o[uù] commencer)\b/i;
const BIZ_RE =
  /\b(my (business|company|team|clients?|shop|store|agency|firm|practice|restaurant|clinic)|we run|i run|our (business|company|team|clients?)|mon (entreprise|[ée]quipe|commerce)|mes clients)\b/i;
const FR_RE = /[àâçéèêëîïôùûü]|\b(je|pour|mais|avec|merci|tr[eè]s)\b/i;

function score(c) {
  let s = 0;
  if (c.text.includes("?")) s += 1;
  if (CURIOUS_RE.test(c.text)) s += 1;
  if (BIZ_RE.test(c.text)) s += 1;
  if (c.text.length >= 60) s += 1;
  return s;
}

function companyFrom(headline) {
  const m = headline.match(
    /(?:founder|co-?founder|owner|ceo|president|fondat\w+|propri[ée]taire|pdg)[^@]*?(?:@|\bat\b|\bchez\b)\s*([^|•·,;–—]{2,60})/i,
  );
  return m ? m[1].trim() : null;
}

// ---- main ----
mkdirSync(OUT_DIR, { recursive: true });
const creators = JSON.parse(readFileSync(SOURCES, "utf8"));

// Stage 1: recent posts per creator (batched 5 profiles/call for the sync limit).
const posts = await cached("posts", async () => {
  const all = [];
  for (let i = 0; i < creators.length; i += 5) {
    const batch = creators.slice(i, i + 5);
    const items = await runActor(
      "harvestapi~linkedin-profile-posts",
      {
        targetUrls: batch.map((c) => c.linkedin_url),
        maxPosts: MAX_POSTS_PER_CREATOR,
        postedLimit: "month",
        includeReposts: false,
        includeQuotePosts: false,
        scrapeReactions: false,
        scrapeComments: false,
      },
      `posts[${batch.map((c) => c.name).join(",")}]`,
    );
    // Attribute each post to its creator by URL author when present; fall back to batch label.
    for (const raw of items) {
      const author = str(raw?.author?.linkedinUrl) ?? str(raw?.author?.url) ?? "";
      const match = batch.find((c) => author.startsWith(c.linkedin_url.replace(/\/$/, "")));
      const p = mapPost(raw, match?.name ?? batch[0].name);
      if (p) all.push(p);
    }
    console.log(`[posts] batch ${i / 5 + 1}: +${items.length} raw`);
  }
  return all;
});
const perCreator = {};
for (const p of posts) perCreator[p.creator] = (perCreator[p.creator] ?? 0) + 1;
console.log(`[posts] ${posts.length} posts across ${Object.keys(perCreator).length} creators:`, perCreator);
for (const c of creators)
  if (!perCreator[c.name]) console.log(`[coverage] WARNING: 0 posts for ${c.name} — check the slug`);

// Stage 2: pick the busiest posts — max 2 per creator, so one mega-account
// can't monopolize the run (2026-07-20: Welsh took 7/10 slots and his comment
// section is the seller economy, not buyers).
const byBusiest = posts
  .filter((p) => p.comments >= POSTS_MIN_COMMENTS)
  .sort((a, b) => b.comments - a.comments);
const perCreatorCount = {};
const mineable = byBusiest.filter((p) => {
  perCreatorCount[p.creator] = (perCreatorCount[p.creator] ?? 0) + 1;
  return perCreatorCount[p.creator] <= 2;
}).slice(0, MAX_POSTS_TO_MINE);
console.log(
  `[select] mining ${mineable.length}/${posts.length} posts (comments ≥ ${POSTS_MIN_COMMENTS}, cap ${MAX_POSTS_TO_MINE})`,
);

// Stage 3: comments — one call per post so creator/post attribution is exact.
const comments = await cached("comments", async () => {
  const all = [];
  for (const post of mineable) {
    const items = await runActor(
      "harvestapi~linkedin-post-comments",
      {
        posts: [post.post_url],
        maxItems: COMMENTS_PER_POST,
        scrapeReplies: false,
        profileScraperMode: "short",
      },
      `comments[${post.creator}]`,
    );
    for (const raw of items) {
      const c = mapComment(raw);
      if (c) {
        all.push({ ...c, post_url: post.post_url, post_text: post.text.slice(0, 200), creator: post.creator });
      }
    }
    console.log(`[comments] ${post.creator} (${post.comments} listed): total ${all.length}`);
  }
  return all;
});
console.log(`[comments] ${comments.length} usable comments`);

// Stage 4: filter + score + dedupe within run.
const seen = new Set();
const owners = [];
let excluded = 0;
for (const c of comments) {
  const key = c.profile.replace(/\/$/, "").toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  if (!c.headline || !OWNER_RE.test(c.headline)) continue;
  if (EXCLUDE_RE.test(c.headline)) {
    excluded += 1;
    continue;
  }
  owners.push({ ...c, score: score(c), locale: FR_RE.test(c.text) ? "fr" : "en", company: companyFrom(c.headline) });
}
owners.sort((a, b) => b.score - a.score);
const tierA = owners.filter((o) => o.score >= 2).slice(0, MAX_CRM_INSERTS);
console.log(
  `[filter] ${owners.length} unique owner-headline commenters (${excluded} excluded as AI-sellers/etc); tier A (score ≥ 2): ${tierA.length}`,
);
if (owners.filter((o) => o.score >= 2).length > MAX_CRM_INSERTS)
  console.log(`[filter] NOTE: tier A capped at ${MAX_CRM_INSERTS} — remainder lands in the CSV only`);

// Stage 5: dedupe vs existing CRM.
const existingRes = await fetch(`${CC_API}/api/clients`);
if (!existingRes.ok) {
  console.error(`prospect-mine failed at crm-dedupe — GET /api/clients ${existingRes.status} — nothing inserted, safe to retry`);
  process.exit(1);
}
const { clients: existing } = await existingRes.json();
const existingKeys = new Set(
  existing.flatMap((c) => [
    (c.linkedin_url ?? "").replace(/\/$/, "").toLowerCase(),
    c.name.trim().toLowerCase(),
  ]).filter(Boolean),
);
const toInsert = tierA.filter(
  (o) => !existingKeys.has(o.profile.replace(/\/$/, "").toLowerCase()) && !existingKeys.has(o.name.trim().toLowerCase()),
);
console.log(`[dedupe] ${tierA.length - toInsert.length} already in CRM; inserting ${toInsert.length}`);

// Stage 6: CSV backlog — everything, always.
const csvFile = join(OUT_DIR, `prospects-${today}.csv`);
const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
writeFileSync(
  csvFile,
  ["name,headline,company,profile,score,locale,creator,post_url,comment"]
    .concat(owners.map((o) => [o.name, o.headline, o.company, o.profile, o.score, o.locale, o.creator, o.post_url, o.text].map(esc).join(",")))
    .join("\n"),
);
console.log(`[csv] full pool (${owners.length}) → ${csvFile}`);

// Stage 7: CRM inserts (validated :3737 API; comment lands as a timeline note).
if (dryRun) {
  console.log(`[dry-run] would insert ${toInsert.length} prospects — stopping before writes`);
  process.exit(0);
}
let inserted = 0;
for (const o of toInsert) {
  const res = await fetch(`${CC_API}/api/clients`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: o.name,
      company: o.company,
      channel: "linkedin_dm",
      locale: o.locale,
      status: "new",
      linkedin_url: o.profile,
      source_ref: `mine:${o.creator}`,
      next_action: "Reply to their comment, then DM opener",
    }),
  });
  if (!res.ok) {
    console.error(`[insert] FAILED for ${o.name}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    continue;
  }
  const { client } = await res.json();
  const noteRes = await fetch(`${CC_API}/api/clients/${client.id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "note",
      title: "Mined LinkedIn comment",
      content: `They commented on ${o.creator}'s post:\n\n"${o.text}"\n\nPost: ${o.post_text}…\n${o.post_url}`,
    }),
  });
  if (!noteRes.ok) console.error(`[insert] note failed for ${o.name} (${noteRes.status}) — client row kept`);
  inserted += 1;
}
console.log(`prospect-mine: done — ${inserted}/${toInsert.length} prospects inserted, full pool in ${csvFile}`);
