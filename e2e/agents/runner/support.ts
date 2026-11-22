// What every check of slice 3 (M4.03) shares: the surface of `@orthograph/agents` the checks assume (README.md names each
// piece and says which are H2's and which are chosen here), a way to load it that fails with a message instead of a
// stack, the example projects' facts read from the model and the repository (never from a run), and the run folder read back.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync as rm, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { Effect, type Scope } from "effect";
import { copyOf, ortho, repo } from "../../layer1/support.ts";

export { repo } from "../../layer1/support.ts";

export type Project = "acme" | "starter";
export const examples: Readonly<Record<Project, string>> = { acme: join(repo, "examples/acme"), starter: join(repo, "examples/starter") };

export interface Task { readonly id: string; readonly project: Project; readonly root: string; readonly operation: string; readonly variant: "blank"; readonly handler: string }
export interface Sandbox { readonly root: string }
export interface Usage { readonly input: number; readonly output: number; readonly thinking: number; readonly cacheRead: number; readonly cacheWrite: number; readonly usd: number }
export interface ToolCall { readonly name: string; readonly argsHash: string; readonly ms: number; readonly isError: boolean }
export interface TurnIn { readonly ms: number; readonly stop: string; readonly usage: Usage; readonly toolCalls: ReadonlyArray<ToolCall> }
export type Status = "done" | "failed" | "budget" | "turns" | "timeout" | "interrupted";
export interface RunOutcome { readonly status: Status; readonly reason?: string; readonly turns: ReadonlyArray<TurnIn>; readonly transcript: ReadonlyArray<string>; readonly usdSource: "provider" | "table" }
export interface Runner { readonly kind: "sdk" | "oracle" | "null"; readonly run: (task: Task, config: RunConfig, sandbox: Sandbox) => Effect.Effect<RunOutcome, unknown, Scope.Scope> }
export interface RunConfig {
  readonly provider: string; readonly model: string; readonly thinking: string; readonly systemPrompt: string;
  readonly skills: ReadonlyArray<{ readonly name: string; readonly text: string }>;
  readonly limits: { readonly maxTurns: number; readonly maxUsd: number; readonly wallMs: number };
}
export interface Counted { readonly passed: number; readonly of: number; readonly failed: ReadonlyArray<string> }
export interface Record_ {
  readonly id: string; readonly suite: string; readonly startedAt: string; readonly endedAt: string; readonly ms: number;
  readonly repo: { readonly commit: string; readonly dirty: boolean };
  readonly task: { readonly id: string; readonly project: string; readonly operation: string; readonly variant: string; readonly brief: { readonly hash: string }; readonly startHash: string };
  readonly agent: { readonly runner: string; readonly provider: string; readonly model: string; readonly thinking: string; readonly systemPromptHash: string; readonly skills: ReadonlyArray<{ readonly name: string; readonly hash: string }>; readonly limits: RunConfig["limits"]; readonly sandbox: string };
  readonly turns: ReadonlyArray<TurnIn & { readonly n: number }>;
  readonly totals: { readonly turns: number; readonly toolCalls: number; readonly toolErrors: number; readonly input: number; readonly output: number; readonly usd: number; readonly usdSource: string; readonly restarts: number };
  readonly outcome: { readonly status: string; readonly reason?: string };
  readonly friction: { readonly deniedReads: number; readonly checkRunsBeforePass: number; readonly checkFailures: number };
  readonly verdicts: {
    readonly tampered: boolean; readonly changed: ReadonlyArray<string>;
    readonly check: { readonly pass: boolean; readonly findings: ReadonlyArray<string> };
    readonly prove: { readonly pass: boolean; readonly evals: Counted; readonly journeys: Counted };
  };
  readonly solved: boolean;
  readonly traces: { readonly run: string; readonly score: string };
}
export interface Executed { readonly record: Record_; readonly folder: string }
export interface Agents {
  readonly RunRecord: unknown;
  readonly Tasks: { readonly derive: (input: { readonly project: Project; readonly root: string }) => Effect.Effect<ReadonlyArray<Task>, unknown> };
  readonly Runners: { readonly oracle: Runner; readonly null: Runner };
  readonly Runs: {
    readonly execute: (input: { readonly task: Task; readonly runner: Runner; readonly config: RunConfig; readonly suite: string; readonly runsDir: string; readonly redact?: ReadonlyArray<string> }) => Effect.Effect<Executed, unknown, Scope.Scope>;
  };
}

