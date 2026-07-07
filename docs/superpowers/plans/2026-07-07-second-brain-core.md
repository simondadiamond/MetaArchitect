# Second Brain Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the canonical second-brain store (`~/projects/brain/` git repo) and the deterministic `brain` CLI (save/find/doctor/sync/inbox/describe/import), wire it into every Claude session, seed it with a curated backfill, and prove it with benchmarks.

**Architecture:** Plain markdown notes (one fact per file) + one always-true `INDEX.md` catalogue. Retrieval is deterministic code: keyword-strip → score index lines without opening files → open ONE file → extract matching section → one `[[pointer]]` hop max → print evidence with citations. The model is touched only by `brain describe` (image/PDF ingestion) and never during retrieval. A Supabase table (`public.brain_entries`) + Storage bucket (`brain`) are a read-only projection for the Command Center UI, written solely by `brain sync`.

**Tech Stack:** Node v24 ESM, **zero npm dependencies** (node: builtins + fetch only), Node built-in test runner (`node --test`), git + `gh` CLI, Supabase REST/Storage/Management APIs.

## Global Constraints

- Repo: `/home/diamond/projects/brain` — new, private. All CLI code in `tools/`, libs in `tools/lib/`, tests in `tools/tests/`.
- `package.json`: `{"name":"brain","private":true,"type":"module","scripts":{"test":"node --test tools/tests/"}}` — no dependencies, ever, in phase 1.
- Domains enum (exact): `business | content | infra | personal | family | health | finance`.
- INDEX.md line format (exact): `- [<slug>](notes/<slug>.md) (<domain>) — <one-sentence description>`
- Note frontmatter keys (exact): `slug, title, domain, tags, created, source, description` — `tags` serialized as `[a, b]`. Optional keys: `attachment` (repo-relative path), `asset_url`, `storage_pending`, `describe_pending` (both `true` when set, key absent otherwise).
- STATE S+T+E: every CLI command creates a state object `{workflowId (crypto.randomUUID()), cmd, stage, startedAt}`, appends one JSON line per stage transition to `.log/brain.jsonl`, validates output before any write. Error format exactly: `❌ brain <cmd> failed at <stage> — <message> — no partial writes` printed to stderr, exit code 1.
- Atomicity: note file + INDEX line land in the SAME git commit; any failure rolls back to the pre-command git state (`git checkout -- . && git clean -fd notes/ assets/` scoped to changed paths).
- Supabase project: `ashwrqkoijzvakdmfskj`. Env from `/home/diamond/projects/brain/.env` (keys `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, copied from `/home/diamond/projects/MetaArchitect/.env`). Never hardcode or print key values. DDL via Management API: `POST https://api.supabase.com/v1/projects/ashwrqkoijzvakdmfskj/database/query` with bearer token read from `~/.supabase/access-token`.
- Git pushes use `gh`-wired HTTPS (`git push origin main`); never raw SSH push.
- LLM calls (describe, bench) via `claude -p` headless on the Max subscription — **never** the Anthropic SDK / `ANTHROPIC_API_KEY`.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Repo scaffold + CLI skeleton + env loader

**Files:**
- Create: `/home/diamond/projects/brain/` (git init), `package.json`, `.gitignore`, `README.md`, `INDEX.md`, `MAP.md`, `CLAUDE.md`, `notes/.gitkeep`, `assets/.gitkeep`, `inbox/.gitkeep`, `bench/.gitkeep`
- Create: `tools/brain.mjs` (dispatcher), `tools/lib/env.mjs`, `tools/lib/paths.mjs`
- Create: symlink `~/.local/bin/brain` → `/home/diamond/projects/brain/tools/brain.mjs`

**Interfaces:**
- Produces: `ROOT`, `NOTES_DIR`, `ASSETS_DIR`, `INBOX_DIR`, `INDEX_PATH`, `LOG_PATH` (absolute-path string constants) from `tools/lib/paths.mjs`; `loadEnv()` from `tools/lib/env.mjs` returning `{SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY}` (parsed from `.env`, tolerant of missing file — returns `{}`); `brain <cmd>` dispatcher that routes to `tools/cmd/<cmd>.mjs` default export `run(argv)`.

- [ ] **Step 1: Scaffold repo**

```bash
mkdir -p ~/projects/brain/{notes,assets,inbox,bench,tools/lib,tools/cmd,tools/tests,.log}
cd ~/projects/brain && git init -b main
printf '.env\n.log/\nnode_modules/\n.staging/\n' > .gitignore
printf '# Second Brain\n\nCanonical store for Simon Paris\047s business + personal knowledge.\nSpec: MetaArchitect/docs/superpowers/specs/2026-07-07-second-brain-design.md\n' > README.md
printf '# INDEX\n\n' > INDEX.md
printf '# MAP — topic → owning document\n\n| Topic | Owner | Notes |\n|---|---|---|\n' > MAP.md
touch notes/.gitkeep assets/.gitkeep inbox/.gitkeep bench/.gitkeep
cat > package.json <<'EOF'
{
  "name": "brain",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test tools/tests/" }
}
EOF
grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' ~/projects/MetaArchitect/.env > .env
```

- [ ] **Step 2: Write `CLAUDE.md` routing note**

```markdown
# Second Brain — session routing

This repo is the canonical second brain. Rules for any Claude session working here:
1. Recall: run `brain find "<question>"` BEFORE manual grep/Read. Check INDEX.md first, open files second.
2. Store: `brain save "<fact>" --domain <business|content|infra|personal|family|health|finance> [--tags a,b] [--title t] [--file path]` — one atomic step (note + INDEX + commit).
3. Never edit INDEX.md by hand; `brain doctor --fix` regenerates it from notes/ (notes are the source of truth).
4. One fact per note. Cross-link with [[slug]]. Big reference docs are NOT copied in — point at them from MAP.md.
```

- [ ] **Step 3: Write `tools/lib/paths.mjs` and `tools/lib/env.mjs`**

```javascript
// tools/lib/paths.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const NOTES_DIR = join(ROOT, 'notes');
export const ASSETS_DIR = join(ROOT, 'assets');
export const INBOX_DIR = join(ROOT, 'inbox');
export const INDEX_PATH = join(ROOT, 'INDEX.md');
export const LOG_PATH = join(ROOT, '.log', 'brain.jsonl');
```

```javascript
// tools/lib/env.mjs
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './paths.mjs';
export function loadEnv() {
  let raw;
  try { raw = readFileSync(join(ROOT, '.env'), 'utf8'); } catch { return {}; }
  const env = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
```

- [ ] **Step 4: Write `tools/brain.mjs` dispatcher**

```javascript
#!/usr/bin/env node
// brain — deterministic second-brain CLI. Model calls live ONLY in `describe`.
const COMMANDS = ['find', 'save', 'doctor', 'sync', 'inbox', 'describe', 'import'];
const [,, cmd, ...rest] = process.argv;
if (!COMMANDS.includes(cmd)) {
  console.error(`usage: brain <${COMMANDS.join('|')}> ...`);
  process.exit(2);
}
const mod = await import(`./cmd/${cmd}.mjs`);
await mod.run(rest);
```

- [ ] **Step 5: Stub each `tools/cmd/<cmd>.mjs`** so the dispatcher resolves (each: `export async function run() { console.error('not implemented'); process.exit(2); }`)

- [ ] **Step 6: Symlink onto PATH and smoke-test**

```bash
chmod +x ~/projects/brain/tools/brain.mjs
ln -sf ~/projects/brain/tools/brain.mjs ~/.local/bin/brain
brain 2>&1 | head -1   # expect: usage: brain <find|save|...>
```

- [ ] **Step 7: Commit and create private GitHub repo**

```bash
cd ~/projects/brain && git add -A && git commit -m "chore: scaffold second brain repo + CLI skeleton

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
gh repo create simondadiamond/brain --private --source=. --push
```

---

### Task 2: Keyword stripper + STATE logger

**Files:**
- Create: `tools/lib/keywords.mjs`, `tools/lib/state.mjs`
- Test: `tools/tests/keywords.test.mjs`, `tools/tests/state.test.mjs`

**Interfaces:**
- Produces: `stripToKeywords(question: string): string[]` (lowercased, deduped, stopwords + punctuation removed, keeps accented chars, drops 1-char tokens); `createState(cmd: string): state`, `logStage(state, stage: string, data?: object): void` (mutates `state.stage`, appends JSONL to `LOG_PATH`, creating `.log/` if needed), `fail(state, stage: string, message: string): never` (logs `status:"error"`, prints exact error format to stderr, `process.exit(1)`).

- [ ] **Step 1: Write failing tests**

```javascript
// tools/tests/keywords.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripToKeywords } from '../lib/keywords.mjs';

test('strips stopwords and punctuation, lowercases, dedupes', () => {
  assert.deepEqual(
    stripToKeywords("What is the Hydro-Québec bill for March?"),
    ['hydro-québec', 'bill', 'march']
  );
});
test('drops 1-char tokens and question filler', () => {
  assert.deepEqual(stripToKeywords('how do i restart the ngrok tunnel'), ['restart', 'ngrok', 'tunnel']);
});
```

```javascript
// tools/tests/state.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { createState, logStage } from '../lib/state.mjs';
import { LOG_PATH } from '../lib/paths.mjs';

test('logStage appends JSONL with workflowId, cmd, stage, timestamp', () => {
  const state = createState('save');
  logStage(state, 'validate', { slug: 'x' });
  const last = readFileSync(LOG_PATH, 'utf8').trim().split('\n').at(-1);
  const row = JSON.parse(last);
  assert.equal(row.cmd, 'save');
  assert.equal(row.stage, 'validate');
  assert.equal(row.workflow_id, state.workflowId);
  assert.ok(row.timestamp);
});
```

- [ ] **Step 2: Run to verify failure** — `cd ~/projects/brain && npm test` → FAIL (module not found)

- [ ] **Step 3: Implement**

```javascript
// tools/lib/keywords.mjs
const STOPWORDS = new Set(('a an the is are was were be been being do does did done to of in on at for with about and or nor not no yes my our your his her their its this that these those what which who whom whose where when how why can could should would will shall may might must have has had having i you he she it we they me him them us from by as if then than so such just also there here any some all each every either neither get got gets find found tell show give need want know whats im dont didnt isnt arent wasnt werent cant wont into out up down over under again more most other own same too very once only everever still yet le la les un une des du de et ou est sont pour avec dans sur que qui quoi comment pourquoi').split(' '));
export function stripToKeywords(question) {
  const tokens = question
    .toLowerCase()
    .replace(/[^a-z0-9àâäçéèêëîïôöûùüÿœæ\s-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^-+|-+$/g, ''))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return [...new Set(tokens)];
}
```

```javascript
// tools/lib/state.mjs
import { randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { LOG_PATH } from './paths.mjs';

export function createState(cmd) {
  return { workflowId: randomUUID(), cmd, stage: 'init', startedAt: new Date().toISOString() };
}
export function logStage(state, stage, data = {}, status = 'success') {
  state.stage = stage;
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  appendFileSync(LOG_PATH, JSON.stringify({
    workflow_id: state.workflowId, cmd: state.cmd, stage, status,
    timestamp: new Date().toISOString(), ...data,
  }) + '\n');
}
export function fail(state, stage, message) {
  logStage(state, stage, { message }, 'error');
  console.error(`❌ brain ${state.cmd} failed at ${stage} — ${message} — no partial writes`);
  process.exit(1);
}
```

- [ ] **Step 4: Run tests** — `npm test` → both files PASS
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: keyword stripper + STATE logger"` (with co-author trailer)

---

### Task 3: Note frontmatter + INDEX parsing/serialization

**Files:**
- Create: `tools/lib/note.mjs`, `tools/lib/index-file.mjs`
- Test: `tools/tests/note.test.mjs`, `tools/tests/index-file.test.mjs`

**Interfaces:**
- Produces from `note.mjs`: `parseNote(text): {frontmatter: object, body: string}` (`tags` always an array); `serializeNote(frontmatter, body): string`; `slugify(title): string` (kebab-case ascii, max 60 chars).
- Produces from `index-file.mjs`: `parseIndex(text): Array<{slug, path, domain, description}>`; `formatIndexLine(entry): string` (exact Global-Constraints format); `noteToIndexEntry(frontmatter): {slug, path, domain, description}`.

- [ ] **Step 1: Write failing tests**

```javascript
// tools/tests/note.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, serializeNote, slugify } from '../lib/note.mjs';

const SAMPLE = `---
slug: hydro-bill-march-2026
title: Hydro-Québec bill March 2026
domain: finance
tags: [utilities, receipts]
created: 2026-07-07
source: phone-capture
description: Hydro-Québec bill for March 2026, $142, account ending 4471.
---

Amount: $142. Account ending 4471. See [[home-utilities-overview]].
`;

test('parseNote round-trips through serializeNote', () => {
  const { frontmatter, body } = parseNote(SAMPLE);
  assert.equal(frontmatter.slug, 'hydro-bill-march-2026');
  assert.deepEqual(frontmatter.tags, ['utilities', 'receipts']);
  assert.match(body, /Account ending 4471/);
  assert.equal(parseNote(serializeNote(frontmatter, body)).frontmatter.title, frontmatter.title);
});
test('slugify', () => {
  assert.equal(slugify("Charlotte's CPE enrollment — 2026!"), 'charlotte-s-cpe-enrollment-2026');
});
```

```javascript
// tools/tests/index-file.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndex, formatIndexLine } from '../lib/index-file.mjs';

test('parseIndex reads the exact line format', () => {
  const text = '# INDEX\n\n- [hydro-bill-march-2026](notes/hydro-bill-march-2026.md) (finance) — Hydro bill March 2026, $142.\n';
  const [e] = parseIndex(text);
  assert.deepEqual(e, { slug: 'hydro-bill-march-2026', path: 'notes/hydro-bill-march-2026.md', domain: 'finance', description: 'Hydro bill March 2026, $142.' });
  assert.equal(formatIndexLine(e), '- [hydro-bill-march-2026](notes/hydro-bill-march-2026.md) (finance) — Hydro bill March 2026, $142.');
});
```

- [ ] **Step 2: Run — verify FAIL**
- [ ] **Step 3: Implement**

```javascript
// tools/lib/note.mjs
export function parseNote(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: {}, body: text };
  const frontmatter = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (key === 'tags') {
      frontmatter.tags = val.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    } else if (val === 'true') frontmatter[key] = true;
    else frontmatter[key] = val;
  }
  if (!Array.isArray(frontmatter.tags)) frontmatter.tags = [];
  return { frontmatter, body: text.slice(m[0].length).replace(/^\n/, '') };
}
export function serializeNote(fm, body) {
  const ORDER = ['slug', 'title', 'domain', 'tags', 'created', 'source', 'description',
    'attachment', 'asset_url', 'storage_pending', 'describe_pending'];
  const lines = [];
  for (const key of ORDER) {
    if (fm[key] === undefined || fm[key] === null) continue;
    if (key === 'tags') { if (fm.tags.length) lines.push(`tags: [${fm.tags.join(', ')}]`); }
    else lines.push(`${key}: ${fm[key]}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.trimEnd()}\n`;
}
export function slugify(title) {
  return title.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60).replace(/-+$/, '');
}
```

