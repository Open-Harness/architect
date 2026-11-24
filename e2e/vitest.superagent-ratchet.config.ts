import { defineConfig, mergeConfig } from "vitest/config";
import superagent from "./vitest.superagent.config.ts";

// Goal 17's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(superagent, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
