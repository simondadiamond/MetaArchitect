const ANCHORS = ['Absent', 'Ad-hoc', 'Systematic', 'Enforced'];
export const PILLAR_KEYS = ['structured', 'traceable', 'auditable', 'tolerant', 'explicit'];

const norm = (s) => s.toLowerCase().replace(/[\s ]+/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').trim();

export function validateScore(obj, transcriptText, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (!Number.isInteger(obj.level) || obj.level < 0 || obj.level > 3) throw new Error('level must be an integer 0–3');
  if (obj.anchor !== ANCHORS[obj.level]) throw new Error(`anchor must be "${ANCHORS[obj.level]}" for level ${obj.level}`);
  if (typeof obj.rationale !== 'string' || obj.rationale.trim().length < 40) throw new Error('rationale missing or too thin');
  if (!Array.isArray(obj.quotes) || obj.quotes.length < 1) throw new Error('at least one client quote required');
  const hay = norm(transcriptText);
  for (const q of obj.quotes) {
    if (typeof q !== 'string' || q.trim().length < 8) throw new Error('quote too short to be evidence');
    if (!hay.includes(norm(q))) throw new Error(`quote not found verbatim in the intake: "${String(q).slice(0, 60)}"`);
  }
  if (!['LOW', 'MED', 'HIGH'].includes(obj.confidence)) throw new Error('confidence must be LOW|MED|HIGH');
  if (!Array.isArray(obj.optimism_flags)) throw new Error('optimism_flags must be an array');
  for (const f of obj.optimism_flags) {
    if (typeof f?.claim !== 'string' || !f.claim || typeof f?.why !== 'string' || !f.why)
      throw new Error('each optimism flag needs non-empty claim and why');
  }
}

const FORBIDDEN_ASK = /\b(discuss|talk about|explore|tell me about your approach|discutez|parlez[- ]moi de)\b/i;
const VISIBLE_DEMAND = /\b(show|share|pull up|open|screen|run|point (me|at)|montre|affiche|partage|ouvre|exécute)\b/i;

export function validateBrief(obj, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (!obj.blocks || typeof obj.blocks !== 'object') throw new Error('blocks object required');
  const ranks = new Set();
  for (const key of PILLAR_KEYS) {
    const b = obj.blocks[key];
    if (!b) throw new Error(`missing block: ${key}`);
    for (const f of ['claim', 'ask', 'confirms', 'breaks']) {
      if (typeof b[f] !== 'string' || b[f].trim().length < 15) throw new Error(`${key}.${f} missing or too thin`);
    }
    if (FORBIDDEN_ASK.test(b.ask) || !VISIBLE_DEMAND.test(b.ask))
      throw new Error(`${key}.ask is not screen-share actionable — it must demand something visible on screen ("${b.ask.slice(0, 60)}…")`);
    if (!Number.isInteger(b.rank) || b.rank < 1 || b.rank > 5 || ranks.has(b.rank))
      throw new Error(`${key}.rank must be a unique integer 1–5`);
    ranks.add(b.rank);
  }
  if (!Array.isArray(obj.top_flags) || obj.top_flags.length > 3) throw new Error('top_flags must be an array of at most 3');
  if (!Array.isArray(obj.hardest_asks) || obj.hardest_asks.length !== 2) throw new Error('hardest_asks must list exactly 2');
}

export function validateSkeleton(obj, templateText, locale) {
  if (obj.language !== locale) throw new Error(`language must be "${locale}"`);
  if (typeof obj.markdown !== 'string' || obj.markdown.trim().length < 500) throw new Error('markdown missing or implausibly short');
  const names = (t) => new Set([...t.matchAll(/\{([A-Z0-9_]+)/g)].map(m => m[1]));
  const allowed = names(templateText);
  for (const n of names(obj.markdown)) {
    if (!allowed.has(n)) throw new Error(`invented placeholder {${n}} — not in the template`);
  }
  if (!obj.markdown.includes('[ANALYZER — re-judge]'))
    throw new Error('no [ANALYZER — re-judge] tags — every filled value must be tagged for re-judgment');
  const pending = locale === 'fr' ? /à confirmer/i : /pending call/i;
  if (!pending.test(obj.markdown)) throw new Error('page-5 confirmation entries must be pre-populated as pending the call');
}
