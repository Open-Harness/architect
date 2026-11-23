// The Collector as a process: started from its pinned binary on a loopback port, owned by PID, stopped by PID.
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { Effect, Schedule } from "effect";
import { CollectorFailed } from "../types.ts";
import { collectorBinary } from "./binary.ts";
import { collectorConfig, type CollectorOptions } from "./config.ts";
import { alive, forget, markers, record, stillTheSame, type Marker } from "./runs.ts";

/** A port the system says is free. */
const freePort = Effect.callback<number, CollectorFailed>((resume) => {
  const server = createServer();
  server.once("error", () => resume(Effect.fail(new CollectorFailed({ message: "no loopback port was free for the collector" }))));
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as { port: number };
    server.close(() => resume(Effect.succeed(port)));
  });
});

export interface Started {
  readonly url: string;
  readonly marker: Marker;
}

/** Where a collector keeps its own marker, so whoever stops it by folder can find it. */
const markerFile = (dir: string) => `${dir}/collector.json`;

/** The collector gets no environment but what it needs to find itself: nothing of the shell's keys reaches it. */
const KEPT = /^(PATH|HOME|TMPDIR|TZ|LANG|LC_[A-Z]+)$/;

/**
 * Start `otelcol-contrib` on a port the system chose, writing to `dir`. `owned` ties it to this process (`sweepOrphans` finds
 * it if this process is killed first); otherwise it is detached and an environment's `down` stops it.
 */
export const runCollector = (dir: string, options: Pick<CollectorOptions, "strip">, owned: boolean) =>
  Effect.gen(function* () {
    const binary = yield* collectorBinary;
    const port = yield* freePort;
    const config = `${dir}/collector.yaml`;
    writeFileSync(config, collectorConfig({ ...options, port, dir }));
    const log = openSync(`${dir}/collector.log`, "a");
    const child: ChildProcess = spawn(binary, ["--config", `file:${config}`], {
      stdio: ["ignore", log, log], detached: !owned, env: Object.fromEntries(Object.entries(process.env).filter(([name]) => KEPT.test(name))),
    });
    closeSync(log);
    child.once("error", () => undefined);
    if (child.pid === undefined) return yield* new CollectorFailed({ message: `the collector at ${binary} could not start` });
    if (!owned) child.unref();
    const marker: Marker = { kind: owned ? "collector" : "collector-env", pid: child.pid, owner: owned ? process.pid : 0, command: `${binary} --config file:${config}` };
    record(marker);
    if (!owned) writeFileSync(markerFile(dir), JSON.stringify(marker));
    return { url: `http://127.0.0.1:${port}`, marker } satisfies Started;
  });

const gone = (pid: number) => Effect.suspend(() => (alive(pid) ? Effect.fail("alive" as const) : Effect.void));

/** The last of what the collector wrote to its log: why it didn't come up. */
export const logTail = (dir: string) => {
  try { return readFileSync(`${dir}/collector.log`, "utf8").trim().split("\n").slice(-5).join(" | "); } catch { return ""; }
};

/** Stop the process a marker names, and only if it still runs that command: ask, wait, then insist. Nothing to stop is not an error. */
export const terminate = (marker: Marker) =>
  Effect.gen(function* () {
    if (alive(marker.pid) && stillTheSame(marker)) {
      const signal = (name: NodeJS.Signals) => Effect.sync(() => { try { process.kill(marker.pid, name); } catch { /* gone already */ } });
      yield* signal("SIGTERM");
      const stopped = yield* gone(marker.pid).pipe(Effect.retry({ schedule: Schedule.spaced("50 millis"), times: 100 }), Effect.option);
      if (stopped._tag === "None") {
        yield* signal("SIGKILL");
        yield* gone(marker.pid).pipe(Effect.retry({ schedule: Schedule.spaced("50 millis"), times: 100 }), Effect.ignore);
      }
    }
    forget(marker.kind, marker.pid);
  });

/** Stop the collector an environment launched in `dir`, by its marker. */
export const stopCollector = (dir: string) =>
  Effect.gen(function* () {
    let marker: Marker | undefined;
    try { marker = JSON.parse(readFileSync(markerFile(dir), "utf8")) as Marker; } catch { marker = undefined; }
    if (marker !== undefined) yield* terminate(marker);
    rmSync(markerFile(dir), { force: true });
  });

/**
 * Stop every collector whose owner process is gone: a prove killed before it could clean up leaves its collector running. Collectors of a
 * live process, and an environment's own (stopped by `env down`), are never touched. Answers the PIDs it stopped.
 */
export const sweepOrphans = (): Effect.Effect<ReadonlyArray<number>> =>
  Effect.gen(function* () {
    const orphans = markers("collector").filter((m) => !alive(m.owner));
    for (const m of orphans) yield* terminate(m);
    return orphans.map((m) => m.pid);
  });
