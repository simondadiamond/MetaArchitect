const ANCHORS = ['Absent', 'Ad-hoc', 'Systematic', 'Enforced'];
export const PILLAR_KEYS = ['structured', 'traceable', 'auditable', 'tolerant', 'explicit'];

// Quote matching must survive routine LLM transcription drift: curly→straight
// quotes, em/en dash→hyphen, accent folding (é→e), whitespace collapse.
const norm = (s) => s
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[–—]/g, '-')
  .replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
  .replace(/[\s ]+/g, ' ')
  .trim();

export function validateScore(obj, transcriptText, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (!Number.isInteger(obj.level) || obj.level < 0 || obj.level > 3) throw new Error('level must be an integer 0–3');
  if (obj.anchor !== ANCHORS[obj.level]) throw new Error(`anchor must be "${ANCHORS[obj.level]}" for level ${obj.level}`);
  if (typeof obj.rationale !== 'string' || obj.rationale.trim().length < 40) throw new Error('rationale missing or too thin');
  if (!Array.isArray(obj.quotes) || obj.quotes.length < 1) throw new Error('at least one client quote required');
  const hay = norm(transcriptText);
  // Select-heavy pillars legitimately quote short answers ("No", "Yes for all"),
  // so the anti-fabrication weight sits on requiring ONE substantial phrase.
  let substantial = false;
  for (const q of obj.quotes) {
    if (typeof q !== 'string' || q.trim().length < 2) throw new Error('empty quote');
    if (!hay.includes(norm(q))) throw new Error(`quote not found verbatim in the intake: "${String(q).slice(0, 60)}"`);
    if (q.trim().length >= 12) substantial = true;
  }
  if (!substantial) throw new Error('at least one quote must be a substantial phrase (≥12 chars) from the answers');
  if (!['LOW', 'MED', 'HIGH'].includes(obj.confidence)) throw new Error('confidence must be LOW|MED|HIGH');
  if (!Array.isArray(obj.optimism_flags)) throw new Error('optimism_flags must be an array');
  for (const f of obj.optimism_flags) {
    if (typeof f?.claim !== 'string' || !f.claim || typeof f?.why !== 'string' || !f.why)
      throw new Error('each optimism flag needs non-empty claim and why');
  }
}

const FORBIDDEN_ASK = /\b(discuss|talk about|explore|tell me about your approach|discutez|parlez[- ]moi de)\b/i;
// EN verbs + FR tu- AND vous-forms; \b fails before accented initials, so
// "écran"/"exécut…" are matched without a leading boundary.
const VISIBLE_DEMAND = /\b(show|share|pull up|open|screen|run|point (me|at)|montrez?|affichez?|partagez?|ouvrez?)\b|écran|exécut/i;

const isNonEmptyString = (v, min = 5) => typeof v === 'string' && v.trim().length >= min;

export function validateBrief(obj, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (!obj.blocks || typeof obj.blocks !== 'object') throw new Error('blocks object required');
  const extra = Object.keys(obj.blocks).filter(k => !PILLAR_KEYS.includes(k));
  if (extra.length) throw new Error(`unexpected blocks (one per pillar, nothing else): ${extra.join(', ')}`);
  const ranks = new Set();
  for (const key of PILLAR_KEYS) {
    const b = obj.blocks[key];
    if (!b) throw new Error(`missing block: ${key}`);
    for (const f of ['claim', 'ask', 'confirms', 'breaks']) {
      if (!isNonEmptyString(b[f], 15)) throw new Error(`${key}.${f} missing or too thin`);
    }
    if (FORBIDDEN_ASK.test(b.ask) || !VISIBLE_DEMAND.test(b.ask))
      throw new Error(`${key}.ask is not screen-share actionable — it must demand something visible on screen ("${b.ask.slice(0, 60)}…")`);
    if (!Number.isInteger(b.rank) || b.rank < 1 || b.rank > 5 || ranks.has(b.rank))
      throw new Error(`${key}.rank must be a unique integer 1–5`);
    ranks.add(b.rank);
  }
  if (!Array.isArray(obj.top_flags) || obj.top_flags.length > 3 || !obj.top_flags.every(f => isNonEmptyString(f)))
    throw new Error('top_flags must be an array of at most 3 strings');
  if (!Array.isArray(obj.hardest_asks) || obj.hardest_asks.length !== 2 || !obj.hardest_asks.every(f => isNonEmptyString(f)))
    throw new Error('hardest_asks must list exactly 2 strings');
}

export function validateSkeleton(obj, templateText, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (typeof obj.markdown !== 'string' || obj.markdown.trim().length < 500) throw new Error('markdown missing or implausibly short');
  // Placeholder tokens look like {NAME} or {NAME: hint}; requiring the
  // terminator keeps prose like "{X was set" from being misread as a token.
  const names = (t) => new Set([...t.matchAll(/\{([A-Z0-9_]+)(?=[}:])/g)].map(m => m[1]));
  const allowed = names(templateText);
  for (const n of names(obj.markdown)) {
    if (!allowed.has(n)) throw new Error(`invented placeholder {${n}} — not in the template`);
  }
  if (!obj.markdown.includes('[ANALYZER — re-judge]'))
    throw new Error('no [ANALYZER — re-judge] tags — every filled value must be tagged for re-judgment');
  const pending = locale === 'fr' ? /à confirmer/i : /pending call/i;
  if (!pending.test(obj.markdown)) throw new Error('page-5 confirmation entries must be pre-populated as pending the call');
}
