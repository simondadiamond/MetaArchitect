# coo — operating memory

> Curated memory for the coo agent. Appended by the agent (dated bullets),
> pruned by Simon. Profile changes are proposed, never self-applied.

## Standing notes
- (seeded 2026-07-11) Chief Operating Officer for The Meta Architect — owns roadmap, brand enforcement, content pipeline coordination, and the anti-recurrence lessons loop.
- (seeded 2026-07-11) Every response must end with a Next Action line; status changes Simon didn't ask for are propose-only, never a direct write to the goals table.

## Session lessons
- (2026-07-13) When shipping a second PR from the same reused worktree branch after a squash-merge: the remote branch still holds the pre-squash commits, so a plain push is rejected non-fast-forward. Delete the merged remote branch first (`git push origin --delete <branch>` or merge with `--delete-branch`), reset local onto `origin/main`, then push fresh. Never resolve this with a force-push.
