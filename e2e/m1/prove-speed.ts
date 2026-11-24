// What checks 29 (ST1.23, `ortho prove --changed`) and 30 (ST1.24, a warm world) share: running prove as a user does, reading
// what it says as data, the set of journeys a change affects worked out from the model (never from prove's output), and the
// instruments that judge a run. Written by the checks author; a builder never edits it (AGENTS.md, "Journeys and checks come first").
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { cli } from "../layer1/support.ts";

// ---- prove's report, as `--report <file>` writes it (the existing `ProveReport`, plus ST1.23's `changed`) ----

export interface Changed {
  readonly base: string;
  readonly rerun: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<string>;
  readonly fellBack: null | { readonly reason: string; readonly files: ReadonlyArray<string> };
}
export interface Report {
  readonly passed: boolean;
  readonly journeys: ReadonlyArray<{ readonly name: string; readonly verdict: string; readonly steps: ReadonlyArray<{ readonly name: string; readonly verdict: string }> }>;
  readonly lines: ReadonlyArray<string>;
  readonly changed?: Changed;
}
export interface Proved {
  readonly status: number | null;
  readonly out: string;
  readonly report: Report | undefined;
  readonly seconds: number;
  /** The operations that really ran in the world, read from the spans the run's collector wrote (a recording, not prove's own word). */
  readonly called: ReadonlySet<string>;
  /** How many spans named exactly each operation the collector heard in the run. */
  readonly counts: ReadonlyMap<string, number>;
  /** Every wrangler or workerd process of this project that was not already running when prove started, as the poll saw them (see `worldProcesses`). */
  readonly worlds: ReadonlySet<string>;
}

const PROVE_FOLDER = ".ortho/prove-telemetry";
/** Where `ortho dev`'s collector writes (`ortho telemetry trace` already looks there), which a warm prove's spans must reach. */
export const DEV_FOLDER = ".ortho/dev-telemetry";

/** `ortho prove <args> --root <root> --report <file>`, run as a user runs it, asynchronously, watching what it starts. */
export const prove = (root: string, ...args: ReadonlyArray<string>): Promise<Proved> => proveWatching(root, PROVE_FOLDER, args);
/** The same, for a prove against `ortho dev`: what the world was asked is read from dev's collector folder. */
export const proveWarm = (root: string, ...args: ReadonlyArray<string>): Promise<Proved> => proveWatching(root, DEV_FOLDER, args);

/**
 * How many proves of one test file run at once. Check 29's rows each prove in a copy and a world of their own, so they run together, but
 * a prove starts a workerd world and a Node process: this keeps the load on a runner to what it can carry. Check 30 times its runs and
 * never overlaps them, so it is never held up by this.
 */
export const PROVE_AT_ONCE = 3;
let running = 0;
const waiting: Array<() => void> = [];
// A finished prove hands its place straight to the next one waiting, so the count never dips below what is running.
const turn = async () => {
  if (running < PROVE_AT_ONCE) { running += 1; return; }
  await new Promise<void>((resolve) => waiting.push(resolve));
};
const release = () => { const next = waiting.shift(); if (next === undefined) running -= 1; else next(); };

const proveWatching = async (root: string, folder: string, args: ReadonlyArray<string>): Promise<Proved> => {
  await turn();
  try { return await proveWatchingNow(root, folder, args); } finally { release(); }
};

const proveWatchingNow = async (root: string, folder: string, args: ReadonlyArray<string>): Promise<Proved> => {
  const file = join(dirname(root), `report-${Math.random().toString(36).slice(2)}.json`);
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root, "--report", file], { cwd: root });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const worlds = new Set<string>();
  const spans = join(root, folder, "traces.jsonl");
  const was = existsSync(spans) ? { ino: statSync(spans).ino, size: statSync(spans).size } : { ino: 0, size: 0 };
  const before = new Set(worldProcesses(root).map(pidOf));
  const started = Date.now();
  let open = true;
  const done = new Promise<number | null>((resolve) => child.once("close", (code) => { open = false; resolve(code); }));
  while (open) {
    for (const line of [...worldProcesses(root), ...worldProcessesUnder(child.pid!)]) if (!before.has(pidOf(line))) worlds.add(line);
    await new Promise((r) => setTimeout(r, 120));
  }
  const status = await done;
  const report = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as Report) : undefined;
  // prove empties its own collector's folder at the start of a run (a new file); dev's collector appends to one file for as long as it lives.
  const now = existsSync(spans) ? statSync(spans) : undefined;
  const from = now !== undefined && now.ino === was.ino && now.size >= was.size ? was.size : 0;
  const counts = operationsCalled(root, folder, from);
  return { status, out, report, seconds: (Date.now() - started) / 1000, worlds, called: new Set(counts.keys()), counts };
};

