import { defineConfig, mergeConfig } from "vitest/config";
import m2 from "./vitest.m2.config.ts";

// M2's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(m2, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
