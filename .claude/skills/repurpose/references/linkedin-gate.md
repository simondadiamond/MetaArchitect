# LinkedIn Copy Gate — shared validation for ALL LinkedIn post producers

> The single mechanical + judgment gate for any skill that generates LinkedIn copy:
> `/repurpose` (Step 5), `write-post` (LINKEDIN_EXTRACT), `teardown-generate` (linkedin_post).
> One canonical copy. If a check needs to change, change it HERE — never fork a local variant.
> Companion: `linkedin-playbook.md` (platform mechanics), `brand/brand-summary.md` (voice).

A candidate passes this gate **before being shown to Simon** and re-passes it (post-edit) before any write. A failure means rewrite the offending line and re-run — never present or save a failing candidate, never silently lower the bar.

## Mechanical checks (write the candidate to a temp file and verify)

```bash
wc -w candidate.txt   # 180–300 words (post text only, excluding first comment)
grep -c '—' candidate.txt                                      # must be 0 — zero em dashes (Simon's call, 2026-07-05; ICP reads them as the ChatGPT signature)
grep -inE "it'?s not [^.]{1,60}, (it'?s|it is)" candidate.txt  # must be 0 (LinkedIn's publicly named AI-tell shape)
grep -inE "comment yes|agree\?|thoughts\?|tag (a|someone)|repost if|let that sink in|read that again|excited to share|thrilled to announce|game.chang|revolutionary|groundbreaking|transformational|cutting.edge|state.of.the.art|in today's fast|in the age of ai" candidate.txt   # must be 0
head -1 candidate.txt | wc -c    # hook line ≤ ~140 chars (mobile fold)
grep -cE '\]\(' candidate.txt    # must be 0 — LinkedIn strips markdown; write URLs bare
grep -coE 'https?://' candidate.txt   # ≤ 1 — one bare URL in the body is allowed (see link rule)
grep -icE 'simonparis\.ca/readiness' candidate.txt   # must be 0 — public CTAs go to /score, never /readiness
```

**Link rule (updated 2026-07-21, Simon's call — body is the DEFAULT):** the post's one link goes IN THE BODY (2026 algorithm: mild penalty only when the post stands alone; link-in-first-comment is obsolete advice per the playbook's sources — Buffer Dec 2025, Dataslayer Feb 2026). Max one URL, bare (no markdown), never in the hook line, never the only payload of its line's paragraph until after the close, and the post must deliver its core insight without the click. The first comment is for BONUS VALUE (added mechanism, the fix line, a supporting detail) — and is the overflow slot when a post needs a second link (e.g. /score in body, blog link in comment).

## Judgment checks

- [ ] Anatomy holds: hook / setup / turn / lesson / close, blank-line separated (playbook "Post anatomy")
- [ ] Close is ONE specific practitioner question (answerable only with production scar tissue) OR a one-line STATE tie-in — not both, not generic
- [ ] Something referenceable a reader would **save** (score, checklist, field list, taxonomy, test)
- [ ] Burned-practitioner test, specificity test, thesis-alignment test (`brand/brand-summary.md`)
- [ ] Full playbook **anti-slop checklist** — every box
- [ ] **Source-number fidelity**: quote stats at source precision with the source's unit ("65%+ of approvals", "10–15% of expenses") — never round, floor, or swap the unit; rephrase *around* the number instead
- [ ] **Claim provenance + scope** (2026-07-07 — the Ramp 65% incident): for every external-world claim — numbers, process narratives ("ran in shadow mode"), attributed statements ("ZenML says…") — find the verbatim sentence in the long-form source that carries it, and check the long-form source itself links a primary URL for it. Preserve scope qualifiers ("at Ramp itself", "more than", "since deployment"). Conclusions drawn from a source's *silence* are yours — never put them in the source's mouth. If a claim can't be chased to a primary source sentence, cut it — a punchier hook is never worth an unattributable claim, and the hook is the line screenshots travel with.
- [ ] **No implied incidents**: a present-tense failure narrative next to a named company's real metrics reads as "this happened at X" — keep hypotheticals clearly hypothetical; this brand never fabricates
- [ ] **`/score` CTA cadence**: query the last 2 LinkedIn rows in `pipeline.posts` (shipped/drafted); if neither mentions `/score`, this post carries the soft CTA (body close or seeded first comment), phrased as a practitioner sharing a tool — never a marketer pushing a download

## Failure format

```
❌ [calling skill] failed at candidate_gate — [which check failed on which candidate] — nothing written
```
