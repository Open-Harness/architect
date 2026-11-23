// What the climbability check shares: acme copied into a temp folder, one planted handler laid over it, and `ortho prove`
// run on it as an agent runs it. Read-only use of the earlier gates' helpers; nothing here touches a handler or a journey
// of the repository (the planted ones are in `e2e/fixtures/climb`).
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync } from "node:fs";
import type { ProveReport } from "@orthograph/prove";
import { join } from "node:path";
import { acme, cli, copyOf, nothingRunning, repo } from "../layer1/support.ts";
import { freePorts } from "../ports.ts";

export { nothingRunning };

/** This check's ports, free ones picked when the file loads (`e2e/ports.ts`): the control's, and a pair for each kind of failure. */
const picked = freePorts("control", "first0", "first1", "first2", "first3", "first4", "second0", "second1", "second2", "second3", "second4");
export const PORTS = {
  control: picked.control,
  first: [picked.first0, picked.first1, picked.first2, picked.first3, picked.first4],
  second: [picked.second0, picked.second1, picked.second2, picked.second3, picked.second4],
} as const;

const fixture = join(repo, "e2e/fixtures/climb");

/** One kind of failure: the journey that a correct handler passes, the variant that plants the fault, and where it lives. */
export interface Kind {
  readonly id: "wrong-answer" | "missing-refusal" | "missing-event" | "wrong-state" | "missing-span";
  readonly label: string;
  readonly journey: string;
  readonly step: string;
  /** What prove must say on the failing step's line: the thing expected and the thing that came back. */
  readonly expected: RegExp;
  /** The handler file the agent has to change, and the declaration it answers to. */
  readonly handler: string;
  readonly declaration: string;
}

const handler = "src/allowance/spend.ts";
const declaration = "blueprint/things/allowance/verbs/spend.ts";
export const KINDS: ReadonlyArray<Kind> = [
  { id: "wrong-answer", label: "a wrong answer", journey: "climb: a wrong answer", step: "olga spends some and is told what is left", expected: /answer "500", expected "380"/, handler, declaration },
  { id: "missing-refusal", label: "a missing refusal", journey: "climb: a missing refusal", step: "olga can't spend more than the allowance", expected: /expected refused with AllowanceExceeded, answered/, handler, declaration },
  { id: "missing-event", label: "a missing event", journey: "climb: a missing event", step: "olga spends some and the spend is announced", expected: /expected AllowanceSpent, journal has nothing/, handler, declaration },
  { id: "wrong-state", label: "the wrong state", journey: "climb: the wrong state", step: "olga spends all of it and the allowance is exhausted", expected: /is in "active", expected "exhausted"/, handler, declaration },
  { id: "missing-span", label: "a missing span", journey: "climb: a missing span", step: "olga spends some and the record step is traced", expected: /span allowance\.spend\.record/, handler, declaration },
];

export interface Planted {
  readonly root: string;
  readonly remove: () => void;
}

/** A copy of acme with the climb journeys beside its own, and, for a planted kind, that kind's handler over `spend.ts`. */
export const planted = (kind?: Kind["id"]): Planted => {
  const copy = copyOf(acme);
  cpSync(join(fixture, "journeys"), join(copy.root, "journeys"), { recursive: true });
  if (kind !== undefined) cpSync(join(fixture, "variants", kind), copy.root, { recursive: true });
  return copy;
};

export interface Proved {
  readonly status: number | null;
  readonly out: string;
  readonly lines: ReadonlyArray<string>;
  /** Wall-clock seconds for the whole `ortho prove` process, world start included. */
  readonly seconds: number;
  /** prove's own structured report (`--report`, schemaVersion 1): the journeys and steps as data. Absent when prove wrote none. */
  readonly report: ProveReport | undefined;
}

/** `ortho prove [--only <journey>] --port <port>` in `root`, as the agent runs it, timed. */
export const prove = (root: string, port: number, only?: string): Proved => {
  const start = performance.now();
  const file = join(root, ".ortho-climb-report.json");
  // A prove that hangs would hold workerd and a collector for ever: it is killed at two minutes, and the check then fails on its status.
  const result = spawnSync(process.execPath, [cli, "prove", ...(only === undefined ? [] : ["--only", only]), "--port", String(port), "--root", root, "--report", file], {
    cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000, killSignal: "SIGKILL",
  });
  const out = `${result.stdout}${result.stderr}`;
  const report = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as ProveReport) : undefined;
  return { status: result.status, out, lines: out.split("\n"), seconds: (performance.now() - start) / 1000, report };
};

/** What prove says about the journeys, before its per-operation evals: what an agent reads first, and what a failure message shows. */
export const head = (proved: Proved) => {
  const end = proved.lines.findIndex((line) => /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]* /.test(line));
  return (end < 0 ? proved.lines : proved.lines.slice(0, end)).join("\n");
};

/** The line prove gives a journey: `journey <name> ✔|✘ <n>/<m> steps`. */
export const journeyLine = (proved: Proved, journey: string) => proved.lines.find((line) => line.startsWith(`journey ${journey} `));

/** The failing lines of a step: `  ✘ "<step>": <what happened>`. */
export const stepLines = (proved: Proved, step: string) => proved.lines.filter((line) => line.startsWith(`  ✘ "${step}"`));

/**
 * What a result is, with the things that differ between two honest runs taken out: an id the world made, a measured
 * time, and the performance eval's review note (`; review: p95 <t> is over 1.5x budget`), which appears only when p95
 * crosses 1.5x the budget, so it depends on how loaded the machine is. Eval 7 never fails (`failures` is always empty),
 * so the note cannot change a verdict; the line's own ✔ or ✘ stays and is still compared.
 */
export const essence = (proved: Proved) =>
  proved.lines
    .map((line) => line.replace(/\b[a-z]{2,6}_[0-9a-z]{12,}\b/g, "<id>").replace(/\bp(50|95) \d+ms\b/g, "p$1 <ms>")
        .replace(/; review: p95 \S+ is over 1\.5x budget$/, ""),
    )
    .filter((line) => line.trim() !== "");

/** The structured detail of a journey's failing step, from prove's report. */
export const stepOf = (proved: Proved, journey: string, step: string) =>
  proved.report?.journeys.find((j) => j.name === journey)?.steps.find((s) => s.name === step);
