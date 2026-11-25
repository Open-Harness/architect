// #999's two gaps in the generated CLI's output, older than #981, judged by running the `output.ts` that `renderCli` writes
// in a scratch project, beside a stand-in for the SDK's `Errors` shaped as a generated project's is (`decimal-doors.test.ts`
// builds the same project for #981).
//
//  1. Without `--json`, a one-field answer whose value is `Option.some(decimal)` prints the decimal's text, as a bare decimal
//     does: `1.50`, its places kept and no exponent, never Effect's own `some(BigDecimal(1.5))`. Red on main. A bare decimal,
//     and `--json` (#981's shape), are the controls. Not judged: how a `None`, or an `Option` of anything else, prints plain.
//  2. A failure whose tag is a name on every object's prototype (`constructor`, `toString`, `hasOwnProperty`, `valueOf`,
//     `__proto__`) is not one of the project's refusals: it prints as any undeclared failure does, `<tag>: <fields as JSON>`,
//     with no code, and exits 1. Red on main, which looks the tag up with `in`. A declared refusal (its code and exit), the
//     runtime's own `NotAllowed`, an undeclared tag and `SchemaError` (exit 2) are the controls.
//
// The SDK's half of #999 (its `InvalidPayload` names every refused field) is `sdk/invalid-payload-fields.test.ts`.
// Written by #999's checks author. The red cases are listed in packages/projections/expected-failing/plain-and-tags.txt (G11).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BigDecimal, type Context, Effect, Layer, Option } from "effect";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";

// Under the package, so `effect` and `orthograph` resolve from the scratch project the way generated code's imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/plain-and-tags");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const SDK = `export const Errors = {
  refusals: { RateTooHigh: { code: "BK-001", exit: 41, status: 422 }, NotAllowed: { code: "AR-001", exit: 3, status: 403 } },
  codes: { RateTooHigh: "BK-001", NotAllowed: "AR-001" },
  declared: { RateTooHigh: { fields: { rate: {} } } },
};
`;

type ExitCodeKey = Context.Key<unknown, { readonly set: (code: number) => Effect.Effect<void> }>;
type Output = { readonly answer: (json: boolean) => <A extends object, E>(effect: Effect.Effect<A, E>) => Effect.Effect<unknown, never, unknown>; readonly ExitCode: ExitCodeKey };
let loaded: Promise<Output> | undefined;
const load = (): Promise<Output> => (loaded ??= (async () => {
  const file = renderCli({ things: {}, operations: {} } as unknown as Model, "books").find((f) => f.path === "generated/cli/src/output.ts");
  if (file === undefined) throw new Error("renderCli wrote no output.ts");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  for (const [path, content] of [["generated/cli/src/output.ts", file.content], ["generated/sdk/src/index.ts", SDK]] as const) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return (await import(join(root, "generated/cli/src/output.ts"))) as Output;
})());

/** What the CLI writes for an answer (or a failure), stdout and stderr apart, and the exit code it sets. */
const printed = async (json: boolean, effect: Effect.Effect<object, unknown>) => {
  const { answer, ExitCode } = await load();
  const out: Array<string> = [];
  const err: Array<string> = [];
  const keep = (to: Array<string>) => (...args: Array<unknown>) => void to.push(args.map(String).join(" "));
  const log = vi.spyOn(console, "log").mockImplementation(keep(out));
  const error = vi.spyOn(console, "error").mockImplementation(keep(err));
  let code: number | undefined;
  try {
    const exit = Layer.succeed(ExitCode as never, { set: (c: number) => Effect.sync(() => void (code = c)) } as never) as Layer.Layer<never>;
    await Effect.runPromise(Effect.exit((answer(json)(effect) as Effect.Effect<unknown>).pipe(Effect.provide(exit))));
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
  return { stdout: out.join("\n"), stderr: err.join("\n"), code };
};
const d = (text: string) => BigDecimal.fromStringUnsafe(text);

describe("1. Without --json, a one-field answer holding Option.some(decimal) prints the decimal's text", () => {
  for (const text of ["1.50", "0.10", "10000000000000000", "-0.00000000000000001", "7"]) {
    it(`Option.some(${text}) prints ${text}`, async () => {
      expect((await printed(false, Effect.succeed({ rate: Option.some(d(text)) }))).stdout).toBe(text);
    });
  }

  it("a bare decimal prints its text (the control)", async () => {
    expect((await printed(false, Effect.succeed({ rate: d("1.50") }))).stdout).toBe("1.50");
  });

  it("with --json, it keeps #981's shape (the control)", async () => {
    expect((await printed(true, Effect.succeed({ rate: Option.some(d("1.50")) }))).stdout).toBe('{"rate":{"_id":"Option","_tag":"Some","value":"1.50"}}');
  });
});

const PROTOTYPE = ["constructor", "toString", "hasOwnProperty", "valueOf", "__proto__", "isPrototypeOf"];

describe("2. A failure tagged with a prototype's name is not a refusal: it prints as an undeclared failure and exits 1", () => {
  for (const tag of PROTOTYPE) {
    for (const json of [false, true]) {
      it(`${tag}${json ? " with --json" : ""}: \`${tag}: {"why":"s999"}\`, exit 1`, async () => {
        const r = await printed(json, Effect.fail({ _tag: tag, why: "s999" }));
        expect([r.stderr, r.code]).toEqual([`${tag}: {"why":"s999"}`, 1]);
        expect(r.stdout).toBe("");
      });
    }
  }
});

describe("2. The controls", () => {
  it("a declared refusal prints its code, name and declared fields, and exits with its own exit", async () => {
    const r = await printed(false, Effect.fail({ _tag: "RateTooHigh", code: "BK-001", rate: d("1.50") }));
    expect([r.stderr, r.code]).toEqual(["[BK-001] RateTooHigh { rate: 1.50 }", 41]);
  });

  it("the runtime's own NotAllowed prints its code and exits 3", async () => {
    const r = await printed(false, Effect.fail({ _tag: "NotAllowed", code: "AR-001" }));
    expect([r.stderr, r.code]).toEqual(["[AR-001] NotAllowed", 3]);
  });

  it("a tag the project does not declare prints as JSON and exits 1", async () => {
    const r = await printed(false, Effect.fail({ _tag: "NotSignedIn", why: "s999" }));
    expect([r.stderr, r.code]).toEqual(['NotSignedIn: {"why":"s999"}', 1]);
  });

  it("a SchemaError prints its message and exits 2", async () => {
    const r = await printed(false, Effect.fail({ _tag: "SchemaError", message: "amount is missing" }));
    expect([r.stderr, r.code]).toEqual(["SchemaError: amount is missing", 2]);
  });
});
