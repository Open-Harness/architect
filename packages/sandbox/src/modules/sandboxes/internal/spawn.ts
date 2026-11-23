// A process of the bridge's own `exec` call: in its own process group, tracked by pid (and written to the sandbox's `.pgids` file, so a
// bridge killed hard cannot lose it), and gone (group and all) when it ends, when its call is interrupted, when it times out, or when its
// sandbox closes. It is started only while the sandbox is open, in the same step that looks, so nothing starts after a close.
import { spawn } from "node:child_process";
import { Effect } from "effect";
import { Timers } from "@orthograph/language-effect";
import { SandboxGone, type Executed } from "../types.ts";

const KEPT = 1_048_576;

/** SIGKILL a process group. Nothing there is not a failure. */
export const killGroup = (pid: number): Effect.Effect<void> =>
  Effect.try({ try: () => process.kill(-pid, "SIGKILL"), catch: () => undefined }).pipe(Effect.ignore);

/** Whether a process is still there (the process table's own answer). */
export const alive = (pid: number): Effect.Effect<boolean> =>
  Effect.try({ try: () => process.kill(pid, 0), catch: () => "gone" as const }).pipe(Effect.as(true), Effect.orElseSucceed(() => false));

const keep = (text: string, chunk: Buffer): string => (text.length >= KEPT ? text : text + chunk.toString("utf8").slice(0, KEPT - text.length));

export interface Run {
  readonly sandbox: string;
  readonly argv: ReadonlyArray<string>;
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly running: Set<number>;
  readonly timeout: string;
  /** Whether the sandbox is still open: asked at the instant of spawning. */
  readonly open: () => boolean;
  /** Write the set of running groups where the next bridge will find it. */
  readonly record: (running: ReadonlySet<number>) => Effect.Effect<void>;
}

interface Started {
  readonly pid: number | undefined;
  readonly exited: Effect.Effect<Executed>;
  readonly output: () => { stdout: string; stderr: string };
}

const start = (run: Run): Effect.Effect<Started, SandboxGone> =>
  Effect.suspend(() => {
    if (!run.open()) return Effect.fail(new SandboxGone({ sandbox: run.sandbox }));
    const [program = "", ...args] = run.argv;
    const out = { stdout: "", stderr: "" };
    let result: Executed | undefined;
    let notify: () => void = () => undefined;
    const finish = (value: Executed) => { result ??= value; notify(); };
    const child = spawn(program, args, { cwd: run.cwd, env: { ...run.env }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout?.on("data", (chunk: Buffer) => { out.stdout = keep(out.stdout, chunk); });
    child.stderr?.on("data", (chunk: Buffer) => { out.stderr = keep(out.stderr, chunk); });
    child.once("error", (error: NodeJS.ErrnoException) => finish({ exit: error.code === "ENOENT" ? 127 : 126, stdout: out.stdout, stderr: `${program}: ${error.code === "ENOENT" ? "command not found" : (error.code ?? "could not run")}\n` }));
    child.once("close", (code, signal) => finish({ exit: code ?? (signal === null ? 1 : 128), stdout: out.stdout, stderr: out.stderr }));
    const exited = Effect.callback<Executed>((resume) => {
      if (result !== undefined) return resume(Effect.succeed(result));
      notify = () => resume(Effect.succeed(result!));
    });
    return Effect.succeed({ pid: child.pid, exited, output: () => out });
  });

/** Run an argv, waiting for it through `Timers` only for its timeout. A program that is not found exits 127, as a shell says. */
export const runTracked = (run: Run): Effect.Effect<Executed, SandboxGone, Timers> =>
  Effect.gen(function* () {
    const timers = yield* Timers;
    const started = yield* start(run);
    const { pid } = started;
    if (pid !== undefined) {
      run.running.add(pid);
      yield* run.record(run.running);
    }
    const timedOut = timers.sleep("sandbox.exec", run.timeout as never).pipe(Effect.map((): Executed => ({ exit: 124, ...started.output(), stderr: `${started.output().stderr}timed out after ${run.timeout}\n` })));
    return yield* Effect.raceFirst(started.exited, timedOut).pipe(
      // Whatever ends the call, the group goes with it and the pid is forgotten, on disk too.
      Effect.ensuring(Effect.suspend(() => (pid === undefined ? Effect.void : killGroup(pid).pipe(Effect.andThen(Effect.sync(() => void run.running.delete(pid))), Effect.andThen(Effect.suspend(() => run.record(run.running))))))),
    );
  });