```javascript
// tools/lib/index-file.mjs
const LINE_RE = /^- \[([a-z0-9-]+)\]\((notes\/[a-z0-9-]+\.md)\) \(([a-z]+)\) — (.+)$/;
export function parseIndex(text) {
  const entries = [];
  for (const line of text.split('\n')) {
    const m = line.match(LINE_RE);
    if (m) entries.push({ slug: m[1], path: m[2], domain: m[3], description: m[4] });
  }
  return entries;
}
export function formatIndexLine({ slug, path, domain, description }) {
  return `- [${slug}](${path}) (${domain}) — ${description}`;
}
export function noteToIndexEntry(fm) {
  return { slug: fm.slug, path: `notes/${fm.slug}.md`, domain: fm.domain, description: fm.description };
}
```

- [ ] **Step 4: Run tests — PASS. Step 5: Commit** `"feat: note frontmatter + INDEX parsers"`

---

### Task 4: Index scorer

**Files:**
- Create: `tools/lib/score.mjs`
- Test: `tools/tests/score.test.mjs`

**Interfaces:**
- Consumes: entries from `parseIndex` (optionally enriched with `tags` from frontmatter — scorer must tolerate missing `tags`).
- Produces: `scoreEntry(keywords: string[], entry): number` (slug hit = 3, description hit = 2, domain/tag hit = 1, per keyword, substring match); `rankEntries(keywords, entries, {threshold=4} = {}): {ranked: Array<{entry, score}>, confident: boolean}` — sorted desc, zero-score dropped, `confident` = top score ≥ threshold.

