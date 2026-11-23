import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import type { Model } from "@orthograph/compiler";
import { Secrets } from "./service.ts";

const model = {
  secrets: {
    STRIPE_API_KEY: { how: "stored", kind: "runtime", export: "apiKey", from: { kind: "app" } },
    AUTH_SECRET: { how: "generated", kind: "runtime", export: "secret", from: { kind: "app" } },
    NPM_TOKEN: { how: "stored", kind: "release", export: "token", from: { kind: "app" } },
  },
  environments: { local: { cloud: null }, production: { cloud: { provider: "cloudflare", database: "d1" } } },
} as unknown as Model;

const roots: Array<string> = [];
const root = () => { const r = mkdtempSync(join(tmpdir(), "ortho-secrets-")); roots.push(r); return r; };
afterEach(() => { for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true }); });
const run = <A, E>(e: Effect.Effect<A, E>) => Effect.runPromise(Effect.result(e));

describe("secrets in an environment", () => {
  it("a stored secret is missing until set, then set, 0600, and the row never holds the value", async () => {
    const dir = root();
    expect(await Effect.runPromise(Secrets.missing({ root: dir, target: "production", model }))).toEqual(["STRIPE_API_KEY"]);
    expect((await run(Secrets.set({ root: dir, env: "production", name: "STRIPE_API_KEY", value: "sk_live_x", model })))._tag).toBe("Success");
    const rows = await Effect.runPromise(Secrets.rows({ root: dir, env: "production", model }));
    expect(rows.map((r) => [r.name, r.status])).toEqual([["AUTH_SECRET", "missing (promote makes it)"], ["NPM_TOKEN", "in CI"], ["STRIPE_API_KEY", "set"]]);
    expect(JSON.stringify(rows)).not.toContain("sk_live_x");
    expect(await Effect.runPromise(Secrets.missing({ root: dir, target: "production", model }))).toEqual([]);
    const file = join(dir, ".ortho/environments/production/secrets.env");
    expect(readFileSync(file, "utf8")).toBe("STRIPE_API_KEY=sk_live_x\n");
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });

  it("refuses an unknown name or environment, a release secret, an empty value and a multi-line one", async () => {
    const dir = root();
    for (const [env, name, value] of [["local", "NOPE", "v"], ["nowhere", "STRIPE_API_KEY", "v"], ["local", "NPM_TOKEN", "v"], ["local", "STRIPE_API_KEY", ""], ["local", "STRIPE_API_KEY", "a\nb"]] as const) {
      expect((await run(Secrets.set({ root: dir, env, name, value, model })))._tag, `${env} ${name}`).toBe("Failure");
    }
  });

  // Codex P2 on #690: `STRIPE_API_KEY=` in secrets.env counted as set, so promote passed with no credential.
  it("a name with an empty value in secrets.env is not set, in the listing and for promote alike", async () => {
    const dir = root();
    mkdirSync(join(dir, ".ortho/environments/production"), { recursive: true });
    writeFileSync(join(dir, ".ortho/environments/production/secrets.env"), "STRIPE_API_KEY=\nAUTH_SECRET=\n", { mode: 0o600 });
    expect(await Effect.runPromise(Secrets.missing({ root: dir, target: "production", model }))).toEqual(["STRIPE_API_KEY"]);
    const rows = await Effect.runPromise(Secrets.rows({ root: dir, env: "production", model }));
    expect(rows.find((r) => r.name === "STRIPE_API_KEY")?.status).toBe("missing");
    expect(rows.find((r) => r.name === "AUTH_SECRET")?.status).toMatch(/^missing/);
  });
});
