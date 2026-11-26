# CI-parked-suites-nightly: a parked goal's suite runs nightly on main, and on the pull requests that touch it

26 November 2026, by a Goal 18 builder on the lead's brief of that day (Aaron: CI is bottlenecking the work, so be careful what runs
in CI and how fast). Decided under AGENTS.md, "Who decides".

## The problem

Every ready pull request ran the suites of four goals that are parked (`design/goals/map.md`; each brief says `status: parked`):

| Job | Goal | Minutes in run 45804673866 (#1086) | When it ran |
|---|---|---|---|
| `e2e-superagent` | 17, the superagent | 11.2 | every pull request but docs-only, and the fast gate only into `goal/superagent` |
| `e2e-portal-next` | 6, the new portal | 8.2 | every pull request but docs-only, the fast gate included (so every pull request into `goal/capxul`) |
| `e2e-m8` | 9, time | 4.2 | every pull request but docs-only, fast or unaffected |
| `e2e-ui-layer` | 5, the UI layer | 1.7 | pull requests into `main` and `goal/ui-layer`, and pushes to them (CI-main-ui-layer) |

That is 25 runner-minutes of every pull request into `main`, four of the 26 jobs, on a repository that hits GitHub's limit of 20 jobs
at once at peak hours (CI-speed.md). None is a required check on `main` (`CI-branch-protection.md`, `CI-main-required.md`,
`CI-main-stage1.md`: `check`, `e2e-layer1`, `e2e-layer2`, `e2e-m0`, `builder-paths`, `portal-ui`, `e2e-m1`, `e2e-climb`, `e2e-grid`,
`e2e-stage1`), so none could block a merge: a red one only showed. Nobody builds these goals now (K44), so a pull request rarely
touches what they check, and when one does, it is one that changes their own paths.

## The call

1. **The four jobs move to their own workflow, `.github/workflows/parked.yml` (`parked`),** with the same names and the same steps.
   `e2e-superagent` keeps its supersedes guard.
2. **They run every night on `main`** (02:41 UTC), and by hand (`workflow_dispatch`) on any branch.
3. **On a ready pull request, a suite runs when** (`tools/ci/parked.sh`, which reads each goal's brief):
   - its goal is no longer parked (the brief's `status:`), or its brief is gone: then on every pull request again, with no change
     here;
   - the pull request is into its goal's branch (the brief's `branch:`), as `e2e-superagent` did on the fast gate of `goal/superagent`;
   - the pull request changes a path the goal owns (the brief's `owns:`, `design/` left out), a path of the suite's own
     (`e2e/fixtures/<suite>/`, `e2e/vitest.<suite>*`), or the machinery every suite shares: the workflow, `tools/ci/parked.sh`,
     `e2e/ratchet/`, `e2e/package.json` and `pnpm-lock.yaml`.
   Never on a docs-only pull request (`tools/ci/docs-only.sh`), as before. A draft runs only the `which` job, which reads the live
   draft state from the API as `ci`'s `ready` does (CI-drafts-race).
4. **A red night run on `main`** is a Snag in the owning goal's milestone, logged by whoever sees it first (GitHub mails the
   failure of a scheduled run to whoever last changed its schedule). When the goal starts again, its brief's `status:` brings its
   suite back to every pull request.

What it gives up: a change to shared code (`packages/prove`, the generators, the CLI) that breaks a parked suite is found the next
morning, not on its pull request. That was already so in effect, since a red non-required check never blocked a merge.

## Branch protection

No change on `main`: none of the four is required there. `goal/superagent` is unprotected (CI-watch-required.md, #654), and a pull
request into it still runs `e2e-superagent`, under the same name. Should any goal branch require one of the four, the check keeps its
name, so its protection needs no change either.

## Evidence

- Run 45804673866's jobs, from the jobs API (`ready` 10:48:06): `e2e-superagent` 10:49:05 to 11:00:16, `e2e-portal-next` 10:49:06 to
  10:57:16, `e2e-m8` 10:49:05 to 10:53:17, `e2e-ui-layer` 10:49:05 to 10:50:48.
- `tools/ci/ci.test.sh` holds `parked.sh`'s cases: shared code runs no suite; the goal's branch, an owned path, a suite's own path and
  the shared ratchet run it; an owned path under `design/` does not; an unparked goal, a missing brief and an unreadable diff run it.
- This change's own pull request touches `.github/workflows/parked.yml` and `tools/ci/parked.sh`, so it runs all four there.

## Undoing it

Move the four jobs back into `ci.yml` as they were before this change (`git show <this commit>^:.github/workflows/ci.yml`), and
delete `parked.yml` and `tools/ci/parked.sh` with their cases.

## Supersedes

- design/decisions/CI-main-ui-layer.md: "`e2e-ui-layer` runs its steps for pull requests into `main` and pushes to `main`, as it does for `goal/ui-layer`." → "`e2e-ui-layer` runs nightly on `main`, and on a pull request into `goal/ui-layer` or one that changes Goal 5's paths."
- e2e/ui-layer/README.md: "CI runs it as the job `e2e-ui-layer`, on pull requests into `goal/ui-layer` and pushes to it." → "CI runs it as the job `e2e-ui-layer` of the `parked` workflow: every night on `main`, and on a pull request into `goal/ui-layer` or one that changes Goal 5's paths"
- e2e/superagent/README.md: "`.github/workflows/ci.yml` needs an `e2e-superagent` job like `e2e-m8`'s" → "`.github/workflows/parked.yml` runs `e2e:superagent-ratchet` as the job `e2e-superagent`, beside `e2e-m8`"
- .github/workflows/ci.yml: "an exception to CI-integration.md B1, for Goal 17's integration branch" → "Goal 17 is parked; a pull request into goal/superagent always runs it."
