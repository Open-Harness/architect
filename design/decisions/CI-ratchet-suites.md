# CI-ratchet-suites: a builder may shrink every e2e suite's ratchet list, not only `e2e/m1/`'s

Decided 22 November 2026 by Goal 5's lead, on the first goal suite after `e2e/m1/` whose builder had to shrink its own
list.

## The problem

AGENTS.md lets a builder remove lines from "the ratchet lists" on the goal branches, and names `e2e/m1/expected-failing/`
and the packages' lists. The suites that came after it each have a list of the same kind (`e2e/stage1/`, `e2e/m8/`,
`e2e/ui-layer/`), read by the same ratchet (`e2e/ratchet/`). `tools/ci/builder-paths.sh` only knew `e2e/m1/` and the
packages, so Goal 5's slice 1 build (#508), which deletes the three lists of `e2e/ui-layer/` as their 37 checks pass,
failed the required `builder-paths` job:

```text
builder-paths: a -build branch changed files that only a journey or check author may change:
  e2e/ui-layer/expected-failing/01-actions-refusals.txt
  e2e/ui-layer/expected-failing/02-actions-approvals.txt
  e2e/ui-layer/expected-failing/03-actions-registry.txt
```

The rule was right and the guard was narrower than the rule.

## The call

Every `e2e/<suite>/expected-failing/` list is shrink-only for a builder, exactly as `e2e/m1/`'s is: deleting a line or a
whole file passes; adding a line, adding a file, swapping a line or renaming one is a hit, and every other file of a
suite (its checks, fixtures and README) stays protected. The guard matches `^e2e/[^/]+/expected-failing/`, so a
look-alike folder (`expected-failing-x/`) is still protected. `tools/ci/ci.test.sh` carries five new cases for it.

Goal 3 widened the guard the same way for `e2e/m2/` alone (#267, a list of two folders) while this was in review. The
pattern above covers `e2e/m2/` too, so the merge keeps the pattern and both sets of test cases.

Goal 9 then widened it to every milestone folder, `^e2e/m[0-9]+/expected-failing/` (M8-timers-shape), with a case that
a non-milestone suite (`e2e/mx/`) may not shrink. Under this call every suite's list may shrink, so the 23 November
merge keeps this pattern, and that case now checks a look-alike folder (`e2e/mx/expected-failing-x/`) instead.

## Supersedes

- `AGENTS.md`: "in `e2e/m1/expected-failing/` and a file per test file" → "in an e2e suite's `expected-failing/` (`e2e/m1/`, `e2e/ui-layer/` and the rest; CI-ratchet-suites) and a file per test file"
- `tools/ci/builder-paths.sh`: "one file per check in e2e/m1/expected-failing/ (G9)" → "one file per check in an e2e suite's expected-failing/ (e2e/m1/ G9, and every other"
- `e2e/m8/README.md`: "lets a builder shrink only M1's list today, so an M8 builder" → "lets a builder shrink every e2e suite's list, this one"
