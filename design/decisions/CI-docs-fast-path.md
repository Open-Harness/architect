# CI-docs-fast-path: a docs-only pull request skips the layer gates; main stays strict (_Superseded by CI-drafts, 21 November 2026: `main` is no longer strict_)

20 November 2026. Decided by the conductor under AGENTS.md, "Who decides", after Aaron said yes to fixing both costs
the 📓 Scribe raised on 19 November: strict `main` reruns CI that docs cannot affect, and a lint test flakes under load.

## Evidence

Since 19 November `main` is strict (_Superseded by CI-drafts, 21 November 2026: not strict since 21 November_) ("require branches to be up to date before merging",
[`CI-branch-protection.md`](CI-branch-protection.md)). With several pull requests in flight, each merge puts every
other one behind, and each catch-up merge reruns all of CI, 9 to 20 minutes, the layer gates included.

- **#136, a docs-only pull request** (the process log), went green with Codex finished three times, in runs
  44625016111 (14 min), 44627416732 (19 min) and 44630518103 (9 min). Each time it fell behind again as #133, #138 and
  #134 landed. Its changes could not have moved `e2e-layer1` or `e2e-layer2`.
- **The code pull requests paid too:** #134 took 3 catch-up merges and 7 runs, #133 took 1 and 4, #138 took 1 and 3.
- **The flaky lint test:** `packages/lint/test/boundaries.test.ts`, `describe("module boundaries")`, starts oxlint
  through `pnpm exec` once per case at Vitest's 5 s default. It took 5967 ms on run 44633925275 and 5216 ms on run
  44638137760, and each failure cost a rerun of `check`, about 20 minutes. Locally each case takes 0.6 to 1.0 s.

## Decision

1. **Main stays strict.** (_Superseded by CI-drafts, 21 November 2026: `main` no longer requires up to date; its own push run checks every merge_) Dropping "up to date" would let two green pull requests merge into a red `main`.
2. **A `changes` job decides docs-only** from the pull request's diff against `origin/$BASE_REF`
   ([`tools/ci/docs-only.sh`](../../tools/ci/docs-only.sh), its cases in `tools/ci/ci.test.sh`). Docs-only means every
   changed path is under `design/`, or is a `*.md` file outside `packages/`, `e2e/` and `examples/`: a module's
   `README.md` is one of its six slots, and the e2e READMEs carry generated totals. An empty diff is not docs-only.
3. **`e2e-layer1` and `e2e-layer2` need `changes` and skip through a job-level `if:`** when the flag is set (_Superseded by CI-drafts-race, 21 November 2026: they run and
   pass without their steps, since a required job never skips_). A skipped
   job counts as passed for a required check, so `main`'s required checks are unchanged. Should `changes` fail, the
   gates run: the condition skips only on a `changes` that succeeded and said docs-only.
4. **`check` and `e2e-m0` always run.** `check` lints, runs `e2e:totals` and the CI guards' cases; `e2e-m0` runs
   `docs:check`, `canon:check` over the design docs and `tools/ci/supersedes.sh`. A docs change can break those.
   Superseded by CI-speed, 20 November 2026: `check` is now check-static, which always runs, plus prove's tests,
   which skip on a docs-only pull request.
5. **Pushes, and pull requests with any non-doc change, run everything** as before.
6. **Never workflow-level `paths-ignore`.** A workflow that never starts never reports its jobs, and a required check
   with no report stays pending forever.
7. **The lint test gets a 30 s timeout** for its describe and runs `node_modules/.bin/oxlint` directly, without the
   second Node start `pnpm exec` adds. Assertions and fixtures are unchanged.

## Merge queue: not available here

A merge queue would remove the catch-up merges altogether, but this repository is owned by a personal account
(`gh api repos/AaronAbuUsama/architect` gives `owner.type: User`), and GitHub offers merge queues only on
organization-owned repositories (public ones, or private ones on Enterprise Cloud). `main` has none
(`repository.mergeQueue(branch: "main")` is null). Setting one up was out of scope; moving the repository to an
organization would make it possible, and is Aaron's call.

## Also in this change

- AGENTS.md said only `main` requires `builder-paths`. Live protection also requires it on `goal/stage-1`
  (`gh api repos/AaronAbuUsama/architect/branches/goal/stage-1/protection`, 20 November); `m1` does not yet. No
  protection setting was changed.
- `design/handoff.md` gains the "Decision IDs" list the conductor allocates from (the rule merged in #129), with every
  ID used on `main`, `m1`, `goal/stage-1` and the open branches, and how to claim the next one.

## Supersedes

- AGENTS.md: "`main` also requires `builder-paths`" → "`main` and `goal/stage-1` also require `builder-paths`"
