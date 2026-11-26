# CI-m1-balance: the M1 shards are split by measured time, six of them, and the totals run beside them

26 November 2026, by a Goal 18 builder on the lead's brief of that day (Aaron: CI is bottlenecking the work): cut the wall-clock time
of a pull request's CI run without weakening what `main` is protected by. It builds the rebalance `CI-m1-shards.md` priced and left
unbuilt, because the bar there was runner-minutes and the bar now is the wait.

## Evidence

**The run.** Run 45804673866 (#1086, 26 November) took 21 minutes, `ready` at 10:48:06 to `e2e-m1` at 11:09:01. Its longest path:
`ready` and `portal-ui` (1.3 minutes), then `e2e-m1-shard (3/4)` (17.9 minutes, 10:49:25 to 11:07:19; its tests 16.6), then `e2e-m1`
(1.7 minutes). The other three shards took 10.2, 10.8 and 10.9 minutes. Every other job had finished by 11:01:25.

**Per file.** The `m1-report` artifacts of four runs on 26 November (45769291351, 45792778839 and 45797156217, pushes to `main`, and
45804673866), 48 files each (47 in two of them): 44.2 minutes of tests in all, by the median of each file. One file,
`m1/29-st1-23-prove-changed.test.ts`, takes 8.4 minutes (493 to 508 seconds in the four runs); then 30 (2.6), 37, 28, 16, 35 and 32
(1.7 to 1.8 each). `tools/ci/m1-timings.json` holds every median.

**Why shard 3 was slow.** Vitest's `--shard=<i>/4` cuts the file list by count, not by time. In 45804673866, shard 3 had files 29 and
28, 16.0 minutes of tests; shard 2 had 8.3.

**The split, scored out of sample.** Each run's files assigned from the other three runs' medians (longest first, each to the
lightest shard), then timed with that run's real durations:

| Shards | Slowest shard's tests, per run (minutes) | Fastest |
|---|---|---|
| 4 by count (today) | 16.0 (measured, 45804673866) | 8.3 |
| 4 by time | 10.9 to 13.4 | 9.7 to 11.2 |
| 5 by time | 9.0 to 10.2 | 7.8 to 8.6 |
| 6 by time | 8.2 to 8.5 | 6.2 to 7.7 |
| 7 or more | no lower: file 29 alone is 8.4 | |

Six is where file 29 sets the floor: it runs alone, and the other five shards carry about 7.2 minutes each. A seventh shard would wait
on file 29 all the same. Each shard costs about 1.3 minutes of setup (checkout, install, Playwright, Foundry) and 0.6 of vitest's
start, so six in place of four adds about 4 runner-minutes a run (51.6 to 55.4 by the same sum), which `CI-parked-suites-nightly.md`
more than gives back (25 runner-minutes a pull request).

**The totals.** In `e2e-m1`'s last step, the ratchet took under a second (11:08:05.3 to 11:08:05.4) and `node e2e/totals/totals.mjs`
54 seconds (to 11:08:59): it runs `vitest list` over every suite. Its output is the job summary's table (G9), never a verdict.

## The call

1. **`e2e-m1-shard` runs six shards, split by time.** `tools/ci/m1-shards.sh <n> <shards>` lists shard `n`'s files: every
   `e2e/m1/**/*.test.ts`, weighted by `tools/ci/m1-timings.json` (60 seconds for a file the table does not know yet), heaviest first,
   each to the shard with the least time so far. It depends only on the checkout, so all six jobs compute the same partition. Each
   shard runs the ratchet's vitest command with its files in place of `m1` and `--shard`; the same tests, the same config, one file at
   a time on each runner. `M1_SHARDS`, at the top of the workflow, is the count; a shard fails if the matrix disagrees with it.
2. **Nothing the gate checks changes.** `e2e-m1` still needs every shard to have passed, and `tools/ci/m1-reports.sh` still fails
   unless there is one report per shard, no file ran twice and together they ran every file in `e2e/m1`. A shard given no file fails
   before vitest starts, since vitest given no filter would run them all.
3. **The table is refreshed by script.** `tools/ci/m1-timings.sh <folder>` prints the medians from any `m1-report` artifacts
   downloaded into a folder. Refresh it when the shards drift apart (a shard's job more than two minutes over the others), or a few
   days after new checks land. A new file before then weighs 60 seconds and goes to the lightest shard.
4. **The totals run beside the shards,** as their own job, `e2e-totals`, with the shards' skips and its own step summary. `e2e-m1`
   no longer waits on them. No branch requires `e2e-totals`.

Expected: the slowest shard about 10.4 minutes (8.5 of tests), `e2e-m1` about 0.8, so the run about 12.5 minutes from `ready`.
Measured in "After" below.

## After

Run 45818890007 (#1092, head 4caa23a6, 26 November): **13.5 minutes**, `ready` at 12:21:49 to `e2e-m1` at 12:35:19, against 21
before. The six shards' jobs took 7.0 to 9.6 minutes (tests 5.9 to 8.0); file 29's shard was the lightest this time (5.9). `e2e-m1`
took 0.9 minutes, against 1.7. `e2e-totals` ran beside the shards in 1.9. The rest of the longest path was waiting for a runner:
the shards started 0.1 to 1.7 minutes after `portal-ui` ended, and `e2e-m1` 0.5 after the last shard, because this pull request
also ran the four parked suites (it changes their workflow). On a pull request that does not, those four runners are free.
Every other job had finished by 12:31:50: `prove-tests` 7.3 to 9.0 minutes, `check-static` 7.9, `e2e-layer2` 7.5, `e2e-m2` 7.1.

## Not done, and why

- **Starting the shards before `portal-ui` finishes** (about a minute: they wait for its client artifact). The shards would have to
  poll for an artifact of a job still running; a stale or missing client would read as a test failure. Not worth the fragility.
- **Caching Playwright's browser** (17 to 40 seconds a shard, mostly the system libraries, which a cache does not keep;
  CI-m1-shards.md). Off the critical path's floor, which is file 29.
- **File 29 itself** (8.4 minutes) is the floor of the whole run. It is the checks author's (`CI-m1-shards.md`, Ask #623).

## Supersedes

- .github/workflows/ci.yml: "They run as four shards (design/decisions/CI-speed.md): each runs a quarter of the files" → "They run as M1_SHARDS shards (design/decisions/CI-speed.md, CI-m1-balance.md): each runs the files tools/ci/m1-shards.sh gives it"
- .github/workflows/ci.yml: "the ratchet over all four shards' reports at once" → "the ratchet over every shard's report at once"
- .github/workflows/ci.yml: "The totals are printed, never committed (G9): the job's summary carries them." → "The e2e suites' totals (G9), printed in this job's summary and never committed."
- tools/ci/m1-reports.sh: "Each shard runs a quarter of e2e/m1" → "Each shard runs its share of e2e/m1 (tools/ci/m1-shards.sh)"
- tools/ci/watch-required.sh: "(`e2e-m1` needs its four shards)" → "(`e2e-m1` needs its shards)"
- e2e/totals/totals.mjs: "e2e-m1 job's step summary" → "e2e-totals job's step summary"
- e2e/m1/README.md: "CI prints them in the e2e-m1 job's summary." → "CI prints them in the e2e-totals job's summary."
- design/decisions/CI-speed.md: "**`e2e-m1` runs as four shards and keeps its name**" → "`e2e-m1` runs as six shards split by measured time (CI-m1-balance)"
- design/decisions/CI-m1-shards.md: "it is a small pull request: `tools/ci/m1-shards.sh` computes the four file lists" → "built by CI-m1-balance, with six shards"
- design/decisions/G9-ratchet-per-check.md: "the `e2e-m1` job's step summary" → "the `e2e-totals` job's step summary"
