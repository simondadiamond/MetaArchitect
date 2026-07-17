// Artifact scaffolding is localized so an FR row yields FR artifacts end-to-end
// (spec stage-5 gate: "language matches row locale"). LLM prose arrives already
// localized via the prompts; this map covers the fixed labels around it.
const L10N = {
  en: {
    briefTitle: 'Confirmation-Call Brief',
    briefIntro: 'Run the call FROM THIS BRIEF (diagnostic runbook block table). Blocks ordered most-optimistic first — rank 1 gets the longest block.',
    intakeRow: 'Intake row', analyzerRun: 'analyzer run', submitted: 'submitted', locale: 'locale',
    topFlags: '**Top optimism flags:**',
    dontSkip: '**Do not skip under time pressure:**',
    block: 'block',
    claim: '**The claim held:**', ask: '**The show-me ask:**', confirms: '**Confirms it:**', breaks: '**Breaks it:**',
    scTitle: 'Provisional STATE Scorecard',
    banner: '> **PROVISIONAL — scored from self-report only; confirms nothing (rubric rule 3). For engagement prep, never client delivery.**',
    proposed: 'proposed', confidence: 'confidence',
    optimismFlags: '**Optimism flags:**',
    total: (t) => `**Proposed total: ${t}/15.** Provisional totals are not bands — bands are earned live. Every score above gets re-judged by hand against the anchors before it goes anywhere: the analyzer proposes, the auditor disposes.`,
  },
  fr: {
    briefTitle: 'Brief d’appel de confirmation',
    briefIntro: 'Menez l’appel À PARTIR DE CE BRIEF (table des blocs du runbook diagnostic). Blocs ordonnés du plus optimiste au moins optimiste — le rang 1 reçoit le bloc le plus long.',
    intakeRow: 'Ligne d’intake', analyzerRun: 'exécution de l’analyseur', submitted: 'soumis le', locale: 'langue',
    topFlags: '**Principaux signaux d’optimisme :**',
    dontSkip: '**À ne pas sauter sous pression de temps :**',
    block: 'bloc',
    claim: '**L’affirmation à vérifier :**', ask: '**La démonstration demandée :**', confirms: '**Ce qui la confirme :**', breaks: '**Ce qui la brise :**',
    scTitle: 'Grille STATE provisoire',
    banner: '> **PROVISOIRE — noté à partir de l’auto-déclaration seulement; ne confirme rien (règle 3 de la rubrique). Pour la préparation de l’engagement, jamais pour livraison au client.**',
    proposed: 'proposé', confidence: 'confiance',
    optimismFlags: '**Signaux d’optimisme :**',
    total: (t) => `**Total provisoire proposé : ${t}/15.** Les totaux provisoires ne sont pas des paliers — les paliers se gagnent en direct. Chaque note ci-dessus est re-jugée à la main contre les ancres avant d’aller où que ce soit : l’analyseur propose, l’auditeur dispose.`,
  },
};

function l10n(locale) {
  const l = L10N[locale];
  if (!l) throw new Error(`no renderer localization for locale "${locale}"`);
  return l;
}

export function renderBrief({ brief, row, workflowId }) {
  const t = l10n(row.locale);
  const order = Object.entries(brief.blocks).sort((a, b) => a[1].rank - b[1].rank);
  const lines = [
    `# ${t.briefTitle} — ${row.system_name}`, '',
    `> ${t.briefIntro}`,
    `> ${t.intakeRow}: ${row.id} · ${t.analyzerRun} ${workflowId}`, '',
    t.topFlags,
    ...brief.top_flags.map(f => `- ${f}`), '',
    `${t.dontSkip} ${brief.hardest_asks.join(' · ')}`, '',
  ];
  for (const [key, b] of order) {
    lines.push(`## ${b.rank}. ${key.toUpperCase()} ${t.block}`, '',
      `${t.claim} ${b.claim}`, '',
      `${t.ask} ${b.ask}`, '',
      `${t.confirms} ${b.confirms}`, '',
      `${t.breaks} ${b.breaks}`, '');
  }
  return lines.join('\n');
}

export function renderScorecard({ scorecard, row, decoded, workflowId }) {
  const t = l10n(row.locale);
  const lines = [
    `# ${t.scTitle} — ${row.system_name}`, '',
    t.banner,
    '>',
    `> ${t.intakeRow}: ${row.id} · ${t.submitted} ${row.submitted_at ?? '(fixture)'} · ${t.locale} ${row.locale} · ${t.analyzerRun} ${workflowId}`, '',
  ];
  for (const [key, p] of Object.entries(scorecard.pillars)) {
    const title = decoded.pillars.find(d => d.key === key)?.title ?? key;
    lines.push(`## ${title} — ${t.proposed} ${p.level}/3 (${p.anchor}) · ${t.confidence} ${p.confidence}`, '', p.rationale, '');
    for (const q of p.quotes) lines.push(`> "${q}"`);
    if (p.optimism_flags.length) {
      lines.push('', t.optimismFlags);
      for (const f of p.optimism_flags) lines.push(`- ${f.claim} — ${f.why}`);
    }
    lines.push('');
  }
  lines.push('---', t.total(scorecard.total));
  return lines.join('\n');
}
