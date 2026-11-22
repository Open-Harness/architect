// THROWAWAY: proof 2 of the author skill. Not for commit.
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { Effect, Schema } from "effect";
import { Collectors } from "../../prove/src/index.ts";
import { copyOf, ortho, repo } from "../../../e2e/layer1/support.ts";

const P = process.env["PLANT"] ?? "";
let runCount = 0;
let firstConfig: any;
const sha = (t: string | Buffer) => createHash("sha256").update(t).digest("hex");
const handlerPath = (op: string) => `src/${op.replace(".", "/")}.ts`;

export const RunRecord = Schema.Unknown;

export const Tasks = {
  derive: ({ project, root }: { project: string; root: string }) => Effect.sync(() => {
    const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: Record<string, { kind: string }> };
    return Object.entries(model.operations).filter(([, o]) => o.kind === "operation").map(([operation]) => ({ id: `${project}:${operation}:blank`, project, root, operation, variant: "blank", handler: handlerPath(operation) }));
  }),
};

const put = (root: string, path: string, content: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
const none = { status: "done", turns: [], transcript: [], usdSource: "table" };
export const Runners = {
  oracle: { kind: "oracle", run: (task: any, _c: any, sb: any) => Effect.sync(() => { put(sb.root, task.handler, readFileSync(join(task.root, task.handler), "utf8")); return none; }) },
  null: { kind: "null", run: () => Effect.succeed(none) },
};

const tree = (root: string): Map<string, string> => {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if ((P === "ignore-journeys-dir" && e.name === "journeys") || (P === "ignore-generated" && e.name === "generated" && dir === root) || e.name.startsWith(".") || e.name === "node_modules" || (dir === root && e.name === "tsconfig.json")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p); else out.set(relative(root, p), sha(readFileSync(p)));
    }
  };
  walk(root);
  return out;
};

const span = (trace: string, name: string, start: number, end: number) => ({
  traceId: trace, spanId: randomBytes(8).toString("hex"), name, kind: 1,
  startTimeUnixNano: String(BigInt(start) * 1000000n), endTimeUnixNano: String(BigInt(end) * 1000000n), status: { code: 1 },
});

const parseProve = (op: string, out: string, journeys: string[]) => {
  const ls = out.split("\n");
  const failedEvals = ls.filter((l) => l.startsWith(`${op} `) && l.includes(" ✘") && !/ of 9 evals ✘/.test(l)).map((l) => l.slice(op.length + 1, l.indexOf(" ✘")));
  const failed = [...new Set(failedEvals)];
  const journeyFailed = journeys.filter((j) => ls.some((l) => l.startsWith(`journey ${j} ✘`)));
  return {
    evals: { passed: 9 - failed.length, of: 9, failed },
    journeys: { passed: journeys.length - journeyFailed.length, of: journeys.length, failed: journeyFailed },
    ok: ls.filter((l) => l !== "").at(-1) === "prove ✔",
  };
};

