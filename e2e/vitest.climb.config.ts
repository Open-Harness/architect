import { defineConfig } from "vitest/config";

// The climbability check runs `ortho prove` (workerd and a collector) on planted projects: one file at a time, each with
// room to finish. Its ports are free ones picked per file, and nothing sweeps what other gates started.
export default defineConfig({
  test: { include: ["climb/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 },
});
