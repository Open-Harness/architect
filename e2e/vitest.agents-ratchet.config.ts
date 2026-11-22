import { defineConfig, mergeConfig } from "vitest/config";
import agents from "./vitest.agents.config.ts";

// Goal 10's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(agents, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