/** The operations (by the model's names) that have a span in the collector's file past `offset` bytes: what the world was really asked to do. */
const operationsCalled = (root: string, folder: string, offset: number): ReadonlyMap<string, number> => {
  const file = join(root, folder, "traces.jsonl");
  if (!existsSync(file) || !existsSync(join(root, "generated/model/model.json"))) return new Map();
  const known = new Set(Object.keys((JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { operations: object }).operations));
  const found = new Map<string, number>();
  for (const line of readFileSync(file).subarray(offset).toString("utf8").split("\n")) {
    if (line === "") continue;
    // The collector writes whole lines, but the file may be read as one is being written.
    const parsed = Effect.runSync(Effect.try(() => JSON.parse(line)).pipe(Effect.orElseSucceed(() => ({})))) as { resourceSpans?: ReadonlyArray<{ scopeSpans?: ReadonlyArray<{ spans?: ReadonlyArray<{ name: string }> }> }> };
    for (const r of parsed.resourceSpans ?? []) for (const sc of r.scopeSpans ?? []) for (const sp of sc.spans ?? []) if (known.has(sp.name)) found.set(sp.name, (found.get(sp.name) ?? 0) + 1);
  }
  return found;
};

const pidOf = (line: string) => line.split(/\s+/)[0]!;
/** `pid command` of every wrangler or workerd process whose command line names this project's folder (a unique temp folder). */
export const worldProcesses = (root: string): ReadonlyArray<string> => {
  const token = dirname(root).split("/").pop()!;
  const listed = spawnPs();
  return listed.filter((line) => line.includes(token) && /workerd|wrangler/.test(line)).map((line) => line.trim());
};
const spawnPs = () => spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\n");

/** `pid command` of every wrangler, workerd or miniflare process anywhere below this pid, whatever folder its command line names. */
export const worldProcessesUnder = (top: number): ReadonlyArray<string> => {
  const table = spawnSync("ps", ["-axo", "pid=,ppid=,command="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\n")
    .flatMap((line) => { const m = line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]), command: m[3]! }] : []; });
  const below = new Set([top]);
  for (let grew = true; grew;) { grew = false; for (const p of table) if (below.has(p.ppid) && !below.has(p.pid)) { below.add(p.pid); grew = true; } }
  return table.filter((p) => below.has(p.pid) && p.pid !== top && /workerd|wrangler|miniflare/.test(p.command)).map((p) => `${p.pid} ${p.command}`);
};

// ---- the model, and what a change affects, worked out without prove ----

interface ModelCheck { readonly kind: string; readonly present?: ReadonlyArray<string>; readonly absent?: ReadonlyArray<string> }
interface ModelJourney { readonly name: string; readonly starts: string | null; readonly steps: ReadonlyArray<{ readonly title: string; readonly call?: { readonly operation: string }; readonly checks: ReadonlyArray<ModelCheck> }> }
interface ModelWorld { readonly from: string | null; readonly makes: ReadonlyArray<{ readonly operation: string } | null> }
export interface JourneyMap {
  readonly journeys: Record<string, ModelJourney>;
  readonly startingWorlds: Record<string, ModelWorld>;
  readonly operations: Record<string, { readonly kind: string }>;
}
export const modelOf = (root: string): JourneyMap => JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as JourneyMap;

/** Every operation a journey's proof rests on: its own steps' calls, and the calls of the starting worlds it stands on, oldest first. */
export const callsOf = (map: JourneyMap, name: string): ReadonlySet<string> => {
  const journey = Object.values(map.journeys).find((j) => j.name === name)!;
  return new Set([...journey.steps.flatMap((s) => (s.call ? [s.call.operation] : [])), ...worldCallsOf(map, name)]);
};
/** The starting worlds a journey stands on: its own, then the one that one is made from, and so on. */
export const worldsOf = (map: JourneyMap, name: string): ReadonlyArray<string> => {
  const journey = Object.values(map.journeys).find((j) => j.name === name)!;
  const chain: Array<string> = [];
  for (let world = journey.starts; world !== null && !chain.includes(world) && map.startingWorlds[world] !== undefined; world = map.startingWorlds[world]!.from) chain.push(world);
  return chain;
};
/** Only what the starting worlds a journey stands on make: answered whatever the journey does after. */
export const worldCallsOf = (map: JourneyMap, name: string): ReadonlySet<string> =>
  new Set(worldsOf(map, name).flatMap((world) => map.startingWorlds[world]!.makes.flatMap((call) => (call ? [call.operation] : []))));
