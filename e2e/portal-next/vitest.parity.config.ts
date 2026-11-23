import { defineConfig } from "vitest/config";
import { parityChecks } from "./parity/touching.ts";

// The portal checks that read a served client (the harness's default, `PORTAL_CLIENT`), run against the new one: the parity list's run
// (`e2e/portal-next/parity/`). Root is `e2e`, so a check's key is its path from there, as the ratchet keys M1's. Which checks they are is found, not
// listed: every check file that opens a portal through `served-portal` or names `portal/dist/client`, less the exempt ones with their reasons
// (`parity/exempt.json`), so a portal check that arrives by a merge is run against the new client with no change here. The same files run
// against the old client with `PORTAL_CLIENT=old` (the default): they are the checks that hold today's portal.
export default defineConfig({
  test: {
    include: [...parityChecks()],
    runner: "./ratchet/runner.ts",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 600_000,
    hookTimeout: 300_000,
  },
});
