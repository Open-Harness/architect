import { defineConfig, mergeConfig } from "vitest/config";
import m8 from "./vitest.m8.config.ts";

// M8's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(m8, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