- [ ] **Step 1: Write failing tests**

```javascript
// tools/tests/score.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreEntry, rankEntries } from '../lib/score.mjs';

const ENTRIES = [
  { slug: 'hydro-bill-march-2026', path: 'notes/hydro-bill-march-2026.md', domain: 'finance', description: 'Hydro-Québec bill for March 2026, $142, account ending 4471.' },
  { slug: 'ngrok-tunnel-setup', path: 'notes/ngrok-tunnel-setup.md', domain: 'infra', description: 'How the ngrok tunnel on sterling is configured and restarted.' },
];
test('scoring weights slug > description > meta', () => {
  const kw = ['hydro', 'bill'];
  assert.ok(scoreEntry(kw, ENTRIES[0]) > scoreEntry(kw, ENTRIES[1]));
});
test('rankEntries returns confident match for a clear question', () => {
  const { ranked, confident } = rankEntries(['ngrok', 'tunnel', 'restart'], ENTRIES);
  assert.equal(ranked[0].entry.slug, 'ngrok-tunnel-setup');
  assert.equal(confident, true);
});
test('rankEntries is not confident on garbage', () => {
  const { confident } = rankEntries(['zebra', 'quantum'], ENTRIES);
  assert.equal(confident, false);
});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement**

```javascript
// tools/lib/score.mjs
export function scoreEntry(keywords, entry) {
  const slug = entry.slug.toLowerCase();
  const desc = (entry.description || '').toLowerCase();
  const meta = `${entry.domain || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (slug.includes(kw)) score += 3;
    if (desc.includes(kw)) score += 2;
    if (meta.includes(kw)) score += 1;
  }
  return score;
}
export function rankEntries(keywords, entries, { threshold = 4 } = {}) {
  const ranked = entries
    .map((entry) => ({ entry, score: scoreEntry(keywords, entry) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return { ranked, confident: ranked.length > 0 && ranked[0].score >= threshold };
}
```

- [ ] **Step 4: PASS. Step 5: Commit** `"feat: deterministic index scorer"`

---

### Task 5: Section extractor + pointer hop

**Files:**
- Create: `tools/lib/extract.mjs`
- Test: `tools/tests/extract.test.mjs`

**Interfaces:**
- Produces: `splitSections(markdown): Array<{heading: string, text: string}>` (splits on `#`-headings; preamble before first heading gets `heading: ''`); `extractBest(markdown, keywords): {heading, text, pointer: string|null}` — highest keyword-hit section (whole body if no headings); `pointer` = first `[[slug]]` in the winning section, else null.

- [ ] **Step 1: Write failing tests**

```javascript
// tools/tests/extract.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitSections, extractBest } from '../lib/extract.mjs';

const DOC = `Intro line.

## Billing
Hydro bill was $142 in March. See [[home-utilities-overview]].

## Contacts
Landlord: 418-555-0100.
`;
test('splitSections keeps preamble and headings', () => {
  const s = splitSections(DOC);
  assert.equal(s.length, 3);
  assert.equal(s[1].heading, 'Billing');
});
test('extractBest picks the section with the most keyword hits and finds pointer', () => {
  const best = extractBest(DOC, ['hydro', 'bill', 'march']);
  assert.equal(best.heading, 'Billing');
  assert.equal(best.pointer, 'home-utilities-overview');
});
test('no headings → whole body, no pointer → null', () => {
  const best = extractBest('just one fact, no links', ['fact']);
  assert.equal(best.pointer, null);
  assert.match(best.text, /one fact/);
});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement**

```javascript
// tools/lib/extract.mjs
export function splitSections(markdown) {
  const lines = markdown.split('\n');
  const sections = [];
  let current = { heading: '', text: [] };
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) {
      if (current.text.join('').trim() || current.heading) sections.push(finish(current));
      current = { heading: h[1].trim(), text: [] };
    } else current.text.push(line);
  }
  sections.push(finish(current));
  return sections.filter((s) => s.heading || s.text.trim());
  function finish(c) { return { heading: c.heading, text: c.text.join('\n').trim() }; }
}
export function extractBest(markdown, keywords) {
  const sections = splitSections(markdown);
  let best = sections[0] ?? { heading: '', text: markdown.trim() };
  let bestScore = -1;
  for (const s of sections) {
    const hay = `${s.heading} ${s.text}`.toLowerCase();
    const score = keywords.reduce((n, kw) => n + (hay.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  const p = best.text.match(/\[\[([a-z0-9-]+)\]\]/);
  return { heading: best.heading, text: best.text, pointer: p ? p[1] : null };
}
```

- [ ] **Step 4: PASS. Step 5: Commit** `"feat: section extractor with one-pointer-hop detection"`

---

### Task 6: `brain find` — the retrieval ladder

**Files:**
- Create: `tools/cmd/find.mjs` (replace stub)
- Test: `tools/tests/find.test.mjs` (integration, fixture dir)

**Interfaces:**
- Consumes: `stripToKeywords`, `parseIndex`, `rankEntries`, `extractBest`, `parseNote`, `createState/logStage/fail`, paths.
- Produces: `run(argv)` for `brain find "question" [--json]`. Ladder: keywords → parse INDEX (enrich each entry's `tags` lazily is NOT allowed — score from INDEX alone) → rank → not confident: print `no confident match` + top-3 suggestions (`slug (score)`), exit 1 → read ONLY the top note → `extractBest` → if `pointer`, read pointed note once and extract again → print evidence block with citations, exit 0. `--json` prints `{slug, heading, evidence, sources: [paths], score}` for the bench runner. Every stage logged via `logStage`.

- [ ] **Step 1: Write failing integration test** (build fixture with `mkdtemp`; the command must accept an optional `BRAIN_ROOT` env override for tests — add that to `paths.mjs`: every exported path derives from `process.env.BRAIN_ROOT ?? <repo root>`, computed at import time)

```javascript
// tools/tests/find.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const BIN = new URL('../brain.mjs', import.meta.url).pathname;

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'brain-'));
  mkdirSync(join(root, 'notes')); mkdirSync(join(root, '.log'), { recursive: true });
  writeFileSync(join(root, 'notes', 'hydro-bill-march-2026.md'),
`---
slug: hydro-bill-march-2026
title: Hydro bill March 2026
domain: finance
created: 2026-07-07
source: test
description: Hydro-Québec bill for March 2026, $142, account ending 4471.
---

## Billing
Amount was $142, account ending 4471. See [[home-utilities-overview]].
`);
  writeFileSync(join(root, 'notes', 'home-utilities-overview.md'),
`---
slug: home-utilities-overview
title: Home utilities overview
domain: personal
created: 2026-07-07
source: test
description: Overview of home utility accounts and providers.
---

Hydro-Québec account 999-4471, billed bi-monthly.
`);
  writeFileSync(join(root, 'INDEX.md'),
`# INDEX

- [hydro-bill-march-2026](notes/hydro-bill-march-2026.md) (finance) — Hydro-Québec bill for March 2026, $142, account ending 4471.
- [home-utilities-overview](notes/home-utilities-overview.md) (personal) — Overview of home utility accounts and providers.
`);
  return root;
}

