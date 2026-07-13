#!/usr/bin/env python3
"""
teardown-gate.py — the teardown-generate Pre-Write Checklist (Gates 1-11) as a callable
script. Promoted verbatim-faithfully from .claude/skills/teardown-generate/SKILL.md Step 4
("Pre-Write Checklist") on 2026-07-13 (post-Fable gate build, goal 3df3143e). Gate semantics
are the skill's; if a gate needs to change, change the skill AND this file together.

Usage:
    python3 tools/teardown-gate.py <payload.json>
    python3 tools/teardown-gate.py --self-test

Payload keys (all produced by the generate step, before any INSERT):
    state_scores   {s|t|a|tol|e: {score: 0|1|2, reasoning: str}}
    gaps           [{pillar, gap, consequence, severity}]           (>=2)
    remediation    [{pillar, recommendation, priority}]             (>=2)
    full_content   str  (the full teardown markdown)
    linkedin_post  str
    dm_template    str
    alt_hooks      [str]
    source_urls    [str]  (every research source must be linked in full_content)
    founding_live  bool (optional) — overrides the live simonparis.ca/work-with-me check;
                   env TEARDOWN_FOUNDING_LIVE=0|1 also works. Without either, the script
                   fetches the live page exactly as the skill specifies (the only network call).

Prints one PASS/FAIL line per gate; exit 1 if any gate fails.
Also exports esc() and build_upsert_sql() — the skill's idempotent-write helper (SQL text
only; execution stays with the caller's supabase_sql path).
"""
import json
import os
import re
import sys


def esc(v):
    """The skill's SQL-literal escaper (Step 4)."""
    return (str(v) if v is not None else '').replace("'", "''")


PILLARS = {'s', 't', 'a', 'tol', 'e'}


def _founding_live(payload):
    """Founding CTA is conditional on the LIVE page (skill Step 4: a temporary condition
    must be code, not a comment). Overridable for offline runs/tests."""
    if 'founding_live' in payload:
        return bool(payload['founding_live'])
    env = os.environ.get('TEARDOWN_FOUNDING_LIVE')
    if env is not None:
        return env == '1'
    import urllib.request as _ur
    try:
        _page = _ur.urlopen(_ur.Request('https://simonparis.ca/work-with-me',
                                        headers={'User-Agent': 'Mozilla/5.0'}),
                            timeout=20).read().decode('utf-8', 'replace')
        return 'founding' in _page.lower()
    except Exception:
        return False   # page unreachable/gone -> treat the program as not live


