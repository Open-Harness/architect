# CI-speed: the slow work runs side by side, and docs skip the suites they cannot move

20 November 2026. Decided by the CI audit thread under AGENTS.md, "Who decides", on the conductor's brief: find why a
change takes hours to merge while Goal 3 runs three builders at once, and get the speed from CI itself. A merge queue
is not available on a personal account, and moving to an organization on the free plan would not raise the limit on
jobs running at once.

## Evidence

Every `ci` run from 18 to 20 November: 731 runs, 4,183 jobs, read with `gh run list`, the jobs API
(`actions/runs/<id>/jobs?filter=all`) and four job logs. A job's queue time is its start minus its creation; a job
copied into a re-run attempt (started before it was created) is left out.

### Where a merge's time goes

| Pull requests merged 18 to 20 November | count | runs | cancelled | median open to merge | median last green run | median green to merge |
|---|---|---|---|---|---|---|
| into `goal/stage-1`, code | 32 | 141 | 65 | 67 min | 22.7 min | 2 min |
| into `goal/stage-1`, docs only | 5 | 14 | 6 | 24 min | 20.1 min | 1 min |
| into `main`, code | 24 | 78 | 19 | 25 min | 10.8 min | 1 min |
| into `main`, docs only | 21 | 52 | 11 | 14 min | 11.2 min | 1 min |

A code pull request into `goal/stage-1` ran CI 4.4 times on average. Of the 155 runs of all 37 goal pull requests, 37
were the first push, 83 a new commit, 32 a catch-up merge of the base branch and 3 another merge (`main` is strict (_Superseded by CI-drafts, 21 November 2026: not strict since 21 November_), so every merge there puts the rest behind;
`goal/stage-1` is not strict, but builders merge it in to pick up totals and generated files). Each rerun costs one
whole run, so the length of a clean run multiplies through everything else.

### Waiting for a runner

| Job | runs | median queue | 90th percentile | longest | median run (green) |
|---|---|---|---|---|---|
| check | 698 | 0.0 min | 4.1 min | 30.5 min | 11.0 min (14.8 on `goal/stage-1`) |
| e2e-m1 | 324 | 0.0 min | 6.1 min | 35.3 min | 20.3 min |
| e2e-layer2 | 680 | 0.0 min | 3.8 min | 35.1 min | 8.2 min |
| e2e-layer1 | 688 | 0.0 min | 4.3 min | 37.1 min | 4.7 min |
| e2e-climb | 174 | 0.0 min | 3.8 min | 17.3 min | 2.4 min |
| e2e-grid | 168 | 0.0 min | 4.7 min | 19.1 min | 1.8 min |
| portal-ui | 306 | 0.0 min | 5.8 min | 34.8 min | 0.9 min |
| e2e-m0 | 693 | 0.0 min | 4.4 min | 30.4 min | 0.7 min |

The repository hit GitHub's limit of 20 jobs at once: 20 is the most that ever ran together, and it sat at 20 for 353
minutes over the three days, mostly on 19 November from 14:00 to 16:00 and at 22:00 UTC, when jobs waited up to 37
minutes. The rest of the time a job starts within seconds. Queueing is a peak-hour cost, not the everyday one.

The brief's example, `e2e-layer2` "queued from 07:58 to 08:45" in run 44698831344, was not a queue. The job failed at
08:06 (the check 8 latency flake, 280 ms against a 150 ms budget), and at 08:45 someone re-ran the failed jobs; the
second attempt was created at 08:45 and started two seconds later. Pull request 172's 1 hour 47 minutes was five runs,
three cancelled by catch-up merges as `main` moved, plus that flake and the time before someone noticed it.

### Where a clean run's time goes

From the logs of run 44698831344 (`goal/stage-1`, 20 November):

- **`check`, 16 minutes:** setup and `pnpm install` take 35 seconds (the pnpm store is already cached by
  `setup-node`). Then `nx run-many -t lint,typecheck,test` runs 72 tasks. All of them but one finish in 4 minutes 30
  seconds. The one is **`prove:test`: 813 seconds**, 38 files at two workers (its `vitest.config.ts` keeps two worlds
  at a time), 1,515 seconds of tests, the biggest file 304 seconds (`prove.test.ts`).
