// The grid runner's entry and composition root: the only file that reads the process, touches the disk for the modules, or prints.
//
//   tsx e2e/grid/src/main.ts [run] [--prove]               judge every switched-on cell, write the verdicts, exit 1 if a red pair is not on expected-red.json
//                                                           (or a listed pair is green or not switched on: the ratchet, G7);
//                                                           --prove runs `ortho prove` first, so the spans and the report are this commit's
//   tsx e2e/grid/src/main.ts touched --journey "<name>" --report <prove output> [--write]
//                                                           the rows and cells a green journey touches; --write switches them on
//   tsx e2e/grid/src/main.ts capture --out <folder> [--run]  copy the project's outputs (and a run) for the tests to judge
//
// Options: --project <dir> (default examples/plugged-in), --list <file> (default e2e/grid/switched-on.json),
// --expected <file> (default e2e/grid/expected-red.json: the pairs allowed to be red today, G7), --held <file> (default e2e/grid/held-off.json: the cells `touched --write` never switches on, with what each waits for),
// --out <file> (default e2e/grid/out/verdicts.json), --observed <file> (the refused calls the client journeys recorded;
// default <project>/.ortho/grid/observed.json), --report <file> (prove's `--report` JSON; default <project>/.ortho/grid/prove.json),
// --revision <sha> (default GITHUB_SHA, else git HEAD).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect } from "effect";
import { ServedPortals } from "../../served-portal/service.ts";
import { FileSource } from "@orthograph/prove";
import { Evidence } from "./modules/evidence/service.ts";
import type { Observed, Ports } from "./modules/evidence/types.ts";
import { Grid } from "./modules/grid/service.ts";
import type { List, OutputId } from "./modules/grid/types.ts";
import { ProjectEvidenceService } from "./modules/project-evidence/service.ts";
import { ProjectEvals } from "./modules/project-evals/service.ts";
import { RefusalEvals } from "./modules/refusal-evals/service.ts";
import type { ModelView, RefusalEvidence, SpanView } from "./modules/refusal-evals/types.ts";
import { Touches } from "./modules/touches/service.ts";
import type { TouchModel } from "./modules/touches/types.ts";
import { World } from "./modules/world/service.ts";
import type { Primitives } from "./modules/world/types.ts";

const here = resolve(import.meta.dirname, "../..");
const repo = resolve(here, "..");
const argv = process.argv.slice(2);
const command = argv[0] !== undefined && !argv[0].startsWith("--") ? argv[0] : "run";
const option = (name: string) => { const at = argv.indexOf(`--${name}`); return at < 0 ? undefined : argv[at + 1]; };
const project = resolve(option("project") ?? join(repo, "examples/plugged-in"));
const listPath = resolve(option("list") ?? join(here, "grid/switched-on.json"));
const expectedPath = resolve(option("expected") ?? join(here, "grid/expected-red.json"));
const heldPath = resolve(option("held") ?? join(here, "grid/held-off.json"));
const outPath = resolve(option("out") ?? join(here, "grid/out/verdicts.json"));
const reportPath = resolve(option("report") ?? join(project, ".ortho/grid/prove.json"));
const telemetryPath = join(project, ".ortho/prove-telemetry");
const say = (lines: ReadonlyArray<string>) => { for (const line of lines) process.stdout.write(`${line}\n`); };
const fail = (lines: ReadonlyArray<string>): never => { for (const line of lines) process.stderr.write(`${line}\n`); return process.exit(2); };

const text = (path: string) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);
const readJson = <A>(path: string): A | undefined => { const t = text(path); return t === undefined ? undefined : (JSON.parse(t) as A); };

const node: Primitives = {
  read: text,
  list: (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)) : []),
  run: (cmd, args, cwd) => { const ran = spawnSync(cmd, [...args], { cwd, encoding: "utf8", timeout: 600_000 }); return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr }; },
  remove: (path) => rmSync(path, { recursive: true, force: true }),
  load: (path) => import(path) as Promise<Record<string, unknown>>,
};

const loadList = (): List => {
  const found = text(listPath);
  if (found === undefined) return fail([`no list at ${listPath}`]);
  const json = Effect.runSync(Effect.try(() => JSON.parse(found) as unknown).pipe(Effect.orElseSucceed(() => undefined)));
  if (json === undefined) return fail([`${listPath} is not JSON`]);
  const parsed = Grid.parse(json);
  return parsed.ok ? parsed.value : fail([`${listPath} is not a valid list:`, ...parsed.problems.map((p) => `  ${p}`)]);
};

