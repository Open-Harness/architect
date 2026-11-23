# Totals for the e2e suites, printed and never committed

A suite's README used to hold its test counts as a sentence, and then as a generated block, and every pull request that added or took off
a test rewrote the same lines, so whichever landed first conflicted with every other (G9, `design/decisions/G9-ratchet-per-check.md`). Now the
counts are printed from facts and kept nowhere.

## What it does

`nx run e2e:totals` (`node e2e/totals/totals.mjs`) prints, to stdout, for every `e2e/<suite>/` that has an `expected-failing/` folder:

- the number of tests in each file of the suite, from `vitest list --json` (nothing runs; it uses
  `e2e/vitest.<suite>.config.ts` if there is one, else `e2e/vitest.config.ts`);
- how many of each file's tests are on the suite's list, the `*.txt` files of `e2e/<suite>/expected-failing/`. A listed line that
  matches no test is counted too, so a stale entry shows. Lines for a hook or a file that errored are not tests and are not counted.

The output is a markdown heading, a sentence (`N tests in all; P pass; R expected to fail, listed in expected-failing/`) and a table of
file, tests and expected to fail. `--suite <name>` (repeatable) names a suite with no list. CI appends the output to the e2e-m1 job's step
summary. Nothing is written to a README, and no check compares one with it.

## Its own test

`nx run e2e:test` (so CI's `check` job) runs `test-totals.mjs` on the small suites in `fixture/`: it prints the totals, names a suite with
no list, and changes a test and prints again. The fixture's tests are red on purpose and are not in any real run: `e2e/vitest.config.ts`
excludes `totals/**`, and the other configs name their own folders.
