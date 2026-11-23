# CI-e2e-suites: a per-suite table for the e2e jobs saves under 2%, so it is not built

23 November 2026, by the CI builder, on the conductor's ask that day: measure a per-suite table (`tools/ci/suites.json`, one flag
per e2e job in `affected.sh`) against real pull requests before building it, and build it only if it saves roughly 10% of e2e
runner minutes or more.

## What was measured

The table was replayed on the pull requests into `main` and `goal/stage-1` that merged from 13 to 23 November (288 of them), using
each one's changed files from GitHub and the job minutes in `design/history/ci-2026-11-22/jobs.tsv.gz`. Runner minutes exist only for
20 to 22 November, so the replay covers the 101 of those pull requests that ran `ci` in that window. A pull request's runs are
matched to it by branch name (the run table's pull-request column is mostly empty). Every run of a pull request is counted against
its final diff, which slightly overstates a branch whose early runs had a smaller diff. The script is
`design/history/ci-2026-11-22/e2e_suites_replay.py`; run it on `jobs.tsv`, `ci.tsv` and the two `prs-*.json` lists (`gh pr list
--state merged --base <b> --json number,files,headRefName,baseRefName`).

The e2e jobs took 17,281 runner-minutes in the window. Where they ran:

| Where | Minutes | Share | After Part B |
|---|---|---|---|
| pull requests into `main` and `goal/stage-1` | 9,689 | 56% | still run (B3 gates them) |
| pushes to `main` and `goal/stage-1` | 4,198 | 24% | kept in full (B4) |
| pushes to other branches | 2,383 | 14% | gone (B2) |
| pull requests into other goal branches | 1,011 | 6% | gone (B1) |

By suite: `e2e-m1` 11,321 (66%), `e2e-layer2` 2,497, `e2e-layer1` 1,372, `e2e-grid` 674, `e2e-climb` 618, `e2e-m0` 347, `e2e-m8` 234,
`e2e-stage1` 123, the goal suites and `e2e-m2` under 100 each.

## Result

| Table | Minutes it would have skipped | Of all e2e minutes | Of those pull requests' e2e minutes |
|---|---|---|---|
| **The honest one:** a change under `e2e/<suite>/` runs that suite only; any `packages/**`, `examples/**` or other path runs every suite (the CLI's closure reaches all of them); every run-everything rule kept | 216 | **1.3%** | 2.7% |
| **An optimistic bound:** a pull request whose files sit in one area (`packages/<x>`, `examples/<x>`, `e2e/<suite>`) skips every suite but `e2e-m1`, which no table could justify without reading each suite's real inputs | 308 | **1.8%** | 3.8% |

Even the bound is a fifth of the 10% bar. Eight of the 101 pull requests would have skipped anything worth counting in the honest table, all of them
changes under `e2e/m1/` (they skip the other suites, never `e2e-m1` itself, which is 66% of the minutes).

## Why it is so small

- Almost every pull request touches `packages/**`, and a package change reaches every suite: the suites run the CLI and the examples
  and read the portal, not just the packages they import.
- The suite that costs the most, `e2e-m1`, is the one a package change reaches soonest, so a table cannot skip it.
- A change only to `e2e/<suite>/` is rare among merged pull requests, and the other suites stay cheap beside `e2e-m1`.

## Decision

Not built. No `tools/ci/suites.json`, no per-job flags. B3's `affected_e2e` stays as it is (inert today, and cheap to keep). The
saving to look for next is elsewhere, in this order:

1. **`e2e-m1` itself,** 66% of e2e minutes: shard count and runtime (four shards at 6 to 15 minutes each), not whether it runs.
2. **Pushes to `main` and `goal/stage-1`,** 24%, kept on purpose (B4); they run the suites a second time on the merge commit.
3. Splitting the `e2e` Nx project would make the graph honest but, per the table above, would save nothing today.

Reopen only with new evidence: a measured change in what pull requests touch (for example, many more suite-only checks), or a
suite whose inputs are known to be a small, fixed set of paths.

## Supersedes

Nothing: this adds a measurement and a "no". It answers the open point in CI-integration's "Built, 22 November 2026 (B3)" section,
which left the `e2e` split "for Aaron".
