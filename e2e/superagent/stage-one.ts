// What slice 6's checks (18 to 23) share: stage one's journeys and starting worlds, kept in `e2e/fixtures/superagent/stage-one/`
// and run by `ortho prove` as a user runs it, on a copy of examples/superagent outside the repository, and the reading of
// prove's own report (`--report`, schemaVersion 1) against what each journey must have done.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect } from "vitest";
import { leftRunning, plain, proveOnce } from "../stage1/support.ts";
import { copyApp, repo, run } from "./app.ts";

export const fixtures = join(repo, "e2e/fixtures/superagent/stage-one");
/** The journeys that run through GOAL17-check-harness's doors (check 22), with their own worlds beside stage one's. */
export const doors = join(repo, "e2e/fixtures/superagent/stage-one-doors");

/** What a journey must be: its declared name, and how many steps it takes (the titles come from the journey's own file). */
export interface Wanted { readonly file: string; readonly name: string; readonly steps: number; readonly dir?: string }

/** Stage one's journeys, in the order check 19 runs them: the file in `e2e/fixtures/superagent/stage-one/journeys/`, its declared name, and how many steps it has. */
export const WANTED: ReadonlyArray<Wanted> = [
  { file: "a-stale-policy-save-is-refused.ts", name: "a stale policy save is refused", steps: 12 },
  { file: "an-account-is-seen-once.ts", name: "an account is seen once", steps: 10 },
  { file: "a-trigger-twice-is-stored-once.ts", name: "a trigger twice is stored once", steps: 4 },
  { file: "the-gate-lets-the-right-ones-through.ts", name: "the gate lets the right ones through", steps: 27 },
  { file: "an-eval-batches-a-thread.ts", name: "an eval batches a thread", steps: 6 },
  { file: "the-stage-read-is-served.ts", name: "the stage read is served", steps: 4 },
];

/** The journeys that go through GOAL17-check-harness's doors (check 22), in `e2e/fixtures/superagent/stage-one-doors/journeys/`. */
export const DOORS: ReadonlyArray<Wanted> = [
  { file: "observe-records-would-accept-and-starts-nothing.ts", name: "observe records would accept and starts nothing", steps: 6 },
  { file: "a-follow-up-reaches-its-ticket-with-no-eval.ts", name: "a follow-up reaches its ticket with no eval", steps: 9 },
  { file: "a-policy-change-restarts-a-live-eval.ts", name: "a policy change restarts a live eval", steps: 7 },
  { file: "a-stop-withdraws-the-mandate.ts", name: "a stop withdraws the mandate", steps: 17 },
  { file: "a-stop-cancels-or-closes-from-the-state-it-reads.ts", name: "a stop cancels or closes from the state it reads", steps: 9 },
  { file: "a-stop-after-a-handoff-closes-the-agents-turn.ts", name: "a stop after a handoff closes the agent's turn", steps: 10 },
  { file: "the-stage-read-has-every-row.ts", name: "the stage read has every row", steps: 22 },
  { file: "an-accept-makes-five-records-in-one-commit.ts", name: "an accept makes five records in one commit", steps: 2 },
].map((w) => ({ ...w, dir: join(repo, "e2e/fixtures/superagent/stage-one-doors") }));

