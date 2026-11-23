import { defineConfig, mergeConfig } from "vitest/config";

// Stage 1's checks start worlds on workerd, a collector, a logbook and an issuer: one file at a time, each with room to finish. Their ports are
// free ones picked per file, and nothing sweeps what other gates started. The runner marks each test's hooks for the ratchet (ratchet/runner.ts).
export default mergeConfig(
  defineConfig({ test: { include: ["stage1/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 } }),
  defineConfig({ test: { runner: "./ratchet/runner.ts" } }),
);
