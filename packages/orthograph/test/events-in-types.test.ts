// E1 (#1165, design/decisions/CX-events-in.md call 4): an adapter's event typechecks through `Blueprint.on` with no cast, as S2 needs. The fixture is
// compiled on its own by tsc, so a missing surface is a failing test here and not a red package typecheck (the pattern of test/invariants.test.ts).
// Written by the checks author; the builder never edits this file or test/fixtures/events-in-types/.
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../..");
const tsc = (fixture: string) => {
  const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(repo, "packages/orthograph/test/fixtures", fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
  const errors = result.stdout.split("\n").filter((l) => l.includes("error TS"));
  if (result.status !== 0 && errors.length === 0) errors.push(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
  if (result.status === 0 && errors.length > 0) errors.push("tsc exited 0 yet printed errors");
  return errors;
};

describe("events in from the chain (E1): an adapter's event through Blueprint.on", () => {
  it("compiles with no cast: the map is given the decoded payload, an `on:` list takes it, EventNames names it, and each planted error is an error", { timeout: 60_000 }, () => {
    expect(tsc("events-in-types"), "the fixture's plain lines must compile and each `@ts-expect-error` line must hide an error").toEqual([]);
  });
});