export const Runs = {
  execute: (input: any) => Effect.gen(function* () {
    const { task, runner, config, suite, runsDir, redact = [] } = input;
    const id = randomBytes(8).toString("hex");
    const folder = join(runsDir, suite, id);
    mkdirSync(join(folder, "output"), { recursive: true });
    mkdirSync(join(folder, "score"), { recursive: true });
    const copy = copyOf(task.root);
    yield* Effect.addFinalizer(() => Effect.sync(copy.remove));
    const root = copy.root;
    rmSync(join(root, task.handler));
    ortho(root, "generate");
    const brief = ortho(root, "brief", task.operation).stdout;
    const stash = join(root, "..", "journeys");
    cpSync(join(root, "journeys"), stash, { recursive: true });
    rmSync(join(root, "journeys"), { recursive: true });
    const before = tree(root);
    const startHash = sha([...before].map(([k, v]) => `${k}:${v}`).join("\n"));

    const dir = join(folder, "collector");
    const collector = yield* Collectors.local(dir, []);
    const traceRun = randomBytes(16).toString("hex");
    const traceScore = P === "same-trace" ? traceRun : randomBytes(16).toString("hex");
    const startedMs = Date.now();
    const outcome = yield* runner.run(task, config, { root });
    const endedMs = Date.now();

    const after = tree(root);
    const keys = new Set([...before.keys(), ...after.keys()]);
    const touched = [...keys].filter((k) => before.get(k) !== after.get(k) && !(P === "ignore-deleted" && !after.has(k)) && !(P === "ignore-new" && !before.has(k))).sort();
    const changed = touched.filter((k) => k !== task.handler);
    const tampered = P === "tamper-always" ? true : P === "tamper-never" ? false : changed.length > 0;
    for (const k of touched) if (after.has(k)) { mkdirSync(dirname(join(folder, "output", k)), { recursive: true }); cpSync(join(root, k), join(folder, "output", k)); }
    writeFileSync(join(folder, "output.diff"), touched.map((k) => `--- a/${k}\n+++ b/${k}\n${(after.has(k) ? readFileSync(join(root, k), "utf8") : "").split("\n").map((l) => `+${l}`).join("\n")}\n`).join(""));

    let check = { pass: false, findings: [] as string[] }, prove = { pass: false, evals: { passed: 0, of: 9, failed: [] as string[] }, journeys: { passed: 0, of: 0, failed: [] as string[] } };
    let checkText = "", proveText = "";
    const scoreStart = Date.now();
    if (!tampered) {
      cpSync(stash, join(root, "journeys"), { recursive: true });
      const c = ortho(root, "check"); checkText = c.stdout + c.stderr;
      check = { pass: c.status === 0 && checkText.includes("check ✔"), findings: checkText.split("\n").filter((l) => l.startsWith("  ")) };
      const files = [...brief.matchAll(/journeys\/([a-z0-9-]+)\.ts/g)].map((m) => m[1]!).filter((j, i, a) => a.indexOf(j) === i);
      const journeys = files.map((f) => /Blueprint\.journey\("([^"]+)"/.exec(readFileSync(join(stash, `${f}.ts`), "utf8"))![1]!);
      const p = ortho(root, "prove", "--env", "local", "--port", "0"); proveText = p.stdout;
      const parsed = parseProve(task.operation, proveText, journeys);
      prove = { pass: P === "evals-only" ? parsed.evals.failed.length === 0 : P === "ignore-check-prove" ? true : parsed.ok && parsed.evals.failed.length === 0 && parsed.journeys.failed.length === 0, evals: parsed.evals, journeys: parsed.journeys };
    }
    const scoreEnd = Date.now();
    runCount++;
    if (P === "evals-of-8") prove.evals.of = 8;
    if (P === "journeys-zero") prove.journeys = { passed: 0, of: 0, failed: [] };
    if (P === "evals-failed-null") (prove.evals as any).failed = null;
    if (P === "check-findings-empty") check.findings = [];
    const verdicts = { tampered, changed: P === "changed-empty" ? [] : changed, check, prove };
    const solved = P === "health-solved" && task.operation === "system.health" ? true : P === "always-solved" ? true : P === "never-solved" ? false
      : P === "second-run-solved" ? (runCount >= 2 ? true : !tampered && check.pass && prove.pass)
      : P === "ignore-check" ? !tampered && prove.pass : P === "ignore-tamper" ? check.pass && prove.pass : !tampered && check.pass && prove.pass;
    writeFileSync(join(folder, "score/check.txt"), checkText);
    writeFileSync(join(folder, "score/prove.txt"), proveText);
    writeFileSync(join(folder, "score/verdicts.json"), JSON.stringify(verdicts));

    // Spans through the collector, read back by trace id.
    for (const [trace, name, a, b] of [[traceRun, "agent.run", startedMs, endedMs], ...(P === "no-score-span" ? [] : [[traceScore, "agent.score", scoreStart, scoreEnd]])] as const) {
      yield* Effect.promise(() => fetch(`${collector.url}/v1/traces`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resourceSpans: [{ resource: { attributes: [] }, scopeSpans: [{ scope: { name: "agents" }, spans: [span(trace, name, a, Math.max(b, a + 1))] }] }] }) }));
    }
    const got = yield* collector.traces([{ trace: traceRun, parent: "0000000000000000" }, { trace: traceScore, parent: "0000000000000000" }]);
    const spans = [...got.values()].flatMap((t) => t.spans);
    writeFileSync(join(folder, "spans.jsonl"), spans.map((s) => JSON.stringify(s)).join("\n") + "\n");
    writeFileSync(join(folder, "logs.jsonl"), "");
    rmSync(dir, { recursive: true, force: true });

    const redacted = (outcome.transcript as string[]).map((l) => redact.reduce((t: string, k: string) => P === "no-redact" ? t : t.replaceAll(P === "over-redact" ? k.slice(0, -1) : k, "[redacted]"), l));
    writeFileSync(join(folder, "transcript.jsonl"), redacted.map((l) => `${l}\n`).join(""));
    const turns = (outcome.turns as any[]).map((t, i) => ({ n: i + 1, ...t }));
    const sum = (f: (t: any) => number) => (P === "no-sum" ? turns.slice(0, 1) : turns).reduce((a, t) => a + f(t), 0);
    const git = (...a: string[]) => spawnSync("git", a, { cwd: repo, encoding: "utf8" }).stdout.trim();
    const record = {
      id, suite, startedAt: new Date(startedMs).toISOString(), endedAt: new Date(endedMs).toISOString(), ms: endedMs - startedMs + (P === "ms-wrong" ? 1 : 0),
      repo: { commit: P === "commit-wrong" ? "0".repeat(40) : git("rev-parse", "HEAD"), dirty: git("status", "--porcelain") !== "" },
      task: { id: task.id, project: task.project, operation: task.operation, variant: task.variant, brief: { hash: sha(P === "brief-hash-wrong" ? brief.trim() : brief) }, startHash: P === "start-const" ? "0".repeat(64) : startHash },
      agent: { runner: runner.kind, provider: config.provider, model: P === "config-first" ? (firstConfig ??= config).model : config.model, thinking: config.thinking, systemPromptHash: sha(P === "prompt-hash-wrong" ? config.systemPrompt + "\n" : config.systemPrompt), skills: config.skills.map((s: any) => ({ name: s.name, hash: sha(s.text) })), limits: config.limits, sandbox: "copy" },
      turns,
      totals: { turns: turns.length, toolCalls: sum((t) => t.toolCalls.length), toolErrors: sum((t) => t.toolCalls.filter((c: any) => c.isError).length), input: sum((t) => t.usage.input), output: sum((t) => t.usage.output), usd: sum((t) => t.usage.usd), usdSource: outcome.usdSource, restarts: 0 },
      outcome: outcome.reason === undefined ? { status: outcome.status } : { status: outcome.status, reason: outcome.reason },
      friction: { deniedReads: 0, checkRunsBeforePass: 0, checkFailures: 0 },
      verdicts, solved, traces: { run: traceRun, score: traceScore },
    };
    writeFileSync(join(folder, "record.json"), JSON.stringify(record, null, 2));
    return { record, folder };
  }),
};
