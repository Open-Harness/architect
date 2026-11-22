// What the durable checks share: a child process that runs one agent run on the seam (child.ts), started, waited for,
// killed with SIGKILL and read back, and the logs it writes outside the run's own storage.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";

/** One child's whole configuration, written to a file and read by child.ts. */
export interface Config {
  readonly root: string;
  /** Where the child's logs go: requests, attempts, effects, timers. Shared by the processes of one scenario. */
  readonly out: string;
  readonly run: string;
  readonly command: "run" | "view";
  readonly process: "first" | "second" | "third";
  /** Hang here until killed: with the tool call in flight, or with the model's first reply in flight. */
  readonly hold: "none" | "tool" | "model";
  readonly script: "one-tool" | "two-tools-same-id";
  /** The provider's id for the tool call. */
  readonly callId: string;
  /** How far ahead of the platform's clock the Clock the child provides runs. */
  readonly offsetMs: number;
  /** Submit the start (request key `start-1`); false reopens the run and only waits. */
  readonly submit: boolean;
}

export interface Usage { readonly input: number; readonly output: number; readonly cacheRead: number; readonly cacheWrite: number }
export interface Entry {
  readonly id: string;
  readonly kind: "user" | "assistant" | "tool-result";
  readonly at: number;
  readonly text: string;
  readonly usage?: Usage;
  readonly toolCalls: ReadonlyArray<{ readonly callId: string; readonly name: string }>;
}
export interface RunView { readonly run: string; readonly entries: ReadonlyArray<Entry>; readonly usage: Usage }
export interface Settled { readonly status: string; readonly reason?: string }

export interface Finished { readonly code: number | null; readonly signal: NodeJS.Signals | null; readonly stdout: string; readonly stderr: string }
export interface Child { readonly pid: number; readonly finished: Promise<Finished>; kill(): void }

const here = new URL(".", import.meta.url).pathname;
const alive = new Set<Child>();
const made: Array<string> = [];
/** Whatever a check left running dies with it (by PID, only the children this file started), and its folders go. */
afterAll(() => {
  for (const child of alive) child.kill();
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

/** A scenario's folder: the project root the runs live under, and the logs the children write. */
export const scenario = (name: string) => {
  const dir = mkdtempSync(join(tmpdir(), `ortho-agents-${name}-`));
  made.push(dir);
  const root = join(dir, "project");
  const out = join(dir, "out");
  mkdirSync(root, { recursive: true });
  mkdirSync(out, { recursive: true });
  return { dir, root, out };
};

export const config = (where: { readonly root: string; readonly out: string }, run: string, rest: Partial<Config> = {}): Config => ({
  ...where, run, command: "run", process: "first", hold: "none", script: "one-tool", callId: "call_1", offsetMs: 0, submit: true, ...rest,
});

/** Start child.ts with this configuration. */
export const start = (cfg: Config): Child => {
  const file = join(cfg.out, `config-${cfg.process}-${cfg.command}-${cfg.run}.json`);
  writeFileSync(file, JSON.stringify(cfg));
  const proc = spawn(process.execPath, [join(here, "child.ts"), file], { cwd: here, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  proc.stdout.on("data", (chunk) => { stdout += chunk; });
  proc.stderr.on("data", (chunk) => { stderr += chunk; });
  const finished = new Promise<Finished>((done) => proc.on("close", (code, signal) => done({ code, signal, stdout, stderr })));
  const child: Child = { pid: proc.pid!, finished, kill: () => { if (proc.exitCode === null && proc.signalCode === null) proc.kill("SIGKILL"); } };
  alive.add(child);
  void finished.then(() => alive.delete(child));
  return child;
};

/** Run a child to its end, and read its RESULT line. A child that failed fails here with what it printed. */
export const finish = async <T = { readonly settled: Settled; readonly view: RunView }>(child: Child): Promise<T> => {
  const done = await Promise.race([child.finished, new Promise<never>((_, no) => setTimeout(() => no(new Error(`child ${child.pid} did not finish in 300 s`)), 300_000).unref())]);
  const line = done.stdout.split("\n").find((l) => l.startsWith("RESULT "));
  if (done.code !== 0 || line === undefined) throw new Error(`child exited ${done.code} (${done.signal}) with no result:\n${done.stderr.slice(-3000)}\n${done.stdout.slice(-1000)}`);
  return JSON.parse(line.slice("RESULT ".length)) as T;
};

/** Kill a child with SIGKILL once `ready` holds of its log, and show that SIGKILL is how it ended. */
export const killWhen = async (child: Child, ready: () => boolean, what: string): Promise<void> => {
  const until = Date.now() + 240_000;
  let exited: Finished | undefined;
  void child.finished.then((done) => { exited = done; });
  while (!ready()) {
    if (exited !== undefined) throw new Error(`${what}: never happened; the child exited ${exited.code} (${exited.signal}) first:\n${exited.stderr.slice(-3000)}`);
    if (Date.now() > until) { child.kill(); throw new Error(`${what}: never happened in 240 s`); }
    await new Promise((r) => setTimeout(r, 25));
  }
  child.kill();
  const done = await child.finished;
  if (done.signal !== "SIGKILL") throw new Error(`${what}: the child was to die by SIGKILL, and ended ${done.code} (${done.signal}):\n${done.stderr.slice(-3000)}`);
};

/** One log of the scenario: a line of JSON per event, in the order the processes wrote them. */
export const lines = <T = Record<string, unknown>>(out: string, file: string): ReadonlyArray<T & { readonly process: string }> => {
  const path = join(out, `${file}.jsonl`);
  return existsSync(path) ? readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
};

/** The run's transcript as a read-only child sees it: nothing resumed, nothing written. */
export const viewOf = async (where: { readonly root: string; readonly out: string }, run: string, rest: Partial<Config> = {}): Promise<RunView> =>
  (await finish<{ view: RunView }>(start(config(where, run, { command: "view", process: "third", ...rest })))).view;

export const kinds = (view: RunView) => view.entries.map((e) => e.kind);
export const runFile = (root: string, run: string) => join(root, ".orthograph", "runs", run, "run.sqlite");
export const sum = (usages: ReadonlyArray<Usage>): Usage => usages.reduce((a, u) => ({ input: a.input + u.input, output: a.output + u.output, cacheRead: a.cacheRead + u.cacheRead, cacheWrite: a.cacheWrite + u.cacheWrite }), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

/** Run `make` once, on first use; every later caller gets the same result. */
export const once = <A>(make: () => Promise<A>): (() => Promise<A>) => {
  let result: Promise<A> | undefined;
  return () => (result ??= make());
};
