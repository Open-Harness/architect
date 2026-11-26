# G9: the ratchet list is a folder of one file per check, and totals are printed, not committed

Decided 20 November 2026 by the Goal 3 lead, at the conductor's request. Written by the checks author.

## The problem

Two shared files made almost every catch-up of the week. Whichever pull request landed first broke every other that touched them:

- `e2e/m1/expected-failing.txt` is one sorted list for every check, with a header log of who added what, one line per change (K19, HAN-10,
  ST1.22, W2, ...). Two pull requests adding or removing lines next to each other, or both appending to the log, conflict.
- The totals block in `e2e/m1/README.md` is a table of every file's test count and red count. Any pull request that adds a test or takes a
  line off the list rewrites it, so any two conflict, and `e2e:lint` fails a branch whose block is stale.

The catch-ups that cost a merge each: #159 four times, #171 three, #186 once, #184 once more on the way, and the docs-baseline,
HAN-10-baselines and golden pull requests each at least once, almost always in these two files and nothing else.

## The call

1. **One list per check.** `e2e/m1/expected-failing.txt` becomes the folder `e2e/m1/expected-failing/`, one file per check file, named
   after it (`21-portal-viewer.txt` holds `m1/21-portal-viewer.test.ts > ...`), keys in the same format, sorted. A check with nothing
   expected to fail has no file; a builder deletes the file when its last line goes. A pull request that changes one check's lines can only
   conflict with another that changes the same check's. The per-change history comments leave the header: one short note per file where it
   helps, the rest is in the pull requests and these decisions; the general rules are in `e2e/ratchet/README.md`.
   `e2e/ratchet/check.ts` reads every `*.txt` in the folder, errors on a key filed under another check's name, and still fails on any failure
   not listed and prints the newly passing ones.
2. **No committed totals.** The totals block leaves `e2e/m1/README.md`. `nx run e2e:totals` prints the table to stdout, and CI appends it to
   the `e2e-m1` job's step summary (_Superseded by CI-m1-balance, 26 November 2026: the `e2e-totals` job's_). `e2e:lint` no longer runs `totals.mjs --check`, since there is no block to compare.
3. **The builder's rule, kept.** A `-build` branch may only shrink the list: `tools/ci/builder-paths.sh` lets it delete a line from a file under
   `e2e/m1/expected-failing/` or delete a file, and refuses an added line or an added file. Its README exception for totals blocks is gone,
   with its cases in `tools/ci/ci.test.sh`.

Seeded from `goal/stage-1` when the folder landed (after #159, #171 and #184 had merged): the old file held eight lines, all of check 28, and the folder holds those eight in `28-st1-22-rules-in-the-portal.txt`; the m1 ratchet reads the same set. The grid's list was already empty.

## Not decided here

`e2e/grid/expected-red.json` is the grid's list (G7) and a JSON document, not a text list: the same split, one file per cell under
`e2e/grid/expected-red/`, would remove the same conflicts, and the grid runner, its tests and `builder-paths.sh`'s jq judgement would
change with it. It is a larger change than a path; it follows if its conflicts show.

## Supersedes

- AGENTS.md: "`e2e/m1/expected-failing.txt`. Authors' branches end in `-check` and builders' in `-build`." → "in `e2e/m1/expected-failing/`, or delete a file there. Authors' branches end in `-check` and builders' in `-build`."
- design/milestones.md: "Listed in `e2e/m1/expected-failing.txt`" → "Listed in `e2e/m1/expected-failing/`"
- e2e/ratchet/README.md: "`e2e/m1/expected-failing.txt`, and the job fails on any failure that is not on the list" → "the per-check files of `e2e/m1/expected-failing/`, and the job fails on any failure that is not on the list"
- e2e/m1/README.md: "<!-- Written by `nx run e2e:totals` from the tests and expected-failing.txt. Do not edit by hand. -->" → "The numbers (tests in all, how many pass, how many are expected to fail, per file) are not kept here: run `nx run e2e:totals`"
- e2e/totals/README.md: "`e2e:lint` runs `totals.mjs --check` after oxlint" → "Nothing is written to a README, and no check compares one with it"
- tools/ci/builder-paths.sh: "A suite README's totals block" → "The ratchet list, one file per check in e2e/m1/expected-failing/"
- tools/ci/docs-only.sh: "the e2e READMEs carry generated totals" → "an e2e README is part of the checks"
- tools/ci/docs-only.sh: "total the e2e READMEs" → "lint the docs, run canon:check"
- .github/workflows/ci.yml: "are on e2e/m1/expected-failing.txt and may fail" → "are on the per-check files of e2e/m1/expected-failing/ (G9) and may fail"
- .github/workflows/ci.yml: "total the e2e READMEs" → "lint the docs, build the"
- tools/ci/m1-reports.sh: "e2e/m1/expected-failing.txt <out>/m1-errors.json" → "e2e/m1/expected-failing <out>/m1-errors.json"
