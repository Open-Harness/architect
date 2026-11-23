import { defineConfig } from "vitest/config";

// The grid runner's own tests: pure logic over values, no world, no ports.
export default defineConfig({
  test: { include: ["grid/**/*.test.ts", "served-portal/**/*.test.ts"], testTimeout: 60_000, hookTimeout: 60_000 },
});
