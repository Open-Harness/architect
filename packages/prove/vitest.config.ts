import { defineConfig } from "vitest/config";

// Each test file starts real worlds (wrangler, workerd, a collector process). Two files at a time keeps world start-up
// well inside its wait on a laptop and on CI's runners.
export default defineConfig({ test: { maxWorkers: 2 } });
