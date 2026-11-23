# CI-sibling-test-speed: lint's boundaries cases run their oxlint at once; the logbook's local cases get a measured timeout

23 November 2026. Decided by a 🔨 builder thread at the conductor's ask, after
[CI-compiler-test-speed](CI-compiler-test-speed.md): the two other suites seen past vitest's 5-second default, where
the slow part is a real process starting, not module loading.

## Evidence

Scanned: the failed attempts of the last 400 `ci` runs, and the reruns among them.

- **`packages/lint`, `test/boundaries.test.ts`.** Each case starts oxlint, which loads the workspace's JS plugin. It timed
  out at 5 s on 18, 19 and 20 November (runs 44400281241, 44622682715, 44643767982), and has not since
  [CI-docs-fast-path](CI-docs-fast-path.md) gave it 30 and 60 s. It is still slow: on `main`'s green run 45125139194
  the six cases took 1.5 to 5.3 s each, 15.9 s one after another, and `lint:test` took 16.8 s.
- **`packages/logbook`, `src/modules/local/local.test.ts`.** One workerd (through `wrangler dev`) and two OIDC issuers
  start once for the file, in `beforeAll`. Its first case timed out once, in run 45118635060 attempt 2, on a runner whose
  compiler suite was timing out beside it. On run 45125139194 that case took 0.5 s. Timed step by step on the shared
  Mac at load average 175, the case is 0.3 to 0.6 s: a mint, one RSA key for the forged token (0.06 to 0.16 s), six more
  mints, nine refused writes (the first, to a fresh worker, 0.01 to 0.07 s), two reads. Nothing in it is shared work
  left undone.
- `routes.test.ts`, beside it, starts a fresh workerd for every case, on purpose (fresh storage per case). The start
  runs in `beforeEach`, whose own timeout is 180 s, and the cases themselves are short. It has not timed out.

## Decision

1. **Boundaries:** `beforeAll` starts every oxlint run the file needs at once. There are seven: the six fixtures, plus
   `chain-evm`'s `main.ts`, plus the Pro fixture with the GitHub reporter. Each case awaits its own run. Every run is
   still one oxlint on one file with the same arguments, and each case asserts the same exit and output as before.
   The tmp config is written once, before any run reads it, instead of once per case. The 30 and 60 s timeouts stay.
2. **Logbook local:** its setup is already shared. Each case's time depends on two processes vitest doesn't schedule,
   so the `describe` gets 30 s, with the case-level 60 and 180 s timeouts kept. 30 s is 20 times its slowest case on a
   runner (1.5 s, the concurrent-models one) and 6 times the stall seen once.
3. `routes.test.ts` is unchanged: its starts are its subject, and they are in a hook with its own budget.

## Numbers

Local, the shared Mac (10 cores) on its own load, no synthetic load beside it:

| | Before | After |
|---|---|---|
| `boundaries.test.ts`, load average 158 to 190 | 18.0 to 26.2 s (5 runs) | 5.1 to 10.6 s (20 runs, load 174 to 243) |
| `boundaries.test.ts`, its slowest case | 3.6 to 8.9 s | 4.9 to 10.0 s (the first, waiting for all seven) |

Twenty runs of each package's whole suite, back to back, default timeouts, every one green. The load average is
shown for the lint run, then the logbook run. Lint's slowest case is the first one, which waits for all seven runs that
started together. The logbook's slowest case is the slowest of the cases that now have 30 s; the two with their own 60
and 180 s, which restart workerd, took up to 7.7 s. The logbook's twenty are its runs 10 to 29. Run 9 of 29 failed
because the Mac went to sleep on low battery from 09:00:47 to 09:16:34 (`pmset -g log`), in the middle of it: every
case stopped for 950 s, and the tokens minted before the sleep had expired after it. Its other 28 runs were green.

