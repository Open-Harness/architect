# The e2e-m1 ratchet

M1's checks (`e2e/m1/*.test.ts`) were written before the slices they check, so some of them fail until their slice
lands. The ratchet lets the CI job `e2e-m1` be a real gate anyway: the failures we know about are listed in
the per-check files of `e2e/m1/expected-failing/`, and the job fails on any failure that is not on the list. The list only shrinks.

`nx run e2e:m1-ratchet` runs the unit test of the comparison (`ratchet.test.ts`), then all of `e2e/m1` with vitest
writing a JSON report to `tmp/m1-report.json`, then `check.ts`, which compares the report with the list (`node e2e/ratchet/check.ts <report> e2e/m1/expected-failing [<errors>]`: it reads every `*.txt` in the folder):

| Case | Result |
|---|---|
| a test fails and is not on the list | the job fails; each one is printed as an error |
| a listed test passes now | a `::warning::` ("newly passing, take it off the list"); the job does not fail |
| a listed entry is not in the report (renamed, deleted) | a warning; the job does not fail |
| a hook throws (beforeAll, afterAll, ...) or a file errors, even in a file whose failing tests are all listed | the job fails, unless that exact key is listed: `m1/NN.test.ts > describe > [suite error]`, or `m1/NN.test.ts > [file error]` |
| a per-test hook throws (beforeEach, afterEach) on a test, listed or not | the job fails, unless that exact key is listed: `m1/NN.test.ts > describe > test > [afterEach error]` (or `[beforeEach error]`) |
| a listed test was skipped | a warning; the job does not fail |
| there is no report, or it is not a vitest report, or it has no files (vitest crashed) | the job fails |

## The list: one file per check

The list is a folder, `e2e/m1/expected-failing/`, with one file per check file, named after it: `21-portal-viewer.txt` holds the keys of
`m1/21-portal-viewer.test.ts`. A check with nothing expected to fail has no file, and a builder deletes the file when its last line goes.
`check.ts` reads every `*.txt` in the folder, and errors on a key filed under another check's name, so a pull request that adds or removes
lines for one check can only conflict with another that touches the same check (G9, `design/decisions/G9-ratchet-per-check.md`). A file may
open with `#` lines saying why its entries are there (one short note is enough); the history of who added what lives in the pull requests and
the decisions. The numbers per file are printed by `nx run e2e:totals`, never committed.

## Keys

One line per entry, `m1/NN-file.test.ts > describe > ... > test`: the file's path from `e2e/`, then the describe titles
and the test's title, joined with ` > `, as vitest's own `FAIL` lines print them. No durations, no colours. A file that
fails with no failing test under it and no hook error (it does not load) is keyed by the file alone: `m1/NN-file.test.ts`.
A hook that throws is its own key, because vitest's JSON report leaves hook errors out: `reporter.ts` (a vitest reporter,
writing `tmp/m1-errors.json`) records them, and no failing test in the same file covers them. Per-test hooks are told apart from the test's own failure by
`runner.ts` (vitest's runner, marking each test's `meta`; `vitest.m1-ratchet.config.ts` turns it on). Lines starting with `#` and blank lines are ignored; keep each file's entries sorted (`LC_ALL=C sort`).

## Taking a test off the list

When a slice lands, its checks start passing and CI prints `newly passing, take it off the list: <key>` for each.
Delete those lines from the check's file in `expected-failing/` in the same pull request (or the next one), and the file when its last line goes. The list never grows by
accident: Gate M1 (M1.15) is when the folder is empty and goes.

## Adding a test to the list

Almost never. A new failure is a regression until proven otherwise: fix it. A line may be added only when a check
is new and its slice is not built yet (the check was written first, as the flow requires), and the pull request says why in its body: which
check, which slice, and when it is due. A test that fails because it is flaky is not listed: fix it or take it up with
the conductor.

## Re-seeding

Read the failing names from a CI run's `e2e-m1` log (`gh run view <run> --job <id> --log`, strip colours, keep the
`FAIL m1/...` lines), or run `e2e:m1-ratchet` locally and read `tmp/m1-report.json`. Locally, one file is enough to
check the shape: `vitest run --root e2e --config vitest.m1.config.ts m1/16-visibility --reporter=json --outputFile.json=../tmp/r.json`
then `node e2e/ratchet/check.ts tmp/r.json e2e/m1/expected-failing` (entries for the files you did not run show as missing warnings).

The rules for a branch: a `-build` branch may only delete lines from these files, or delete a file (`tools/ci/builder-paths.sh` refuses an added line or an added file); a `-check` branch may add, with the reason in the pull request.

## Package tests (G11)

A package whose directory has an `expected-failing/` folder runs its `nx test` through `tools/ci/package-test.sh`: vitest with the JSON reporter, then this `check.ts` with `RATCHET_ROOT=<package>`.
The folder holds one file per test file, named after it, with keys relative to the package (`src/modules/records/find-by.test.ts > <describe> > <test>`). A package without the folder runs as it always did.
The rules are the same as for `e2e/m1`: a builder may only delete lines or files (`tools/ci/builder-paths.sh`); a listed test that passes is reported to take off; there is no hook-error key (a file whose hook throws fails as the file).
`package-ratchet.test.ts` proves it on a scratch package. See `design/decisions/G11-package-ratchet.md`.
