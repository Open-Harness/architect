// The pi-env daemon as a process: spawned in the sandbox's folder with the sandbox's environment, its output split into the
// frames after its `PI-ENV <token>` sync line, and stopped by SIGTERM, then SIGKILL, with the stop waiting for the exit.
import { spawn, type ChildProcess } from "node:child_process";
import { Effect } from "effect";
import { Timers } from "@orthograph/language-effect";
import { DaemonFailed, type RelaySpec } from "../types.ts";
import { split } from "./frames.ts";

const STDERR_KEPT = 2_000;

export interface Spawned {
  readonly child: ChildProcess;
  readonly exited: () => boolean;
  readonly stderr: () => string;
  /** Called with each complete frame the daemon sends after its sync line. Set once, before the daemon is ready. */
  readonly onFrames: (listener: (frames: ReadonlyArray<Buffer>) => void) => void;
  /** Resolves when the sync line has arrived, or the daemon failed. */
  readonly synced: Effect.Effect<void, DaemonFailed>;
}

export const spawnDaemon = (spec: RelaySpec): Effect.Effect<Spawned> =>
  Effect.sync(() => {
    const child = spawn(spec.binary, ["serve", "--token", spec.token], { cwd: spec.cwd, env: { ...spec.env }, stdio: ["pipe", "pipe", "pipe"] });
    let stderr = "";
    let text: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let isSynced = false;
    let failure: string | undefined;
    let listener: (frames: ReadonlyArray<Buffer>) => void = () => undefined;
    let wake: () => void = () => undefined;
    child.stdin?.on("error", () => undefined);
    child.stderr?.on("data", (chunk: Buffer) => { stderr = (stderr + chunk.toString("utf8")).slice(-STDERR_KEPT); });
    child.stdout?.on("data", (chunk: Buffer) => {
      text = text.length === 0 ? chunk : Buffer.concat([text, chunk]);
      if (!isSynced) {
        const end = text.indexOf(0x0a);
        if (end < 0) return;
        isSynced = true;
        text = text.subarray(end + 1);
        wake();
      }
      const { frames, rest } = split(Buffer.alloc(0), text);
      text = rest;
      if (frames.length > 0) listener(frames);
    });
    child.once("error", (error: NodeJS.ErrnoException) => { failure = error.code === "ENOENT" ? "the pi-env daemon was not found" : `the pi-env daemon could not start (${error.code ?? "unknown"})`; wake(); });
    child.once("exit", (code, signal) => { failure ??= `the pi-env daemon exited before it was ready (${signal ?? code})`; wake(); });
    const synced = Effect.callback<void, DaemonFailed>((resume) => {
      const settle = () => resume(isSynced ? Effect.void : Effect.fail(new DaemonFailed({ reason: `${failure ?? "the pi-env daemon did not answer"}${stderr === "" ? "" : `: ${stderr.trim()}`}` })));
      if (isSynced || failure !== undefined) return settle();
      wake = settle;
    });
    return { child, exited: () => child.pid === undefined || child.exitCode !== null || child.signalCode !== null, stderr: () => stderr, onFrames: (l) => { listener = l; }, synced };
  });

const killAndWait = (child: ChildProcess, signal: NodeJS.Signals) =>
  Effect.callback<void>((resume) => {
    child.once("exit", () => resume(Effect.void));
    child.kill(signal);
  });

/** SIGTERM (the daemon kills what it started and exits); SIGKILL if it has not gone in two seconds. Returns once it has exited. */
export const stopDaemon = (daemon: Spawned): Effect.Effect<void, never, Timers> =>
  Effect.gen(function* () {
    if (daemon.exited()) return;
    const timers = yield* Timers;
    yield* Effect.raceFirst(killAndWait(daemon.child, "SIGTERM"), timers.sleep("sandbox.daemon.stop", "2 seconds").pipe(Effect.andThen(killAndWait(daemon.child, "SIGKILL"))));
  });
