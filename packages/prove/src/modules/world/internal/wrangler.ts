import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Schedule } from "effect";
import { WorldFailed } from "../types.ts";

const bin = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");

/** The D1 bindings a config migrates: each `d1_databases` entry names its `migrations_dir`. The default is `DB`; each declared store (K3) has its own. */
export const databasesOf = (configText: string): ReadonlyArray<string> =>
  [...configText.matchAll(/"binding"\s*:\s*"([A-Za-z0-9_]+)"[^}]*"migrations_dir"/g)].map((m) => m[1]!);

/** Apply the generated migrations to each local database. `CI=1` stops wrangler asking to confirm. */
export const applyMigrations = (config: string, state: string) =>
  Effect.try({
    try: () => {
      const found = databasesOf(readFileSync(config, "utf8"));
      for (const binding of found.length > 0 ? found : ["DB"]) {
        const run = spawnSync(process.execPath, [bin, "d1", "migrations", "apply", binding, "--local", "--config", config, "--persist-to", state], {
          encoding: "utf8",
          env: { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false" },
        });
        if (run.status !== 0) throw new Error(run.stderr || run.stdout);
      }
    },
    catch: (e) => new WorldFailed({ message: `the local database couldn't be made: ${String(e)}` }),
  });

/** How to run one `wrangler dev`: its own state, its own inspector port, its output in `log`. */
export interface Wrangle {
  readonly config: string;
  readonly state: string;
  readonly port: number;
  readonly log: string;
  /** Vars travel as arguments: only for a throwaway secret. A real one goes in `envFile`. */
  readonly vars?: Readonly<Record<string, string>>;
  /** A file of secrets (`NAME=value` lines), read by wrangler and never shown by `ps`. */
  readonly envFile?: string;
  /**
   * Secrets that must never reach a file or an argument (a telemetry token): given to wrangler through its process
   * environment, which wrangler hands to the Worker as secret bindings. wrangler then runs with a small allowlist of
   * the caller's environment and not all of it, so nothing else in the shell becomes a binding of the Worker.
   */
  readonly secretEnv?: Readonly<Record<string, string>>;
  /** Own process group, outliving this process: a long-lived environment. */
  readonly detached?: boolean;
  /** Written with the process id as soon as it exists, so a caller killed part-way can still find what it started. */
  readonly pidFile?: string;
}

/**
 * `wrangler dev`, its output appended to `log`. `--inspector-port 0` keeps two of them off the same inspector port (9229).
 */
export const startWrangler = (w: Wrangle) =>
  Effect.sync((): ChildProcess => {
    const out = openSync(w.log, "a");
    const args = [
      bin, "dev", "--config", w.config, "--port", String(w.port), "--ip", "127.0.0.1", "--persist-to", w.state, "--inspector-port", "0",
      ...(w.envFile ? ["--env-file", w.envFile] : []),
      ...Object.entries(w.vars ?? {}).flatMap(([k, v]) => ["--var", `${k}:${v}`]),
    ];
    const child = spawn(process.execPath, args, { stdio: ["ignore", out, out], detached: w.detached === true, env: childEnv(w.secretEnv) });
    if (w.detached) child.unref();
    if (w.pidFile) writeFileSync(w.pidFile, `${child.pid}\n`);
    return child;
  });

/** What wrangler needs from the shell to run, and nothing it doesn't: no key of the user's reaches the Worker. */
const KEPT = /^(PATH|HOME|USER|LOGNAME|SHELL|TMPDIR|TERM|TZ|LANG|LC_[A-Z]+|XDG_[A-Z_]+|SSL_CERT_FILE|SSL_CERT_DIR|NODE_EXTRA_CA_CERTS|HTTPS?_PROXY|NO_PROXY|https?_proxy|no_proxy)$/;

/** The environment wrangler runs in: unchanged, unless there are secrets to hand it, and then the allowlist plus them. */
const childEnv = (secrets: Readonly<Record<string, string>> | undefined): NodeJS.ProcessEnv => {
  const base = { CI: "1", WRANGLER_SEND_METRICS: "false" };
  if (secrets === undefined || Object.keys(secrets).length === 0) return { ...process.env, ...base };
  const kept = Object.fromEntries(Object.entries(process.env).filter(([k]) => KEPT.test(k)));
  return { ...kept, ...base, ...secrets, CLOUDFLARE_INCLUDE_PROCESS_ENV: "true" };
};

export const stop = (child: ChildProcess) =>
  Effect.callback<void>((resume) => {
    if (child.exitCode !== null || child.signalCode !== null) return resume(Effect.void);
    child.once("exit", () => resume(Effect.void));
    child.kill("SIGTERM");
  });

/** One look at `url`, given up after a second: while the worker cannot build, wrangler takes the connection and never answers it. */
const answers = (url: string) =>
  Effect.tryPromise({ try: () => fetch(url, { signal: AbortSignal.timeout(1000) }).then((r) => r.ok), catch: () => false }).pipe(
    Effect.flatMap((ok) => (ok ? Effect.void : Effect.fail(false))),
  );

/**
 * Start wrangler and wait until `ready` answers. wrangler picks the worker's internal sockets itself, and two of them
 * starting together can pick the same one; it then exits at once, so an early exit for a taken address starts it again.
 * A process that never comes up is stopped. One that does is the caller's.
 */
export const bringUp = (w: Wrangle, ready: string) => {
  const url = `http://127.0.0.1:${w.port}${ready}`;
  const attempt = Effect.gen(function* () {
    const from = readLog(w.log).length;
    const child = yield* startWrangler(w);
    // A worker that cannot be built (a missing file, an import of something not exported) leaves wrangler up, waiting for the
    // file to change: it never exits and never answers. Its log holds esbuild's error, so the wait ends the moment that shows.
    // A taken socket is told apart first: workerd's bind failure also prints a `✘ [ERROR]` line, and it is retried, not reported.
    const up = Effect.suspend((): Effect.Effect<void, "exited" | "silent" | "unbuildable" | "taken"> => {
      const log = readLog(w.log).slice(from);
      return taken(log) ? Effect.fail("taken")
        : child.exitCode !== null ? Effect.fail("exited")
        : buildErrors(log) !== undefined ? Effect.fail("unbuildable")
        : answers(url).pipe(Effect.mapError(() => "silent" as const));
    });
    yield* up.pipe(
      Effect.retry({ schedule: Schedule.spaced("250 millis"), times: 480, while: (e) => e === "silent" }),
      Effect.tapError(() => stop(child)),
      Effect.mapError((e) => {
        const log = readLog(w.log).slice(from);
        const isTaken = e === "taken" || (e === "exited" && taken(log));
        const built = isTaken ? undefined : buildErrors(log);
        return new WorldFailed({
          message: isTaken ? `the world's address was taken; see ${w.log}`
            : built !== undefined ? `couldn't start the world: wrangler could not build the worker:\n${built}\nwrangler's output is in ${w.log}`
            : e === "exited" ? `the world exited (${child.exitCode}); see ${w.log}` : `the world didn't answer within 120 s; see ${w.log}`,
          taken: isTaken,
        });
      }),
    );
    return child;
  });
  return attempt.pipe(Effect.retry({ times: 3, while: (e) => e.taken === true }));
};

const readLog = (log: string) => (existsSync(log) ? readFileSync(log, "utf8") : "");

/** Whether workerd could not bind one of its sockets: another world took it first, and a fresh start picks again. */
export const taken = (log: string): boolean => log.includes("Address already in use");

const colour = /\u001b\[[0-9;]*m/g;

/**
 * What esbuild said when it could not build the worker, colour stripped: each `✘ [ERROR]` line and the line after it that
 * names the importing file (`path:line:column:`). `undefined` while the log holds no build error.
 */
export const buildErrors = (log: string): string | undefined => {
  const lines = log.replace(colour, "").split("\n");
  const found = lines.flatMap((line, i) => {
    if (!line.includes("✘ [ERROR]")) return [];
    const where = lines.slice(i + 1, i + 4).find((l) => /^\s+\S+:\d+:\d+:\s*$/.test(l));
    return [where === undefined ? line.trim() : `${line.trim()}\n${where.trimEnd()}`];
  });
  return found.length === 0 ? undefined : found.slice(0, 5).join("\n");
};