def run_gates(payload):
    """Run Gates 1-11. Returns (results, ok) where results is [(gate_name, ok, message)]."""
    results = []

    def gate(name):
        def wrap(fn):
            try:
                fn()
                results.append((name, True, ''))
            except AssertionError as e:
                results.append((name, False, str(e)))
            except KeyError as e:
                results.append((name, False, f'payload missing key: {e}'))
        return wrap

    state_scores  = payload.get('state_scores', {})
    gaps          = payload.get('gaps', [])
    remediation   = payload.get('remediation', [])
    full_content  = payload.get('full_content', '')
    linkedin_post = payload.get('linkedin_post', '')
    dm_template   = payload.get('dm_template', '')
    alt_hooks     = payload.get('alt_hooks', [])
    source_urls   = payload.get('source_urls', [])

    @gate('gate1_state_scores')
    def _():
        # Gate 1: state_scores has all 5 pillars with non-empty reasoning
        for p in ('s', 't', 'a', 'tol', 'e'):
            assert p in state_scores, f"missing pillar: {p}"
            assert state_scores[p]['score'] in (0, 1, 2), f"{p}: score must be 0/1/2"
            assert len(state_scores[p]['reasoning'].split()) >= 20, \
                f"{p}: reasoning too short (need 2-4 sentences)"

    @gate('gate2_gaps')
    def _():
        # Gate 2: gaps array has >=2 fully-populated entries
        assert len(gaps) >= 2, "need at least 2 gaps"
        for i, g in enumerate(gaps):
            for k in ('pillar', 'gap', 'consequence', 'severity'):
                assert g.get(k), f"gap[{i}] missing or empty: {k}"
            assert g['severity'] in ('high', 'medium', 'low'), f"gap[{i}] bad severity"

    @gate('gate2b_pillar_enum')
    def _():
        # Gate 2b: pillar enum — normalize case, then require the literal allowed values
        # (lessons.md 2026-07-05: every enum-constrained field must show its literal allowed values)
        for i, entry in enumerate(gaps + remediation):
            entry['pillar'] = str(entry['pillar']).lower()
            assert entry['pillar'] in PILLARS, \
                f"entry[{i}] bad pillar {entry['pillar']!r} — must be one of 's','t','a','tol','e'"

    @gate('gate3_remediation')
    def _():
        # Gate 3: remediation array has >=2 fully-populated entries
        assert len(remediation) >= 2, "need at least 2 remediation items"
        for i, r in enumerate(remediation):
            for k in ('pillar', 'recommendation', 'priority'):
                assert r.get(k) not in (None, '', []), f"remediation[{i}] missing or empty: {k}"

    @gate('gate4_score_cta')
    def _():
        # Gate 4: full_content ends with the canonical /score CTA (lessons.md 2026-05-09)
        assert '[Take the STATE assessment →](/score)' in full_content, \
            "full_content must end with the canonical /score CTA, not a series description"

    @gate('gate5_li_word_count')
    def _():
        # Gate 5: linkedin_post word count is 180-300 (repurpose linkedin playbook, 2026-07-05)
        lp_words = len(linkedin_post.split())
        assert 180 <= lp_words <= 300, f"linkedin_post is {lp_words} words; must be 180-300"

    @gate('gate6_gets_right')
    def _():
        # Gate 6: "Gets Right" section present (credibility gate — gaps must read as diagnosis, not attack)
        assert 'Gets Right' in full_content, "missing 'What [System] Gets Right' section"

    @gate('gate7_score_yourself')
    def _():
        # Gate 7: every gap closes with a self-score question
        assert full_content.count('**Score yourself:**') >= len(gaps), \
            "each gap section must close with a **Score yourself:** line"

    @gate('gate8_what_good_looks_like')
    def _():
        # Gate 8: 'What Good Looks Like' section exists and contains a fenced artifact snippet
        assert '## What Good Looks Like' in full_content, "missing '## What Good Looks Like' section"
        wgll = full_content.split('## What Good Looks Like')[1].split('\n## ')[0]
        assert '```' in wgll, "What Good Looks Like must include a fenced artifact snippet"

    @gate('gate9_faq')
    def _():
        # Gate 9: FAQ section present
        assert '## FAQ' in full_content, "missing 3-question FAQ section"

    @gate('gate10_question_headings')
    def _():
        # Gate 10: >= 2 question-form H2/H3 headings (AEO)
        _qh = [h for h in re.findall(r'^#{2,3} (.+)$', full_content, re.M) if h.strip().endswith('?')]
        assert len(_qh) >= 2, f"need >= 2 question-form headings, found {len(_qh)}"

    @gate('gate10b_links')
    def _():
        # Gate 10b: links (lessons: Ramp teardown 2026-07-05 shipped with zero hyperlinks)
        _links = re.findall(r'\[[^\]]*\]\((\S+?)\)', full_content)
        for _src in source_urls:   # every research source must be linked
            assert f']({_src})' in full_content, f"source not linked: {_src}"
        _int = [u for u in _links if u.startswith('/') and u not in ('/score', '/work-with-me')]
        assert _int, "need an internal link beyond the CTA lines (e.g. [teardown](/blog))"

    @gate('gate10b_founding_cta')
    def _():
        founding_live = _founding_live(payload)
        if founding_live:
            assert '](/work-with-me)' in full_content, "founding program live: include the founding CTA"
        else:
            assert '](/work-with-me)' not in full_content, \
                "founding program not live: drop the founding CTA (keep only the /score CTA)"

    @gate('gate10b_li_no_markdown_links')
    def _():
        assert not re.search(r'\[[^\]]*\]\(\S+?\)', linkedin_post), \
            "linkedin_post: no markdown links — LinkedIn strips markdown; if it carries a URL it is bare, max 1 (shared linkedin-gate rule)"

    @gate('gate10c_em_dashes')
    def _():
        # Gate 10c: em-dash budget (dense em dashes read as generated text)
        _w = len(full_content.split())
        assert full_content.count('—') <= max(8, -(-_w // 150)), \
            f"{full_content.count('—')} em dashes in {_w} words — vary the punctuation"
        # LinkedIn surfaces: ZERO em dashes (the ICP reads them as the ChatGPT signature)
        assert '—' not in linkedin_post, "linkedin_post: zero em dashes"
        assert '—' not in dm_template, "dm_template: zero em dashes"
        assert all('—' not in h for h in alt_hooks), "alt_hooks: zero em dashes"

    @gate('gate11_outreach_kit')
    def _():
        # Gate 11: outreach kit populated
        assert 40 <= len(dm_template.split()) <= 80, \
            f"dm_template is {len(dm_template.split())} words; must be 40-80"
        assert '{name}' in dm_template and '{their_pattern}' in dm_template, \
            "dm_template must keep personalization placeholders"
        assert len(alt_hooks) >= 2, "need >= 2 alternate LinkedIn hooks"

    return results, all(ok for _, ok, _ in results)


def build_upsert_sql(payload, candidate, workflow_id, model_id, existing_draft_id=None):
    """The skill's idempotent-write helper (Step 4 "Idempotent write" block), as SQL text.

    A rerun after a crash, or a deliberate regenerate, must UPDATE the existing
    non-archived draft — a second row for the same candidate is a bug, not a version.
    Caller finds `existing_draft_id` via:
        SELECT id, status FROM pipeline.teardown_drafts
        WHERE candidate_id = '<id>' AND status != 'archived'
        ORDER BY created_at DESC LIMIT 1
    and executes the returned SQL through its supabase_sql path.
    Column note: outreach lives in an `outreach` jsonb column; add idempotently if absent:
        ALTER TABLE pipeline.teardown_drafts ADD COLUMN IF NOT EXISTS outreach jsonb;
    """
    outreach = {'dm_template': payload['dm_template'], 'alt_hooks': payload['alt_hooks']}
    log_entry = json.dumps({'step': 'generate', 'model': model_id,
                            'output_summary': 'full teardown generated',
                            'workflow_id': workflow_id}).replace("'", "''")
    j = lambda v: json.dumps(v).replace("'", "''")

    if existing_draft_id:
        return f"""
    UPDATE pipeline.teardown_drafts SET
      system_summary = '{esc(candidate['description'])}',
      state_scores   = '{j(payload['state_scores'])}'::jsonb,
      gaps           = '{j(payload['gaps'])}'::jsonb,
      remediation    = '{j(payload['remediation'])}'::jsonb,
      full_content   = '{esc(payload['full_content'])}',
      linkedin_post  = '{esc(payload['linkedin_post'])}',
      outreach       = '{j(outreach)}'::jsonb,
      post_angle     = '{esc(payload.get('post_angle', ''))}',
      blog_slug      = '{esc(payload.get('blog_slug', ''))}',
      status         = 'draft',
      workflow_id    = '{workflow_id}',
      generation_log = generation_log || '[{log_entry}]'::jsonb,
      updated_at     = now()
    WHERE id = '{existing_draft_id}'
"""
    return f"""
    INSERT INTO pipeline.teardown_drafts
      (candidate_id, system_summary, state_scores, gaps, remediation,
       full_content, linkedin_post, outreach, post_angle, blog_slug, status, workflow_id, generation_log)
    VALUES (
      '{candidate['id']}',
      '{esc(candidate['description'])}',
      '{j(payload['state_scores'])}'::jsonb,
      '{j(payload['gaps'])}'::jsonb,
      '{j(payload['remediation'])}'::jsonb,
      '{esc(payload['full_content'])}',
      '{esc(payload['linkedin_post'])}',
      '{j(outreach)}'::jsonb,
      '{esc(payload.get('post_angle', ''))}',
      '{esc(payload.get('blog_slug', ''))}',
      'draft',
      '{workflow_id}',
      '[{log_entry}]'::jsonb
    ) RETURNING id
"""


# ------------------------------------------------------------------ self-test
def _passing_payload():
    reasoning = ('The system persists a typed state object per run and every stage transition '
                 'is recorded, so a crash at any step can be diagnosed and resumed from the '
                 'stored position rather than restarted blind.')  # >= 20 words
    li = 'Your agent failed at 2am and the logs show nothing.\n\n' + \
         ' '.join(f'word{i}' for i in range(200))
    full = '\n'.join([
        '# Teardown: ExampleSys',
        '## What ExampleSys Gets Right',
        'Solid ingestion. See the [pipeline docs](https://example.com/src1).',
        '## Where Does Traceability Break?',
        'The gap. **Score yourself:** can you replay a failure?',
        '## What Happens After a Crash?',
        'The other gap. **Score yourself:** where does step 6 resume?',
        'More context in [our earlier teardown](/blog/earlier-teardown).',
        '## What Good Looks Like',
        '```json',
        '{"workflowId": "uuid", "stage": "verify"}',
        '```',
        '## FAQ',
        'Q&A here.',
        '',
        '[Take the STATE assessment →](/score)',
    ])
    return {
        'state_scores': {p: {'score': 1, 'reasoning': reasoning} for p in ('s', 't', 'a', 'tol', 'e')},
        'gaps': [
            {'pillar': 't', 'gap': 'no call logs', 'consequence': 'irreproducible failures', 'severity': 'high'},
            {'pillar': 's', 'gap': 'no state object', 'consequence': 'restarts from step 1', 'severity': 'medium'},
        ],
        'remediation': [
            {'pillar': 't', 'recommendation': 'log every LLM call with workflow_id', 'priority': 1},
            {'pillar': 's', 'recommendation': 'typed state object per run', 'priority': 2},
        ],
        'full_content': full,
        'linkedin_post': li,
        'dm_template': ('Hey {name}, saw your write-up on {their_pattern} and it maps exactly to a '
                        'failure class I keep tearing down: silent state loss between retries. I '
                        'scored a similar system this week and two gaps stood out. Happy to share '
                        'the scorecard if useful, zero pitch, just trading production notes.'),
        'alt_hooks': ['Hook two about silent retries.', 'Hook three about missing traces.'],
        'source_urls': ['https://example.com/src1'],
        'founding_live': False,
    }


def _self_test():
    import copy
    tpass = tfail = 0

    def expect(name, payload, want_ok, want_failing_gate=None):
        nonlocal tpass, tfail
        results, ok = run_gates(payload)
        failed = [n for n, g_ok, _ in results if not g_ok]
        if ok == want_ok and (want_failing_gate is None or want_failing_gate in failed):
            print(f"PASS self-test: {name}")
            tpass += 1
        else:
            print(f"FAIL self-test: {name} — ok={ok}, failed gates={failed}")
            tfail += 1

    good = _passing_payload()
    expect('passing payload passes all gates', good, True)

    p = copy.deepcopy(good); p['state_scores']['t']['reasoning'] = 'too short'
    expect('short pillar reasoning fails gate1', p, False, 'gate1_state_scores')

    p = copy.deepcopy(good); p['gaps'] = p['gaps'][:1]
    expect('<2 gaps fails gate2', p, False, 'gate2_gaps')

    p = copy.deepcopy(good); p['gaps'][0]['pillar'] = 'X'
    expect('bad pillar value fails gate2b', p, False, 'gate2b_pillar_enum')

    p = copy.deepcopy(good); p['gaps'][0]['pillar'] = 'TOL'
    expect('uppercase pillar normalizes and passes', p, True)

    p = copy.deepcopy(good)
    p['full_content'] = p['full_content'].replace('[Take the STATE assessment →](/score)', '')
    expect('missing /score CTA fails gate4', p, False, 'gate4_score_cta')

    p = copy.deepcopy(good); p['linkedin_post'] = 'way too short'
    expect('short linkedin_post fails gate5', p, False, 'gate5_li_word_count')

    p = copy.deepcopy(good); p['linkedin_post'] = good['linkedin_post'] + ' — and an em dash'
    expect('em dash in LI post fails gate10c', p, False, 'gate10c_em_dashes')

    p = copy.deepcopy(good); p['founding_live'] = True
    expect('founding live but no founding CTA fails gate10b', p, False, 'gate10b_founding_cta')

    p = copy.deepcopy(good); p['source_urls'] = ['https://example.com/UNLINKED']
    expect('unlinked source fails gate10b_links', p, False, 'gate10b_links')

    p = copy.deepcopy(good); p['dm_template'] = 'Hey {name} about {their_pattern}.'
    expect('short dm_template fails gate11', p, False, 'gate11_outreach_kit')

    # upsert helper sanity: escapes quotes, emits both branches
    cand = {'id': 'abc-123', 'description': "it's got quotes"}
    ins = build_upsert_sql(good, cand, 'wf-1', 'test-model')
    upd = build_upsert_sql(good, cand, 'wf-1', 'test-model', existing_draft_id='d-1')
    if "it''s got quotes" in ins and 'INSERT INTO pipeline.teardown_drafts' in ins \
            and "WHERE id = 'd-1'" in upd and 'UPDATE pipeline.teardown_drafts' in upd:
        print('PASS self-test: build_upsert_sql escapes + both branches'); tpass += 1
    else:
        print('FAIL self-test: build_upsert_sql output wrong'); tfail += 1

    print(f"\nteardown-gate self-test: {tpass} pass, {tfail} fail")
    return tfail == 0


if __name__ == '__main__':
    args = sys.argv[1:]
    if args == ['--self-test']:
        sys.exit(0 if _self_test() else 1)
    if len(args) != 1 or args[0].startswith('-'):
        print('usage: teardown-gate.py <payload.json> | --self-test'); sys.exit(2)
    with open(args[0]) as f:
        payload = json.load(f)
    results, ok = run_gates(payload)
    for name, g_ok, msg in results:
        print(f"{'PASS' if g_ok else 'FAIL'} {name}" + ('' if g_ok else f" — {msg}"))
    print()
    if ok:
        print('teardown-gate: ALL GATES PASS — safe to INSERT')
    else:
        print('teardown-gate: FAILED — fix the offending field(s); do NOT INSERT a draft that fails any gate')
    sys.exit(0 if ok else 1)
