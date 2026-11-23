# Branch protection, and the CI guards behind it

19 November 2026. Proposals 2, 4 (the closed-PR half), 6 and 8 (the mechanical half) in `design/process/proposals.md`,
applied by the ci-guards thread on Aaron's "Yes, apply them" (19 November 2026), which is his written yes to proposal 2.

> Superseded by CI-codex-advisory, 20 November 2026: `codex-finished` is no longer a required check on any branch. It
> still runs, as an advisory status, and the 🔍 reviewer's pass is the merge gate
> ([`CI-codex-advisory.md`](CI-codex-advisory.md)). The rest stands.

## Why

Nothing enforced the landing rules. #127 merged into `main` with three checks still running; Codex findings sat up to 17
hours unanswered and two merged with their findings open; builders edited the journeys, evals or checks that judge them
five times in three days (`design/process/patterns.md`). The rules were right and written down; GitHub let every one
of them be skipped.

## What GitHub now refuses

### `main`

Set with `gh api -X PUT repos/AaronAbuUsama/architect/branches/main/protection`:

```json
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "check" },
      { "context": "e2e-layer1" },
      { "context": "e2e-layer2" },
      { "context": "e2e-m0" },
      { "context": "builder-paths" },
      { "context": "codex-finished" }
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "required_conversation_resolution": true,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

- **The checks** are every job `main`'s `ci.yml` runs (`check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, and
  `builder-paths`, which is skipped, and so passes, on anything but a `-build` branch (_Superseded by CI-drafts-race,
  21 November 2026: it runs and passes at once on anything but a `-build` branch_)), plus the `codex-finished` status
  (Superseded by CI-codex-advisory, 20 November 2026: no longer required).
