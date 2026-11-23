// ST1.20 (G5 section 7): G4's `findBy(thing, field, value)` is retired; `findBy` takes a rule only. The fixture is compiled on its own by tsc, so this is a failing test
// here and not a red package typecheck. Written by the checks author; the builder never edits this file or test/fixtures/g4-retired-findby/.
// It is red on `goal/stage-1` (G4's form still type-checks) and green once ST1.20 lands. It stays red through ST1.14 to ST1.16 on purpose: G4's form and G5's
// coexist until Plugged In moves (ST1.19), and `find-by.test.ts` does not judge G4's form for that reason.
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../../../..");
const fixture = join(repo, "packages/language-effect/test/fixtures/g4-retired-findby");

describe("ST1.20: G4's findBy is gone", () => {
  it("`findBy(thing, field, value)` is a type error", { timeout: 60_000 }, () => {
    const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
    const errors = result.stdout.split("\n").filter((l) => l.includes("error TS"));
    // tsc that dies, or is killed, without printing an error line is not a clean compile.
    if (result.status !== 0 && errors.length === 0) errors.push(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
    expect(errors, "the fixture's `@ts-expect-error` line must hide exactly one error").toEqual([]);
  });
});
