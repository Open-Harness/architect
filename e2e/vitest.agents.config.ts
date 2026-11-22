import { defineConfig } from "vitest/config";

// Goal 10's checks (agents, design/decisions/M4-agents.md) start worlds, a local model and prove: one file at a time,
// each with room to finish.
export default defineConfig({
  test: { include: ["agents/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 900_000, hookTimeout: 300_000 },
});