/** The pairs allowed to be red today: a red pair not on it fails the run, and so does a listed pair that is green or not switched on. */
const loadExpected = () => {
  const found = text(expectedPath);
  if (found === undefined) return fail([`no expected-red list at ${expectedPath}`]);
  const json = Effect.runSync(Effect.try(() => JSON.parse(found) as unknown).pipe(Effect.orElseSucceed(() => undefined)));
  const parsed = Grid.parseExpected(json);
  return parsed.ok ? parsed.value : fail([`${expectedPath} is not a valid list:`, ...parsed.problems.map((p) => `  ${p}`)]);
};

/** The cells `touched --write` leaves off, each with what it waits for. */
const loadHeld = (): Readonly<Record<string, string>> => readJson<{ readonly cells: Readonly<Record<string, string>> }>(heldPath)?.cells ?? {};

const loadModel = () => {
  const model = readJson<ModelView & TouchModel>(join(project, "generated/model/model.json"));
  return model ?? fail([`no generated/model/model.json in ${project}: run \`ortho generate\` there first`]);
};

/** Why the portal could not be read, said once each (K19): the served portal is how a person reads it, and until the split there is none. */
const told = new Set<string>();
const unavailable = (message: string) => { if (!told.has(message)) { told.add(message); process.stderr.write(`portal: ${message}\n`); } };

const portalPort = (route: string): Effect.Effect<string | undefined> => {
  const wire = readJson<unknown>(join(project, "generated/portal/blueprint.json"));
  return wire === undefined ? Effect.succeed(undefined) : (pages ??= ServedPortals.pages(wire, undefined, unavailable))(route);
};
let pages: ReturnType<typeof ServedPortals.pages> | undefined;

const spansPort = (): Effect.Effect<ReadonlyArray<SpanView> | undefined> => {
  if (!existsSync(telemetryPath)) return Effect.succeed(undefined);
  return FileSource.open(telemetryPath).window(30 * 24 * 3_600_000).pipe(
    Effect.map((traces) => [...traces.values()].flatMap((trace) => trace.spans.map((span) => ({ name: span.name, attrs: span.attrs })))),
    Effect.orElseSucceed(() => undefined),
  );
};

const refusalPorts = (observedFile: string): Ports => ({
  read: (path) => Effect.sync(() => text(join(project, path))),
  portal: portalPort,
  spans: spansPort,
  observed: (refusal) => Effect.sync(() => readJson<Record<string, Observed>>(observedFile)?.[refusal]),
});

const revision = () => option("revision") ?? process.env["GITHUB_SHA"] ?? spawnSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim();

/** A prove run of this commit: the last report and spans are deleted first, and a prove that wrote no report stops the grid, with its own status. */
const proveFirst = () => {
  mkdirSync(dirname(reportPath), { recursive: true });
  const ran = World.proveFresh({ repo, project, report: reportPath, telemetry: telemetryPath, node });
  writeFileSync(join(dirname(reportPath), "prove.txt"), ran.output);
  say([`prove ${ran.status === 0 ? "✔" : "✘"} (status ${String(ran.status)}); its output is in ${join(dirname(reportPath), "prove.txt")}`]);
  if (!ran.fresh) fail([`grid ✘ ${ran.problems.join("; ")}`]);
};

const runCommand = async () => {
  const list = loadList();
  if (argv.includes("--prove")) proveFirst();
  const model = loadModel();
  const observed = resolve(option("observed") ?? join(project, ".ortho/grid/observed.json"));
  const refusalCells = new Set<string>(RefusalEvals.evals.map((e) => e.cell));
  const refusalList: List = { cells: list.cells.filter((c) => refusalCells.has(c.cell)) };
  const projectList: List = { cells: list.cells.filter((c) => !refusalCells.has(c.cell)) };
  // The error row's client and docs evals gather evidence once per refusal named in the list.
  const refusals = [...new Set(refusalList.cells.flatMap((c) => c.subjects))];
  const gathered = new Map(await Effect.runPromise(Effect.all(refusals.map((refusal) => Evidence.ofRefusal({ model, refusal, ports: refusalPorts(observed) }).pipe(Effect.map((e) => [refusal, e] as const))))));
  const sha = revision();
  const refusalReport = Grid.run<RefusalEvidence>({
    list: refusalList, evals: RefusalEvals.evals, revision: sha, environment: "local",
    evidence: (_cell, subject) => gathered.get(subject) ?? ({ model, docs: {}, portal: {}, spans: undefined, held: [], cli: undefined, mcp: undefined }),
  });
  // Every other cell is judged over the whole project's outputs, gathered once, and only the outputs a switched-on cell needs.
  const wanted = new Set(projectList.cells.map((c) => c.cell.split(".")[1] as OutputId));
  const evidence = await Effect.runPromise(ProjectEvidenceService.gather({ ports: World.ports({ project, report: reportPath, telemetry: telemetryPath, node, onUnavailable: unavailable }), wanted }));
  const projectReport = evidence === undefined ? Grid.run<undefined>({ list: projectList, evals: [], evidence: () => undefined, revision: sha, environment: "local" })
    : Grid.run({ list: projectList, evals: ProjectEvals.evals, evidence: () => evidence, revision: sha, environment: "local" });
  const report = Grid.combine([refusalReport, projectReport], sha, "local");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  const ratchet = Grid.ratchet(report, loadExpected());
  say([...Grid.lines(report), `verdicts written to ${outPath}`, ...Grid.ratchetLines(ratchet)]);
  await ServedPortals.closeAll();
  process.exit(ratchet.ok ? 0 : 1);
};

