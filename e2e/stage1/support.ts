// What the stage 1 checks share: `ortho prove` as a user runs it, in a process group of its own, with every process it started
// stopped afterwards (the cleanup of checks 33 and 36), and the expected journeys of Plugged In's stage 1.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { cli, nothingRunning, repo } from "../layer1/support.ts";
import { worldProcesses } from "../m1/prove-speed.ts";

export { cli, nothingRunning, repo };
export const pluggedIn = join(repo, "examples/plugged-in");

/**
 * The seven journeys of stage 1 (`design/goals/03-stage-1-hill-climbed.md`, "The journeys"), by their declared names, with the steps each
 * has today. `declared()` reads the journeys folder, so a journey added or renamed without this list fails the check rather than slipping
 * past it. Prove's own report says what ran; these are the expectation.
 */
export const JOURNEYS: Readonly<Record<string, number>> = {
  "a name is claimed once": 5,
  "a stranger cannot edit a page": 8,
  "add, order and remove a link": 12,
  "anyone reads a public page": 5,
  "claim a handle": 8,
  "release a handle": 13,
  "a person claims a page and shares it": 5,
};
export const STEPS = Object.values(JOURNEYS).reduce((a, b) => a + b, 0);

/** The journey files of the example: one per journey, the README aside. */
export const declared = () => readdirSync(join(pluggedIn, "journeys")).filter((f) => f.endsWith(".ts"));

/** Every process below this pid, whatever its name, as of now. */
const descendants = (top: number): ReadonlyArray<number> => {
  const table = spawnSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" }).stdout.split("\n")
    .flatMap((line) => { const m = line.trim().match(/^(\d+)\s+(\d+)$/); return m ? [{ pid: Number(m[1]), ppid: Number(m[2]) }] : []; });
  const below = new Set([top]);
  for (let grew = true; grew;) { grew = false; for (const p of table) if (below.has(p.ppid) && !below.has(p.pid)) { below.add(p.pid); grew = true; } }
  return [...below];
};
const signal = (pids: ReadonlyArray<number>, name: NodeJS.Signals) => { for (const pid of pids) { try { process.kill(pid, name); } catch { /* gone */ } } };

export interface Ended { readonly status: number | null; readonly out: string; readonly seconds: number; readonly hung: boolean; readonly report: any }

/**
 * `ortho prove <args> --root <root>` as a user runs it, in a process group of its own, with `report` (a file path) as `--report` when
 * given. Whether it exits or hangs, its group and every descendant seen while it ran are stopped afterwards.
 */
export const proveOnce = async (root: string, args: ReadonlyArray<string>, options: { readonly env?: Readonly<Record<string, string>>; readonly hardStopSeconds: number; readonly report?: string }): Promise<Ended> => {
  const reportFile = options.report;
  const child = spawn(process.execPath, [cli, "prove", ...args, "--root", root, ...(reportFile ? ["--report", reportFile] : [])], { cwd: root, detached: true, env: { ...process.env, ...options.env } });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const seen = new Set<number>();
  const watch = () => { for (const pid of descendants(child.pid!)) seen.add(pid); };
  const watcher = setInterval(watch, 1000);
  const started = Date.now();
  let timer: NodeJS.Timeout | undefined;
  const status = await new Promise<number | null | "hung">((resolve) => {
    child.once("close", (code) => resolve(code));
    timer = setTimeout(() => resolve("hung"), options.hardStopSeconds * 1000);
  });
  clearTimeout(timer);
  clearInterval(watcher);
  const seconds = (Date.now() - started) / 1000;
  watch();
  const stop = (name: NodeJS.Signals) => { try { process.kill(-child.pid!, name); } catch { /* gone */ } signal([...seen].filter((pid) => pid !== process.pid), name); };
  stop("SIGTERM");
  await new Promise((r) => setTimeout(r, 2000));
  stop("SIGKILL");
  let report: unknown;
  if (reportFile && existsSync(reportFile)) { try { report = JSON.parse(readFileSync(reportFile, "utf8")); } catch { report = undefined; } rmSync(reportFile, { force: true }); }
  return { status: status === "hung" ? null : status, out, seconds, hung: status === "hung", report };
};

/** Nothing of this copy is left: no wrangler, workerd or node process names its folder (waits a few seconds for a slow exit). */
export const leftRunning = async (root: string) => {
  for (let i = 0; i < 20; i++) { if (worldProcesses(root).length === 0 && spawnSync("pgrep", ["-f", dirname(root)], { encoding: "utf8" }).stdout.trim() === "") return []; await new Promise((r) => setTimeout(r, 250)); }
  return [...worldProcesses(root), spawnSync("pgrep", ["-fl", dirname(root)], { encoding: "utf8" }).stdout.trim()];
};

/** Colour codes off. */
export const plain = (text: string) => text.replace(/\x1b\[[0-9;]*m/g, "");

/** What is wrong with a journey verdict list: empty when exactly the stage 1 journeys ran, each with all its steps green. */
export const journeyProblems = (seen: ReadonlyArray<{ readonly name: string; readonly green: number; readonly total: number }>): ReadonlyArray<string> => {
  const names = seen.map((j) => j.name);
  return [
    ...Object.keys(JOURNEYS).filter((n) => !names.includes(n)).map((n) => `journey "${n}" did not run`),
    ...names.filter((n) => !(n in JOURNEYS)).map((n) => `unexpected journey "${n}"`),
    ...names.filter((n, i) => names.indexOf(n) !== i).map((n) => `journey "${n}" ran twice`),
    ...seen.filter((j) => j.name in JOURNEYS && j.total !== JOURNEYS[j.name]).map((j) => `journey "${j.name}" ran ${j.total} steps, expected ${JOURNEYS[j.name]}`),
    ...seen.filter((j) => j.green !== j.total).map((j) => `journey "${j.name}" is red: ${j.green}/${j.total} steps green`),
  ];
};