test('find answers a buried fact with citation and follows one pointer', () => {
  const out = execFileSync('node', [BIN, 'find', 'how much was the hydro bill in march', '--json'],
    { env: { ...process.env, BRAIN_ROOT: fixture() }, encoding: 'utf8' });
  const r = JSON.parse(out);
  assert.equal(r.slug, 'hydro-bill-march-2026');
  assert.match(r.evidence, /\$142/);
  assert.ok(r.sources.some((s) => s.includes('home-utilities-overview')));
});

test('find exits 1 with no confident match on garbage', () => {
  assert.throws(() =>
    execFileSync('node', [BIN, 'find', 'zebra quantum lasagna'], { env: { ...process.env, BRAIN_ROOT: fixture() }, encoding: 'utf8' })
  );
});
```

- [ ] **Step 2: Update `paths.mjs` for `BRAIN_ROOT` override, run test — FAIL (stub exit 2)**

- [ ] **Step 3: Implement `tools/cmd/find.mjs`**

```javascript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, INDEX_PATH } from '../lib/paths.mjs';
import { stripToKeywords } from '../lib/keywords.mjs';
import { parseIndex } from '../lib/index-file.mjs';
import { rankEntries } from '../lib/score.mjs';
import { extractBest } from '../lib/extract.mjs';
import { parseNote } from '../lib/note.mjs';
import { createState, logStage, fail } from '../lib/state.mjs';

