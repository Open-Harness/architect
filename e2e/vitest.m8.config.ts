import { defineConfig } from "vitest/config";

// M8's checks (time, K23) start worlds on workerd and run prove: one file at a time, each with room to finish.
export default defineConfig({
  test: { include: ["m8/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 900_000, hookTimeout: 300_000 },
});
