# CI-main-ui-layer: `main` runs `e2e-ui-layer`

23 November 2026, by the lander (Goal 19), at the `goal/ui-layer` landing (#785). It follows CI-main-stage1.

## The problem

Goal 5 parked under K42, section 7. The lander is bringing `goal/ui-layer` into `main`, and after that `main` is the only
branch where Goal 5's work changes. But `e2e-ui-layer`, Goal 5's done check through its ratchet (`e2e/ui-layer/README.md`), ran
its steps only for pull requests into `goal/ui-layer` and pushes to it. On #785, the pull request into `main`, it was skipped.
Once the work is on `main`, nothing would run the UI layer's checks, and a change on `main` that breaks them would pass.

## The call

`e2e-ui-layer` runs its steps for pull requests into `main` and pushes to `main`, as it does for `goal/ui-layer`. (_Superseded by CI-parked-suites-nightly, 26 November 2026: it runs nightly on `main`, and on a pull request into `goal/ui-layer` or one that changes Goal 5's paths_) The
docs-only skip stays. Its guard now reads the live draft state through `ready`, as `e2e-portal-next`'s does, rather than the
event's payload, so a push just before the pull request is marked ready still runs it (CI-drafts-race). It stays a check that is not required, as it was on `goal/ui-layer`. Making it required is a
branch-protection change, which needs Aaron.

## Evidence

- `nx run e2e:ui-layer` on #785's merge of `main`: `ratchet: 6 failing, 6 expected, 0 unexpected, 0 newly passing`.
- The job needs no Docker, no cloud and no secret, and one slice's check starts one HTTP server. That adds one runner of
  a few minutes beside the `e2e-m1` shards, so no pull request into `main` waits longer.

## Undoing it

Put `github.base_ref == 'goal/ui-layer'` and `refs/heads/goal/ui-layer` back as the only branches in the job's `if`.

## Supersedes

- .github/workflows/ci.yml: "Only for the goal's own branch: pull requests into goal/ui-layer and" → "For main and goal/ui-layer: pull requests into either and"