/** The titles of a journey file's steps, as it writes them: each `s.step(` is followed by its title as a string. */
export const titlesOf = (source: string): ReadonlyArray<string> =>
  [...source.matchAll(/s\.step\(\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`) as string);

export const journeyFile = (file: string, dir: string = fixtures) => readFileSync(join(dir, "journeys", file), "utf8");

export interface StepRun { readonly name: string; readonly verdict: string; readonly failures: ReadonlyArray<{ readonly message: string; readonly expected?: string; readonly got?: string }> }
/** `line` is prove's own text line for the journey, which says why a starting world stopped in full (the report's `stopped` cuts the cause). */
export interface JourneyRun { readonly name: string; readonly verdict: string; readonly stopped?: string; readonly line?: string; readonly steps: ReadonlyArray<StepRun> }

/** One failure as a sentence a builder can act on: the journey, the step, what was expected and what came back. */
const said = (journey: string, step: string, f: StepRun["failures"][number]) =>
  `journey "${journey}", step "${step}": ${f.message}${f.expected === undefined ? "" : ` (expected ${f.expected}, got ${f.got ?? "nothing"})`}`;

/**
 * What is wrong with a prove report as the reading of one wanted journey: empty when it ran once, did not stop, ran exactly its
 * steps in order (titles from its file), and every step passed. Anything else is a sentence naming the journey and the step.
 */
export const problemsOf = (journeys: ReadonlyArray<JourneyRun>, want: Wanted): ReadonlyArray<string> => {
  const titles = titlesOf(journeyFile(want.file, want.dir));
  const found = journeys.filter((j) => j.name === want.name);
  if (titles.length !== want.steps) return [`${want.file}: the journey file has ${titles.length} steps, the check expects ${want.steps}`];
  if (found.length === 0) return [`journey "${want.name}" did not run`];
  if (found.length > 1) return [`journey "${want.name}" ran ${found.length} times`];
  const j = found[0]!;
  if (j.stopped !== undefined) return [`journey "${want.name}" stopped before its first step: ${j.line ?? j.stopped}`];
  const ran = j.steps.map((s) => s.name);
  const shape = ran.length === titles.length && ran.every((n, i) => n === titles[i]) ? [] : [`journey "${want.name}" ran steps [${ran.join(" | ")}], expected [${titles.join(" | ")}]`];
  const red = j.steps.flatMap((s) => (s.verdict === "pass" && s.failures.length === 0 ? [] : s.failures.length === 0 ? [`journey "${want.name}", step "${s.name}": failed with no reason`] : [...new Set(s.failures.map((f) => said(want.name, s.name, f)))]));
  return [...shape, ...red];
};

/** Stage one's journeys and starting worlds written into a copy of the app, and the project generated. */
export const stageOneCopy = (journeys: ReadonlyArray<string>, dir: string = fixtures) => {
  const root = copyApp();
  mkdirSync(join(root, "blueprint/starting-worlds"), { recursive: true });
  // stage one's worlds are every check's; a folder of its own (the doors') adds its own beside them
  for (const from of dir === fixtures ? [fixtures] : [fixtures, dir]) {
    for (const f of readdirSync(join(from, "starting-worlds"))) cpSync(join(from, "starting-worlds", f), join(root, "blueprint/starting-worlds", f));
  }
  mkdirSync(join(root, "journeys"), { recursive: true });
  for (const f of journeys) cpSync(join(dir, "journeys", f), join(root, "journeys", f));
  const generated = run(root, ["generate"]);
  expect(generated.status, `ortho generate on the copy:\n${generated.out}`).toBe(0);
  return root;
};

/** `ortho prove` on the copy, as a user runs it; stopped and cleaned up whatever happens. */
export const proveCopy = async (root: string) => {
  const reports = mkdtempSync(join(tmpdir(), "ortho-superagent-s6-"));
  try {
    const ended = await proveOnce(root, ["--env", "local"], { hardStopSeconds: 900, report: join(reports, "report.json") });
    const out = plain(ended.out);
    expect(ended.hung, "prove was still running at the hard stop").toBe(false);
    expect(ended.report, `prove wrote no readable report:\n${out.slice(-3000)}`).toBeDefined();
    const raw = ended.report as { readonly schemaVersion: number; readonly journeys: ReadonlyArray<JourneyRun>; readonly lines: ReadonlyArray<string> };
    expect(raw.schemaVersion).toBe(1);
    const lineOf = (name: string): string | undefined => raw.lines.find((l) => l.startsWith(`journey ${name} `));
    const journeys: ReadonlyArray<JourneyRun> = raw.journeys.map((j) => { const line = lineOf(j.name); return line === undefined ? j : { ...j, line }; });
    const report = { ...raw, journeys };
    const left = await leftRunning(root);
    expect(left, "something of the copy is still running").toEqual([]);
    return report;
  } finally {
    rmSync(reports, { recursive: true, force: true });
  }
};
