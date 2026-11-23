declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    DB_VAULT: D1Database;
    WORLD: DurableObjectNamespace;
    ACTORS: DurableObjectNamespace;
    RELAYER: DurableObjectNamespace<import("../src/modules/relayer/service.ts").Relayer>;
    FOLLOWER: DurableObjectNamespace<import("../src/modules/follower/service.ts").Follower>;
    AUTH_SECRET: string;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    TEST_MIGRATIONS_VAULT: import("cloudflare:test").D1Migration[];
  }
}
