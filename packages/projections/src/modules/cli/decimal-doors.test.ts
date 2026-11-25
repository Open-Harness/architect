// #981's three decimal gaps at the generated CLI, each judged by running what `renderCli` writes: `output.ts`, and a
// command rendered for an operation whose payload holds `Blueprint.decimal({ places: 2 })`. They sit in a scratch project
// beside stand-ins for what they import from the API (the real `Blueprint.operation`) and the SDK (`Errors`, shaped as a
// generated project's `generated/api/src/errors.ts` is, and a `rate.quote` that records what it is given).
//
//  1. A decimal inside an `Option` in a `--json` answer prints as its text, at any depth inside it (an object, a list,
//     another `Option`). The `Option` keeps its own `toJSON` shape and key order, as
//     `json-keeps-tojson.test.ts` checks for an `Option` of a number: `Option.some(1.50)` prints
//     `{"_id":"Option","_tag":"Some","value":"1.50"}`, and `Option.none()` prints `{"_id":"Option","_tag":"None"}` as it
//     does today. A bare decimal is the control. Red on main: the decimal comes out as `{"_id":"BigDecimal",...}`.
//  2. The CLI refuses a decimal flag with more places than its field declares before it calls the SDK: a `SchemaError`
//     naming the flag's field, exit 2: `1.230` too, since it is written with three places, and any exponent. Exactly the
//     declared places, and fewer, reach the SDK as written, its digits and places kept (`1.50` is never `1.5`). A guard.
//  3. The loop that writes a declared refusal's fields (`said` in `output.ts`) writes a decimal field as its text, at any
//     depth, directly in a list and inside an `Option` (as item 1 has it), keeps each other value's own `toJSON` (an `HttpClientRequest`'s redacts its bearer
//     token), writes only the declared fields the server sent, and leaves out a field the refusal does not declare,
//     whatever its name (`constructor` too: red on main, which looks a name up through the object's prototype), with
//     `--json` and without. The rest is a guard.
//
// Written by #981's checks author. The red cases (item 1, and item 3's `constructor`) are listed in packages/projections/expected-failing/decimal-doors.txt (G11).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { BigDecimal, type Context, Effect, FileSystem, Layer, Option, Path, Stdio, Terminal } from "effect";
import { Command } from "effect/cli";
import { HttpClientRequest } from "effect/http";
import { ChildProcessSpawner } from "effect/process";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";

// Under the package, so `effect` and `orthograph` resolve from the scratch project the way generated code's imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/decimal-doors");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const model = {
  things: {},
  operations: {
    "rate.quote": { kind: "operation", thing: "rate", verb: "quote", description: "Quote a rate.", payload: { amount: { value: { type: "decimal", places: 2 }, optional: false } } },
  },
} as unknown as Model;

// What the project imports from the API and the SDK. The refusals are as a generated project declares them: a row each in
// `refusals`, its code in `codes`, and its declared fields in `declared` (a refusal that is the runtime's own has none there).
const API = `import { Blueprint } from "orthograph";
const Rate = Blueprint.thing({ description: "A rate.", fields: { id: Blueprint.id("rt"), amount: Blueprint.decimal({ places: 2 }) } });
export const declaration = Blueprint.operation(Rate, { description: "Quote a rate.", payload: { amount: Rate.fields.amount }, answer: { amount: Rate.fields.amount }, allowed: [Blueprint.anyone] });
`;
const SDK = `import { Effect } from "effect";
export const Errors = {
  refusals: { RateTooHigh: { code: "BK-001", exit: 41, status: 422 }, RateFetchFailed: { code: "BK-002", exit: 42, status: 502 }, Odd: { code: "BK-003", exit: 43, status: 422 }, NotAllowed: { code: "AR-001", exit: 3, status: 403 } },
  codes: { RateTooHigh: "BK-001", RateFetchFailed: "BK-002", Odd: "BK-003", NotAllowed: "AR-001" },
  declared: { RateTooHigh: { fields: { rate: {}, limit: {}, range: {}, count: {} } }, RateFetchFailed: { fields: { request: {} } }, Odd: { fields: { valueOf: {} } } },
};
export const given: Array<unknown> = [];
export const rate = { quote: (payload: { readonly amount: unknown }) => Effect.sync(() => { given.push(payload); return { amount: payload.amount }; }) };
`;

