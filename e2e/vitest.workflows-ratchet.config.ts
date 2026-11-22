import { defineConfig, mergeConfig } from "vitest/config";
import workflows from "./vitest.workflows.config.ts";

// The workflows journeys as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(workflows, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
