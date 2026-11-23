# Proposal: make proving fast, run only what a change touches, and give Vitest a real job

20 November 2026. To the conductor, from the Vitest deep-dive thread, at Aaron's request. Everything under "Measured"
was run on the shared Mac on `goal/stage-1`; everything under "Proposed" is an estimate until built, and says so.

## The short version

1. **Proving is slow because it waits, not because it works.** `ortho prove` on acme took 30 seconds; the handlers' own
   work in that run was a quarter of a second. Twenty of the thirty seconds were one bug, now fixed in pull request
   pull request 190. What is left is start-up and running journeys one at a time.
2. **Nothing today knows what a change touches,** so CI runs everything. Vitest has a changed-files filter, and it
   gives wrong answers here, because our slow tests start `ortho` as a separate process and Vitest cannot see through
   that. The framework can know exactly, because a journey imports the operations it calls.
3. **Vitest is used as a process launcher.** 255 test files, no fixtures, no custom matchers, eight separate configs,
   and a hand-built ratchet beside it. A spike (pull request 189) showed the climbability check runs unchanged on
   fixtures and matchers in 41 lines where it was 108.

The ask: schedule the three tracks below. Track A's first two steps and track B's first step serve Goal 3's
"climbable" directly, so they belong before stage 1 closes; the rest can wait for `later.md` if you judge so.

## Measured

### One prove run on acme (11 journeys, 43 steps), before the fix

| Part of the run | Time |
|---|---|
| Two ten-second timeouts, waiting for traces that never come | 20.0 s |
| Starting the command, the world and the collector | about 5 s |
| All 11 journeys, one after another | 4.7 s |
| The handlers' own spans, summed | 0.25 s |
| **Whole run** | **29.7 s** |

The timeouts: three steps in acme are reads the server refuses with `NotAllowed`. A refused caller leaves no span, on
purpose (`design/decisions/O2-trace-gaps.md`, gap 3). Prove still waited for those three traces to be complete, hit
its ten-second limit, exported the journey roots, and waited ten seconds again.

### The same run, after the fix (pull request 190)

| Run | Whole run | Journeys and judging |
|---|---|---|
| 1 | 11.1 s | 5.6 s |
| 2 | 10.0 s | 5.4 s |
| 3 | 9.3 s | 5.2 s |

All 43 steps still pass and no step reports missing telemetry. Every project whose journeys test a refused read was
paying those 20 seconds on every prove, and so was every test of ours that runs such a project.

### Other fixed costs

| What | Time |
|---|---|
| `ortho --help` (the command starting and doing nothing) | 2.3 s |
| `ortho check` on acme | 3.1 s |
| `ortho prove --only "health is up"` (one journey, one step, no people) | 5.2 s |

So about five seconds of every prove is start-up, whatever it proves.

### Vitest's changed-files filter, tried on a real change

The fix above changes four files in `packages/prove`. `vitest list --changed` was asked which test files that affects:

| Suite | Files Vitest would run | Right? |
|---|---|---|
| prove's own tests | 28 of 40 | Plausible: these import what they test. |
| climbability check | 0 of 2 | **Wrong.** It runs prove eleven times, and went from 101 s to 63 s with this change. |
| layer 2 gate | 0 of 8 | **Wrong.** It runs prove in a test world. |
| layer 1 gate | 3 of 8 | **Wrong.** It keeps "acme proves" and drops "every eval catches its break", which runs prove nine times. |
| M1 checks | 17 of 29 | Not checked file by file. |

Vitest follows `import` lines. A test that calls `spawnSync(node, [cli, "prove", ...])` has no import of prove, so
Vitest sees no link. 74 test files start a process this way. This is the same reason the CI-speed decision refused
`nx affected`: the graph does not know what the slow tests read.

### CI, from `design/decisions/CI-speed.md` (not re-measured here)

A code pull request into `goal/stage-1` took 67 minutes at the median, ran CI 4.4 times, and each clean run was 22
minutes on its longest path. Prove's own tests were 813 seconds; the M1 checks 1,350 seconds. Both are made of prove
runs, so both should fall with the fix. How far is not measured yet: the first CI run of pull request 190 will say.

## Why journeys stay plain data

A journey today is a description: who, which operation, what payload, what to check. Prove decides how to run it.
That is what lets the framework do things a test runner cannot:

- run the same journey against `local`, `test` and `staging`, and through every generated output (the grid);
- know, without running anything, which operations a journey calls;
- build a starting world once and hand out copies;
- skip a journey whose inputs have not changed, and say so with a signed verdict.

If a journey were the body of a Vitest test, Vitest would own the schedule and the framework would see only "a
function ran". Vitest can still show journeys, filter them and report on them (track C). It should not be what runs them.

## Proposed

### Track A: make one prove fast

