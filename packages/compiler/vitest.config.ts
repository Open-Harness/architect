import { defineConfig } from "vitest/config";

// The model tests compile real blueprints (acme, Plugged In, fresh copies of them), and the compiler loads a blueprint
// with `import()`. Through vitest's module runner every one of those files, and every file of the runtime packages they
// import (orthograph, @orthograph/projections, this compiler), is fetched and transformed one by one, about 100 modules
// for acme and 40 for each fresh copy; on a loaded CI runner that took tests past vitest's 5-second timeout. Node strips
// TypeScript types itself, so these load natively instead, the way `ortho` loads them in production, with one instance
// of each package. Only the test files go through vitest. Measured in design/decisions/CI-compiler-test-speed.md.
export default defineConfig({
  test: {
    server: {
      deps: {
        external: [
          /\/node_modules\//,
          /\/packages\/[^/]+\/src\/(?!.*\.test\.ts$)/,
          /\/examples\//,
          /\/tools\/fixtures\//,
          /\/\.ortho\//,
          /\/test\/(?:tmp[^/]*|fixtures)\//,
        ],
      },
    },
  },
});
