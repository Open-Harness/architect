import { defineConfig } from "vitest/config";

// The workflows journeys (M3.27) start workerd through Miniflare and move a stepped world: one file at a time, each with room to finish.
export default defineConfig({
  test: { include: ["workflows/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 120_000, hookTimeout: 120_000 },
});
