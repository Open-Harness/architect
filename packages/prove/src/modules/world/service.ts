import { Names } from "orthograph/server";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { ServerConfig } from "#modules/server-config/service.js";
import { WorldFailed, type WorldsApi } from "./types.ts";
import { anyPort } from "./internal/ports.ts";
import { applyMigrations, bringUp, stop } from "./internal/wrangler.ts";

export const Worlds: WorldsApi = {
  anyPort,
  start: ({ root, port: asked, name, otlp, portalFeed, environment, secretEnv: given, chain, stands, nonce }) =>
    Effect.gen(function* () {
      const generated = resolve(root, "generated/server/wrangler.jsonc");
      if (!existsSync(generated)) return yield* new WorldFailed({ message: `${generated} is missing: run nx sync first` });
      // A fresh world each run: stage one has no migrations between versions.
      const state = resolve(root, Names.folder, name);
      rmSync(state, { recursive: true, force: true });
      mkdirSync(state, { recursive: true });
      // With the portal's built client in reach, the world runs a config derived from the generated one that serves it (K19).
      const client = ServerConfig.clientOf(root);
      const config = client === undefined ? generated : join(state, "wrangler.jsonc");
      if (client !== undefined) writeFileSync(config, ServerConfig.derive(root, readFileSync(generated, "utf8"), client));
      yield* applyMigrations(config, state);
      // The chain is acquired first, so it is released last: the Worker never outlives the chain it talks to.
      const stood = chain === undefined ? undefined : yield* chain;
      // So are the stand-ins, after the wipe so their folders under the state survive, and their addresses are the Worker's secrets.
      const standEnv = stands === undefined ? {} : yield* stands(state);
      const secretEnv = given === undefined && Object.keys(standEnv).length === 0 ? undefined : { ...given, ...standEnv };
      const log = join(state, "wrangler.log");
      const secret = randomBytes(32).toString("hex");
      // Port 0 asks for any free port; wrangler is told a named one, and `url` is the one it got.
      const port = asked === 0 ? yield* anyPort : asked;
      const url = `http://127.0.0.1:${port}`;
      const vars = { AUTH_SECRET: secret, [Names.variable("ENVIRONMENT")]: environment ?? "local", ...(otlp ? { OTLP_URL: otlp } : {}), ...(portalFeed ? { ORTHO_PORTAL_FEED: portalFeed } : {}), ...(nonce ? { ORTHO_WORLD_NONCE: nonce } : {}) };
      yield* Effect.acquireRelease(bringUp({ config, state, port, log, vars, ...(secretEnv ? { secretEnv } : {}) }, "/_world/health"), stop);
      return { url, log, ...(stood ? { chain: stood } : {}) };
    }),
  launch: ({ config, state, port, log, pidFile, envFile, secretEnv, ready }) =>
    Effect.gen(function* () {
      yield* applyMigrations(config, state);
      const child = yield* bringUp({ config, state, port, log, pidFile, ...(envFile ? { envFile } : {}), ...(secretEnv ? { secretEnv } : {}), detached: true }, ready);
      return { pid: child.pid!, url: `http://127.0.0.1:${port}`, log };
    }),
};