/** The journeys that stand on this starting world, through their own or one it is made from. */
export const standingOn = (map: JourneyMap, world: string) => journeyNames(map).filter((name) => worldsOf(map, name).includes(world));
/**
 * How many spans each operation must have in a run of these journeys, at the least: one for each step that reaches a handler. Left out,
 * each with its reason: a read (answered from the records, no handler), and a step that is refused (`refuses`) unless its own checks say
 * the operation's span is present (`spans({ present })` naming it), since a refusal before the handler leaves no span of its own
 * (O2 gap 3). So `revoke then spend`'s refused spend is left out, and its first step, the revoke, is not.
 */
export const reachingSteps = (map: JourneyMap, names: ReadonlyArray<string>): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const name of names) {
    const journey = Object.values(map.journeys).find((j) => j.name === name)!;
    for (const step of journey.steps) {
      const op = step.call?.operation;
      if (op === undefined || map.operations[op]?.kind === "read") continue;
      const refused = step.checks.some((c) => c.kind === "refuses");
      const present = step.checks.some((c) => c.kind === "spans" && (c.present ?? []).includes(op));
      if (!refused || present) counts.set(op, (counts.get(op) ?? 0) + 1);
    }
  }
  return counts;
};
/** What is missing from the spans of a run that says it ran these journeys: an operation heard fewer times than its steps that reach a handler. */
export const stepsShortfall = (map: JourneyMap, names: ReadonlyArray<string>, heard: ReadonlyMap<string, number>): ReadonlyArray<string> =>
  [...reachingSteps(map, names)].filter(([op, n]) => (heard.get(op) ?? 0) < n).map(([op, n]) => `the collector heard ${op} ${heard.get(op) ?? 0} times, and ${n} steps of the journeys it ran reach its handler`);
export const journeyNames = (map: JourneyMap) => Object.values(map.journeys).map((j) => j.name).sort();
/** The journeys that call (in a step or through a starting world) at least one of these operations. */
export const calling = (map: JourneyMap, ...operations: ReadonlyArray<string>) =>
  journeyNames(map).filter((name) => operations.some((op) => callsOf(map, name).has(op)));

// ---- the judge: what a `--changed` run must say, as a list of problems (empty when it is right) ----

export interface Expected {
  /** Exactly the journeys that must run. */
  readonly ran: ReadonlyArray<string>;
  /** `null`: it can tell. Otherwise the files it cannot place, which it must name: it proves everything. */
  readonly fellBackOn: null | ReadonlyArray<string>;
  /** What the reason it gives must say, when it falls back. */
  readonly reason?: RegExp;
  readonly all: ReadonlyArray<string>;
  /** The model, for the operations the run may and must have called. */
  readonly map: JourneyMap;
  /** Whether everything it reruns passes (a planted comment does; a planted break does not). */
  readonly passes: boolean;
  /** When it does not: exactly the journeys that fail (default, all it ran). */
  readonly fails?: ReadonlyArray<string>;
  /** Names skipped, when two journeys share a name and only one of them reruns (default: every name not rerun). */
  readonly skipped?: ReadonlyArray<string>;
  /** Step titles a rerun journey must be reported with, by name, where two journeys share it and the model alone cannot say which ran. */
  readonly titles?: Readonly<Record<string, ReadonlyArray<string>>>;
  /** The operations whose evals it must judge again (an eval summary line for each, in the text). */
  readonly judges?: ReadonlyArray<string>;
  /** Lines, as `<operation> <eval> ✘`, that the text must hold: an eval that fails where no journey does. */
  readonly evalFails?: ReadonlyArray<string>;
}
const sorted = (xs: ReadonlyArray<string>) => [...xs].sort();
const same = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));

