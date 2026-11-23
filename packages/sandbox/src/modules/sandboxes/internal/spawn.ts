// A process of the bridge's own `exec` call: in its own process group, tracked by pid, and gone (group and all) when it ends,
// when its call is interrupted, when it times out, or when its sandbox closes.
import { spawn } from "node:child_process";
import { Effect } from "effect";
import { Timers } from "@orthograph/language-effect";
import type { Executed } from "../types.ts";

const KEPT = 1_048_576;

/** SIGKILL a process group. Nothing there is not a failure. */
export const killGroup = (pid: number): Effect.Effect<void> =>
  Effect.try({ try: () => process.kill(-pid, "SIGKILL"), catch: () => undefined }).pipe(Effect.ignore);

/** Whether a process is still there (the process table's own answer). */
export const alive = (pid: number): Effect.Effect<boolean> =>
  Effect.try({ try: () => process.kill(pid, 0), catch: () => "gone" as const }).pipe(Effect.as(true), Effect.orElseSucceed(() => false));

const keep = (text: string, chunk: Buffer): string => (text.length >= KEPT ? text : text + chunk.toString("utf8").slice(0, KEPT - text.length));

export interface Run {
  readonly argv: ReadonlyArray<string>;
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly running: Set<number>;
  readonly timeout: string;
}

/** Run an argv, waiting for it through `Timers` only for its timeout. A program that is not found exits 127, as a shell says. */
export const runTracked = (run: Run): Effect.Effect<Executed, never, Timers> =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const out = { stdout: "", stderr: "" };
    let pid: number | undefined;
    const exited = Effect.callback<Executed>((resume) => {
      const [program = "", ...args] = run.argv;
      const child = spawn(program, args, { cwd: run.cwd, env: { ...run.env }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
      pid = child.pid;
      if (pid !== undefined) run.running.add(pid);
      child.stdout?.on("data", (chunk: Buffer) => { out.stdout = keep(out.stdout, chunk); });
      child.stderr?.on("data", (chunk: Buffer) => { out.stderr = keep(out.stderr, chunk); });
      child.once("error", (error: NodeJS.ErrnoException) => resume(Effect.succeed({ exit: error.code === "ENOENT" ? 127 : 126, stdout: out.stdout, stderr: `${program}: ${error.code === "ENOENT" ? "command not found" : (error.code ?? "could not run")}\n` })));
      child.once("close", (code, signal) => resume(Effect.succeed({ exit: code ?? (signal === null ? 1 : 128), stdout: out.stdout, stderr: out.stderr })));
    });
    const timedOut = timers.sleep("sandbox.exec", run.timeout as never).pipe(Effect.map((): Executed => ({ exit: 124, stdout: out.stdout, stderr: `${out.stderr}timed out after ${run.timeout}\n` })));
    return yield* Effect.raceFirst(exited, timedOut).pipe(
      // Whatever ends the call, the group goes with it and the pid is forgotten.
      Effect.ensuring(Effect.suspend(() => (pid === undefined ? Effect.void : killGroup(pid).pipe(Effect.andThen(Effect.sync(() => void run.running.delete(pid!))))))),
    );
  });
