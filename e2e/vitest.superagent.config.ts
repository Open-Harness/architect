import { defineConfig } from "vitest/config";

// Goal 17's adapter checks generate and build plugins into project copies and start stand-ins as processes: one file at a
// time, each with room to finish. The whole-spec checks fetch the published specs once into tmp/specs.
export default defineConfig({
  test: { include: ["superagent/**/*.test.ts"], fileParallelism: false, maxWorkers: 1, testTimeout: 900_000, hookTimeout: 600_000 },
});
