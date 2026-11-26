import { defineConfig, mergeConfig } from "vitest/config";
import acceptance from "./vitest.acceptance.config.ts";

// The acceptance check as the ratchet runs it: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(acceptance, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
