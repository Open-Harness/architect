# CI-drafts: drafts run no CI, a pull request runs CI once when it is ready, and `main` no longer requires up to date

Decided 21 November 2026 by the conductor, on Aaron's ask that day: "what can we do right now to fix this issue", and
"cutting back on unnecessary CI usage in the first place… maybe this should only be running on batches of work".

## The problem, measured

CI was the bottleneck across the lanes. From 06:00 to about 10:00 UTC on 21 November, the `ci` workflow started 161 runs
(about 5,670 job-minutes). 83 of the 120 pull request runs were cancelled before they finished, because a newer push or a
base merge replaced them: about 2,100 job-minutes, 37% of the total, thrown away. The repository is public, so GitHub's
runners cost nothing, but a free account runs only 20 jobs at once and one run is about ten jobs, so the waste queued
the real work behind it. Two causes: every push to an open pull request ran all of CI, and `main` required a branch to be
up to date, so every merge to `main` made every open pull request into `main` run again.

## The call

1. **A draft pull request runs no CI.** Every job in `ci.yml` starts with `github.event.pull_request.draft != true` (_Superseded by
   CI-drafts-race, 21 November 2026: every job in `ci.yml` needs `ready`, which reads the pull request's live draft
   state_), and
   `ready_for_review` starts a run. Open pull requests as drafts; mark one ready when its local checks are green and a
   🔍 reviewer has passed it (the reviewer reads the draft's diff). Push after that only to answer review or CI. A draft
   cannot merge, so a skipped job on a draft never lets anything through. (_Superseded by CI-drafts-race, 21 November
   2026: a draft-payload run can arrive after the ready one, and its suite is the one branch protection reads; every
   job now goes by the live draft state._)
2. **Test locally first.** Before marking ready, run the checks the change touches on your machine (`nx affected` or the
   named targets), and push once rather than once per fix.
3. **`main` no longer requires up to date** (`strict: false`, set 21 November 2026). `main`'s own push run still checks
   every merge, and the goal branches already work this way (CI-branch-protection).
4. **Batch where you can.** A lane keeps at most two non-draft pull requests in CI at once, and folds small fixes into the
   next pull request instead of opening one each.

Goal branches carry their own `ci.yml`. Each lead adds the same guard to its branch's extra jobs when it next merges
`main` in.

Left for later: running only the e2e suites a change touches (an `nx affected` gate in `changes`; superseded by
CI-integration B3, 22 November 2026), and a runner of our own. GitHub's merge queue would batch merges, but it needs the repository in an organisation.

## Supersedes

- `.agents/skills/conductor/SKILL.md`: "**A fresh CI run:** green on a head that includes the current `main`." → "**A fresh CI run:** green on the head that will merge; `main` checks every merge on its own push run (CI-drafts)."
- `.github/workflows/ci.yml`: "main is strict, so every pull request reruns all of CI each time another lands" → "a docs change cannot move them"
- `design/decisions/CI-docs-fast-path.md` (dated, noted in place): "**Main stays strict.**" → "`main` no longer requires up to date; its own push run checks every merge"
- `design/decisions/CI-branch-protection.md` (dated, noted in place): "the branch must contain the current `main` before it merges" → "`false` on `main` now"
- `.agents/skills/threads/SKILL.md`: "CI ran on a head that includes the" → "CI is green on the head that will merge; the target branch's own push run checks every merge"
- `design/decisions/CI-speed.md` (dated, noted in place): "Still no." → "turned off; `main`'s own push run checks every merge"
- `design/decisions/CI-speed.md` (dated, noted in place): "`main` is strict" → "`main` is not strict since 21 November"
