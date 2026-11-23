// A child process for orthograph-package-lock.test.ts: takes the shared lock, logs `enter <pid>` and `exit <pid>` around a hold, and leaves.
import { appendFileSync } from "node:fs";
import { withOrthographLock } from "./orthograph-package.ts";

const [lock, log, holdMs] = process.argv.slice(2) as [string, string, string];
const hold = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
withOrthographLock(() => {
  appendFileSync(log, `enter ${process.pid}\n`);
  hold(Number(holdMs));
  appendFileSync(log, `exit ${process.pid}\n`);
}, { lock, pollMs: 2, waitMs: 60_000 });