const touchedCommand = () => {
  const journey = option("journey");
  const reportFile = option("report");
  if (journey === undefined || reportFile === undefined) return fail(["touched needs --journey <name> and --report <file with prove's output>"]);
  const report = (text(resolve(reportFile)) ?? fail([`no prove output at ${reportFile}`])).split("\n");
  const touched = Touches.of({ model: loadModel(), journey, report });
  if (!touched.green) return fail(touched.problems);
  const held = loadHeld();
  const all = Touches.entries(touched, journey);
  const entries = all.filter((e) => held[e.cell] === undefined);
  say([`journey "${journey}" touches:`, ...touched.rows.map((r) => `  ${r.block} ${r.subject}`), "cells to switch on:", ...entries.map((e) => `  ${e.cell}: ${e.subjects.join(", ")}`),
    ...(entries.length < all.length ? ["held off (not switched on):", ...all.filter((e) => held[e.cell] !== undefined).map((e) => `  ${e.cell}: ${held[e.cell]}`)] : [])]);
  if (argv.includes("--write")) {
    writeFileSync(listPath, `${JSON.stringify(Grid.switchOn(loadList(), entries), null, 2)}\n`);
    say([`switched on in ${listPath}`]);
  }
  return process.exit(0);
};

/**
 * `capture --out <folder> [--run]`: the project as the tests read it: its `generated/` files in `files.json`, the portal's pages in `portal.json`
 * and, with `--run`, the CLI help, MCP tools, prove's report and one span of each shape in `run.json`. The tests judge these copies, never the
 * live outputs, so a builder who changes a generator cannot break one by fixing a cell; recapture to make the copies today's.
 */
const captureCommand = async () => {
  const out = resolve(option("out") ?? fail(["capture needs --out <folder>"]));
  const withRun = argv.includes("--run");
  const wanted = new Set<OutputId>(withRun ? ["portal", "cli", "mcp"] : ["portal"]);
  const evidence = await Effect.runPromise(ProjectEvidenceService.gather({ ports: World.ports({ project, report: reportPath, telemetry: telemetryPath, node, onUnavailable: unavailable }), wanted }));
  if (evidence === undefined) return fail([`no generated/model/model.json in ${project}`]);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "files.json"), `${JSON.stringify(evidence.files, null, 1)}\n`);
  writeFileSync(join(out, "portal.json"), `${JSON.stringify(evidence.portal, null, 1)}\n`);
  if (withRun) {
    const seen = new Set<string>();
    const shape = (s: SpanView) => [s.name, Object.keys(s.attrs).sort().join(","), s.attrs["refusal"], s.attrs["event.name"], s.attrs["journey.step"]].join("|");
    const spans = (evidence.spans ?? []).filter((s) => s.name !== "BATCH" && s.name !== "sqlite" && !seen.has(shape(s)) && seen.add(shape(s)));
    writeFileSync(join(out, "run.json"), `${JSON.stringify({ cli: evidence.cli, mcp: evidence.mcp, spans, prove: evidence.prove }, null, 1)}\n`);
  }
  await ServedPortals.closeAll();
  return say([`captured ${Object.keys(evidence.files).length} files, the portal${withRun ? " and a run" : ""} into ${out}`]);
};

if (command === "run") await runCommand();
else if (command === "touched") touchedCommand();
else if (command === "capture") await captureCommand();
else fail([`unknown command ${command}: run | touched | capture`]);
