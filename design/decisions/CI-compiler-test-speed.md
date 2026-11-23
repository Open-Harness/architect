# CI-compiler-test-speed: the compiler's tests load blueprints natively, not through vitest's module runner

23 November 2026. Decided by a 🔨 builder thread the conductor started, under AGENTS.md, "Who decides": the compiler's
model tests timed out at vitest's 5-second default on loaded runners, about one run in two on `goal/superagent`, and
every lane paid in reruns.

## Evidence

**In CI.** `Test timed out in 5000ms` in `packages/compiler`, in `check-static`:

- run 45091197684 (`goal/time`): `model.test.ts > privacy-ready seams > carries private(role) …` and `vault.test.ts > mounts …`.
- run 45118635060 (`goal-17/s5-names-followup`), attempt 1: `model.test.ts > refuses a sink named twice …` and
  `needs-approval.test.ts > … > is carried into the model when declared …`; attempt 2: `model.test.ts > describes acme`. It went green on attempt 3.

**Why they are slow.** Every model test compiles a real blueprint, and the compiler loads one with `import()`. Inside
vitest each of those files, and every file of the packages they import (`orthograph`, `@orthograph/projections`, the
compiler itself), went through vitest's module runner one at a time: fetched over its RPC, transformed, evaluated. A
cold acme is about 100 modules, `projections/api.ts` alone pulling in the 41 files of `@orthograph/projections`; each
fresh copy of acme's blueprint, which most tests make so they can change one file, is about 40 more. One test file
measured in isolation on the shared Mac (10 cores, load average 130 from other sessions):

| Step | Through the runner | Native |
|---|---|---|
| acme, first compile in the file | 2268 ms | 1060 ms |
| acme, again | 209 ms | 43 ms |
| a fresh copy, first compile | 970 ms | 263 ms |

Sharing compiled models between the tests of a file was weighed first and does not pay: acme compiled a second time
already costs tens of milliseconds, and each test's copy is a different blueprint it changes on purpose, so it must
compile. The cost was the module runner, so that is what changed.

## Decision

`packages/compiler/vitest.config.ts` marks the blueprints (`examples/`, `tools/fixtures/`, the tests' `.ortho/` and
`test/tmp/` scratch copies, `test/fixtures/`) and every workspace package's `src/` but its test files as external, so
Node loads them with its own type stripping, the way `ortho` loads them in production. One instance of each package
results, as in production; before, the tests' compiler and the one `@orthograph/projections` imported were the same
module only because both ran through the runner. Only the test files go through vitest. No test changed, and none
has an explicit timeout: in 20 runs at load average 164 to 224 on 10 cores the slowest test was 1.1 to 3.0 s, once
4.5 s, against the 5-second default, and a GitHub runner is far less loaded than that.

## Numbers

The whole suite, 160 tests, `vitest run --root packages/compiler` as `tools/ci/package-test.sh` runs it, on the shared
Mac (10 cores). "Under load" in the first three rows is that Mac at load average 130 to 170 from other sessions, plus
one `yes` per core (10); the twenty runs had no `yes` beside them, the Mac's own load being already far above a CI
runner's (load average 164 when they started, 224 when they ended).

| | Before | After |
|---|---|---|
| Under load, 5 s timeout | 3 runs of 3 red: 25, 13 and 10 tests timed out | 5 runs of 5 green, slowest test 1.6 to 2.0 s |
| Under load, timeout lifted: wall | 48 s, 57 s | 16 s, 18 s |
| Under load, timeout lifted: slowest test | 14.7 s, 19.5 s (`vault.test.ts > mounts …`) | 2.0 s, 2.3 s |
| Without the extra load, timeout lifted: wall, slowest | 47 s, 15.2 s | 10 s, 1.9 s |

**On a GitHub runner**, `check-static`'s `nx run compiler:test`, from the vitest summary in the job log:

