import { defineConfig } from "vitest/config";

// The checks of events in and out (Goal 11, M5.03 and M5.04) start worlds on workerd, kill them and start them again:
// one file at a time, each with room to finish.
export default defineConfig({
  test: { include: ["events/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 900_000, hookTimeout: 300_000 },
});
