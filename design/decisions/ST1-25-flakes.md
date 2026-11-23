# ST1-25-flakes: check 8 declares its own budget, and a launch refused for a taken port tries a fresh one

20 November 2026. Decided by the checks author for Goal 3 under AGENTS.md, "Who decides".

## Check 8: the 150 ms was acme's example, not the check's promise

`allowance.spend` declares `budget: { p95: "150 millis" }` in acme, an example. Check 8 (`e2e/layer2/08-watch-and-the-portal.test.ts`)
replays 33 calls and asserts the healthy p95 is at most 150 ms. `Evals.percentile` is nearest rank, so over 33 calls the p95 is the
second slowest call: two stalls on a shared runner fail it. CI run 44783700097 failed with p95 197 ms; run 44698831344 with 280 ms
(`CI-speed.md`). Passing runs print no p95, so there is no CI series; the CI evidence is those two failures.

Measured on a Mac with three copies of the check running at once (the machine was at load 10 to 18), the spans of the 33 healthy
calls were mostly 4 to 14 ms; p95 was 20, 14 and 28 ms and the worst single call 87 ms. The planted slow handler (2000 sequential
queries) gave 30 calls of 1.46 to 3.5 s. Healthy is 5 to 20 ms, a bad CI stall is 200 to 300 ms, the planted slowdown is 1500 ms and up.

**Decision.** Check 8 declares `allowance.spend`'s budget itself, 500 ms (`BUDGET_MS`), by rewriting that one line in its own copy of
acme (`declareSpendBudget`, then `ortho generate`, then a commit that is the first release). 500 is 1.8 times the worst CI p95 seen
and about 3 times under the slowest planted run. acme's 150 is untouched, and its docs still show it. The "looser budget" step doubles
the budget in the same way instead of installing a 300 ms fixture (which would now be tighter); check 3 still uses that fixture.

**It still catches a regression.** With the healthy handler planted slow (700 sequential queries) the check fails at its first watch:
`healthy spend p95 against its 500 ms budget: expected 527 to be less than or equal to 500`. The slow handler of the second phase
still has to drift. What the check no longer sees is a regression of under about 3 times; the exact budget arithmetic (over, under,
fewer than 20 calls) stays covered by the watch unit tests.

## ortho env: a port free when chosen is not free when wrangler binds it

`packages/prove/src/modules/environments/environments.test.ts` ("runs staging and production at once…") failed in CI (run
44796275059, job 136498318489) with `production didn't start: the world exited (1)` after 20.9 s; the other 165 tests passed.
`Environments.up` chose a port with `Worlds.anyPort`, which asked the system for any free port. On Linux that range (32768 up) is the
one outgoing connections and wrangler's own sockets draw from. Between choosing and binding come the collector, the config, the D1
migrations (a `wrangler d1 migrations apply` of several seconds) and the start of wrangler, while staging's workerd is running. The
port can be taken in that window. `bringUp` already starts again when wrangler says "Address already in use", but on the same
port, so a port that something else holds fails three times and the up fails. I could not make it fail on the Mac (four copies of
the file at once, five files each, all green); the cause is read from the code and the Linux port range, and a planted refusal proves the fix.

The `claude/test-free-ports` branch was merged (#133, in `goal/stage-1`): it gave the tests' own helper (`test/ports.ts`) a
20000 to 29999 range, but production's `anyPort` kept the system's.

**Decision.** This is a bug in prove, so it is fixed in prove:

1. `Worlds.anyPort` picks at random from 20000 to 29999, each tried for free, and falls back to the system's pick after 20 tries.
2. `Environments.up` launches through `launchOnFreePort`: a launch refused as taken starts again on a fresh port, which it writes to
   the environment's `port` file, up to 3 more times, unless the caller named the port (that one is never moved).
3. `Up.port` is the port the world got.

`launch-port.test.ts`: the first two tries refused as taken, the third succeeds on a third port which is
the one on disk; a named port is never moved; another failure is not retried. With the retry condition replaced by "never", the first
case fails.