/**
 * The check ST1.23 holds a run to. The expected sets come from the model (`calling`), never from the output judged. Each rule is
 * judged on its own, so a run that runs everything, nothing, one too many, one too few or the right count of the wrong ones
 * each earn a problem of their own (check 29's controls plant each).
 */
export const problems = (run: Pick<Proved, "status" | "out" | "report" | "called" | "counts">, want: Expected): ReadonlyArray<string> => {
  const found: Array<string> = [];
  const { report, out } = run;
  if (report === undefined) return ["no report was written: prove did not run"];
  const skipped = sorted(want.skipped ?? want.all.filter((name) => !want.ran.includes(name)));
  const ran = report.journeys.map((j) => j.name);
  if (!same(ran, want.ran) || new Set(ran).size !== ran.length) found.push(`ran ${JSON.stringify(sorted(ran))}, expected exactly ${JSON.stringify(sorted(want.ran))}`);
  const changed = report.changed;
  if (changed === undefined) return [...found, "the report has no `changed` section"];
  if (!same(changed.rerun, want.ran)) found.push(`changed.rerun is ${JSON.stringify(sorted(changed.rerun))}, expected ${JSON.stringify(sorted(want.ran))}`);
  if (!same(changed.skipped, skipped)) found.push(`changed.skipped is ${JSON.stringify(sorted(changed.skipped))}, expected ${JSON.stringify(skipped)}`);
  if (typeof changed.base !== "string" || changed.base === "") found.push("changed.base names no base");
  // Every journey the run skipped is named in the text a person reads, one line each, and no other journey is.
  const said = [...out.matchAll(/^journey (.+?) skipped\b.*$/gm)].map((m) => m[1]!);
  if (!same(said, skipped) || new Set(said).size !== said.length) found.push(`the text names skipped ${JSON.stringify(sorted(said))}, expected ${JSON.stringify(skipped)}, once each`);
  const headline = out.match(/^prove --changed: (.+)$/m)?.[1];
  if (want.fellBackOn === null) {
    if (changed.fellBack !== null) found.push(`it fell back to everything (${JSON.stringify(changed.fellBack)}) where it could tell`);
    if (!/^proving \d+ of \d+ journeys\b/.test(headline ?? "") || headline!.match(/\d+/g)!.join("/") !== `${want.ran.length}/${want.all.length}`) found.push(`headline is ${JSON.stringify(headline)}, expected "proving ${want.ran.length} of ${want.all.length} journeys"`);
  } else {
    const fell = changed.fellBack;
    if (fell === null) found.push("it did not say it fell back to everything");
    else {
      if (!same(fell.files, want.fellBackOn)) found.push(`fellBack.files is ${JSON.stringify(sorted(fell.files))}, expected ${JSON.stringify(sorted(want.fellBackOn))}`);
      if (!(want.reason ?? /cannot place/).test(fell.reason)) found.push(`fellBack.reason is ${JSON.stringify(fell.reason)}, expected it to match ${want.reason ?? /cannot place/}`);
      for (const file of want.fellBackOn) if (!out.includes(file)) found.push(`the text does not name ${file}`);
    }
    if (!/^proving all \d+ journeys: .+/.test(headline ?? "") || !headline!.includes(`all ${want.all.length} journeys`)) found.push(`headline is ${JSON.stringify(headline)}, expected "proving all ${want.all.length} journeys: <why>"`);
    if (said.length > 0) found.push("it fell back to everything and still names skipped journeys");
  }
  // What the world was really asked: nothing outside what the journeys it ran call, and every call their starting worlds make.
  const may = new Set(want.ran.flatMap((name) => [...callsOf(want.map, name)]));
  const must = new Set(want.ran.flatMap((name) => [...worldCallsOf(want.map, name)]));
  for (const op of run.called) if (!may.has(op)) found.push(`the world was asked to run ${op}, which no journey it ran calls`);
  for (const op of must) if (!run.called.has(op)) found.push(`the world was never asked to run ${op}, which a starting world of the journeys it ran makes`);
  // Where every journey passes, each step that reaches a handler really ran: its operation was heard by the collector as often as that.
  const failing = want.passes ? [] : want.fails ?? want.ran;
  if (failing.length === 0) found.push(...stepsShortfall(want.map, want.ran, run.counts));
  // The evals of what changed are judged again, and one that fails where no journey does is said to.
  for (const op of want.judges ?? []) if (!new RegExp(`^${op.replace(/\./g, "\\.")} (\\d+ evals ✔|\\d+ of \\d+ evals ✘)`, "m").test(out)) found.push(`the evals of ${op} were not judged again`);
  for (const line of want.evalFails ?? []) if (!new RegExp(`^${line.replace(/\./g, "\\.")}`, "m").test(out)) found.push(`the text has no line "${line}"`);
  // Each journey it ran is reported step by step, as the model declares them, and the ones that fail are the ones that must.
  for (const j of report.journeys) {
    const titles = want.titles?.[j.name] ?? Object.values(want.map.journeys).find((m) => m.name === j.name)?.steps.map((s) => s.title);
    if (titles === undefined || JSON.stringify(titles) !== JSON.stringify(j.steps.map((s) => s.name))) found.push(`journey ${j.name} is reported with steps ${JSON.stringify(j.steps.map((s) => s.name))}, the model declares ${JSON.stringify(titles)}`);
  }
  // A step's verdict agrees with its journey's: a journey passes when every step does, and fails when one does not.
  for (const j of report.journeys) {
    const allPass = j.steps.every((st) => st.verdict === "pass");
    if (allPass !== (j.verdict === "pass")) found.push(`journey ${j.name} is ${j.verdict} but its steps are ${JSON.stringify(j.steps.map((st) => st.verdict))}`);
  }
  const failed = report.journeys.filter((j) => j.verdict !== "pass").map((j) => j.name);
  if (!same(failed, want.passes ? [] : want.fails ?? want.ran)) found.push(`journeys that failed: ${JSON.stringify(sorted(failed))}, expected ${JSON.stringify(sorted(want.passes ? [] : want.fails ?? want.ran))}`);
  if ((run.status === 0) !== want.passes || report.passed !== want.passes) found.push(`exit ${run.status}, passed ${report.passed}, expected ${want.passes ? "pass" : "fail"}`);
  return found;
};