- **`e2e-m1`, 22 minutes:** install and Playwright take under a minute. The ratchet runs 28 files **one at a time**
  (`vitest.m1.config.ts`: `fileParallelism: false`, each file starts its own worlds on free ports), 1,350 seconds of
  tests. It also waits for `portal-ui`, a minute.
- **`e2e-layer2`, 8 to 10 minutes:** one file, `08-watch-and-the-portal`, is 252 seconds by itself.
- **`e2e-layer1`, 5 to 7 minutes:** one file, `03-every-eval-catches-its-break`, is 289 seconds by itself.

A green push run costs 21 runner-minutes on `main` and 55 on `goal/stage-1`. Runs later cancelled cost 2,224 of the
22,775 runner-minutes in these three days, about one in ten.

### Caching and duplicate work

- **pnpm store:** cached (`actions/setup-node` with `cache: pnpm`); install is 13 to 15 seconds in every job.
- **The OpenTelemetry Collector binary:** cached by version on `goal/stage-1`.
- **workerd and wrangler** come from the pnpm store, so they are cached with it.
- **Playwright's Chromium:** not cached; `playwright install --with-deps chromium` is 19 seconds at the median and 81 at
  the 90th percentile, mostly the system libraries, which a cache would not save.
- **Nx's cache:** not kept between runs, and that stays (below).
- **Each job installs from scratch,** but install is 15 seconds, and nothing is built twice: every job runs its tests
  from source, and the one shared build (the portal's client) is already built once and handed on as an artifact.

### Causes, ranked by minutes lost

1. **Reruns.** Four runs per goal pull request, each a full run: about 45 minutes of a typical 67. CI cannot stop a
   builder pushing, but every minute off a clean run comes off each rerun too.
2. **`e2e-m1` runs its 28 files one after another:** 22 minutes, the longest path of every goal run.
3. **`prove:test` holds `check` for 13 minutes** after everything else in it has finished.
4. **Docs-only pull requests into `goal/stage-1` still run `e2e-m1`, `e2e-climb` and `e2e-grid`,** and every
   docs-only pull request runs prove's tests: 20 minutes on the goal branch, 11 on `main`, for changes that cannot
   move them.
5. **The 20-job limit at peak hours:** a few minutes at the 90th percentile, up to 37 at the worst hour.

## Decision

1. **`check` runs as three jobs and keeps its name.** `check-static` runs every lint, typecheck and test except
   prove's tests, plus the sync check and the CI scripts' tests. `prove-tests` runs prove's tests in three shards
   (`nx run prove:test -- --shard=<n>/3`, vitest splitting by file). The small `check` job needs both and passes only
   when both passed (`tools/ci/gate.sh`, its cases in `tools/ci/ci.test.sh`). It never skips, because a skipped
   required check counts as passed. The same tests run with the same config; only where they run changes.
2. **`e2e-m1` runs as four shards and keeps its name** (_Superseded by CI-m1-balance, 26 November 2026: six shards, split by measured time_) (`goal/stage-1` only, in the change that carries this one
   there). Each shard runs the ratchet's vitest command with `--shard=<n>/4` and uploads its JSON report and
   hook-error file. The `e2e-m1` job then runs the ratchet's own unit test, joins the four reports
   (`tools/ci/m1-reports.sh`: every shard's test files and hook errors; it fails unless exactly four of each arrived,
   no file ran twice, and together they ran as many files as `e2e/m1` holds) and runs the unchanged
   `e2e/ratchet/check.ts` on the whole. The files still run one at a time on each runner, so each file still has a
   machine to itself.
3. **The docs fast path covers the suites docs cannot move:** prove's tests, and on `goal/stage-1` the M1 shards,
   `e2e-climb` and `e2e-grid` skip on a docs-only pull request, as the layer gates already do (_Superseded by CI-drafts-race, 21 November 2026:
   the layer gates now run and pass without their steps; a required job never skips_). No test in them reads
   `design/` or a doc outside `packages/`, `e2e/` and `examples/`: check 15 (`e2e/m1/15-portal-ui-seam.test.ts`) scans
   every tracked file but allows Pro's name in `design/`, `docs/` and every `*.md`, and the grid and check 21 read
   generated docs under `examples/`, which are never docs-only. The one way a doc could still fail check 15 is a path
   named for Pro or a literal licence token, so a pull request that changes such a path or adds a line naming
   `HEROUI_AUTH_TOKEN` is not docs-only (`tools/ci/docs-only.sh`, the 🔍's finding on the goal branch's change). `check-static`, `e2e-m0` and `portal-ui` still run on
   every pull request, and pushes run everything.
4. **No branch protection changes.** The required names (`check`, `e2e-m1` and the rest) are the same jobs' names on
   `main`, `m1` and `goal/stage-1`. The new jobs (`check-static`, the shards) are not required; their gate is.
5. **The `concurrency` group is already right** (a newer push to a pull request cancels the run it replaces; every push
   to a protected branch keeps its run), and `cancel-closed` frees the runners of a closed pull request. Unchanged.

### Not done, and why

- **Nx's cache between runs, or `nx affected`:** both trust the project graph's inputs, and the slow tests read files
  the graph does not list as inputs (prove's tests start the worlds of `examples/acme` and the starter by path). A
  cache hit or an unaffected project would pass a test that never ran against the change. That weakens a check.
- **Turning off strict on `main`:** two green pull requests could merge into a red `main`. Still no. (_Superseded by CI-drafts, 21 November 2026: turned off; `main`'s own push run checks every merge_)
- **Sharding the layer gates:** each has one file of four to five minutes, so a shard cannot finish sooner than that;
  they already sit near the new longest path.
- **More shards:** each shard is a runner slot and a minute of setup. Three and four bring each sharded job under the
  layer gates' length; more would spend slots for no gain on the longest path.
- **Caching Playwright:** the download is seconds; the system libraries are most of it and are not cacheable.

### The cost

A run uses more runner-minutes, because the shards each set up and no longer share a runner with the rest of `check`:
about 31 instead of 21 on `main`, and about 70 instead of 55 on `goal/stage-1`, by the timings above. It also asks for
more runners at once: 10 jobs for a `main` pull request (was 6) and 18 on `goal/stage-1` (was 10). At peak hours
that queues a little more; in exchange a docs-only pull request now uses a fraction of what it did, and every
rerun is half as long.

## Measured

A typical code pull request into `main`, from the push to every required check green. "Queue" is the time before the
first job started; the wall time without it is the number to compare.

| | wall time | queue | without the queue | `check` green after | longest job |
|---|---|---|---|---|---|
| Before: median of the 24 code pull requests into `main` above (their last green run) | 10.8 min | under a minute | about 10.5 min | about 10 min | `check`, 9.8 min |
| After: this change's own run, 44716517941 (pull request 181, 20 November, 10:07 UTC) | 8.3 min | 1.0 min | 7.3 min | 6.1 min | `e2e-layer2`, 6.9 min |

In the after run, `check-static` took 3.0 minutes and the three prove shards 2.3, 4.4 and 4.3; together they ran each of
prove's 30 test files exactly once (9 + 1 skipped, 9 + 1 skipped, 10, read from the shard logs). `check` now waits on
the slowest shard, and the longest path is the layer 2 gate, whose one four-minute file sets the floor. On
`goal/stage-1` the same split should take `check` from about 15 minutes to about 6, and the four M1 shards `e2e-m1` from
22 minutes to about 9, estimated from the timings above.

A code pull request into `goal/stage-1` (the goal branch's change, run 44719201399, 20 November, 10:26 UTC):

| | wall time | longest path, run time only | `check` | `e2e-m1` |
|---|---|---|---|---|
| Before: median of the 32 code pull requests into the goal branch above | 22.7 min | about 22 min (`portal-ui`, then `e2e-m1`) | 14.8 min | 20 to 22 min |
| After | 20.8 min | 10.2 min (`portal-ui`, then `e2e-layer2`) | 7.5 min (slowest shard 7.4) | 10.1 min (shards 8.5, 6.3, 5.6, 5.2, then 0.7 to judge) |

The run's own work halved, but it waited 10.5 minutes for runners: three Goal 3 builders had the 20-job limit full, and
this run asks for 18 jobs, so its shards started 5 to 6.5 minutes after they were ready. With the queue that day, a
single 10-job run would have waited too, but less. The joined M1 verdict was the same as one runner's on the goal
branch at that time: 68 failing, 68 expected, 0 unexpected, 0 newly passing, 0 missing, over all 29 files.

## Supersedes

- tools/ci/docs-only.sh: "`check` and `e2e-m0` always run" → "check-static and `e2e-m0` always run"
