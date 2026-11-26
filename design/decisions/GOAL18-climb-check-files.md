# GOAL18-climb-check-files: the alpha's tests climb as check files, green or red

Decided 25 November 2026 in Goal 18's slice 13 (the climb, K45 section 5), after the 🔍 review of #1073 found the
first count wrong. The building agent owns this call (`AGENTS.md`, "Who decides"). It changes how K45 counts the
alpha's tests, not what K45 decided with Aaron: the climb still has the tests as one of its three dimensions, and it
still climbs.

## The problem

K45 counted the alpha's tests as "each file's tests less its `expected-failing/` lines". The first `climb.mjs` did
that by finding `test(` and `it(` calls in each check file at every commit, and subtracting the red keys. The review
showed three faults:

- **It undercounts.** At `main` 4424c0a5 it found 1,393 tests where vitest's list (`e2e/totals/totals.mjs`) has 2,103:
  `it.each`, `describe.each`, tests made in loops and `it.skipIf(...)(` each count once or not at all.
- **Its two halves are in different units.** The red keys come from vitest, one per expanded case, and were subtracted
  from the regex's count. So "passing" fell when a check pull request landed with new red tests (it fell by 13 at
  a4a7602b, #251), five times in its history, against K45's "the line only climbs".
- **An exact count at every commit is dear.** vitest's list needs the code installed as it was at that commit, an
  install for each of about 55 commits.

## The decision

The alpha's unit is the **check file**: a `*.test.ts` in one of the alpha's suites (`ALPHA_SUITES` in
`tools/github/climb.mjs`), less the portal's graphs (`m1/40-m1-50-graph`, K44 call 2).

- **Red or green:** a check file is red while its own `expected-failing/<check>.txt` holds a key, and green otherwise.
- **Why it is exact:** each red list is a file of its own, named after its check (G9). So the count is exact in git at
  every commit, with no install, and it matches vitest's file list suite by suite.
- **The series:** green, red and all.
- **The tests inside:** `nx run e2e:totals` still counts them, and the dashboard says so.

A green file turns red again only when its author adds tests that fail first. That happened twice in the history, at
e7aee8d1 (#252) and a0354a32 (#1028), both check pull requests. The dashboard and its README say so rather than
claiming the line never falls.

## What was not chosen

- **vitest's list at every commit**, which would count tests exactly. An install per commit makes a nightly refresh
  slow, and an old commit's tests may not load with today's dependencies.
- **Only today's test count, from vitest, with no history.** That gives no climb, which is K45's point.
- **The regex, labelled "test calls written".** It still undercounts the tests, and the red keys can't be taken from it.

## Supersedes

- `design/decisions/K45-board-and-climb.md`: "its `expected-failing/` lines, so the line only climbs (the ratchet)." → "each check file, green while its own expected-failing list is empty (GOAL18-climb-check-files)"
