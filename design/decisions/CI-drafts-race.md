# CI-drafts-race: CI reads a pull request's live draft state, never the event's payload

21 November 2026. An amendment to [`CI-drafts.md`](CI-drafts.md), decided by the building agent under AGENTS.md, "Who
decides", after a pull request into `main` merged with every required check skipped.

## What happened

Pull request 301 (`claude/github-native`, head `91626ef1`) was pushed while still a draft, and `gh pr ready` ran straight
after. GitHub logged `ready_for_review` at 15:55:15Z, then started two `pull_request` runs of `ci`:

| Run | Created | Payload | What it did |
|---|---|---|---|
| 44921725636 | 15:55:18Z | `ready_for_review`, `draft: false` | the real run; cancelled at 15:55:20Z |
| 44921727254 | 15:55:19Z | `synchronize`, `draft: true` (the push, delivered after the ready event) | cancelled the real run through the shared concurrency group `ci-ci-pr-301`, then skipped every job through the payload's draft guard |

A skipped required check counts as passed, so `gh pr merge --auto` merged it at 15:55:47Z. `main`'s own push run
(44921770813) passed afterwards, so nothing broke, but the gate was open. CI-drafts' "A draft cannot merge, so a
skipped job on a draft never lets anything through" assumed a draft payload only ever arrives while the pull request is
a draft.

## What GitHub does, measured

1. **A skipped job's name is never evaluated.** A probe on 21 November (a throwaway `probe/skipped-names` branch, run
   44923553751, deleted after) named three jobs `${{ github.event_name == 'push' && 'evaluated-…' || 'raw' }}`. The job
   that ran reported `evaluated-ran`. The job skipped by its `if:`, and the one skipped because its `needs` skipped,
   reported the expression's text, `github.event_name == 'push' && 'evaluated-if' || 'raw'`. 301 shows the same: its
   skipped matrix job is named `prove-tests (${{ matrix.shard }}/3)`.
2. **Branch protection reads the required checks from the latest `ci` run on the head,** not from the latest check run
   of each name. The first version of this change (head a8f2de60 of the pull request that made it) gave draft-payload
   runs their own concurrency group and gave required jobs names a skipped job could not match. The race was
   reproduced on it: ready run 44924408749 (16:24:30Z) then draft-payload run 44924410374 (16:24:31Z). The ready run was
   no longer cancelled, and all five required checks passed on it (`isRequired` and `SUCCESS` in GraphQL). Still the
   merge endpoint refused: "5 of 5 required status checks are expected". The latest `ci` check suite on the head was
   the draft run's, and it held no check of a required name. So 301 merged on the draft run's skipped checks, and any
   fix that leaves a later draft-payload run skipping can at best wedge the pull request until another push.

So the gating-job shape (one job with the payload's draft guard, the required jobs `needs` it) cannot work either: the
late run still skips, and its suite is still the latest.

## The call

1. **CI reads the pull request's live draft state, never the payload.** A `ready` job asks the API
   (`gh api repos/<repo>/pulls/<n> --jq .draft`, with `pull-requests: read`), and every other job needs it and runs only
   when it says `false`. A push run is never a draft. A late draft-payload run on a pull request that is now ready
   therefore runs all of CI itself, and its suite, the latest, holds the real results. A draft run costs one small job.
2. **The concurrency group stays one per pull request.** A run that cancels another started after it, so it reads the
   draft state later, and on a ready pull request it runs everything.
3. **A required job never skips on a ready run.** Its `if:` is the live guard alone (with `!cancelled()` when it needs
   another job too), and it decides in its steps. `builder-paths` runs on every pull request and push and does its
   work only on a `-build` pull request; on a docs-only pull request `e2e-layer1` and `e2e-layer2` run and pass without
   their steps, a runner for a few seconds each. Jobs no branch requires (`check-static`, `prove-tests`, `changes`,
   `e2e-m8`) may still skip.
4. **A required job's name is `${{ needs.ready.outputs.draft != 'false' && '<id> (draft)' || '<id>' }}`.** On a ready
   run it evaluates to the required name. When the job skips (a real draft, or `ready` failed), its check carries the
   expression's text, which no required check matches; should GitHub ever evaluate skipped names, it carries
   `<id> (draft)`, which none matches either. A draft run can never pass a required check, so if the API ever answered
   `true` for a pull request already ready, the pull request would wait, never merge unchecked.
5. **`tools/ci/required-jobs.sh` holds rules 1, 3 and 4,** run in `check-static` over the five checks `main` requires (its
   cases are in `tools/ci/ci.test.sh`). A branch that requires a new check adds its job to that line.

A pull request left waiting ("Expected") with no run under way recovers with `gh run rerun <its latest ci run>`, which
reads the draft state again, or any push.

## Where it reaches

`main` from this change. Goal branches carry their own `ci.yml` (CI-drafts): each lead takes this when it next merges
`main` in, and gives its branch's extra jobs the `ready` need and the live guard, and its extra required jobs
(`portal-ui`, `e2e-m1`, `e2e-climb`, `e2e-grid` on `goal/stage-1`) the same name, listing them in its
`required-jobs.sh` line. Until then those branches keep the hole. Branch protection is unchanged.

`goal/stage-1` took it on 22 November 2026 (Goal 3's merge of `main`): all ten of its required checks (`check`, `portal-ui`,
`e2e-layer1`, `e2e-layer2`, `e2e-m0`, `e2e-m1`, `e2e-climb`, `e2e-grid`, `e2e-stage1`, `builder-paths`) carry the name and the live
guard, and its `required-jobs.sh` line lists them. `portal-ui` used to skip the job on a fork or a fast pull request, and `e2e-climb`, `e2e-grid` and `e2e-stage1` on a
docs-only or fast one (`e2e-stage1` also off its own branch); they now run and pass without their steps.

## Proof

On the pull request that made this change: made a draft again, pushed, then `gh pr ready` at once. Its description gives
the runs, the check runs on its head, and the merge endpoint's answer before and after the real run passed.

## Supersedes

- `design/decisions/CI-drafts.md` (dated, noted in place): "A draft cannot merge, so a skipped job on a draft never lets anything through." → "A draft-payload run can arrive after the ready one, and its suite is the one branch protection reads; every job now goes by the live draft state."
- `design/decisions/CI-drafts.md` (dated, noted in place): "Every job in `ci.yml` starts with `github.event.pull_request.draft != true`" → "Every job in `ci.yml` needs `ready`, which reads the pull request's live draft state"
- `.github/workflows/ci.yml`: "Skipped on a docs-only pull request, where a skip counts as passed." → "On a docs-only pull request the job runs and passes without its steps: a required job never skips."
- `.github/workflows/ci.yml`: "a skipped job counts as passed where it is required" → "the job still runs and passes at once, guarding nothing: a required job never skips"
- `.github/workflows/ci.yml`: "every job below starts with the draft guard" → "a draft runs only the `ready` job below"
- AGENTS.md: "skip passes (`design/decisions/CI-docs-fast-path.md`)" → "pass without running their steps (`design/decisions/CI-docs-fast-path.md`)"
- `design/decisions/CI-docs-fast-path.md` (dated, noted in place): "skip through a job-level `if:`" → "run and pass without their steps"
- `design/decisions/CI-speed.md` (dated, noted in place): "as the layer gates already do" → "the layer gates now run and pass without their steps; a required job never skips"
- `design/decisions/CI-branch-protection.md` (dated, noted in place): "which is skipped, and so passes, on anything but a `-build` branch" → "which runs and passes at once on anything but a `-build` branch"