export async function run(argv) {
  const state = createState('find');
  const json = argv.includes('--json');
  const question = argv.filter((a) => !a.startsWith('--')).join(' ').trim();
  if (!question) fail(state, 'validate', 'no question given');

  const keywords = stripToKeywords(question);
  logStage(state, 'keywords', { keywords });

  let entries;
  try { entries = parseIndex(readFileSync(INDEX_PATH, 'utf8')); }
  catch (e) { fail(state, 'read-index', e.message); }

  const { ranked, confident } = rankEntries(keywords, entries);
  logStage(state, 'score', { top: ranked.slice(0, 3).map((r) => `${r.entry.slug}:${r.score}`) });
  if (!confident) {
    console.error(`no confident match for "${question}"`);
    for (const r of ranked.slice(0, 3)) console.error(`  maybe: ${r.entry.slug} (${r.score})`);
    logStage(state, 'no-match', {}, 'error');
    process.exit(1);
  }

  const top = ranked[0];
  const sources = [top.entry.path];
  const note = parseNote(readFileSync(join(ROOT, top.entry.path), 'utf8'));
  let best = extractBest(note.body, keywords);
  logStage(state, 'extract', { slug: top.entry.slug, heading: best.heading, pointer: best.pointer });

  let evidence = best.text;
  if (best.pointer) {
    const pPath = `notes/${best.pointer}.md`;
    try {
      const pNote = parseNote(readFileSync(join(ROOT, pPath), 'utf8'));
      const pBest = extractBest(pNote.body, keywords);
      evidence += `\n\n[[${best.pointer}]] → ${pBest.text}`;
      sources.push(pPath);
      logStage(state, 'pointer-hop', { pointer: best.pointer });
    } catch { /* broken pointer: doctor's job, evidence stands alone */ }
  }

  logStage(state, 'done', { sources });
  if (json) {
    console.log(JSON.stringify({ slug: top.entry.slug, heading: best.heading, evidence, sources, score: top.score }));
  } else {
    console.log(evidence);
    console.log(`\n— sources: ${sources.join(', ')}`);
  }
}
```

- [ ] **Step 4: Run tests — PASS (full suite `npm test`). Step 5: Commit** `"feat: brain find — deterministic retrieval ladder with citations"`

---

### Task 7: `brain save` — atomic write

**Files:**
- Create: `tools/cmd/save.mjs`, `tools/lib/args.mjs` (tiny flag parser: `parseFlags(argv) → {positional: string[], flags: object}`)
- Test: `tools/tests/save.test.mjs`

**Interfaces:**
- Consumes: note/index libs, state lib.
- Produces: `run(argv)` for `brain save "<fact text>" --domain X [--tags a,b] [--title t] [--file /abs/path] [--source s] [--no-commit]`. Behavior:
  - validate: domain ∈ enum, fact text non-empty; `--file` must exist. Slug = `slugify(title ?? first 8 words)`; on collision append `-2`, `-3`…
  - description = `--title`-independent: first sentence of fact text truncated to 140 chars.
  - `--file` ≤ 1 MB → copy to `assets/<slug>-<basename>`, set `attachment`; > 1 MB → set `storage_pending: true` and copy to `.staging/<slug>-<basename>` (gitignored). Image/PDF extensions (`.png .jpg .jpeg .webp .gif .pdf`) → `describe_pending: true`.
  - write note via temp-file-then-rename; append INDEX line; `git add <paths> && git commit` (skipped with `--no-commit`, used by `import` and tests); rollback everything on any failure (delete written files, `git checkout -- INDEX.md`).
  - prints the slug on success (stdout, single line) — the capture API depends on this.
- Exported for reuse: `saveNote({text, domain, tags, title, file, source, noCommit}): {slug, path}` — `import.mjs` and `inbox.mjs` call this.

- [ ] **Step 1: Write failing tests** — in a fixture `BRAIN_ROOT` (git-init it in the test): saving writes note + INDEX line + commit (assert `git log --oneline` grew); duplicate title gets `-2` suffix; invalid domain exits 1 and leaves INDEX untouched; `--file` small image sets `attachment` + `describe_pending`.

```javascript
// tools/tests/save.test.mjs (core assertions)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const BIN = new URL('../brain.mjs', import.meta.url).pathname;

