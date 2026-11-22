import { defineConfig } from "vitest/config";

// The portal checks that read a served client (the harness's default, `PORTAL_CLIENT`), run against the new one: the parity list's run
// (`e2e/portal-next/parity/README.md`). Root is `e2e`, so a check's key is its path from there, as the ratchet keys M1's. The same files
// run against the old client with `PORTAL_CLIENT=old` (the default): they are the checks that hold today's portal.
export default defineConfig({
  test: {
    include: ["m1/21-portal-viewer.test.ts", "m1/28-st1-22-rules-in-the-portal.test.ts", "m1/38-m1-12a-request-key.test.ts", "m1/39-m1-49-monitor-derived.test.ts", "m1/40-m1-50-graph.test.ts"],
    runner: "./ratchet/runner.ts",
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 600_000,
    hookTimeout: 300_000,
  },
});
