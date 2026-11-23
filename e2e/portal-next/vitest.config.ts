import { defineConfig } from "vitest/config";

// Goal 6's checks (`nx run e2e:portal-next`): real Chromium and a real nx build, one file at a time, each with room to finish.
export default defineConfig({
  test: { include: ["**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 300_000, hookTimeout: 120_000 },
});
