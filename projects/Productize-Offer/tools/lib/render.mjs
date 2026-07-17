export function renderBrief({ brief, row, workflowId }) {
  const order = Object.entries(brief.blocks).sort((a, b) => a[1].rank - b[1].rank);
  const lines = [
    `# Confirmation-Call Brief — ${row.system_name}`, '',
    '> Run the call FROM THIS BRIEF (diagnostic runbook block table). Blocks ordered most-optimistic first — rank 1 gets the longest block.',
    `> Intake row: ${row.id} · analyzer run ${workflowId}`, '',
    '**Top optimism flags:**',
    ...brief.top_flags.map(f => `- ${f}`), '',
    `**Do not skip under time pressure:** ${brief.hardest_asks.join(' · ')}`, '',
  ];
  for (const [key, b] of order) {
    lines.push(`## ${b.rank}. ${key.toUpperCase()} block`, '',
      `**The claim held:** ${b.claim}`, '',
      `**The show-me ask:** ${b.ask}`, '',
      `**Confirms it:** ${b.confirms}`, '',
      `**Breaks it:** ${b.breaks}`, '');
  }
  return lines.join('\n');
}

export function renderScorecard({ scorecard, row, decoded, workflowId }) {
  const lines = [
    `# Provisional STATE Scorecard — ${row.system_name}`, '',
    '> **PROVISIONAL — scored from self-report only; confirms nothing (rubric rule 3). For engagement prep, never client delivery.**',
    '>',
    `> Intake row: ${row.id} · submitted ${row.submitted_at ?? '(fixture)'} · locale ${row.locale} · analyzer run ${workflowId}`, '',
  ];
  for (const [key, p] of Object.entries(scorecard.pillars)) {
    const title = decoded.pillars.find(d => d.key === key)?.title ?? key;
    lines.push(`## ${title} — proposed ${p.level}/3 (${p.anchor}) · confidence ${p.confidence}`, '', p.rationale, '');
    for (const q of p.quotes) lines.push(`> "${q}"`);
    if (p.optimism_flags.length) {
      lines.push('', '**Optimism flags:**');
      for (const f of p.optimism_flags) lines.push(`- ${f.claim} — ${f.why}`);
    }
    lines.push('');
  }
  lines.push('---',
    `**Proposed total: ${scorecard.total}/15.** Provisional totals are not bands — bands are earned live. Every score above gets re-judged by hand against the anchors before it goes anywhere: the analyzer proposes, the auditor disposes.`);
  return lines.join('\n');
}
