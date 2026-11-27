import { defineConfig } from "vitest/config";

// The acceptance check (Goal 18, slice 11): Orthograph published to a local registry, an app made, proved, run and called. One file,
// one at a time: it builds, publishes and starts servers of its own, on free ports. Its own CI job, `e2e-acceptance`, so it has the
// 20 minutes to itself.
export default defineConfig({
  test: { include: ["acceptance/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 900_000 },
});