function fixtureGit() {
  const root = mkdtempSync(join(tmpdir(), 'brain-'));
  mkdirSync(join(root, 'notes')); mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'INDEX.md'), '# INDEX\n\n');
  execFileSync('git', ['init', '-b', 'main'], { cwd: root });
  execFileSync('git', ['add', '-A'], { cwd: root });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-m', 'init'], { cwd: root });
  return root;
}
test('save writes note + INDEX line + commit atomically', () => {
  const root = fixtureGit();
  const slug = execFileSync('node', [BIN, 'save', 'Charlotte starts CPE on August 25 2026.', '--domain', 'family', '--tags', 'cpe,charlotte'],
    { env: { ...process.env, BRAIN_ROOT: root, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' }, encoding: 'utf8' }).trim();
  assert.match(readFileSync(join(root, 'notes', `${slug}.md`), 'utf8'), /August 25/);
  assert.match(readFileSync(join(root, 'INDEX.md'), 'utf8'), new RegExp(slug));
  const log = execFileSync('git', ['log', '--oneline'], { cwd: root, encoding: 'utf8' });
  assert.equal(log.trim().split('\n').length, 2);
});
test('invalid domain exits 1, INDEX untouched', () => {
  const root = fixtureGit();
  assert.throws(() => execFileSync('node', [BIN, 'save', 'x fact', '--domain', 'nope'], { env: { ...process.env, BRAIN_ROOT: root }, encoding: 'utf8' }));
  assert.equal(readFileSync(join(root, 'INDEX.md'), 'utf8'), '# INDEX\n\n');
});
```

- [ ] **Step 2: Run — FAIL. Step 3: Implement** (`args.mjs`: `--k v` and `--k=v` and boolean flags; `save.mjs` per the interface — key excerpt below; keep whole implementation in these two files)

```javascript
// tools/cmd/save.mjs — core flow (full file implements everything in the interface block)
export const DOMAINS = ['business', 'content', 'infra', 'personal', 'family', 'health', 'finance'];
const DESCRIBE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.pdf']);
const MAX_INLINE_BYTES = 1024 * 1024;

export async function run(argv) {
  const state = createState('save');
  const { positional, flags } = parseFlags(argv);
  try {
    const { slug } = saveNote({
      text: positional.join(' ').trim(),
      domain: flags.domain, tags: flags.tags ? String(flags.tags).split(',').map(s => s.trim()).filter(Boolean) : [],
      title: flags.title, file: flags.file, source: flags.source ?? 'cli', noCommit: !!flags['no-commit'],
    }, state);
    console.log(slug);
  } catch (e) { fail(state, state.stage, e.message); }
}

export function saveNote(opts, state = createState('save')) {
  // stage: validate — domain enum, non-empty text, file exists (statSync)
  // stage: slug — slugify(title ?? first 8 words of text); while existsSync(notes/slug.md) append -2, -3…
  // stage: attach — size/extension logic per interface; copyFileSync
  // stage: write-note — writeFileSync(notes/.tmp-<slug>, serializeNote(fm, text)); renameSync into place
  // stage: write-index — appendFileSync(INDEX_PATH, formatIndexLine(noteToIndexEntry(fm)) + '\n')
  // stage: commit — execFileSync git add <notePath> <INDEX.md> [asset]; git commit -m `brain save: <slug>` (skip if noCommit)
  // rollback on ANY throw after write-note: rmSync note+asset if written, execFileSync git checkout -- INDEX.md; then rethrow
}
```

- [ ] **Step 4: `npm test` — all PASS. Step 5: Commit** `"feat: brain save — atomic note + INDEX + commit with rollback"`

---

### Task 8: `brain doctor` + `brain import`

**Files:**
- Create: `tools/cmd/doctor.mjs`, `tools/cmd/import.mjs`
- Test: `tools/tests/doctor.test.mjs`

**Interfaces:**
- `brain doctor [--fix]`: reads every `notes/*.md` frontmatter (source of truth) and INDEX.md; reports: notes missing from INDEX, INDEX lines with no note, description drift (INDEX ≠ frontmatter), broken `[[links]]`, counts of `describe_pending`/`storage_pending`. Exit 0 clean / 1 drift. `--fix` regenerates INDEX.md entirely from notes (sorted by slug), preserving the `# INDEX` header, and commits `"chore: doctor --fix"`. Mechanical repairs only — never touches note files.
- `brain import <file.jsonl>`: each line `{title, text, domain, tags?, source?}` → `saveNote(..., noCommit: true)`; one git commit at the end `"feat: import <n> notes"`; any invalid line aborts BEFORE any write (validate all lines first — Explicit gate).

- [ ] **Step 1: Failing tests** — fixture with one indexed note + one orphan note + one stale INDEX line; `doctor` exits 1 listing both; `doctor --fix` then `doctor` exits 0. `import` with 2 good lines creates 2 notes 1 commit; import with 1 good + 1 bad line creates nothing.
- [ ] **Step 2: Run — FAIL. Step 3: Implement.** Doctor's regenerate: `notes = readdirSync(NOTES_DIR).filter(f => f.endsWith('.md'))` → parse frontmatter → validate required keys → `INDEX.md = '# INDEX\n\n' + lines.join('\n') + '\n'`.
- [ ] **Step 4: PASS. Step 5: Commit** `"feat: brain doctor (drift check/--fix) + brain import (bulk seed)"`

---

### Task 9: Supabase projection — DDL + `brain sync`

**Files:**
- Create: `tools/infra/ddl.mjs` (one-shot, idempotent), `tools/cmd/sync.mjs`, `tools/lib/supabase.mjs`
- Test: `tools/tests/sync.test.mjs` (unit-test payload building only; live upsert verified manually in Step 4)

**Interfaces:**
- `tools/lib/supabase.mjs`: `upsertEntries(rows: object[]): Promise<void>` — `POST {SUPABASE_URL}/rest/v1/brain_entries?on_conflict=slug` headers `apikey`/`Authorization: Bearer <service key>`/`Prefer: resolution=merge-duplicates`; `uploadAsset(localPath, storagePath): Promise<string>` — `POST {SUPABASE_URL}/storage/v1/object/brain/<storagePath>` with `x-upsert: true`, returns storage path. Throw on non-2xx with response text.
- `buildRow(frontmatter, body): row` — `{slug, title, domain, tags, description, body_md, attachment, asset_url, created_at, updated_at: new Date().toISOString()}`.
- `brain sync`: for every note: buildRow → validate (slug/domain/description present — Explicit) → batch upsert (chunks of 100); for every `storage_pending` note: upload `.staging` file to `assets/<slug>/<basename>`, set `asset_url` (path, not signed URL), remove `storage_pending`, rewrite note; regenerate INDEX if notes changed; commit `"chore: sync"`; `git push origin main`. Stages logged.

- [ ] **Step 1: Write DDL script**

```javascript
// tools/infra/ddl.mjs — one-shot, idempotent. Run: node tools/infra/ddl.mjs
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
const token = readFileSync(`${homedir()}/.supabase/access-token`, 'utf8').trim();
const SQL = `
create table if not exists public.brain_entries (
  slug text primary key,
  title text not null,
  domain text not null check (domain in ('business','content','infra','personal','family','health','finance')),
  tags text[] not null default '{}',
  description text not null,
  body_md text not null default '',
  attachment text,
  asset_url text,
  created_at date,
  updated_at timestamptz not null default now()
);
create index if not exists brain_entries_fts on public.brain_entries
  using gin (to_tsvector('simple', title || ' ' || description || ' ' || array_to_string(tags, ' ')));
alter table public.brain_entries enable row level security;
drop policy if exists brain_entries_read on public.brain_entries;
create policy brain_entries_read on public.brain_entries for select using (true);
insert into storage.buckets (id, name, public) values ('brain','brain', false) on conflict (id) do nothing;
`;
const res = await fetch('https://api.supabase.com/v1/projects/ashwrqkoijzvakdmfskj/database/query', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify({ query: SQL }),
});
console.log(res.status, (await res.text()).slice(0, 300));
process.exit(res.ok ? 0 : 1);
```

- [ ] **Step 2: Run DDL** — `node tools/infra/ddl.mjs` → expect `201` (or 200). Verify: `curl -s "$SUPABASE_URL/rest/v1/brain_entries?limit=1" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"` → `[]`.
- [ ] **Step 3: Failing unit test for `buildRow`** (maps frontmatter+body → row; tags default `[]`; validates required fields throw).
- [ ] **Step 4: Implement `supabase.mjs` + `sync.mjs`; run `npm test` → PASS; then live smoke:** `brain save "sync smoke test" --domain infra && brain sync` then curl the table → row present. Delete smoke row: `curl -X DELETE "$SUPABASE_URL/rest/v1/brain_entries?slug=eq.<slug>" -H ...` and `git rm` the note + `brain doctor --fix`.
- [ ] **Step 5: Commit** `"feat: brain sync — Supabase brain_entries projection + storage upload"`

---

### Task 10: `brain describe` + `brain inbox`

**Files:**
- Create: `tools/cmd/describe.mjs`, `tools/cmd/inbox.mjs`
- Test: `tools/tests/describe.test.mjs` (validation gate only — model call mocked via `BRAIN_DESCRIBE_CMD` env override)

**Interfaces:**
- `brain describe <slug>`: note must have `describe_pending: true` and an `attachment` (or `.staging` file). Runs the ONLY model call in the CLI: `claude -p --output-format json "<prompt>"` where prompt instructs: *read the file at <abs path>; return ONLY JSON `{"description": "<one line, ≤140 chars, concrete: who/what/amount/date>", "extracted_text": "<all legible text>"}`*. Command executed via `execFileSync(process.env.BRAIN_DESCRIBE_CMD ?? 'claude', [...])`. Validation gate (Explicit): parse JSON, require both keys non-empty, description ≤ 200 chars — invalid → error path, note untouched. On pass: replace frontmatter `description`, drop `describe_pending`, append `\n## Extracted\n\n<extracted_text>\n` to body, regenerate that note's INDEX line (via doctor-style rewrite of just that line), commit `"chore: describe <slug>"`. Log the model call with `model_version` from the CLI JSON response.
- `brain inbox [--domain d]`: for each file in `inbox/` (skip `.gitkeep`): `saveNote({text: 'Captured from inbox: <basename>', title: basename sans ext, domain: d ?? 'personal', tags: ['untriaged'], file: <path>, source: 'inbox'})`, then delete the inbox file; after sweep, run describe for each new `describe_pending` note (continue past individual failures, report at end); single summary line `inbox: <n> filed, <m> described, <k> failed`.

- [ ] **Step 1: Failing test** — describe with `BRAIN_DESCRIBE_CMD` pointing at a fixture script that echoes valid JSON → note updated, pending flag gone; fixture script echoing garbage → exit 1, note byte-identical.
- [ ] **Step 2: FAIL. Step 3: Implement. Step 4: PASS + live smoke on a real screenshot** (`cp` any png to `inbox/`, run `brain inbox --domain infra`, check note + INDEX description are concrete). **Step 5: Commit** `"feat: brain describe (write-time model pass) + brain inbox sweep"`

---

### Task 11: Session integration (MetaArchitect + global)

**Files:**
- Modify: `/home/diamond/.claude/CLAUDE.md` (append routing section)
- Modify: `/home/diamond/projects/MetaArchitect/.claude/agents/{coo,family,health,tech-support,blog-writer,sitemaster}.md` — verify actual agent file locations first: `ls -la ~/.claude/agents/` shows symlink targets; edit the TARGETS (MetaArchitect repo), commit there.

**Interfaces:**
- Produces: every session on sterling knows the recall/store contract.

- [ ] **Step 1: Append to `~/.claude/CLAUDE.md`:**

```markdown
## Second Brain (all projects)

Canonical knowledge store: `~/projects/brain` (notes + INDEX.md + `brain` CLI on PATH).
- **Recall**: before manually grepping for a fact about Simon's life/business/infra, run `brain find "<question>"`. It checks the index first, opens at most two files, and cites sources. Exit 1 = no confident match (then search normally).
- **Store**: when a session surfaces a durable fact, decision, or document worth remembering, run `brain save "<fact>" --domain <business|content|infra|personal|family|health|finance> [--tags ...] [--file path]`.
- Boundary: Claude auto-memory = how Claude should operate. The brain = Simon's knowledge/life/business records.
- Documents/photos: drop into `~/projects/brain/inbox/` then `brain inbox`, or `brain save --file <path>`.
```

- [ ] **Step 2: Add one line to each agent profile** (in its `## Instructions`-equivalent top section, matching each file's existing style): coo → `business`, family → `family`, health → `health`, tech-support → `infra`, blog-writer/sitemaster → `content`. Line template: `Second brain: recall with \`brain find\`, store durable facts with \`brain save --domain <domain>\` (see ~/projects/brain).`
- [ ] **Step 3: Verify** — `brain find "what domain does the health agent save to"` is NOT expected to work (that's config, not a brain note) — instead verify by `grep -l 'brain find' ~/.claude/agents/*.md` → 6 files, and `grep -c 'Second Brain' ~/.claude/CLAUDE.md` → 1.
- [ ] **Step 4: Commit MetaArchitect changes** — `git -C ~/projects/MetaArchitect add .claude/agents && git commit -m "feat(agents): second-brain recall/store contract in all agent profiles"` (co-author trailer). Note: `~/.claude/CLAUDE.md` is not in a repo — no commit.

---

### Task 12: Curated backfill (~50 notes) + MAP.md

**Files:**
- Create: `bench/../.staging/backfill.jsonl` (working file, gitignored) → consumed by `brain import`
- Modify: `MAP.md`

**Interfaces:**
- Consumes: `brain import`, `brain sync`.
- Produces: a seeded brain: ≥40 notes across ≥5 domains + MAP.md pointing at big docs.

This task is judgment work — the implementing agent reads sources and writes distilled one-fact notes (NOT dumps). Sources and target counts:

- [ ] **Step 1: MetaArchitect `docs/lessons.md`** → one note per lesson (domain `infra` or `content`, tags `lesson`), ~10-15 notes. Each: title = the lesson, body = what broke + the rule now.
- [ ] **Step 2: `~/projects/meta-architect-plans/`** → one summary note per plan doc (domain `business`, tags `plan`), ~5 notes: goal, status, key decisions.
- [ ] **Step 3: Supabase pattern logs** — `cd ~/projects/MetaArchitect/projects/Content-Engine && node tools/db.mjs get sessions | head -c 4000` (table via `TABLES.SESSIONS`) → distill recurring engineering patterns into ~5 notes (domain `business`, tags `pattern`).
- [ ] **Step 4: Infra facts** — from root/global CLAUDE.md + memory dirs: sterling hardware/IP, ngrok, service topology, Postiz, story pipeline endpoints (domain `infra`), ~8 notes. Do NOT duplicate what MAP.md points at — a note earns its file only if it's a fact someone would ask for directly.
- [ ] **Step 5: Personal seeds** — from agent profiles only (family: Charlotte 3.5, Flo 6mo, Valerie; health: 40-lb fat-loss goal): ~4 notes, domains `family`/`health`. Facts only, no interpretation.
- [ ] **Step 6: MAP.md rows** — brand docs (`brand/*.md`), STATE framework, LinkedIn playbook, Content-Engine CLAUDE.md, command-center README, this spec/plan. Format: `| STATE framework | ~/projects/MetaArchitect/brand/state-framework.md | canonical spec, do not duplicate |`
- [ ] **Step 7: Validate + import** — assemble all notes as JSONL, `brain import .staging/backfill.jsonl`, then `brain doctor` → exit 0, then `brain sync`.
- [ ] **Step 8: Spot-check retrieval** — `brain find "what broke when scheduling posts near midnight"` and `brain find "charlotte cpe"` → confident hits with correct evidence. Commit is made by `import`; push via `git push origin main`.

---

### Task 13: Bench — prove it

**Files:**
- Create: `bench/questions.json`, `bench/run.mjs`, `bench/results.md`

**Interfaces:**
- Consumes: `brain find --json`, `claude -p --output-format json` (headless; response JSON carries `usage` and `duration_ms` fields — inspect one response first and adapt field access).
- Produces: rerunnable benchmark + committed results table.

- [ ] **Step 1: Write `bench/questions.json`** — 12-15 REAL questions against the seeded brain, three types: `index` (answer visible in INDEX description), `buried` (answer only inside a note body), `multi` (needs a pointer hop). Each: `{"q": "...", "must_contain": ["142"], "type": "buried"}` — `must_contain` = strings a correct answer must include (pick from actual seeded notes).
- [ ] **Step 2: Write `bench/run.mjs`** — for each question, three lanes:
  1. `brain-cli`: time `brain find --json`; correct = every `must_contain` in evidence; tokens = 0.
  2. `brain-session`: `claude -p --output-format json "Run: brain find '<q>' — answer using only its output."` with cwd `~/projects/brain`; capture total tokens + wall time + correctness on stdout text.
  3. `default-session`: `claude -p --output-format json "<q>"` with cwd `~/projects` (no brain routing); same capture.
  Emit `bench/results.md`: one row per question (type, correct✓/✗ per lane, tokens per lane, ms per lane) + totals. Skip lanes 2-3 with `--fast` flag (lane 1 only, for iterating).
- [ ] **Step 3: Run full bench.** Pass line (from spec): on `buried` and `multi` questions, brain-session must beat default-session on tokens AND correctness, and brain-cli must be 100% correct in < 100 ms. If it fails: fix scoring/threshold/keywords (Tasks 2/4/5 code), re-run — iterate until pass. Document each optimization in commit messages.
- [ ] **Step 4: Commit** `"feat: bench suite + results — brain vs default session"` and push.

---

## Self-review notes

- Spec coverage: store (T1,T3), CLI ladder (T2,T4,T5,T6), atomic save (T7), self-cleaning (T8), Supabase projection + storage (T9), describe/inbox (T10), session integration (T11), backfill+MAP (T12), bench (T13). CC surface = separate plan (2026-07-07-second-brain-command-center.md). pgvector = phase 2, out of scope.
- `BRAIN_ROOT` env override is load-bearing for all integration tests — introduced in Task 6 Step 2; Tasks 7-10 tests rely on it.
- `saveNote` is the single write path — capture API, inbox, and import all route through it.
