import { defineConfig } from "vitest/config";

// M7's checks (Goal 15): the ones that start workerd and a real logbook run one file at a time, each with room to finish. None reaches a cloud.
export default defineConfig({
  test: { include: ["m7/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 },
});