/** A report and its text that `problems` accepts, for the controls to plant a wrong output into. */
export const perfect = (want: Expected): Pick<Proved, "status" | "out" | "report" | "called" | "counts"> & { readonly report: Report & { readonly changed: Changed } } => {
  const skipped = want.skipped ?? want.all.filter((name) => !want.ran.includes(name));
  const why = want.fellBackOn !== null && want.fellBackOn.length === 0 ? "no record of an earlier prove" : `cannot place ${(want.fellBackOn ?? []).join(", ")}`;
  const fell = want.fellBackOn === null ? null : { reason: why, files: [...want.fellBackOn] };
  const headline = fell ? `prove --changed: proving all ${want.all.length} journeys: ${fell.reason}` : `prove --changed: proving ${want.ran.length} of ${want.all.length} journeys`;
  const evalLines = [...(want.judges ?? []).map((op) => `${op} 9 evals ✔ p50 1ms p95 1ms budget p95 100ms`), ...(want.evalFails ?? []).map((line) => `${line} no deciding log`)];
  const out = [headline, ...skipped.map((name) => `journey ${name} skipped: nothing it calls changed`), ...want.ran.map((name) => `journey ${name} ✔ 1/1 steps`), ...evalLines, "prove ✔"].join("\n");
  const report: Report & { readonly changed: Changed } = {
    passed: want.passes, lines: out.split("\n"),
    journeys: want.ran.map((name) => {
      const verdict = want.passes || !(want.fails ?? want.ran).includes(name) ? "pass" : "fail";
      return { name, verdict, steps: Object.values(want.map.journeys).find((m) => m.name === name)!.steps.map((s) => ({ name: s.title, verdict })) };
    }),
    changed: { base: "last proof", rerun: [...want.ran], skipped, fellBack: fell },
  };
  const called = new Set(want.ran.flatMap((name) => [...callsOf(want.map, name)]));
  const counts = new Map([...reachingSteps(want.map, want.ran)].map(([op, n]) => [op, n + 1] as const));
  for (const op of called) if (!counts.has(op)) counts.set(op, 1);
  return { status: want.passes ? 0 : 1, out, report, called, counts };
};

// ---- planting a change in a copy ----

export const edit = (root: string, path: string, change: (text: string) => string) => {
  const file = join(root, path);
  const before = readFileSync(file, "utf8");
  const after = change(before);
  if (after === before) throw new Error(`the planted change did not change ${path}`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, after);
};
export const append = (root: string, path: string, text: string) => edit(root, path, (before) => before + text);
