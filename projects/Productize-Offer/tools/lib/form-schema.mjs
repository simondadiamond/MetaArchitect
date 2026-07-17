/**
 * Mirror of the /readiness form structure (simonparis-website
 * ReadinessDiagnosticClient.tsx PILLAR_DEFS, form v1 2026-07).
 * Storage: select = option index (number), multiSelect = label strings,
 * scale = 1–5 number, textarea = string. Question copy is read at runtime
 * from the website checkout's messages files — never duplicated here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const PILLAR_COLUMNS = {
  structured: 'pillar_structured',
  traceable:  'pillar_traceable',
  auditable:  'pillar_auditable',
  tolerant:   'pillar_tolerant',
  explicit:   'pillar_explicit',
};

export const FORM_DEF = {
  structured: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'textarea', required: true },
    { id: 'q3', type: 'select', required: true, followUp: { id: 'q3_detail', type: 'textarea' } },
    { id: 'q4', type: 'scale', required: true },
    { id: 'q5', type: 'textarea', required: false },
  ],
  traceable: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'multiSelect', required: true, followUp: { id: 'q2_capture', type: 'multiSelect' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'scale', required: true },
    { id: 'q6', type: 'textarea', required: false },
  ],
  auditable: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'select', required: true, followUp: { id: 'q2_detail', type: 'multiSelect' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'scale', required: true },
    { id: 'q6', type: 'textarea', required: false },
  ],
  tolerant: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'select', required: true, followUp: { id: 'q2_detail', type: 'textarea' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'scale', required: true },
    { id: 'q6', type: 'textarea', required: false },
  ],
  explicit: [
    { id: 'q1', type: 'textarea', required: true },
    { id: 'q2', type: 'select', required: true, followUp: { id: 'q2_detail', type: 'textarea' } },
    { id: 'q3', type: 'select', required: true },
    { id: 'q4', type: 'select', required: true },
    { id: 'q5', type: 'select', required: true },
    { id: 'q6', type: 'scale', required: true },
    { id: 'q7', type: 'textarea', required: false },
  ],
};

const ENGAGEMENT_QS = ['q1', 'q2', 'q3', 'q4']; // all required textarea, minChars 10
const INTRO_REQUIRED = ['system_name', 'role', 'company_size', 'industry', 'system_description', 'prod_status', 'regulations'];

export function checkCompleteness(row) {
  const missing = [];
  for (const f of INTRO_REQUIRED) {
    const v = row[f];
    if (f === 'regulations') { if (!Array.isArray(v) || v.length === 0) missing.push(f); }
    else if (!v || String(v).trim() === '') missing.push(f);
  }
  if (!['en', 'fr'].includes(row.locale)) missing.push('locale');
  for (const [key, qs] of Object.entries(FORM_DEF)) {
    const col = PILLAR_COLUMNS[key];
    const answers = row[col] || {};
    for (const q of qs) {
      if (!q.required) continue;
      const v = answers[q.id];
      const bad =
        q.type === 'textarea' ? (!v || String(v).trim() === '') :
        q.type === 'multiSelect' ? (!Array.isArray(v) || v.length === 0) :
        typeof v !== 'number';
      if (bad) missing.push(`${col}.${q.id}`);
    }
  }
  const ec = row.engagement_context || {};
  for (const id of ENGAGEMENT_QS) {
    const v = ec[id];
    if (!v || String(v).trim().length < 10) missing.push(`engagement_context.${id}`);
  }
  return missing;
}

const MESSAGES_DIR = process.env.READINESS_MESSAGES_DIR
  ?? join(homedir(), 'projects/MetaArchitect/projects/simonparis-website/messages');

export function loadMessages(locale) {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, locale, 'readinessDiagnostic.json'), 'utf8'));
}

const isEmpty = (v) =>
  v === undefined || v === null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

export function decodeIntake(row, messages) {
  const byKey = Object.fromEntries(messages.pillars.map(p => [p.key, p]));
  const pillars = [];
  for (const [key, qs] of Object.entries(FORM_DEF)) {
    const copy = byKey[key];
    const answers = row[PILLAR_COLUMNS[key]] || {};
    const qa = [];
    for (const q of qs) {
      const qCopy = copy?.questions?.[q.id] ?? {};
      const raw = answers[q.id];
      let answer;
      if (isEmpty(raw)) {
        answer = '(not answered)';
      } else if (q.type === 'select') {
        const opts = qCopy.options ?? [];
        answer = typeof raw === 'number' && opts[raw] !== undefined
          ? opts[raw] : `(unrecognized option: ${JSON.stringify(raw)})`;
      } else if (q.type === 'scale') {
        answer = `${raw}/5  (1 = "${qCopy.scaleLow}", 5 = "${qCopy.scaleHigh}")`;
      } else if (q.type === 'multiSelect') {
        answer = raw.join('; ');
      } else {
        answer = String(raw).trim();
      }
      qa.push({ id: q.id, label: qCopy.label ?? q.id, answer });
      if (q.followUp && !isEmpty(answers[q.followUp.id])) {
        const fuRaw = answers[q.followUp.id];
        qa.push({
          id: q.followUp.id,
          label: qCopy.followUp?.label ?? q.followUp.id,
          answer: Array.isArray(fuRaw) ? fuRaw.join('; ') : String(fuRaw).trim(),
        });
      }
    }
    pillars.push({ key, title: copy?.title ?? key, qa });
  }
  const f = messages.intro?.fields ?? {};
  const intro = [
    { label: f.system_name?.label ?? 'System', value: row.system_name },
    { label: f.role?.label ?? 'Role', value: row.role },
    { label: f.company_size?.label ?? 'Company size', value: row.company_size },
    { label: f.industry?.label ?? 'Industry', value: row.industry },
    { label: f.description?.label ?? 'System description', value: row.system_description },
    { label: f.prod_status?.label ?? 'Production status', value: row.prod_status },
    { label: f.regulations?.label ?? 'Regulations', value: (row.regulations ?? []).join('; ') },
  ];
  const ecCopy = byKey.engagement_context;
  const engagement = ENGAGEMENT_QS.map(id => ({
    label: ecCopy?.questions?.[id]?.label ?? id,
    answer: String((row.engagement_context ?? {})[id] ?? '').trim(),
  }));
  const transcriptText = [
    ...intro.map(x => `${x.label}: ${x.value}`),
    ...pillars.flatMap(p => p.qa.map(q => `${q.label}\n${q.answer}`)),
    ...engagement.map(q => `${q.label}\n${q.answer}`),
  ].join('\n\n');
  return { intro, pillars, engagement, transcriptText };
}
