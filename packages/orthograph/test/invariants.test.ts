// G5's types, ST1.14's halves, and ST1.20's retirement of G4's spelling. Two fixtures are compiled on their own by tsc, so a missing surface is a failing test here
// and not a red package typecheck. Written by the checks author; the builder never edits this file or test/fixtures/invariant-types/ and test/fixtures/g4-retired/.
//
// `invariant-types` (ST1.14): the first lines compile (a state of this machine as `machine.states.<state>`, a refusal whose fields are all in the key, a tuple, no
// options, a description) and each `@ts-expect-error` line hides exactly one error: a state of another machine or one it does not have, a state as a bare string, a
// refusal carrying a field outside the key, a field of another thing, a tuple of two things' fields, a key as a string, an empty tuple, a number as the description.
// `g4-retired` (ST1.20): `unique:` is no longer a property of `Blueprint.thing`, and a thing carries no `unique`. It stays red through ST1.14 to ST1.19 on purpose:
// G4's spelling and G5's coexist until Plugged In moves.
// The last test scans the repository's blueprints for a thing declared with G4's `unique:` (the milestone's done check for ST1.20, as a test).
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../..");
const tsc = (fixture: string) => {
  const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(repo, "packages/orthograph/test/fixtures", fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
  const errors = result.stdout.split("\n").filter((l) => l.includes("error TS"));
  // tsc that dies, or is killed, without printing an error line is not a clean compile.
  if (result.status !== 0 && errors.length === 0) errors.push(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
  if (result.status === 0 && errors.length > 0) errors.push("tsc exited 0 yet printed errors");
  return errors;
};
const filesUnder = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "generated" || entry.name === ".ortho") continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) filesUnder(path, out);
    else out.push(path);
  }
  return out;
};

describe("G5 types: invariants and state references (ST1.14)", () => {
  it("compiles: what G5 allows is accepted and each planted error is exactly one error", { timeout: 60_000 }, () => {
    expect(tsc("invariant-types"), "the fixture's `@ts-expect-error` lines must each hide exactly one error, and its other lines none").toEqual([]);
  });
});

describe("G4's spelling is retired (ST1.20)", () => {
  it("`unique:` is not a property of `Blueprint.thing`, and a thing carries no `unique`", { timeout: 60_000 }, () => {
    expect(tsc("g4-retired")).toEqual([]);
  });

  it("no thing in the repository's blueprints is declared with `unique:`", () => {
    const places = ["examples", "e2e/fixtures", "packages/orthograph/test", "spikes"].map((p) => join(repo, p));
    const declared = places.flatMap((place) => filesUnder(place)).filter((f) => /\/blueprint\/things\/[^/]+\/thing\.ts$/.test(f))
      .filter((f) => /\bunique\s*:\s*\{/.test(readFileSync(f, "utf8")));
    expect(declared.map((f) => f.slice(repo.length + 1))).toEqual([]);
  });
});
