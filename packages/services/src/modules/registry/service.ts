import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { Owned } from "#modules/owned/service.js";
import { RegistryFailed, type RegistryApi } from "./types.ts";
import { registryConfig } from "./internal/config.ts";

/** The pinned `verdaccio` package's own bin, run under the Node that is running this. */
const bin = join(dirname(createRequire(import.meta.url).resolve("verdaccio/package.json")), "bin", "verdaccio");

export const Registry: RegistryApi = {
  start: ({ dir, port: given }) =>
    Effect.gen(function* () {
      const port = given ?? (yield* Owned.freePort);
      const storage = join(dir, "registry");
      mkdirSync(storage, { recursive: true });
      const config = join(dir, "verdaccio.yaml");
      writeFileSync(config, registryConfig(storage, port));
      const url = `http://127.0.0.1:${port}/`;
      const owning = yield* Owned.start({
        kind: "registry",
        binary: process.execPath,
        args: [bin, "--config", config],
        cwd: dir,
        title: "verdaccio",
        log: join(dir, "registry.log"),
        ready: Effect.tryPromise({ try: () => fetch(`${url}-/ping`).then((r) => (r.ok ? r : Promise.reject(new Error(String(r.status))))), catch: () => "waiting" }),
      });
      // The token goes to a file and nowhere else: not to the output, not to a command line.
      const password = randomBytes(16).toString("hex");
      const created = yield* Effect.tryPromise({
        try: () => fetch(`${url}-/user/org.couchdb.user:e2e`, {
          method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "e2e", password }),
        }).then((r) => (r.status < 300 ? (r.json() as Promise<{ token: string }>) : Promise.reject(new Error(String(r.status))))),
        catch: (e) => new RegistryFailed({ message: `couldn't make the registry's user: ${e instanceof Error ? e.message : "failed"}` }),
      });
      const npmrc = join(dir, "npmrc");
      writeFileSync(npmrc, `//127.0.0.1:${port}/:_authToken=${created.token}\n`, { mode: 0o600 });
      return { url, port, pid: owning.pid, npmrc, storage };
    }),
};
