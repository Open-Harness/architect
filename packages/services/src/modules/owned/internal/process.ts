// Spawn a child, wait until it answers, and stop it: ask, wait, then insist.
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, openSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { Effect, Schedule } from "effect";
import { ProcessFailed, type Marker, type Owning, type StartOptions } from "../types.ts";
import { alive, forget, record, stillTheSame } from "./markers.ts";

/** Nothing of the shell's keys reaches a service: only what it needs to find itself. */
const KEPT = /^(PATH|HOME|TMPDIR|TZ|LANG|LC_[A-Z]+)$/;

export const freePort = Effect.callback<number, ProcessFailed>((resume) => {
  const server = createServer();
  server.once("error", () => resume(Effect.fail(new ProcessFailed({ message: "no loopback port was free" }))));
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address() as { port: number };
    server.close(() => resume(Effect.succeed(port)));
  });
});

const tail = (log: string) => {
  try { return readFileSync(log, "utf8").trim().split("\n").slice(-6).join(" | ").slice(-1_000); } catch { return ""; }
};

const gone = (pid: number) => Effect.suspend(() => (alive(pid) ? Effect.fail("alive" as const) : Effect.void));

/** Stop the process a marker names, only while `ps` still shows its command: SIGTERM, up to five seconds, then SIGKILL. */
export const stop = (marker: Marker, dir?: string) =>
  Effect.gen(function* () {
    if (alive(marker.pid) && stillTheSame(marker)) {
      const signal = (name: NodeJS.Signals) => Effect.sync(() => { try { process.kill(marker.pid, name); } catch { /* already gone */ } });
      yield* signal("SIGTERM");
      const stopped = yield* gone(marker.pid).pipe(Effect.retry({ schedule: Schedule.spaced("50 millis"), times: 100 }), Effect.option);
      if (stopped._tag === "None") {
        yield* signal("SIGKILL");
        yield* gone(marker.pid).pipe(Effect.retry({ schedule: Schedule.spaced("50 millis"), times: 100 }), Effect.ignore);
      }
    }
    forget(marker, dir);
  });

const exited = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null;

export const start = (options: StartOptions) =>
  Effect.acquireRelease(
    Effect.gen(function* () {
      const log = openSync(options.log, "a");
      const child = spawn(options.binary, [...options.args], {
        stdio: ["ignore", log, log], ...(options.cwd ? { cwd: options.cwd } : {}),
        env: Object.fromEntries(Object.entries(process.env).filter(([name]) => KEPT.test(name))),
      });
      closeSync(log);
      child.once("error", () => undefined);
      if (child.pid === undefined) return yield* new ProcessFailed({ message: `${options.kind}: ${options.binary} could not start` });
      const marker: Marker = { kind: options.kind, pid: child.pid, owner: process.pid, command: [options.binary, ...options.args].join(" "), ...(options.title ? { title: options.title } : {}) };
      record(marker);
      const owning: Owning = { pid: child.pid, marker, printed: () => tail(options.log) };
      const attempts = Math.ceil((options.within ?? 30_000) / 100);
      const asked = Effect.suspend(() => (exited(child) ? Effect.fail("exited" as const) : options.ready.pipe(Effect.mapError(() => "waiting" as const))));
      const up = yield* asked.pipe(
        Effect.retry({ schedule: Schedule.spaced("100 millis"), times: attempts, while: (e) => e === "waiting" }),
        Effect.match({ onFailure: (e) => e, onSuccess: () => "up" as const }),
      );
      if (up !== "up") {
        yield* stop(marker);
        return yield* new ProcessFailed({ message: `${options.kind} ${up === "exited" ? "exited before it answered" : "did not answer in time"}: ${tail(options.log)}`, exited: up === "exited" });
      }
      return owning;
    }),
    (owning) => stop(owning.marker),
  );
