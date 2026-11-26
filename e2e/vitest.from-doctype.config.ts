import { defineConfig } from "vitest/config";

// The from-doctype checks (CX-from-doctype): each runs `ortho` in copies of examples/starter, one file at a time, each
// with room to finish. Nothing starts a world or reaches a cloud.
export default defineConfig({
  test: { include: ["from-doctype/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 600_000, hookTimeout: 300_000 },
});
