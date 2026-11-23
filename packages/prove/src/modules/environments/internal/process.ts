// What an environment leaves on disk to be found again: a pid, a port, and the bundle it runs. And stopping it.
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect, Schedule } from "effect";
import { Collectors } from "#modules/telemetry/service.js";
import { Worlds } from "#modules/world/service.js";
import type { Launched, WorldFailed } from "#modules/world/types.js";
import { telemetryDir } from "./collector.ts";

export const files = (dir: string) => ({
  config: join(dir, "wrangler.jsonc"),
  secrets: join(dir, "secrets.env"),
  state: join(dir, "state"),
  pid: join(dir, "pid"),
  port: join(dir, "port"),
  bundle: join(dir, "bundle.json"),
  log: join(dir, "wrangler.log"),
});

const readNumber = (file: string): number | undefined => {
  const n = existsSync(file) ? Number(readFileSync(file, "utf8").trim()) : NaN;
  return Number.isInteger(n) && n > 1 ? n : undefined;
};
export const readPid = (dir: string) => readNumber(files(dir).pid);
export const readPort = (dir: string) => readNumber(files(dir).port);
export const writePort = (dir: string, port: number) => writeFileSync(files(dir).port, `${port}\n`);

/** Something of this process group still runs. The group, not just wrangler: workerd is wrangler's child. */
export const groupAlive = (pid: number) =>
  Effect.try({ try: () => process.kill(-pid, 0), catch: () => "gone" as const }).pipe(Effect.match({ onFailure: () => false, onSuccess: () => true }));

const wrangler = join(dirname(fileURLToPath(import.meta.resolve("wrangler/package.json"))), "bin/wrangler.js");
// The public logbook entry is src/index.ts in this workspace and dist/index.js after publishing; both are one level
// below its package-owned wrangler.jsonc. Every logbook shares that config, so its state argument must match too.
const logbookConfig = resolve(dirname(fileURLToPath(import.meta.resolve("@orthograph/logbook"))), "../wrangler.jsonc");

/** A PID belongs to this environment only when its full launch command names the derived config and state. */
export const isWrangler = (pid: number, dir: string): boolean => {
  const ps = spawnSync("ps", ["-ww", "-p", String(pid), "-o", "command="], { encoding: "utf8" });
  if (ps.status !== 0) return false;
  const command = ps.stdout.trim();
  const launch = command.indexOf(` ${wrangler} dev `);
  if (launch < 1 || !/(?:^|\/)node(?:\.exe)?$/.test(command.slice(0, launch))) return false;
  const expected = files(resolve(dir));
  const config = basename(resolve(dir)) === "logbook" ? logbookConfig : expected.config;
  return command.includes(` --config ${config} `) && command.includes(` --persist-to ${expected.state} `);
};

const signal = (pid: number, name: "SIGTERM" | "SIGKILL", dir: string) =>
  Effect.try({ try: () => { if (isWrangler(pid, dir)) process.kill(-pid, name); }, catch: () => "gone" as const }).pipe(Effect.ignore);

/** Stop the group: ask, wait up to ten seconds, then insist. */
export const stopGroup = (pid: number, dir: string) =>
  Effect.gen(function* () {
    const gone = groupAlive(pid).pipe(Effect.flatMap((alive) => (alive ? Effect.fail("alive" as const) : Effect.void)));
    yield* signal(pid, "SIGTERM", dir);
    const stopped = yield* gone.pipe(Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 100 }), Effect.option);
    if (stopped._tag === "None") {
      yield* signal(pid, "SIGKILL", dir);
      yield* gone.pipe(Effect.retry({ schedule: Schedule.spaced("100 millis"), times: 50 }), Effect.ignore);
    }
  });

/** What marks an environment as running goes: the state, the secrets and the port stay for the next start. */
export const forget = (dir: string) => {
  const f = files(dir);
  for (const file of [f.pid, f.bundle]) rmSync(file, { force: true });
};

/** Whether a port can be listened on at 127.0.0.1 now. */
export const isFree = (port: number) =>
  Effect.callback<boolean>((resume) => {
    const server = createServer();
    server.once("error", () => resume(Effect.succeed(false)));
    server.listen(port, "127.0.0.1", () => server.close(() => resume(Effect.succeed(true))));
  });

/** Stop only a verified environment process, remove its derived collector, and forget stale or foreign markers. */
export const reap = (dir: string) =>
  Effect.gen(function* () {
    const pid = readPid(dir);
    if (pid !== undefined && (yield* groupAlive(pid)) && isWrangler(pid, dir)) yield* stopGroup(pid, dir);
    yield* Collectors.stop(telemetryDir(dir));
    forget(dir);
  });

/** The port asked for if it is free (an explicit one that isn't is refused), else the one it last had, else any. */
export const choosePort = (dir: string, wanted: number | undefined) =>
  Effect.gen(function* () {
    if (wanted !== undefined) {
      if (!(yield* isFree(wanted))) return yield* Effect.fail(`port ${wanted} is already in use`);
      return wanted;
    }
    const last = readPort(dir);
    return last !== undefined && (yield* isFree(last)) ? last : yield* Worlds.anyPort.pipe(Effect.mapError((e) => e.message));
  });

/** Run a command detached in its own process group, its output appended to `log`, its pid written at once. */
export const spawnDetached = (run: { readonly command: string; readonly args: ReadonlyArray<string>; readonly env: Readonly<Record<string, string>> }, log: string, pidFile: string) =>
  Effect.sync((): ChildProcess => {
    const out = openSync(log, "a");
    const child = spawn(run.command, [...run.args], { stdio: ["ignore", out, out], detached: true, env: { ...process.env, ...run.env } });
    child.unref();
    writeFileSync(pidFile, `${child.pid}\n`);
    return child;
  });

/**
 * Launch on `first`. A port that was free when it was chosen can be taken before wrangler binds it (the collector and the
 * migrations come between), and wrangler then exits for a taken address: unless the caller named the port, launch again
 * on a fresh one, remembered in the port file, up to `times` more.
 */
export const launchOnFreePort = (
  launch: (port: number) => Effect.Effect<Launched, WorldFailed>, dir: string, first: number, named: boolean, times = 3,
): Effect.Effect<Launched, WorldFailed> =>
  launch(first).pipe(
    Effect.catchTag("WorldFailed", (e) =>
      e.taken !== true || named || times === 0
        ? Effect.fail(e)
        : Worlds.anyPort.pipe(Effect.flatMap((fresh) => Effect.sync(() => writePort(dir, fresh)).pipe(Effect.andThen(launchOnFreePort(launch, dir, fresh, named, times - 1)))))),
  );
