import { defineConfig, mergeConfig } from "vitest/config";

// The on-chain checks start worlds (Anvil, a collector, prove) and read the repository: one file at a time, each with room to finish. Their ports are
// free ones picked per file, and nothing sweeps what other gates started. The runner marks each test's hooks for the ratchet (ratchet/runner.ts).
export default mergeConfig(
  defineConfig({ test: { include: ["on-chain/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 } }),
  defineConfig({ test: { runner: "./ratchet/runner.ts" } }),
);