- **`strict`** (_Superseded by CI-drafts, 21 November 2026: `false` on `main` now_): the branch must contain the current `main` before it merges, so the green run is of what will land (the
  conductor's landing rule 2, "a fresh CI run on a head that includes the current `main`").
- **Conversation resolution**: every review thread, Codex's included, is resolved before the merge.
- **No required approvals**: the agents merge their own pull requests (`AGENTS.md`); the 🔍 pass stays the conductor's
  landing rule, not a GitHub review.
- **`enforce_admins: true`**, against the proposal's `false`. Every agent and Aaron act through Aaron's admin account, so
  with it off the protection binds no one: `gh pr merge --admin`, the API's merge endpoint or a local merge and push
  skip every check with a warning. With it on, a merge waits for green like everyone else's. To merge around it in an
  emergency, Aaron removes the protection (below) and puts it back.

### `m1` and `goal/stage-1`

Agreed with the Goal 3 lead on 19 November 2026. Both have the same shape as `main`, with `enforce_admins: true`,
conversation resolution required, no required approvals, and no force pushes or deletions. The differences:

| | `m1` | `goal/stage-1` |
|---|---|---|
| Required checks | `check`, `portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `codex-finished` | `check`, `portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `e2e-m1`, `e2e-climb`, `e2e-grid`, `codex-finished` |
| Left out | `e2e-m1`, which is `continue-on-error` on `m1` | nothing; `e2e-m1` is a real gate through the ratchet (`e2e/ratchet/`) |
| `strict` | `true` (`m1` is finished at 5d2887ca; only a merge of `main` is expected) | `false`: slices merge side by side, and an up-to-date rule would rerun the 45-minute jobs after every merge |
| `codex-finished` | Superseded by CI-codex-advisory, 20 November 2026: dropped from `m1`'s list | Superseded by CI-codex-advisory, 20 November 2026: dropped from `goal/stage-1`'s list |
| When | once #125 (timeouts, push groups) had landed on `m1` | once #110 (`e2e-climb`, `e2e-grid`) had landed on `goal/stage-1` |

- **`codex-finished`** (Superseded by CI-codex-advisory, 20 November 2026: required on no branch) is added to a branch
  only once it has been seen posted on a real pull request into that branch, so a status that never arrives cannot stall every merge.
- **`builder-paths`** is added to each once that branch's `ci.yml` has it (when `main` is next merged in), for the same
  reason.
- **`enforce_admins: true`** costs the leads nothing: every merge into `goal/stage-1` already goes through
  `gh pr merge --merge` (the "Merge PR #n" subjects are set with `--subject`), and direct pushes go only to `goal-3/*`
  pull request branches.

### `goal/on-chain`

Goal 4's branch (K26 item 4), protected on 21 November 2026 in the same shape as `goal/stage-1`: `enforce_admins: true`,
conversation resolution required, no required approvals, no force pushes or deletions, and `strict: false`. Its
required checks are the nine `goal/stage-1` had that day: `check`, `portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`,
`e2e-m1`, `e2e-climb`, `e2e-grid` and `builder-paths`. Read back with
`gh api repos/AaronAbuUsama/architect/branches/goal%2Fon-chain/protection` on 21 November 2026. A check added to
`goal/stage-1` later (`e2e-stage1`, K28) joins this list only once `goal/on-chain` runs it. The done check's own job,
`e2e-on-chain`, joined on 21 November 2026, once slice 2 had added it and it had run green
([#279](https://github.com/AaronAbuUsama/architect/pull/279)): ten required checks, read back the same day.

## The checks that are new

- **`codex-finished`** (`.github/workflows/codex-finished.yml`, `tools/ci/codex-state.sh`; Superseded by CI-codex-advisory, 20
  November 2026: advisory, required nowhere): a commit status on a pull request's head. Codex keeps one summary comment per pull request, with a machine-readable line
  (`<!-- codex-review-state:v1 {…} -->`), and edits it as its reviews start and finish. The workflow reads that line,
  from the Codex app's own comment only, and posts `success` once every review Codex started has completed, `pending`
  while one is running or when Codex has not reviewed at all ("comment @codex review"). It runs from `main` for every
  pull request whatever its base, on Codex's comments, on every `ci` run a push starts (so a new
  head gets its own status), and by hand (`gh workflow run codex-finished -f pr=<n>`). It never checks out a pull
  request's code. Findings are review threads, which conversation resolution holds, so the status does not count them.
  A review covers the head only if Codex reviewed that exact commit, or if every commit since is a clean merge from the
  base branch (`tools/ci/codex-covers.sh`; amended 19 November 2026 at the conductor's request). Each commit on the
  head's first-parent line back to the reviewed one must be a merge whose second parent is in the base's history and
  whose tree is exactly what git makes for that merge with no conflict. So updating a branch from its base for
  `strict` needs no second review, but a new commit, a merge from another branch, a merge with extra edits or a
  resolved conflict, and a rebase all go back to `pending` until "@codex review" reviews the new head. So a branch is
  brought up to date by merging its base in (GitHub's "Update branch" with merge, or `git merge origin/<base>`), not
  by rebasing. The workflow
  fetches the pull request's head as objects only, to walk that history; it never checks it out. A Codex state other
  than `completed` stays `pending` too; "@codex review" or a hand run recovers it.
  Before the status is first required on a branch, the workflow is run by hand for every open pull request into it, so
  none sits at "Expected".
- **`builder-paths`** (a `ci.yml` job, `tools/ci/builder-paths.sh`): on a pull request whose head branch ends in
  `-build`, fails when the branch changes the e2e checks (`e2e/**`), any blueprint's journeys
  (`examples/*/journeys/**`, `**/blueprint/journeys/**`), the evals (`packages/prove/src/modules/evals/**`), the
  runner's generic step checks (`packages/prove/src/modules/journeys/internal/checks.ts`), or the break fixtures the
  checks are proved on (`examples/*/test/fixtures/{evals,journeys,check}/**`). The rest of prove's journeys runner is
  builder code. The one exception is taking lines off `e2e/m1/expected-failing.txt`, which the ratchet asks of the pull
  request whose slice lands (`e2e/ratchet/README.md`); a line added there is a hit. Authors' branches end in `-check`
  and builders' in `-build` (Goal 3's naming, made the rule in `AGENTS.md`); a builder branch named otherwise (older
  ones such as `build/M0.05`) is not guarded, so the naming rule is what makes the guard reach.
- **`supersedes`** (a step in `e2e-m0`, `tools/ci/supersedes.sh`): for each decision's `## Supersedes` list, in the shape
  `AGENTS.md` gives (`- <old doc>: "<old words>" → "<new words>"`), `git grep` must find each old phrase only in the
  dated records, which keep their words (`design/decisions/`, `design/history/`, `design/evidence/`; `design/naming.md`
  rule 6), and in `design/process/`. A line in the wrong shape fails too.
- **`cancel-closed`** (`.github/workflows/cancel-closed.yml`): when a pull request closes, merged or not, its unfinished
  `pull_request` runs are cancelled. It uses only the run's `GITHUB_TOKEN` with `actions: write`.

`tools/ci/ci.test.sh`, run in the `check` job, tests all three scripts on throwaway repositories.

## Where they reach

`codex-finished` runs from `main` for every pull request. The others run from the pull request's own copy of the
workflows, so they reach `m1`, `goal/stage-1` and `goal/on-chain` when `main` is next merged into them; a branch's required list names a
job only once that branch runs it.

## Undoing it

```bash
gh api -X DELETE repos/AaronAbuUsama/architect/branches/main/protection   # likewise m1, goal/stage-1, goal/on-chain
```

The workflows and scripts come out with a revert of the pull request that added them.
