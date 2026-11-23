import { defineConfig } from "vitest/config";

// Goal 5's checks (the UI layer, K29): one file at a time. Slice 1's check starts a real HTTP server on a free port; the
// browser checks of the later slices start Chromium and a world, so they need the room too.
export default defineConfig({
  test: { include: ["ui-layer/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 120_000, hookTimeout: 120_000 },
});