| | Before: `main`, run 45125139194 (green) | After: this pull request, run 45132981499 |
|---|---|---|
| Suite duration | 24.4 s (transform 31.8 s, import 20.3 s) | 9.0 s (transform 0.4 s, import 12.9 s) |
| `model.test.ts` | 17.1 s | 2.5 s |
| `needs-approval.test.ts` | 8.3 s | 1.1 s |
| Slowest test | 2.1 s (`needs-approval.test.ts`, `model.test.ts > describes acme`) | 1.3 s (`vault.test.ts > mounts …`) |

The 20 runs in a row, default timeout, at load average 164 to 224, all green: wall time and the slowest test.

| Run | Wall | Passed | Slowest test | In |
|---|---|---|---|---|
| 1 | 14 s | 160 of 160 | 2.0 s | `vault.test.ts` |
| 2 | 13 s | 160 of 160 | 1.8 s | `vault.test.ts` |
| 3 | 13 s | 160 of 160 | 1.9 s | `vault.test.ts` |
| 4 | 17 s | 160 of 160 | 3.0 s | `vault.test.ts` |
| 5 | 12 s | 160 of 160 | 1.5 s | `needs-approval.test.ts` |
| 6 | 11 s | 160 of 160 | 1.5 s | `vault.test.ts` |
| 7 | 12 s | 160 of 160 | 4.5 s | `needs-approval.test.ts` |
| 8 | 14 s | 160 of 160 | 2.2 s | `vault.test.ts` |
| 9 | 11 s | 160 of 160 | 1.6 s | `vault.test.ts` |
| 10 | 11 s | 160 of 160 | 1.7 s | `vault.test.ts` |
| 11 | 9 s | 160 of 160 | 1.2 s | `vault.test.ts` |
| 12 | 10 s | 160 of 160 | 1.4 s | `vault.test.ts` |
| 13 | 10 s | 160 of 160 | 1.5 s | `vault.test.ts` |
| 14 | 13 s | 160 of 160 | 1.6 s | `vault.test.ts` |
| 15 | 14 s | 160 of 160 | 3.0 s | `vault.test.ts` |
| 16 | 11 s | 160 of 160 | 1.1 s | `vault.test.ts` |
| 17 | 10 s | 160 of 160 | 1.4 s | `vault.test.ts` |
| 18 | 11 s | 160 of 160 | 1.5 s | `vault.test.ts` |
| 19 | 13 s | 160 of 160 | 2.0 s | `needs-approval.test.ts` |
| 20 | 16 s | 160 of 160 | 2.1 s | `vault.test.ts` |

## The scratch-folder race

Added the same day. After this landed, `retired-unique.test.ts` failed once on a docs-only pull request (run
45149408093, attempt 1): `ERR_MODULE_NOT_FOUND` for a file of its own copy of Plugged In, under
`test/tmp/retired-unique/`. The cause was older than this change, which only exposed it. `model.test.ts` kept its copies in
`test/tmp` and removed all of `test/tmp` in its `afterAll`, and three other files keep theirs beneath it
(`retired-unique`, `refusal-field-schema`, `rule-name-case`). While `model.test.ts` was the slowest file (17 s on CI), it
ended after them. At 2.5 to 4 s it ends while they still run, and its cleanup deleted their copies as they loaded.

Reproduced locally with CI's three workers (`--maxWorkers=3`): 4 runs of 25 failed. Three times a case of
`refusal-field-schema` or `retired-unique` could not load or copy a file of its own copy, and each time that file was
running when `model.test.ts` ended. Once `model.test.ts` itself failed after all its cases passed, at its cleanup.
`model.test.ts` now keeps its copies in `test/tmp/model` and removes only that: 40 runs of 40 green, at load average 123
to 205.
No assertion changed, and every file now removes only its own folder.

## Open

- Other packages time out the same way and are not covered here: `packages/logbook`'s `local.test.ts`, on local workerd (run
  45118635060, attempt 2) and `packages/lint`'s boundaries test (CI-docs-fast-path). Their slow part is real processes, not module
  loading, so this fix does not carry over as it stands.
- A test that `vi.mock`s a module loaded natively would not see the mock. None does today; a test that needs one adds
  its module back to vitest's side.
