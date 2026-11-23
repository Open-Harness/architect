# CI-main-stage1: `e2e-stage1` runs on `main`

23 November 2026. Decided by the lander (Goal 19, slice 1) under AGENTS.md, "Who decides", before `goal/stage-1` retires
(K42, section 7, and its open risk on the branch's protections).

## The problem

`goal/stage-1` requires ten checks; `main` requires nine of them, all but `e2e-stage1` (CI-main-required). And in
`main`'s `ci.yml` the `e2e-stage1` job ran its steps only for a pull request into `goal/stage-1` or a push to it: on
every pull request into `main` and every push to `main` it passed without running anything. Once `goal/stage-1` is
retired and `main` is the one integration branch, Goal 3's done check, Plugged In's seven journeys in `--env local` and
`--env test` through the ratchet (`e2e/stage1/README.md`), would guard nothing.

## The call

1. **The job runs everywhere.** Its `SKIP` is now the same as `e2e-climb`'s: it passes without its steps only on a
   docs-only, fast or unaffected pull request (CI-docs-fast-path, CI-integration). On every other ready pull request,
   and every push to `main`, a layer branch, a milestone branch or `goal/stage-1`, it runs `nx run e2e:stage1`.
   It keeps the required-job rules (name, `ready`, the live guard), and `check-static`'s `required-jobs.sh` line
   already lists it.
2. **`main` requires it,** once it is green on `main`. That is a change to branch protection, which needs Aaron's
   written yes, and the lander's token gets 403 on the protection API, so Aaron sets it. The setting is the tenth
   context on `main`'s required status checks:

   ```bash
   gh api -X POST repos/Open-Harness/orthograph/branches/main/protection/required_status_checks/contexts --input <(echo '{"contexts":["e2e-stage1"]}')
   ```

   or, in the repository's settings, Branches, the rule for `main`, "Require status checks to pass": add `e2e-stage1`.
   `strict` stays `false`; the rest of CI-branch-protection stands. Until he does, the job runs and shows red on `main`
   but does not block a merge.

## Evidence

- **It is green on `main` today.** `pnpm nx run e2e:stage1` on `main` at `20d70329`, in an Amp orb: 6 of 7 journeys pass,
  the seventh is on `e2e/stage1/expected-failing/`, and the ratchet says "1 failing, 1 expected, 0 unexpected, 0 newly
  passing, 0 missing" (46 seconds). The suite, its ratchet list and its Nx target all came to `main` with earlier landings.
- **It costs one short job.** On `goal/stage-1`'s push run 45177104630 `e2e-stage1` took 1.5 minutes on one runner, in
  parallel with the `e2e-m1` shards (11 to 14 minutes), so no run on `main` gets longer.
- **Nothing else changes.** A pull request into a goal branch other than `goal/stage-1` is fast (`tools/ci/scope.sh`)
  and still passes without the steps, as it did before.

## Undoing it

Put back the branch test in front of the job's `SKIP` and, if Aaron added it, remove the context:

```bash
gh api -X DELETE repos/Open-Harness/orthograph/branches/main/protection/required_status_checks/contexts --input <(echo '{"contexts":["e2e-stage1"]}')
```

## Supersedes

- .github/workflows/ci.yml: "`e2e-grid`, and on goal/stage-1 also `e2e-stage1`)" → "`e2e-grid`, `e2e-stage1`)"
- .github/workflows/ci.yml: "the other required jobs of goal/stage-1" → "the other required jobs"
- .github/workflows/ci.yml: "Only for the goal's own branch: pull requests into goal/stage-1 and pushes to it." → "It runs on every ready pull request and push, main's included"
