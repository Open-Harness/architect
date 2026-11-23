# CI-e2e-suites: a per-suite table for the e2e jobs saves about 1% (5% with inert paths), so it is not built

23 November 2026, by the CI builder, on the conductor's ask that day: measure a per-suite table (`tools/ci/suites.json`, one flag
per e2e job in `affected.sh`) against real pull requests before building it, and build it only if it saves roughly 10% of e2e
runner minutes or more.

## What was measured

The table was replayed on the pull requests into `main` and `goal/stage-1` that merged from 13 to 23 November (288 of them), using
each one's changed files from GitHub and the job minutes in `design/history/ci-2026-11-22/jobs.tsv.gz`. Runner minutes exist only for
20 to 22 November, so the replay covers the 101 of those pull requests that ran `ci` in that window. A pull request's runs are
matched to it by branch name (the run table's pull-request column is mostly empty). Every run of a pull request is counted against
its final diff, which slightly overstates a branch whose early runs had a smaller diff. The script is
`design/history/ci-2026-11-22/e2e_suites_replay.py`; run `python3 e2e_suites_replay.py` from anywhere and it reads `ci.tsv`, `jobs.tsv.gz` and
the two snapshots of the pull-request lists (`prs-main.json.gz`, `prs-goal_stage-1.json.gz`: number, branches and changed paths, taken with
`gh pr list --state merged --base <b> --json number,files,headRefName,baseRefName,mergedAt` on 23 November) from its own folder.

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

All figures are runner minutes saved over the 17,281 e2e minutes in the window (after B1 and B2 take out 3,394 of them, the pool
left is 13,887). A pull request's minutes are counted once per branch; the 100-file cap on GitHub's `files` list sends 14 pull
requests to "run everything".

| Row | What it assumes | Minutes skipped | Of all e2e minutes | Of the pool after B1+B2 |
|---|---|---|---|---|
| 1 | **The per-suite table, honest:** a change under `e2e/<suite>/` runs that suite only; any `packages/**`, `examples/**` or other path runs every suite; every run-everything rule kept | 216 | **1.2%** | 1.6% |
| 2 | **Inert paths:** a pull request that touches only paths no suite reads (`spikes/`, `.agents/`, `.claude/`, `AGENTS.md`, `.github/ISSUE_TEMPLATE/`, ...) and is not docs-only skips every e2e job but `e2e-m0`. Not a per-suite table: it widens the docs fast path | 728 | **4.2%** | 5.2% |
| 1+2 | both | 944 | **5.5%** | 6.8% |
| 3 | **A ceiling, not a plan:** every non-docs pull request skips every suite but `e2e-m1`, which no table could justify without reading each suite's real inputs | 2,480 | 14.3% | 17.9% |

Rows 1 and 1+2 are under the 10% bar; row 3 is over it only because it assumes the suites read nothing. Eight of the 101 pull
requests would have skipped anything worth counting in row 1, all of them changes under `e2e/` (mostly `e2e/m1/`), and they skip the
other suites, never `e2e-m1` itself, which is 66% of the minutes.

## Why row 1 is so small

- 41 of the 101 pull requests touch `packages/**`, and a package change reaches every suite: the suites run the CLI and the examples and
  read the portal, not just the packages they import. Another 42 touch only other paths (`.agents/`, `spikes/`, `.claude/`, root
  config, `tools/`); most of those either run everything (`tools/ci/`, workflows) or are row 2.
- The suite that costs the most, `e2e-m1`, is the one a package change reaches soonest, so a table cannot skip it.
- A change only to `e2e/<suite>/` is rare among merged pull requests, and the other suites stay cheap beside `e2e-m1`.

Caveats: runner minutes exist only for 20 to 22 November, so the replay covers the 101 merged pull requests that ran in that window
(7,621 of the e2e minutes; the rest ran on pushes and on pull requests that did not merge into the two bases). A pull request's runs
are matched by branch name and all counted against its final diff, which slightly overstates a branch whose early runs had a smaller
diff. Some inert paths are read after all: `e2e/grid` reads `design/grid/grid.json` and `e2e/m0` reads `design/` names, so row 2
keeps `e2e-m0`, and the docs fast path already skips `e2e-grid` on a `design/grid` change (a gap, noted for the next CI pass).

## Decision

The per-suite table is not built: 1.2% is far under the bar. No `tools/ci/suites.json`, no per-job flags. B3's `affected_e2e` stays as
it is (inert today, and cheap to keep). Row 2 is a different and cheaper lever (a few more path patterns in `tools/ci/docs-only.sh`,
worth about 4 to 5% of e2e minutes), not built either, since it is not what was asked and shares the docs-only flag with `prove-tests`;
it is the first thing to take up if the conductor wants more. The saving to look for after that is, in this order:

1. **`e2e-m1` itself,** 66% of e2e minutes: shard count and runtime (four shards at 6 to 15 minutes each), not whether it runs.
2. **Pushes to `main` and `goal/stage-1`,** 24%, kept on purpose (B4); they run the suites a second time on the merge commit.
3. Splitting the `e2e` Nx project would make the graph honest but, per the table above, would save nothing today.

Reopen only with new evidence: a measured change in what pull requests touch (for example, many more suite-only checks), or a
suite whose inputs are known to be a small, fixed set of paths.

## Supersedes

Nothing: this adds a measurement and a "no". It answers the open point in CI-integration's "Built, 22 November 2026 (B3)" section,
which left the `e2e` split "for Aaron".
