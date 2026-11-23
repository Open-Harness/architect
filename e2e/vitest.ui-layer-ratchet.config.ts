import { defineConfig, mergeConfig } from "vitest/config";
import uiLayer from "./vitest.ui-layer.config.ts";

// Goal 5's checks as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(uiLayer, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
