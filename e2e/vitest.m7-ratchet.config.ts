import { defineConfig, mergeConfig } from "vitest/config";
import m7 from "./vitest.m7.config.ts";

// M7's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(m7, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
