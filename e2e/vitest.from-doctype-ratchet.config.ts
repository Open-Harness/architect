import { defineConfig, mergeConfig } from "vitest/config";
import fromDoctype from "./vitest.from-doctype.config.ts";

// The from-doctype checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(fromDoctype, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
