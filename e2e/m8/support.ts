// What every M8 check shares: the club (examples/signup with a time fixture laid over it), ortho run as a user runs it,
// prove's lines read back, and a world started from a copy for the checks that drive the world's front door themselves.
import { spawnSync } from "node:child_process";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";
import { copyOf, ortho, repo } from "../layer1/support.ts";

export { copyOf, nothingRunning, ortho, repo } from "../layer1/support.ts";

export const signup = join(repo, "examples/signup");
export const acme = join(repo, "examples/acme");
export const fixtures = join(repo, "e2e/fixtures/m8");

/**
 * examples/signup copied, with `e2e/fixtures/m8/<fixture>` laid over it: its environment (a stepped clock), its things,
 * handlers, starting worlds and journeys. signup's own sheet and journeys stay: they never move time, and they keep
 * coverage whole. Not generated: `generated()` does that, inside the test, so a missing surface fails the test itself.
 */
export const club = (fixture: string) => {
  const copy = copyOf(signup);
  cpSync(join(fixtures, fixture), copy.root, { recursive: true });
  return copy;
};

/** `ortho generate`, which must succeed: the blueprint loads and compiles. */
export const generated = (root: string) => {
  const run = ortho(root, "generate");
  expect(run.status, `ortho generate failed:\n${run.stdout}${run.stderr}`).toBe(0);
  return root;
};

export interface Proved {
  readonly status: number | null;
  readonly out: string;
  readonly lines: ReadonlyArray<string>;
}

/** `ortho prove --env local --port 0`, its exit and its lines. */
export const prove = (root: string, ...extra: ReadonlyArray<string>): Proved => {
  const run = ortho(root, "prove", "--env", "local", "--port", "0", ...extra);
  const out = run.stdout + run.stderr;
  return { status: run.status, out, lines: run.stdout.split("\n") };
};

/**
 * The journey ran every one of its `steps` and each passed: exactly one line `journey <name> ✔ n/n steps`, and no step
 * of it skipped or failed. A prove that skips a step, or reports one it never ran, fails here.
 */
export const passedWhole = (proved: Proved, name: string, steps: number) => {
  const mine = proved.lines.filter((l) => l.startsWith(`journey ${name} `));
  expect(mine, proved.out).toEqual([`journey ${name} ✔ ${steps}/${steps} steps`]);
};

/**
 * The journey ran all its `steps` and exactly the one titled `step` failed: `journey <name> ✘ n-1/n steps`, with the
 * failure lines naming that step and no other. A prove that passes a planted journey, or fails it somewhere else, fails here.
 */
export const failedAt = (proved: Proved, name: string, steps: number, step: string) => {
  const at = proved.lines.findIndex((l) => l === `journey ${name} ✘ ${steps - 1}/${steps} steps`);
  expect(at, `expected "journey ${name} ✘ ${steps - 1}/${steps} steps" in:\n${proved.out}`).toBeGreaterThanOrEqual(0);
  const below: Array<string> = [];
  for (const line of proved.lines.slice(at + 1)) {
    if (!line.startsWith("  ")) break;
    below.push(line);
  }
  const failing = below.filter((l) => l.startsWith("  ✘ "));
  expect(failing.length, proved.out).toBeGreaterThan(0);
  for (const line of failing) expect(line.startsWith(`  ✘ "${step}": `), `${name}: a failure outside "${step}":\n${line}`).toBe(true);
  expect(below.filter((l) => l.startsWith("  skipped ")), proved.out).toEqual([]);
};

/**
 * A journey file copied with planted changes: each `[from, to]` must change the text (a planted break that changes
 * nothing would prove nothing), and the journey's name gets ` (planted <tag>)`.
 */
export const plant = (root: string, journey: string, tag: string, name: string, swaps: ReadonlyArray<readonly [string, string]>) => {
  let text = readFileSync(join(root, "journeys", `${journey}.ts`), "utf8");
  const named = text.replace(`Blueprint.journey("${name}"`, `Blueprint.journey("${name} (planted ${tag})"`);
  if (named === text) throw new Error(`${journey}.ts is not the journey "${name}"`);
  text = named;
  for (const [from, to] of swaps) {
    if (!text.includes(from)) throw new Error(`planting ${tag}: "${from}" is not in ${journey}.ts`);
    text = text.replace(from, to);
  }
  writeFileSync(join(root, "journeys", `${journey}.planted-${tag}.ts`), text);
  return `${name} (planted ${tag})`;
};

/** Every operation the generated model declares, sorted: what "run everything" means. */
export const operationsOf = (root: string): ReadonlyArray<string> => {
  const model = JSON.parse(readFileSync(join(root, "generated/model/model.json"), "utf8")) as { readonly operations: Readonly<Record<string, unknown>> };
  return Object.keys(model.operations).sort();
};

/** Run `make` once, on first use, and hand every later caller the same result: one prove shared by a file's tests. */
export const once = <A>(make: () => A): (() => A) => {
  let made: { readonly ok: true; readonly value: A } | { readonly ok: false; readonly error: unknown } | undefined;
  return () => {
    if (made === undefined) {
      try { made = { ok: true, value: make() }; } catch (error) { made = { ok: false, error }; }
    }
    if (!made.ok) throw made.error;
    return made.value;
  };
};

/** `ortho prove` with extra variables in its environment (the keeper's delay, M8-checks). */
export const proveWith = (env: Readonly<Record<string, string>>, root: string): Proved => {
  const run = spawnSync(process.execPath, [join(repo, "packages/cli/src/main.ts"), "prove", "--env", "local", "--port", "0", "--root", root], {
    cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env },
  });
  return { status: run.status, out: run.stdout + run.stderr, lines: run.stdout.split("\n") };
};
