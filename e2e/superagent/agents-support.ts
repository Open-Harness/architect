// What slice 8's checks share: the app copied, the journeys laid over it, `ortho prove` run as a user runs it, and the tape runner.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { afterAll, describe, expect, it } from "vitest";
import { copyApp, lazy, removeCopies, repo, run } from "./app.ts";
import { JOURNEYS } from "./journeys-table.ts";

export const here = join(repo, "e2e/superagent");

/** Every slice 8 journey's file name (without `.ts`): one file in `journeys/` each. */
export const allJourneys = (): ReadonlyArray<string> => readdirSync(join(here, "journeys")).filter((f) => f.endsWith(".ts")).map((f) => f.slice(0, -3)).sort();

/**
 * The folders this run copied the app into, kept in a file named for the run (the test runner's own pid, which every file of one run shares), so a
 * check at the end can tell this run's leftovers from another session's on the same machine.
 */
const registry = () => join(tmpdir(), `ortho-s8-roots-${process.ppid}.txt`);
export const registerRoot = (root: string, file: string = registry()) => appendFileSync(file, `${dirname(root)}\n`);
export const registeredRoots = (file: string = registry()): ReadonlyArray<string> => { try { return readFileSync(file, "utf8").split("\n").filter((l) => l !== ""); } catch { return []; } };

/** A copy of the app with slice 8's starting worlds, kit and the named journeys laid over it, as an author's files are laid over a builder's app. */
export const withJourneys = (names: ReadonlyArray<string>, extra: ReadonlyArray<string> = []) => {
  const root = copyApp();
  registerRoot(root);
  cpSync(join(here, "starting-worlds"), join(root, "blueprint/starting-worlds"), { recursive: true });
  cpSync(join(here, "kit"), join(root, "kit"), { recursive: true });
  mkdirSync(join(root, "journeys"), { recursive: true });
  for (const name of names) cpSync(join(here, "journeys", `${name}.ts`), join(root, "journeys", `${name}.ts`));
  for (const dir of extra) cpSync(join(here, dir), join(root, dir), { recursive: true });
  return root;
};

export interface Proved { readonly status: number | null; readonly out: string; readonly lines: ReadonlyArray<string> }

/** `ortho prove --env local --port 0`, its exit and its lines. */
export const prove = (root: string): Proved => {
  const r = run(root, ["prove", "--env", "local", "--port", "0"]);
  return { status: r.status, out: r.out, lines: r.stdout.split("\n") };
};

/** The journey ran every one of its steps and each passed: exactly one line `journey <name> ✔ n/n steps` (the M8 checks' own rule). */
export const passedWhole = (proved: Proved, name: string, steps: number) => {
  const mine = proved.lines.filter((l) => l.startsWith(`journey ${name} `));
  expect(mine, `slice 8's journey "${name}" did not pass whole, so the agents and the sandbox (slice 9) are not built to it yet. prove said:\n${proved.out.slice(0, 4000)}`).toEqual([`journey ${name} ✔ ${steps}/${steps} steps`]);
};

export interface TapeRun {
  readonly name: string; readonly journey: string; readonly titles: ReadonlyArray<string>;
  readonly unknownTapeSteps: ReadonlyArray<string>; readonly unknownPlantSteps: ReadonlyArray<string>;
  readonly good: ReadonlyArray<string>;
  readonly plants: ReadonlyArray<{ name: string; step: string; failedAt: ReadonlyArray<string> }>;
  readonly mutantRuns: ReadonlyArray<{ step: string; path: string; kind: string; read: boolean; failed: boolean }>;
  readonly eventRuns: ReadonlyArray<{ step: string; what: string; failed: boolean }>;
}

/** One journey judged against its tape, in a subprocess whose resolver points the three unbuilt packages at throwaway descriptors. */
export const tapeRun = (root: string, name: string): TapeRun => {
  const tapeDir = join(root, "tape");   // the copy's own, so the runner resolves `orthograph` from the app as a journey does
  const real = createRequire(join(root, "package.json")).resolve("orthograph");
  const map = {
    orthograph: pathToFileURL(join(tapeDir, "shims/orthograph.ts")).href, "orthograph-real": pathToFileURL(real).href,
    "@orthograph/stand-in-model/stand": pathToFileURL(join(tapeDir, "shims/stand-model.ts")).href,
    "@orthograph/agents/probes": pathToFileURL(join(tapeDir, "shims/agents-probes.ts")).href,
  };
  const r = spawnSync(process.execPath, ["--import", pathToFileURL(join(tapeDir, "register.mjs")).href, join(tapeDir, "run.ts"), root, name], { cwd: root, encoding: "utf8", env: { ...process.env, TAPE_MAP: JSON.stringify(map), TAPE_REPO: repo }, maxBuffer: 64 * 1024 * 1024, timeout: 300_000 });
  expect(r.status, `the tape runner for ${name}:\n${r.stdout}${r.stderr}`).toBe(0);
  const parsed = JSON.parse(r.stdout.trim().split("\n").at(-1)!) as TapeRun;
  if (process.env["TAPE_DEBUG"]) console.log(JSON.stringify({ name, good: parsed.good, plants: parsed.plants, mutants: parsed.mutantRuns.length, unread: parsed.mutantRuns.filter((m) => !m.read).length, events: parsed.eventRuns.length }));
  return parsed;
};

/** A copy for the tape runner: the journeys, their kit and their tapes, and nothing a builder writes. */
export const tapeCopy = () => {
  const root = withJourneys(allJourneys(), ["tapes", "tape"]);
  expect(existsSync(join(root, "journeys")), "the copy has no journeys").toBe(true);
  return root;
};

/**
 * A group of slice 8's journeys run for real: the app copied, the group's journeys and worlds laid over it, `ortho prove` run once, and each
 * journey a test that passes only as `✔ n/n steps`. Red until slice 9 builds the agents, the sandbox and the harness's instruments.
 */
export const journeysPass = (heading: string, files: ReadonlyArray<string>) => {
  describe(heading, () => {
    const proved = lazy(() => prove(withJourneys(files)));
    afterAll(removeCopies);
    for (const file of files) {
      const j = JOURNEYS.find((x) => x.file === file);
      if (j === undefined) throw new Error(`no journey ${file} in journeys-table.ts`);
      it(`the journey "${j.name}" passes whole`, () => passedWhole(proved(), j.name, j.steps));
    }
  });
};