| Run | Load average | Lint: passed | `boundaries.test.ts` | Its slowest case | Logbook: passed | `local.test.ts` | Its slowest 30 s case |
|---|---|---|---|---|---|---|---|
| 1 | 239 / 366 | 43 of 43 | 8.0 s | 7.6 s | 26 of 26 | 10.3 s | 0.86 s |
| 2 | 243 / 343 | 43 of 43 | 6.5 s | 6.0 s | 26 of 26 | 10.7 s | 0.98 s |
| 3 | 237 / 316 | 43 of 43 | 6.5 s | 6.5 s | 26 of 26 | 8.9 s | 0.37 s |
| 4 | 230 / 272 | 43 of 43 | 5.7 s | 5.3 s | 26 of 26 | 9.3 s | 0.93 s |
| 5 | 232 / 263 | 43 of 43 | 6.1 s | 5.8 s | 26 of 26 | 10.5 s | 0.73 s |
| 6 | 224 / 243 | 43 of 43 | 6.7 s | 6.7 s | 26 of 26 | 9.7 s | 0.55 s |
| 7 | 215 / 227 | 43 of 43 | 5.5 s | 4.9 s | 26 of 26 | 7.4 s | 0.93 s |
| 8 | 207 / 210 | 43 of 43 | 5.2 s | 5.1 s | 26 of 26 | 8.7 s | 0.74 s |
| 9 | 208 / 197 | 43 of 43 | 5.8 s | 4.9 s | 26 of 26 | 10.7 s | 0.51 s |
| 10 | 203 / 183 | 43 of 43 | 5.1 s | 4.9 s | 26 of 26 | 11.1 s | 0.65 s |
| 11 | 200 / 175 | 43 of 43 | 5.6 s | 5.0 s | 26 of 26 | 9.6 s | 0.63 s |
| 12 | 196 / 176 | 43 of 43 | 6.3 s | 6.3 s | 26 of 26 | 9.4 s | 0.76 s |
| 13 | 180 / 172 | 43 of 43 | 9.2 s | 9.2 s | 26 of 26 | 10.8 s | 0.48 s |
| 14 | 182 / 153 | 43 of 43 | 9.5 s | 8.3 s | 26 of 26 | 6.7 s | 0.45 s |
| 15 | 195 / 167 | 43 of 43 | 10.6 s | 10.0 s | 26 of 26 | 8.4 s | 0.55 s |
| 16 | 201 / 169 | 43 of 43 | 8.0 s | 7.2 s | 26 of 26 | 7.1 s | 0.60 s |
| 17 | 182 / 175 | 43 of 43 | 6.5 s | 6.5 s | 26 of 26 | 6.1 s | 0.43 s |
| 18 | 188 / 173 | 43 of 43 | 10.0 s | 10.0 s | 26 of 26 | 9.6 s | 0.66 s |
| 19 | 186 / 174 | 43 of 43 | 5.9 s | 5.9 s | 26 of 26 | 10.0 s | 0.44 s |
| 20 | 174 / 178 | 43 of 43 | 5.5 s | 5.5 s | 26 of 26 | 5.7 s | 0.41 s |

**On a GitHub runner**, `check-static`, from the vitest summary in the job log:

| | Before: `main`, run 45125139194 (green) | After: this pull request, run 45147211863 |
|---|---|---|
| `boundaries.test.ts` | 15.9 s, its six cases 1.5 to 5.3 s one after another | 6.0 s; the first case 5.9 s (it waits for all seven runs), the rest under 0.3 s |
| `lint:test` | 16.8 s | 12.1 s (`code-rules.test.ts`, 11.8 s, is now the longest file) |
| `local.test.ts`, its first case; its slowest 30 s case | 0.51 s; 1.45 s | 0.63 s; 1.49 s |
| `logbook:test` | 66.0 s | 64.7 s (the `wrangler dev` starts, unchanged) |

The first boundaries case takes more than 5 s on the runner by itself now, since it waits for the whole set; it keeps the
30 s it had.
