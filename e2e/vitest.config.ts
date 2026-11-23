import { configDefaults, defineConfig } from "vitest/config";

// Every check runs real things (worlds on workerd, collectors and a registry as processes, an agent session): two at a
// time, each with room to finish. totals/ holds the totals tool's fixture tests, which are red on purpose: no real run takes them.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "totals/**"], globalSetup: ["layer1/teardown.ts"], maxWorkers: 2, testTimeout: 900_000, hookTimeout: 120_000 },
});
