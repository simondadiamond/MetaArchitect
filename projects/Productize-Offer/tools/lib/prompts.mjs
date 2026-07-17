import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OFFER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RUBRIC_PATH = join(OFFER_ROOT, 'audit', 'state-scoring-rubric.md');
export const RUNBOOK_PATH = join(OFFER_ROOT, 'diagnostic', 'diagnostic-runbook.md');
export const MEMO_TEMPLATE_PATH = join(OFFER_ROOT, 'diagnostic', 'findings-memo-template.md');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Slice a markdown section: from `#{depth} heading` to the next same-depth heading. */
export function extractSection(md, heading, depth = 2) {
  const h = '#'.repeat(depth);
  const re = new RegExp(`^${h} +${esc(heading)}\\s*$`, 'm');
  const m = md.match(re);
  if (!m) throw new Error(`section not found: "${h} ${heading}"`);
  const rest = md.slice(m.index + m[0].length);
  const next = rest.search(new RegExp(`^${h} `, 'm'));
  return rest.slice(0, next === -1 ? undefined : next).trim();
}

const PILLAR_RUBRIC_HEADINGS = {
  structured: 'S — Structured',
  traceable:  'T — Traceable',
  auditable:  'A — Auditable',
  tolerant:   'T — Tolerant',
  explicit:   'E — Explicit',
};

function langLine(locale) {
  return locale === 'fr'
    ? 'The client answered in French. Write rationale, flags, and all prose in French (registre professionnel québécois). Quotes stay verbatim as the client wrote them. Keep anchor names and confidence values in English verbatim — they are part of the instrument.'
    : 'Write all output in English.';
}

export function buildScorePrompt({ pillarKey, decoded, locale }) {
  const rubric = readFileSync(RUBRIC_PATH, 'utf8');
  const scale = extractSection(rubric, 'The scale');
  const rules = extractSection(rubric, 'Scoring rules (read before scoring anything)');
  const calib = extractSection(rubric, 'Calibration notes — where two auditors diverge, and the tie-break');
  const pillarSection = extractSection(rubric, PILLAR_RUBRIC_HEADINGS[pillarKey]);
  const pillar = decoded.pillars.find(p => p.key === pillarKey);
  const qa = pillar.qa.map(q => `Q: ${q.label}\nA: ${q.answer}`).join('\n\n');
  const introTxt = decoded.intro.map(x => `${x.label}: ${x.value}`).join('\n');
  return `STATE-SCORE-TASK
You are scoring ONE pillar of the STATE rubric from a client's self-reported intake. This produces a PROVISIONAL score for engagement prep only — self-report confirms nothing (rubric rule 3). Your job: a faithful application of the anchors to what the client claims, plus flagging optimism.

## Rubric — the scale
${scale}

## Rubric — scoring rules
${rules}

## Rubric — calibration notes
${calib}

## Rubric — the pillar you are scoring
${pillarSection}

## Engagement context (intro block)
${introTxt}

## The client's intake answers for this pillar
${qa}

## Your task
1. Apply the anchors to the claims exactly as stated. All-criteria rule; torn between two levels → take the lower.
2. Optimism flags: any claim that pattern-matches "tooling installed ≠ property held". The classic tell is a confidence scale of 4–5 alongside a narrative that describes ad-hoc practice. Flag each with the claim and why it reads optimistic. An empty array is a valid answer.
3. ${langLine(locale)}

Return ONLY a JSON object (no markdown fence, no prose) with exactly this shape:
{"language":"${locale}","level":<integer 0-3>,"anchor":"<Absent|Ad-hoc|Systematic|Enforced — must match the level>","rationale":"<3-6 sentences applying the anchor criteria to their answers>","quotes":["<phrases copied character-for-character from the answers above; at least one>"],"confidence":"<LOW|MED|HIGH>","optimism_flags":[{"claim":"…","why":"…"}]}`;
}

export function buildBriefPrompt({ scorecard, decoded, locale }) {
  const runbook = readFileSync(RUNBOOK_PATH, 'utf8');
  const callSection = extractSection(runbook, '1. The confirmation call — 60–90 min, day 1 of the engagement window', 3);
  return `CALL-BRIEF-TASK
You are writing Simon's confirmation-call brief from a provisional STATE scorecard and the client's own intake answers. The call is never improvised: every block opens with a claim the client already made, and the block's only job is show-me — confirm it or break it, on a screen-share.

## The call structure this brief maps onto (from the diagnostic runbook — one block per pillar)
${callSection}

## Provisional scorecard (JSON — self-report only, confirms nothing)
${JSON.stringify(scorecard, null, 1)}

## The client's intake (decoded)
${decoded.transcriptText}

## Rules
- One block per pillar: structured, traceable, auditable, tolerant, explicit — mapping 1:1 onto the call blocks above.
- Every ask must be actionable on a screen-share: demand a specific thing on screen ("pull up", "show me", "open the code at"). Never "discuss their approach".
- rank 1 = the most optimistic claim; it gets the longest block on the call. The 2–3 most optimistic claims get the sharpest, most specific asks.
- confirms / breaks: the concrete on-screen observation that confirms the claim, and the one that breaks it.
- hardest_asks: the two asks most likely to be skipped under time pressure — one line each, as reminders.
- ${langLine(locale)}

Return ONLY a JSON object:
{"language":"${locale}","blocks":{"structured":{"rank":<1-5, unique across blocks>,"claim":"…","ask":"…","confirms":"…","breaks":"…"},"traceable":{…},"auditable":{…},"tolerant":{…},"explicit":{…}},"top_flags":["<at most 3 one-line optimism flags>"],"hardest_asks":["<exactly two>"]}`;
}

export function buildSkeletonPrompt({ scorecard, decoded, row, locale }) {
  const template = readFileSync(MEMO_TEMPLATE_PATH, 'utf8');
  const pendingCall = locale === 'fr' ? 'à confirmer sur l’appel' : 'pending call';
  return `MEMO-SKELETON-TASK
Pre-fill the findings-memo template below from a client intake and a provisional scorecard. This is Day-0 prep: fill ONLY what is knowable before the confirmation call, and append the literal tag [ANALYZER — re-judge] to every value you fill.

## Rules
- Fill: engagement facts (client, owner, workflow line), the workflow description, provisional pillar scores + anchor names + one-line rationale summaries, candidate named-risk sketches on page 3 (drawn only from intake answers), and page 5's confirmation-table rows for intake-only evidence (entry: "${pendingCall}").
- Leave untouched (as {PLACEHOLDER} tokens): anything only knowable at or after the call — dates, call timestamps, artifact counts, attendee names, quiz delta, first moves.
- NEVER invent a fact. Every filled claim must trace to an intake answer. When in doubt, leave the placeholder.
- Do not add placeholders that are not already in the template. Keep the template's structure, headings, comment blocks and order intact.
- ${langLine(locale)}

## Provisional scorecard (JSON)
${JSON.stringify(scorecard, null, 1)}

## Intake (decoded)
${decoded.transcriptText}

## Row facts
Client email: ${row.email} | Submitted: ${row.submitted_at ?? '(fixture)'} | Locale: ${locale}

## The template
${template}

Return ONLY a JSON object: {"language":"${locale}","markdown":"<the full pre-filled template as one markdown string>"}`;
}
