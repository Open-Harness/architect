# CI-m1-shards: the M1 shards are 89% test time; no lever clears 10% of their minutes, so nothing is built

23 November 2026, by the CI builder, on the conductor's ask that day: measure where the `e2e-m1-shard` minutes go, price the levers,
and build only those worth roughly 10% of e2e-m1 minutes or more. The push runs are left alone (B4).

## What was measured

The step timings of the four green shards of the 19 most recent `ci` runs that ran them (23 November, 00:38 to 03:31 UTC; pull
requests into `goal/stage-1` and its own push runs; my probe branches left out), from the jobs API, and the per-file test times in the
`m1-report` artifacts of the 8 newest of them (the artifacts live three days). Data and script:
`design/history/ci-2026-11-22/m1-shards.json.gz`, `m1_shards_replay.py` (`python3 m1_shards_replay.py` reproduces every number below,
the queue wait from `jobs.tsv.gz` beside it) and `m1_shards_collect.py` (refreshes the data from GitHub; the artifacts expire after three days).

## Where the minutes go

76 shard jobs, 872 runner-minutes, a median job of 11.7 minutes (about 46 minutes a run).

| Step | Minutes | Share | Median |
|---|---|---|---|
| **Run this shard's M1 checks** (vitest) | 779.7 | **89.4%** | 10.4 min |
| `playwright install --with-deps chromium` (a fresh download each run: the workflow has no browser cache) | 25.6 | 2.9% | 0.31 |
| `pnpm install --frozen-lockfile` | 23.0 | 2.6% | 0.32 |
| `actions/setup-node` (pnpm cache restore) | 14.6 | 1.7% | 0.18 |
| `pnpm/action-setup`, foundry, checkout, cache, job setup, artifact up/down | 24.5 | 2.8% | each under 0.1 |

So **setup is 10.6% of the minutes in all** (92 of 872), about 1.2 minutes a shard, and most of it is already cached.

Per-file test time, over 44 files in 8 runs: 39.1 minutes in total (9.8 a shard if perfectly even). Two files are a quarter of it:
`e2e/m1/29-st1-23-prove-changed.test.ts` takes 6.7 minutes and `e2e/m1/30-st1-24-warm-world.test.ts` 3.1; then `32` (2.0), `16`
(1.7), `37` (1.5). Vitest's own start and the reporter add about 0.7 minutes a shard on top.

**The spread.** Vitest's `--shard=i/4` cuts the sorted file list into equal counts, not equal times. In a run the slowest shard's job
takes 15.6 minutes and the fastest 8.4 (median); the tests alone take 12.2 and 7.0. Shards that finish early are not billed for the wait,
so the spread costs wall-clock time, not minutes.

**Waiting.** A different sample (20 to 22 November, 1,155 shard jobs from `jobs.tsv.gz`): a shard job waits a median 6.8 minutes (p90 30) between
being created and getting a runner, which includes waiting for `portal-ui` and for the runner cap. Not billed.

## The levers, priced

| Lever | Runner-minutes saved | Share of shard minutes | Wall-clock effect |
|---|---|---|---|
| Cache Playwright's browser, and `node_modules` by lockfile hash | the ceiling is the install steps (49 minutes, 5.6%; 63, 7.2%, with the `setup-node` restore); a cache hit still restores, so about half | **3 to 7%** | about 0.4 to 0.6 minutes off each shard |
| Install the browser only on shards that run a browser check (`served-portal`: files 21, 27, 28, 38, 39) | up to the playwright step | **up to 2.9%**, less in practice | |
| Rebalance by measured per-file time (a timings table in `tools/ci/`, an explicit file list per shard in place of `--shard`) | none: the same tests run | **0%** | slowest shard 12.2 to 10.5 minutes (out of sample; 9.8 ideal), **-14% to -20%** |
| Three shards instead of four | one shard's setup (1.2 minutes) and its vitest start-up (0.7), about 4% | **about 4%** | slowest shard +33% |
| Two shards, or one | about 8%, or about 12% | **8%**, **12%** | slowest shard about 2x, or 4x (past the 30-minute job limit) |
| Fewer or cheaper checks | not a CI lever: the checks are the e2e author's (below) | up to 25% for files 29 and 30 | |

The rebalance was judged out of sample: the shards are assigned from the other runs' per-file medians and scored on each run's real times.

## Decision

**Nothing is built.** No lever saves 10% of the minutes: the best (caching) saves 3 to 7% at the very most and costs a cache that can go stale; fewer shards save more minutes (8% for two) by making the run twice as slow, and
rebalancing saves no minutes at all. The shards are test time; the minutes are in the checks.

Rebalancing is the one thing worth having, for the wait rather than the bill (the slowest shard's tests finish 14% sooner out of sample, 20% at the ideal; about 11% of the whole job once setup is counted), and it
stays inside `tools/ci/` and the workflow. It was not built because the bar set was minutes. If the conductor wants it for latency,
it is a small pull request: `tools/ci/m1-shards.sh` computes the four file lists (_Superseded by CI-m1-balance, 26 November 2026: built, with six shards_) from a committed timings table, with unknown
files going to the lightest shard, and the job runs `vitest run <its files>` in place of `--shard`. It needs `ci.test.sh` cases and
a refresh of the table by a script, since new checks arrive weekly.

## Ask

Two checks are 25% of all M1 test time, and no workflow change can touch them. The Ask to Goal 3's checks author (issue #623, in their milestone) asks
whether `e2e/m1/29-st1-23-prove-changed.test.ts` (6.7 minutes) and `e2e/m1/30-st1-24-warm-world.test.ts` (3.1 minutes) can start fewer
worlds or share one, or move to a gate that runs less often. (By their names they test `ortho prove`'s changed-only mode and warm world; I have not read
the files, which are the checks author's.) That is the 10% this note could not find in the workflow.

## Supersedes

Nothing: this adds a measurement and a "no".
