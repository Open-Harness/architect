# CI-main-stage1: `main` runs and requires `e2e-stage1`

23 November 2026, by the lander (Goal 19), in its slice 1, under K42's open risk: "The lander (Goal 19) checks that
`main` already requires each of them in its slice 1, before it retires the branch."

## The problem

Read on 23 November 2026 with `gh api repos/Open-Harness/orthograph/branches/<branch>/protection`:

| Protection | `goal/stage-1` | `main` |
|---|---|---|
| `check`, `portal-ui`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `e2e-m1`, `e2e-climb`, `e2e-grid`, `builder-paths` | required | required |
| `e2e-stage1` | required | **not required** |
| every conversation resolved | yes | yes |
| admins included, no force push, no deletion | yes | yes |

`e2e-stage1` is Goal 3's done check, begun: Plugged In's seven journeys green through `ortho prove` in `--env local` and
`--env test`, through the ratchet (`e2e/stage1/README.md`). In `ci.yml` its steps ran only for pull requests into
`goal/stage-1` and pushes to it; anywhere else it passed without them. Once `goal/stage-1` is retired (K42, section 7),
nothing would run Plugged In's journeys on any branch, though K42 keeps Plugged In as "the example app every change
keeps green".

## The call

1. `e2e-stage1` runs its steps for pull requests into `main` and pushes to `main`, as it does for `goal/stage-1`
   (this change, in `.github/workflows/ci.yml`). The docs-only and affected-suite skips stay as they are.
2. Once this pull request's own run shows `e2e-stage1` green against `main`, the lander adds it to `main`'s required
   checks, so `main` requires `goal/stage-1`'s ten:

```bash
gh api -X POST repos/Open-Harness/orthograph/branches/main/protection/required_status_checks/contexts --input <(echo '{"contexts":["e2e-stage1"]}')
```

3. Only then does `goal/stage-1` retire (the lander's slice 1).

## Evidence

- `e2e/stage1/` and the `e2e-stage1` job are already on `main` (both came with #602); only the branch test in its `SKIP`
  kept it from running there.
- It is one runner, about a minute on a Mac and within a 15-minute timeout, run beside the `e2e-m1` shards (8 to 15
  minutes), so no pull request into `main` waits longer (CI-main-required.md, evidence).

## Undoing it

```bash
gh api -X DELETE repos/Open-Harness/orthograph/branches/main/protection/required_status_checks/contexts --input <(echo '{"contexts":["e2e-stage1"]}')
```

and put `github.base_ref == 'goal/stage-1'` back as the only branch in the job's `SKIP`.

## Supersedes

- .github/workflows/ci.yml: "`e2e-grid`, and on goal/stage-1 also `e2e-stage1`) follow" → "`e2e-grid`, `e2e-stage1`) follow"
- .github/workflows/ci.yml: "Only for the goal's own branch: pull requests into goal/stage-1 and pushes to it." → "For main and goal/stage-1: pull requests into either and pushes to either"
