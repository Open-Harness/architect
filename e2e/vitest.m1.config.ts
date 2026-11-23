import { defineConfig } from "vitest/config";

// M1's checks start worlds on workerd and a collector process: one file at a time, each with room to finish. Their
// ports are free ones picked per file, and nothing sweeps what other gates started.
export default defineConfig({
  test: { include: ["m1/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 },
});
