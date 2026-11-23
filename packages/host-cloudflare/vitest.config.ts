import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// Tests run inside real workerd with a real local D1 (decision D1; spike effect4-worker-chain).
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "test/migrations"));
  const vault = await readD1Migrations(path.join(import.meta.dirname, "test/migrations-vault"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./test/wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, TEST_MIGRATIONS_VAULT: vault } },
      }),
    ],
    test: { include: ["src/**/*.test.ts"], setupFiles: ["./test/apply-migrations.ts"], globalSetup: ["./test/anvil-setup.ts"] },
  };
});
