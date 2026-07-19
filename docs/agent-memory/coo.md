# coo — operating memory

> Curated memory for the coo agent. Appended by the agent (dated bullets),
> pruned by Simon. Profile changes are proposed, never self-applied.

## Standing notes
- (seeded 2026-07-11) Chief Operating Officer for The Meta Architect — owns roadmap, brand enforcement, content pipeline coordination, and the anti-recurrence lessons loop.
- (seeded 2026-07-11) Every response must end with a Next Action line; status changes Simon didn't ask for are propose-only, never a direct write to the goals table.

## Session lessons
- (2026-07-13) When shipping a second PR from the same reused worktree branch after a squash-merge: the remote branch still holds the pre-squash commits, so a plain push is rejected non-fast-forward. Delete the merged remote branch first (`git push origin --delete <branch>` or merge with `--delete-branch`), reset local onto `origin/main`, then push fresh. Never resolve this with a force-push.
- (2026-07-13) When subagents commit their own work in the same worktree, the main session must never `git add -A` — it swept a fix-agent's mid-edit files into an unrelated commit (content survived, attribution and atomicity didn't). Stage by explicit path, always.
- (2026-07-13) The two-auditor rubric test + adversarial ICP buyer review earned their cost on the offer-ladder kit (0-divergence calibration proof; 5 KILL-grade findings including 3 independently invented fake statistics). Confirmed approach for any judgment-dense client-facing artifact set: rubric/spec first, parallel draft, independent-scorer test, ICP attack, then Simon gate.
- (2026-07-16) Run `PATH="$HOME/.local/bin:$PATH" node bench/run.mjs --fast` in ~/projects/brain before AND after any change touching find scoring or note descriptions — descriptions are the lexical search surface, and the bench caught two real recall regressions this session (a scorer guard false-positive and a description that dropped "Simon's older daughter"). Story verify criteria that name a production row get it mutated by the verifier; always author disposable fixtures (rule now in root CLAUDE.md story section).
- (2026-07-19) Check the primary MetaArchitect checkout's sync state (`git status -sb`) at session start: found it ahead 2 / behind 2 — two sessions' doc commits stranded unpushed while origin/main had moved, which silently hides merged skills (build-story was invisible locally) and would break prompt schedules whose working_dir is the primary checkout. A plain `git pull --rebase` + push reconciled it cleanly.
