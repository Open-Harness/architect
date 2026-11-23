import { defineConfig } from "vitest/config";

// Gate 2's checks each start a logbook, a registry, an issuer and one or more long-lived environments: two at a time, each
// with room to finish. Its own config, so layer 1's teardown (and its run folder) stay out of it.
export default defineConfig({
  test: { include: ["layer2/**/*.test.ts"], globalSetup: ["layer2/teardown.ts"], maxWorkers: 2, testTimeout: 1_500_000, hookTimeout: 1_200_000 },
});
