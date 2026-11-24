import { Names } from "orthograph/server";
import { randomBytes } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { ServerConfig } from "#modules/server-config/service.js";
import { WorldFailed, type Runner, type StandRunning, type WorldsApi } from "./types.ts";
import { anyPort } from "./internal/ports.ts";
import { applyMigrations, bringUp, stopGroup } from "./internal/wrangler.ts";

export const Worlds: WorldsApi = {
  anyPort,
  start: ({ root, port: asked, name, otlp, portalFeed, environment, secretEnv, chain, nonce, stands }) =>
    Effect.gen(function* () {
      const generated = resolve(root, "generated/server/wrangler.jsonc");
      if (!existsSync(generated)) return yield* new WorldFailed({ message: `${generated} is missing: run nx sync first` });
      // A fresh world each run: stage one has no migrations between versions.
      const state = resolve(root, Names.folder, name);
      rmSync(state, { recursive: true, force: true });
      mkdirSync(state, { recursive: true });
      // With the portal's built client in reach, the world runs a config derived from the generated one that serves it (K19).
      const client = ServerConfig.clientOf(root);
      // A world runs the world's own entry when the project has one: the Worker with its packages' probes registered (GOAL17-check-harness, call 5).
      const entry = existsSync(resolve(root, "generated/server/world.ts")) ? "world.ts" : undefined;
      const config = client === undefined && entry === undefined ? generated : join(state, "wrangler.jsonc");
      if (client !== undefined || entry !== undefined) writeFileSync(config, ServerConfig.derive(root, readFileSync(generated, "utf8"), client, entry));
      yield* applyMigrations(config, state);
      // The chain is acquired first, so it is released last: the Worker never outlives the chain it talks to.
      const stood = chain === undefined ? undefined : yield* chain;
      // Each stand-in is the world's, not wrangler's: it is released after the Worker and survives a kill of the runner.
      const standing: Record<string, StandRunning> = {};
      for (const [mount, acquire] of Object.entries(stands ?? {})) standing[mount] = yield* acquire;
      const log = join(state, "wrangler.log");
      const secret = randomBytes(32).toString("hex");
      // Port 0 asks for any free port; wrangler is told a named one, and `url` is the one it got.
      const port = asked === 0 ? yield* anyPort : asked;
      const url = `http://127.0.0.1:${port}`;
      const standVars = Object.fromEntries(Object.entries(standing).map(([mount, s]) => [Names.variable(`STAND_${mount.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`), s.url]));
      const vars = { ...standVars, AUTH_SECRET: secret, [Names.variable("ENVIRONMENT")]: environment ?? "local", ...(otlp ? { OTLP_URL: otlp } : {}), ...(portalFeed ? { ORTHO_PORTAL_FEED: portalFeed } : {}), ...(nonce ? { ORTHO_WORLD_NONCE: nonce } : {}) };
      // The Worker leads its own process group, so the runner can signal the whole of it, as an eviction would.
      const wrangle = { config, state, port, log, vars, detached: true, ...(secretEnv ? { secretEnv } : {}) };
      const held: { child: ChildProcess } = { child: yield* Effect.acquireRelease(bringUp(wrangle, "/_world/health"), (first) => stopGroup(held?.child ?? first)) };
      const runner: Runner = {
        url,
        kill: (signal = "SIGKILL") => Effect.suspend(() => {
          const pid = held.child.pid ?? 0;
          return stopGroup(held.child, signal).pipe(Effect.as({ pid }));
        }),
        start: Effect.gen(function* () {
          if (held.child.exitCode === null && held.child.signalCode === null) return yield* new WorldFailed({ message: "the runner is running: kill it before starting it again" });
          held.child = yield* bringUp(wrangle, "/_world/health");
          return { pid: held.child.pid ?? 0 };
        }),
      };
      return { url, log, runner, stands: standing, ...(stood ? { chain: stood } : {}) };
    }),
  launch: ({ config, state, port, log, pidFile, envFile, secretEnv, ready }) =>
    Effect.gen(function* () {
      yield* applyMigrations(config, state);
      const child = yield* bringUp({ config, state, port, log, pidFile, ...(envFile ? { envFile } : {}), ...(secretEnv ? { secretEnv } : {}), detached: true }, ready);
      return { pid: child.pid!, url: `http://127.0.0.1:${port}`, log };
    }),
};