type ExitCodeKey = Context.Key<unknown, { readonly set: (code: number) => Effect.Effect<void> }>;
type Project = {
  readonly answer: (json: boolean) => <A extends object, E>(effect: Effect.Effect<A, E>) => Effect.Effect<unknown, never, unknown>;
  readonly ExitCode: ExitCodeKey;
  readonly quote: Command.Command<"quote", unknown, unknown, unknown, unknown>;
  readonly given: Array<unknown>;
};
const loadProject = async (): Promise<Project> => {
  const files = renderCli(model, "books");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  const write = (path: string, content: string) => {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  for (const path of ["generated/cli/src/output.ts", "generated/cli/src/rate/quote.ts"]) {
    const file = files.find((f) => f.path === path);
    if (file === undefined) throw new Error(`renderCli wrote no ${path}`);
    write(path, file.content);
  }
  write("generated/api/src/rate/quote.ts", API);
  write("generated/sdk/src/index.ts", SDK);
  const output = (await import(join(root, "generated/cli/src/output.ts"))) as Pick<Project, "answer" | "ExitCode">;
  const command = (await import(join(root, "generated/cli/src/rate/quote.ts"))) as Pick<Project, "quote">;
  const sdk = (await import(join(root, "generated/sdk/src/index.ts"))) as Pick<Project, "given">;
  return { ...output, ...command, ...sdk };
};

/** What the CLI writes, stdout and stderr apart, and the exit code it sets. */
const capture = async (run: (exit: Layer.Layer<never>) => Effect.Effect<unknown, unknown>, ExitCode: ExitCodeKey) => {
  const out: Array<string> = [];
  const err: Array<string> = [];
  const keep = (to: Array<string>) => (...args: Array<unknown>) => void to.push(args.map(String).join(" "));
  const log = vi.spyOn(console, "log").mockImplementation(keep(out));
  const error = vi.spyOn(console, "error").mockImplementation(keep(err));
  let code: number | undefined;
  try {
    const exit = Layer.succeed(ExitCode as never, { set: (c: number) => Effect.sync(() => void (code = c)) } as never) as Layer.Layer<never>;
    await Effect.runPromise(Effect.exit(run(exit)) as Effect.Effect<unknown>);
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
  return { stdout: out.join("\n"), stderr: err.join("\n"), code };
};

const printed = async (json: boolean, effect: Effect.Effect<object, unknown>) => {
  const { answer, ExitCode } = await loadProject();
  return capture((exit) => (answer(json)(effect) as Effect.Effect<unknown>).pipe(Effect.provide(exit)), ExitCode);
};

// The environment a command runs in, as effect/cli's own tests make it: nothing on disk, no terminal, no child process.
const CliTest = Layer.mergeAll(
  FileSystem.layerNoop({}),
  Path.layer,
  Stdio.layerTest({}),
  Layer.succeed(Terminal.Terminal, Terminal.make({
    columns: Effect.succeed(80), rows: Effect.succeed(24), size: Effect.die("unused"),
    readInput: Effect.die("unused"), readLine: Effect.die("unused"), display: () => Effect.void,
  })),
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, ChildProcessSpawner.make(() => Effect.die("unused"))),
);
/** `books rate quote <args>`, as the rendered command parses and runs it. */
const ran = async (args: ReadonlyArray<string>) => {
  const project = await loadProject();
  const said = await capture((exit) => (Command.runWith(project.quote as never, { version: "0.0.0" })(args) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(Layer.merge(CliTest, exit))), project.ExitCode);
  return { ...said, given: project.given };
};

const d = (text: string) => BigDecimal.fromStringUnsafe(text);

describe("1. A decimal inside an Option prints as its text in a --json answer", () => {
  it("a bare decimal prints as its text (the control)", async () => {
    expect(JSON.parse((await printed(true, Effect.succeed({ rate: d("1.50") }))).stdout)).toEqual({ rate: "1.50" });
  });

  it("an Option of a number keeps its own toJSON (the control)", async () => {
    expect(JSON.parse((await printed(true, Effect.succeed({ due: Option.some(3) }))).stdout)).toEqual({ due: { _id: "Option", _tag: "Some", value: 3 } });
  });

  it("Option.some of a decimal prints the decimal's text inside the Option's own shape", async () => {
    expect(JSON.parse((await printed(true, Effect.succeed({ rate: Option.some(d("1.50")) }))).stdout)).toEqual({ rate: { _id: "Option", _tag: "Some", value: "1.50" } });
  });

  it("Option.some of a decimal prints as its text with no exponent, in a list's items and beside a bare one", async () => {
    const out = JSON.parse((await printed(true, Effect.succeed({ items: [{ id: "rt_1", rate: Option.some(d("10000000000000000")) }, { id: "rt_2", rate: Option.some(d("-0.00000000000000001")) }], bare: d("2.5") }))).stdout) as unknown;
    expect(out).toEqual({
      items: [{ id: "rt_1", rate: { _id: "Option", _tag: "Some", value: "10000000000000000" } }, { id: "rt_2", rate: { _id: "Option", _tag: "Some", value: "-0.00000000000000001" } }],
      bare: "2.5",
    });
  });

  it("a decimal anywhere inside an Option prints as its text: in an object, in a list, in an Option", async () => {
    const out = JSON.parse((await printed(true, Effect.succeed({
      quote: Option.some({ rate: d("1.50"), id: "rt_1" }), rates: Option.some([d("0.10"), d("2.5")]), twice: Option.some(Option.some(d("7.00"))),
      listed: [Option.some(d("1.50"))],
    }))).stdout) as unknown;
    expect(out).toEqual({
      quote: { _id: "Option", _tag: "Some", value: { rate: "1.50", id: "rt_1" } },
      rates: { _id: "Option", _tag: "Some", value: ["0.10", "2.5"] },
      twice: { _id: "Option", _tag: "Some", value: { _id: "Option", _tag: "Some", value: "7.00" } },
      listed: [{ _id: "Option", _tag: "Some", value: "1.50" }],
    });
  });

  it("prints exactly the text an Option's own toJSON would, its keys in their order", async () => {
    expect((await printed(true, Effect.succeed({ rate: Option.some(d("1.50")) }))).stdout).toBe('{"rate":{"_id":"Option","_tag":"Some","value":"1.50"}}');
  });

  it("a decimal directly in a list, and a plain object that only looks like a decimal, print as they are (a guard)", async () => {
    const lookalike = { _id: "BigDecimal", value: "150", scale: 2 };
    expect(JSON.parse((await printed(true, Effect.succeed({ rates: [d("1.50"), d("0.10")], lookalike, held: Option.some(lookalike) }))).stdout))
      .toEqual({ rates: ["1.50", "0.10"], lookalike, held: { _id: "Option", _tag: "Some", value: lookalike } });
  });

  it("Option.none() prints as an Option's toJSON makes it, beside a Some", async () => {
    const out = JSON.parse((await printed(true, Effect.succeed({ rate: Option.none(), paid: Option.some(d("0.10")) }))).stdout) as unknown;
    expect(out).toEqual({ rate: { _id: "Option", _tag: "None" }, paid: { _id: "Option", _tag: "Some", value: "0.10" } });
  });
});

describe("2. The CLI refuses a decimal flag with more places than its field holds, before calling the SDK", () => {
  for (const text of ["1.234", "0.001", "-12.345", "1.230", "1.2e-5"]) {
    it(`--amount ${text} for a field of 2 places: a SchemaError naming the field, exit 2, the SDK never called`, async () => {
      const r = await ran(["--amount", text]);
      expect(r.stderr).toMatch(/^SchemaError: /);
      expect(r.stderr, "it names the field").toMatch(/\bamount\b/);
      expect(r.code).toBe(2);
      expect(r.given, "the SDK was never called").toEqual([]);
      expect(r.stdout).toBe("");
    });
  }

  for (const text of ["1.5e1", "1e-2", "1.23e0"]) {
    it(`--amount ${text}: an exponent is refused, though the number it makes would fit (a SchemaError, exit 2, the SDK never called)`, async () => {
      const r = await ran(["--amount", text]);
      expect([r.stderr.startsWith("SchemaError: "), r.code, r.given]).toEqual([true, 2, []]);
    });
  }

  for (const text of ["1.23", "1.2", "1", "-0.5", "1.50", "1.00", "0.10", "0.00", "12345678901234567.89"]) {
    it(`--amount ${text}: reaches the SDK as written, digits and places, and is printed back (the control)`, async () => {
      const r = await ran(["--amount", text]);
      expect(r.stderr).toBe("");
      // the decimal written, as its digits and its places: 1.50 is 150 at 2 places, never 15 at 1
      const written = BigDecimal.fromStringUnsafe(text);
      expect(r.given.map((p) => { const a = (p as { readonly amount: BigDecimal.BigDecimal }).amount; return [String(a.value), a.scale]; })).toEqual([[String(written.value), written.scale]]);
      expect(r.stdout).toBe(text);
    });
  }
});

describe("3. A declared refusal's fields are written by the CLI, a decimal as its text and a token never", () => {
  const TOKEN = "sk_live_7f3kQ9zT";
  const request = HttpClientRequest.get("https://books.invalid/v1/rates").pipe(HttpClientRequest.bearerToken(TOKEN));
  const tooHigh = { _tag: "RateTooHigh", code: "BK-001", rate: d("1.50"), limit: d("10000000000000000"), range: { low: d("0.10"), high: d("-0.00000000000000001") }, count: 7n, note: "undeclared" };
  // Read off the declaration and the values above: the code, the name, each declared field in the order sent, the undeclared one left out.
  const LINE = '[BK-001] RateTooHigh { rate: 1.50, limit: 10000000000000000, range: {"low":"0.10","high":"-0.00000000000000001"}, count: 7 }';

  for (const json of [true, false]) {
    it(`a refusal with decimal fields, at the top and inside an object, with${json ? "" : "out"} --json`, async () => {
      const r = await printed(json, Effect.fail(tooHigh));
      expect(r.stderr).toBe(LINE);
      expect(r.stdout).toBe("");
      expect(r.code).toBe(41);
    });

    it(`a refusal holding a request with a bearer header, with${json ? "" : "out"} --json: the request as its own toJSON makes it, the token never`, async () => {
      const r = await printed(json, Effect.fail({ _tag: "RateFetchFailed", code: "BK-002", request }));
      expect(r.stderr).not.toContain(TOKEN);
      expect(r.stderr).toBe(`[BK-002] RateFetchFailed { request: ${JSON.stringify(request)} }`);
      expect(r.stderr, "the request is there, redacted").toContain("books.invalid");
      expect(r.code).toBe(42);
    });
  }

  it("a refusal that carries only some of its declared fields prints only those the server sent", async () => {
    const r = await printed(true, Effect.fail({ _tag: "RateTooHigh", code: "BK-001", rate: d("1.50") }));
    expect(r.stderr).toBe("[BK-001] RateTooHigh { rate: 1.50 }");
  });

  it("a decimal at any depth of a refusal's field, and directly in a list, prints as its text", async () => {
    const r = await printed(true, Effect.fail({ _tag: "RateTooHigh", code: "BK-001", range: { low: { at: d("0.10") }, steps: [d("1.50"), d("2.5")] } }));
    expect(r.stderr).toBe('[BK-001] RateTooHigh { range: {"low":{"at":"0.10"},"steps":["1.50","2.5"]} }');
  });

  it("a decimal inside an Option in a refusal's field prints as its text, the Option keeping its shape", async () => {
    const r = await printed(true, Effect.fail({ _tag: "RateTooHigh", code: "BK-001", rate: Option.some(d("1.50")) }));
    expect(r.stderr).toBe('[BK-001] RateTooHigh { rate: {"_id":"Option","_tag":"Some","value":"1.50"} }');
  });

  it("a declared field named like an Object.prototype member prints like any other (a guard)", async () => {
    const r = await printed(true, Effect.fail({ _tag: "Odd", code: "BK-003", valueOf: d("1.50") }));
    expect([r.stderr, r.code]).toEqual(["[BK-003] Odd { valueOf: 1.50 }", 43]);
  });

  it("a field a refusal does not declare is left out, whatever its name", async () => {
    const r = await printed(true, Effect.fail({ _tag: "RateTooHigh", code: "BK-001", rate: d("1.50"), constructor: "x", toString: "y", hasOwnProperty: "z" }));
    expect(r.stderr).toBe("[BK-001] RateTooHigh { rate: 1.50 }");
  });

  it("a refusal the runtime makes declares no fields, so every field the server sent prints (the control)", async () => {
    const r = await printed(true, Effect.fail({ _tag: "NotAllowed", code: "AR-001", rate: d("1.50") }));
    expect([r.stderr, r.code]).toEqual(["[AR-001] NotAllowed { rate: 1.50 }", 3]);
  });
});
