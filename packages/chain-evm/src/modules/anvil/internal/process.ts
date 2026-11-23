import { spawn, type ChildProcess } from "node:child_process";
import { Effect } from "effect";
import { Timers } from "@orthograph/language-effect";

/** Flags are fixed: `--silent` always, loopback only, and none of Anvil's own funded dev accounts. */
export const anvilArgs = (port: number, chainId: number, blockTime?: number): ReadonlyArray<string> => [
  "--silent", "--host", "127.0.0.1", "--port", String(port), "--chain-id", String(chainId), "--accounts", "0",
  ...(blockTime === undefined ? [] : ["--block-time", String(blockTime)]),
];

const MAX_PRINTED = 8_192;
/** Anvil gets no environment but what it needs to find itself: nothing of the shell's keys reaches it. */
const KEPT = /^(PATH|HOME|TMPDIR|TZ|LANG|LC_[A-Z]+)$/;

export interface Spawned {
  readonly child: ChildProcess;
  readonly printed: () => string;
  readonly failure: () => string | undefined;
}

export const spawnAnvil = (binary: string, port: number, chainId: number, blockTime?: number) =>
  Effect.sync((): Spawned => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => KEPT.test(name)));
    const child = spawn(binary, [...anvilArgs(port, chainId, blockTime)], { stdio: ["ignore", "pipe", "pipe"], env });
    let printed = "";
    let failure: string | undefined;
    const keep = (chunk: Buffer) => { if (printed.length < MAX_PRINTED) printed += chunk.toString("utf8").slice(0, MAX_PRINTED - printed.length); };
    child.stdout?.on("data", keep);
    child.stderr?.on("data", keep);
    child.once("error", (error: NodeJS.ErrnoException) => { failure = error.code === "ENOENT" ? "the anvil binary was not found" : "anvil could not start"; });
    return { child, printed: () => printed, failure: () => failure };
  });

export const hasExited = (child: ChildProcess) => child.pid === undefined || child.exitCode !== null || child.signalCode !== null;

const killAndWait = (child: ChildProcess, signal: NodeJS.Signals) =>
  Effect.callback<void>((resume) => {
    child.once("exit", () => resume(Effect.void));
    child.kill(signal);
  });

/** SIGTERM, and SIGKILL if it hasn't gone within two seconds. Returns once the process has exited. */
export const stopAnvil = (child: ChildProcess) =>
  Effect.gen(function* () {
    if (hasExited(child)) return;
    const timers = yield* Timers;
    yield* Effect.raceFirst(
      killAndWait(child, "SIGTERM"),
      timers.sleep("anvil.stop", "2 seconds").pipe(Effect.andThen(killAndWait(child, "SIGKILL"))),
    );
  });