let loaded: Agents | undefined;
/** The package, or a failure that says what is missing: the checks are red on this until slice 3 builds `@orthograph/agents`. */
const PACKAGE: string = "@orthograph/agents";
export const agents = (): Promise<Agents> =>
  loaded !== undefined ? Promise.resolve(loaded) : import(PACKAGE).then(
    (m) => (loaded = m as unknown as Agents),
    (cause: unknown) => Promise.reject(new Error(`@orthograph/agents does not exist yet (slice 3, M4.03, builds it): ${String(cause)}`)),
  );

export const sha256 = (text: string | Buffer) => createHash("sha256").update(text).digest("hex");
export const baseConfig: RunConfig = { provider: "none", model: "none", thinking: "off", systemPrompt: "", skills: [], limits: { maxTurns: 40, maxUsd: 1, wallMs: 600_000 } };

export const runsDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "ortho-runs-"));
  return { dir, remove: () => rm(dir, { recursive: true, force: true }) };
};

/** The one task of a project for an operation, from `Tasks.derive`. */
export const taskOf = async (project: Project, operation: string): Promise<Task> => {
  const found = (await Effect.runPromise((await agents()).Tasks.derive({ project, root: examples[project] }))).find((t) => t.operation === operation);
  if (found === undefined) throw new Error(`Tasks.derive gave no task for ${project} ${operation}`);
  return found;
};

/** One run through `Runs.execute`: the sandbox and the scorer's work end with the scope; the folder stays under `runsDir`. */
export const execute = async (input: Omit<Parameters<Agents["Runs"]["execute"]>[0], "suite" | "config"> & { readonly suite?: string; readonly config?: RunConfig }): Promise<Executed> => {
  const a = await agents();
  return Effect.runPromise(Effect.scoped(a.Runs.execute({ suite: "checks", config: baseConfig, ...input })));
};

// What the examples say, read from the model and the repository, never from a run.
export interface Op { readonly name: string; readonly kind: string }
export const operationsOf = (project: Project): ReadonlyArray<Op> => {
  const model = JSON.parse(readFileSync(join(examples[project], "generated/model/model.json"), "utf8")) as { readonly operations: Readonly<Record<string, { readonly kind: string }>> };
  return Object.entries(model.operations).map(([name, o]) => ({ name, kind: o.kind })).sort((a, b) => (a.name < b.name ? -1 : 1));
};
/** An operation that has a handler is `kind: "operation"` (a `read` has none), and its handler is `src/<thing>/<verb>.ts`. */
export const blankOps = (project: Project): ReadonlyArray<string> => operationsOf(project).filter((o) => o.kind === "operation").map((o) => o.name);
export const handlerPath = (operation: string) => `src/${operation.replace(".", "/")}.ts`;
export const reference = (project: Project, operation: string) => readFileSync(join(examples[project], handlerPath(operation)), "utf8");

/** The brief an agent is given for the blank handler, as check 4 gets it; the record's `brief.hash` is the SHA-256 of this text. */
export const briefOf = (project: Project, operation: string): string => {
  const copy = copyOf(examples[project]);
  try {
    rm(join(copy.root, handlerPath(operation)));
    const g = ortho(copy.root, "generate");
    if (g.status !== 0) throw new Error(`ortho generate failed: ${g.stdout}${g.stderr}`);
    return ortho(copy.root, "brief", operation).stdout;
  } finally {
    copy.remove();
  }
};

// The run folder, read back.
export const files = (dir: string): ReadonlyArray<string> =>
  existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => relative(dir, join(e.parentPath, e.name))).sort() : [];
export const text = (folder: string, name: string) => readFileSync(join(folder, name), "utf8");
export const lines = (folder: string, name: string) => text(folder, name).split("\n").filter((l) => l !== "");
export const json = (folder: string, name: string): unknown => JSON.parse(text(folder, name));
export const modified = (path: string) => statSync(path).mtimeMs;

export const git = (...args: ReadonlyArray<string>) => spawnSync("git", args, { cwd: repo, encoding: "utf8" }).stdout.trim();

/** Write a file of the sandbox, making its folder. */
export const put = (root: string, path: string, content: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
};

const nothing: RunOutcome = { status: "done", turns: [], transcript: [], usdSource: "table" };

/** A runner of our own: `act` does what the agent would do in the sandbox, and may say what it did (turns, transcript). */
export const runnerOf = (kind: Runner["kind"], act: (task: Task, sandbox: Sandbox) => RunOutcome | void): Runner => ({
  kind,
  run: (task, _config, sandbox) => Effect.sync(() => act(task, sandbox) ?? nothing),
});

/** What the oracle does (the known-good handler), then `also` in the sandbox: the scorer must see everything else. */
export const oracleAnd = (also: (sandbox: Sandbox) => void): Runner =>
  runnerOf("oracle", (task, sandbox) => {
    put(sandbox.root, task.handler, reference(task.project, task.operation));
    also(sandbox);
  });
