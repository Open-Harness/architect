import { defineConfig, mergeConfig } from "vitest/config";
import m1 from "./vitest.m1.config.ts";

// M1's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(m1, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