| # | Change | What it should save | Risk | Done when |
|---|---|---|---|---|
| A0 | Do not wait for a trace the server will never send. **Done, pull request 190.** | 20 s of 30 on acme (measured) | A handler that wrongly ran for a refused caller: its spans are still waited for once any arrive. | merged |
| A1 | A warm world: `ortho dev` keeps the world and collector up, and `ortho prove` uses them when they are there. | The 5 s start-up, on every run after the first | Leftover state between runs: a reset before each run keeps it out of the way (Superseded by ST1-24, 20 November 2026). | second prove in a row on acme is under 6 s |
| A2 | `ortho prove --changed`: prove only the journeys that call an operation whose handler, declaration or journey changed. | Most of a run, in the climb loop | The map must be complete; a miss is a false green. Always falls back to everything when unsure. | changing `spend.ts` on acme runs the 3 journeys that call spend and names the 8 it skipped |
| A3 | Verdict reuse: key a verdict by the handler hashes, the journey text, the model slice and the framework version; reuse the logbook's signed verdict when the key matches. | Whole runs in CI when nothing they prove changed | Wrong key means a stale pass. The key must be proved by planted changes, one per input. | a docs-only change proves nothing and reports every operation's verdict as reused |
| A4 | Starting worlds as snapshots: build `founded` and `funded` once as database files, copy one per journey. | The repeated set-up calls; full isolation between journeys | Durable Objects hold state too; a snapshot must cover both. Needs a spike. | spike answers whether a D1-plus-DO snapshot restores in under 100 ms |
| A5 | Journeys at the same time. Each already has its own people. | 4.7 s to about 1 s (estimate) | The performance eval measures latency; load changes it. Run it apart, or measure it on its own pass. | prove on acme is the same verdict 20 times in a row, concurrent |
| A6 | Prove receives telemetry itself, with no collector process and no polling of files. | About half a second of quiet-waiting and the collector's start | The local viewer reads the collector's files today. | prove's trace wait is under 100 ms on acme |
| A7 | Load each command's code only when it runs. | Most of the 2.3 s of `ortho --help` | Low. | `ortho --help` under 0.5 s |

Order: A0 is done. A2 and A1 next, because the climbing agent's loop is "edit one handler, prove" and those two cut it
most. A3 is the one that pays back across many users and across CI, and needs the most care.

### Track B: run only what a change touches

Aaron's question: when something changes, how do we know what must rerun? Three layers, each with its own answer.

**B1. Journeys: the framework already has the map.** A journey file imports the operations it calls
(`import spend from "../blueprint/things/allowance/verbs/spend.ts"`), the model names each operation's handler file,
and prove already hashes every handler. So "which journeys does this change touch" is a lookup, exact, with no test
runner involved. This is A2, and the same map drives A3.

**B2. Our own tests: let Vitest see what they test.** Vitest's filter works where a test imports what it tests, and
fails where a test starts a process. Two moves:
- Where a test only needs prove's result, call it in process. The CLI is already shaped for that: `main.ts` is the
  only file that exits or prints. Then `vitest --changed` is right for those files, and they lose 2.3 s of start-up each.
- Where a test must start `ortho` as a user does (the layer gates), say what it reads by tagging it. Vitest 4.1 has
  test tags; a suite tagged `prove` reruns when `packages/prove` changes, by a rule we write down, not one we hope for.

**B3. CI: pick suites from the changed paths.** The docs fast path is the first rule of this kind. With B2's tags, CI
runs `vitest --tags-filter` from a small table of path to tag, kept in one file and tested like `tools/ci/docs-only.sh` is.
Until B2 lands, nothing in CI should use `--changed`: the table above shows it would skip the climbability check.

Done when: a pull request that only changes `packages/portal` runs no prove suite, and a planted change in
`packages/prove` is shown to run every suite that starts prove.

### Track C: Vitest as part of the framework

**C1. For users: a Vitest plugin, as one more generated output.**
- Each journey appears as a suite and each step as a test, run by the same prove engine. Users get watch mode, the
  Vitest UI and run-one-step without us building any of it.
- An Orthograph reporter: writes the structured report, marks a failure on the handler file and the declaration in the
  pull request, attaches the trace link, and posts verdicts to the logbook. With sharded runs it merges them.
- The journey checks (`emits`, `refuses`, `spans`, `machine.isIn`) as `expect` matchers, from the same code prove uses,
  so a handler's unit test and its journey speak the same words.

**C2. For this repository.**
- World-starting checks on shared fixtures and report matchers (spike in pull request 189: 26 of 26 green, 41 lines
  for 108, a leak fails the file by itself; no faster).
- One config with named projects where `e2e/` has eight configs.
- The ratchet as one reporter, and shard results joined by Vitest's own blob reports. Not yet proved: whether the
  reporter can tell which hook failed, which is what the ratchet's custom runner exists for.
- A slow-file budget: a reporter that fails CI when one test file passes its limit, so a 300-second file is noticed
  the day it appears.

C2's checks belong to the checks author, not a builder (`AGENTS.md`, "Journeys and checks come first").

## What I would not do

- Make journeys Vitest tests (above).
- Use Vitest's mocks or fake timers anywhere: local, not fake.
- Turn on `vitest --changed` or `nx affected` in CI before B2.
- Adopt `@effect/vitest` before someone confirms it supports Effect 4.1.1 and it clears the three-day release rule.

## What is not known yet

- How much CI falls with A0. The first CI run of pull request 190 answers it.
- Whether other examples (signup, Plugged In, work) had the same 20-second wait. Any journey with a refused read did.
- Every number in the "what it should save" column except A0's.
- I could not see the speed-test thread; if it measured the same things, its numbers should replace mine where they differ.

## Where the evidence is

- The trace-wait fix and its test: pull request 190 (into `goal/stage-1`).
- The fixtures and matchers spike: pull request 189, `spikes/vitest-fixtures/README.md`.
- CI timings: `design/decisions/CI-speed.md`.
