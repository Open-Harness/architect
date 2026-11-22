import { defineConfig, mergeConfig } from "vitest/config";
import events from "./vitest.events.config.ts";

// The checks of events as the ratchet runs them: the same config, with the runner that marks each test's hooks (ratchet/runner.ts).
export default mergeConfig(events, defineConfig({ test: { runner: "./ratchet/runner.ts" } }));
