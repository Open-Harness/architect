// #1133 (CX-feature-contracts, calls 2 and 4): a handler that runs a contract, written as the scaffold writes it (`yield* steps.<key>(input)`),
// compiles with no cast. A required contract's runner answers its output, an optional one's its output or `undefined`, and each fails with its
// contract's errors, which pass through the handler's own error channel. A fill's handler (`FillHandler<typeof fill>`) is typed from its fill:
// its input, its steps, its output and its contract's errors. What is no refusal or no shape of theirs is a type error. Written by the checks
// author; the builder never edits this file or test/fixtures/contract-types/, and only removes lines from `expected-failing/contract-types.txt`.
//
// The type is judged by the compiler itself: one tsc run over the fixture. `features.ts` and `accepts.ts` must compile clean, and hold no cast,
// no `any` and no `@ts-` comment. Each file in `refuses/` is a handler `accepts.ts` holds with exactly one fault, named in its header
// (`Fault: 'Stranger'`) and marked `← the fault`: its errors must all be on that line, one of them must name the fault, and `accepts.ts` must
// compile, so the error is that fault's and no other. (The harness is #1079's `inner-operation-types.test.ts`.)
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../../../..");
const fixture = join(repo, "packages/language-effect/test/fixtures/contract-types");

type Diagnostic = { readonly file: string; readonly line: number; readonly column: number; readonly text: string };
let compiled: ReadonlyArray<Diagnostic> | undefined;
const compile = (): ReadonlyArray<Diagnostic> => (compiled ??= (() => {
  // `--pretty false`: with FORCE_COLOR (CI) tsc colours "error" and "TS" apart, and a filter on "error TS" would find nothing.
  // `--noErrorTruncation`: a long union printed as "… 4 more …" could hide the fault's name.
  const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "--noErrorTruncation", "-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
  const found: Array<Diagnostic> = [];
  for (const l of result.stdout.split("\n")) {
    const m = /^(.+?)\((\d+),(\d+)\): error TS\d+: (.*)$/.exec(l);
    if (m) found.push({ file: resolve(repo, m[1]!), line: Number(m[2]), column: Number(m[3]), text: m[4]! });
    // An indented line goes on explaining the error above it ("Type 'Stranger' is not assignable to …").
    else if (/^\s+\S/.test(l) && found.length > 0) found[found.length - 1] = { ...found[found.length - 1]!, text: `${found[found.length - 1]!.text}\n${l}` };
  }
  // tsc exits 1 or 2 when it reports errors; one that dies, or is killed, without an error line is no answer, and must not read as a clean compile.
  if (result.status !== 0 && found.length === 0) throw new Error(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
  if (result.status === 0 && found.length > 0) throw new Error("tsc exited 0 but printed errors");
  return found;
})());
const errorsIn = (file: string) => compile().filter((d) => d.file === join(fixture, file));
const shown = (d: Diagnostic) => `${String(d.line)}:${String(d.column)}: ${d.text.slice(0, 600)}`;
/** The fixture compiles against the framework's own types: an error in them (or anywhere outside the fixture) is no clean compile. */
const accepted = () => [...compile().filter((d) => !d.file.startsWith(`${fixture}/`)), ...errorsIn("features.ts"), ...errorsIn("accepts.ts")].map(shown);

describe("#1133: a handler runs its contracts with their types, and a fill's handler is typed from its fill", () => {
  it("compiles with no cast: steps.<contract>(input) answers the output, or the output or undefined when optional; its errors are the handler's own; a fill handler from its fill", { timeout: 60_000 }, () => {
    for (const file of ["features.ts", "accepts.ts"]) {
      const source = readFileSync(join(fixture, file), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\/\*\*|\*)/.test(l)).join("\n");
      expect(/\bas\s+(never|any|unknown)\b|\bany\b|@ts-|\bas [A-Z]/.test(source), `${file} must hold no cast, no any and no @ts- comment`).toBe(false);
    }
    expect(accepted(), "features.ts and accepts.ts must compile: a contract's runner and a fill's handler are typed (CX-feature-contracts, calls 2 and 4)").toEqual([]);
  });

  const refusals = readdirSync(join(fixture, "refuses")).filter((f) => f.endsWith(".ts")).sort();
  it("has every refusal the table names", () => {
    expect(refusals).toEqual([
      "code-no-such-output.ts", "fill-contract-error-not-its-own.ts", "fill-no-such-input.ts", "fill-no-such-step.ts", "fill-other-contract-error.ts", "fill-output-missing.ts", "fill-own-output-missing.ts",
      "fill-undeclared-error.ts", "fill-wrong-output.ts", "no-such-contract-step.ts", "quick-other-contract-error.ts", "runner-other-contract.ts",
      "runner-stranger.ts", "submit-stranger.ts", "tax-maybe-undefined.ts", "tax-missing-input.ts", "tax-wrong-input.ts",
    ]);
  });
  for (const file of refusals) {
    it(`refuses/${file}: its one fault is a type error, there and nowhere else`, { timeout: 60_000 }, () => {
      // The same handler without the fault must compile, or an error here could be the missing widening's rather than the fault's.
      expect(accepted(), "accepts.ts must compile first: a refusal means something only beside the same handler accepted").toEqual([]);
      const source = readFileSync(join(fixture, "refuses", file), "utf8").split("\n");
      const fault = /Fault: '(\w+)'/.exec(source[0] ?? "")?.[1];
      const at = source.findIndex((l) => l.includes("← the fault")) + 1;
      expect([fault !== undefined, at > 0], "the fixture names its fault and marks its line").toEqual([true, true]);
      // Where the fault is written as a key on its line (`amount: "1"`), when it is: an error there is the fault's own.
      const written = source[at - 1]!.search(new RegExp(`\\b${fault!}:`)) + 1;
      const errors = errorsIn(`refuses/${file}`);
      expect(errors.filter((d) => d.line !== at).map(shown), "an error away from the fault means the file is not one fault").toEqual([]);
      expect(errors.length, `refuses/${file}'s fault must be a type error`).toBeGreaterThan(0);
      expect(
        errors.some((d) => new RegExp(`'${fault!}'|\\b${fault!}\\b`).test(d.text) || (written > 0 && d.column === written)),
        `one error must name '${fault!}' or point at it: ${errors.map(shown).join(" | ")}`,
      ).toBe(true);
    });
  }
});
