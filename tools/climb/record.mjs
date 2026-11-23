#!/usr/bin/env node
// The climb recorder (Goal 3, loop step 2) and an entry file: it holds the clock (`new Date()`), `spawn` and `process`, which
// `parse.mjs` never touches. Runs `ortho prove` with the arguments given, streams its output unchanged, and appends one JSON
// line per journey to design/evidence/climb/runs.jsonl, taken from prove's own report (`--report`, a `ProveReport` with
// schemaVersion 1) and never retyped:
//   { at, commit, journey, green, total, seconds, run_seconds, prove_seconds, exit }
// `seconds` is the journey's own time as prove measured it; `run_seconds` is measured here, from spawn to close, so it holds the
// world's start and stop; `prove_seconds` is prove's own timer for the run (after the world is up, before cleanup).
//   node tools/climb/record.mjs --root examples/plugged-in --only "claim a free handle" [--runs <file>]
// `--runs` is this tool's own option (default design/evidence/climb/runs.jsonl); everything else goes to `ortho prove`.
// A report it cannot read records nothing and exits 3 (prove's own exit code is kept when it is not 0 or 1).
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { entries } from "./parse.mjs";

const repo = resolve(import.meta.dirname, "../..");
const args = process.argv.slice(2);
const at = args.indexOf("--runs");
const runs = resolve(at < 0 ? resolve(repo, "design/evidence/climb/runs.jsonl") : args[at + 1]);
const prove = at < 0 ? args : args.filter((_, i) => i !== at && i !== at + 1);

const folder = mkdtempSync(join(tmpdir(), "ortho-climb-"));
const reportFile = join(folder, "report.json");
const started = new Date().toISOString();
const t0 = performance.now();
const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();
const child = spawn(process.execPath, [resolve(repo, "packages/cli/src/main.ts"), "prove", ...prove, "--report", reportFile], { stdio: ["inherit", "inherit", "inherit"] });
// An interrupted climb must stop prove too, so its workerd and collector are released by prove's own cleanup.
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { child.kill(signal); });

// A spawn that fails (no such executable) never closes: say so, remove the folder and exit, recording nothing.
child.on("error", (error) => {
  rmSync(folder, { recursive: true, force: true });
  process.stderr.write(`climb recorder: nothing recorded: could not start prove (${error.code ?? error.message})\n`);
  process.exit(3);
});

/** The report prove wrote, or why there is none. The folder is removed whichever it is. */
const readReport = () => {
  let report;
  let problem;
  try { report = JSON.parse(readFileSync(reportFile, "utf8")); } catch (error) { problem = `prove wrote no readable report (${error.code ?? error.message})`; }
  rmSync(folder, { recursive: true, force: true });
  return { report, problem };
};

child.on("close", (exit) => {
  const { report, problem } = readReport();
  const made = problem === undefined ? entries({ report, at: started, commit, exit, runSeconds: Math.round((performance.now() - t0) / 100) / 10 }) : { ok: false, problem };
  if (!made.ok) {
    process.stderr.write(`climb recorder: nothing recorded: ${made.problem}\n`);
    process.exit(exit === 0 || exit === 1 || exit === null ? 3 : exit);
  }
  if (made.lines.length > 0) {
    mkdirSync(dirname(runs), { recursive: true });
    appendFileSync(runs, made.lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
  }
  process.stderr.write(`recorded ${made.lines.length} journey line(s) in ${runs}\n`);
  process.exit(exit ?? 1);
});
