// Snag #1044: `Records.insert` takes a `Blueprint.optional` field as optional. A handler leaves an unset one out with no cast; leaving out a required
// field, passing an optional one as `undefined`, a wrong type, an extra field or `state` are still type errors, for every kind of value, with or without
// a state, and in `update` too. Written by the checks author; the builder never edits this file or test/fixtures/insert-optional-types/.
//
// The type is judged by the compiler itself: one tsc run over the fixture. `accepts.ts` must compile clean. Each file in `refuses/` holds one statement,
// marked `← the fault`, that is a shape `accepts.ts` holds with exactly one fault, named in its header (`Fault: 'reportType'`). Its errors must all be on
// that line, and one of them must name the field or point at it: so the error is that fault's, not some other.
// The runtime half: a unit holds back and commits an insert as given: absent optional keys stay absent, set ones (falsy ones too) are kept, for any thing.
// D1's half is host-cloudflare's store.test.ts, "stores a row with no optional value".
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store, type Instance } from "./types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const fixture = join(repo, "packages/language-effect/test/fixtures/insert-optional-types");

type Diagnostic = { readonly file: string; readonly line: number; readonly column: number; readonly text: string };
let compiled: ReadonlyArray<Diagnostic> | undefined;
const compile = (): ReadonlyArray<Diagnostic> => (compiled ??= (() => {
  // `--pretty false`: with FORCE_COLOR (CI) tsc colours "error" and "TS" apart, and a filter on "error TS" would find nothing.
  const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
  const found: Array<Diagnostic> = [];
  for (const l of result.stdout.split("\n")) {
    const m = /^(.+?)\((\d+),(\d+)\): error TS\d+: (.*)$/.exec(l);
    if (m) found.push({ file: resolve(repo, m[1]!), line: Number(m[2]), column: Number(m[3]), text: m[4]! });
    // An indented line goes on explaining the error above it ("Types of property 'x' are incompatible").
    else if (/^\s+\S/.test(l) && found.length > 0) found[found.length - 1] = { ...found[found.length - 1]!, text: `${found[found.length - 1]!.text}\n${l}` };
  }
  // tsc exits 1 or 2 when it reports errors; one that dies, or is killed, without an error line is no answer, and must not read as a clean compile.
  if (result.status !== 0 && found.length === 0) throw new Error(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
  if (result.status === 0 && found.length > 0) throw new Error("tsc exited 0 but printed errors");
  return found;
})());
const errorsIn = (file: string) => compile().filter((d) => d.file === join(fixture, file));
const shown = (d: Diagnostic) => `${String(d.line)}:${String(d.column)}: ${d.text.slice(0, 400)}`;

describe("Records.insert's fields: a Blueprint.optional field may be left out (snag #1044)", () => {
  it("compiles with no cast: every optional kind left out, set, or falsy; a thing with no optional field; no state; updates of any subset", { timeout: 60_000 }, () => {
    expect(errorsIn("accepts.ts").map(shown), "accepts.ts must compile: an optional field is one a handler may leave out").toEqual([]);
  });

  it("the fixture's own things and ids compile", { timeout: 60_000 }, () => {
    expect(errorsIn("thing.ts").map(shown)).toEqual([]);
  });

  const refusals = readdirSync(join(fixture, "refuses")).filter((f) => f.endsWith(".ts")).sort();
  it("has every refusal the table names", () => {
    expect(refusals).toEqual([
      "company-missing-name.ts", "extra-field.ts", "gauge-missing-required.ts", "gauge-optional-bool-undefined.ts", "gauge-optional-id-wrong.ts",
      "gauge-optional-uint-wrong.ts", "missing-id.ts", "missing-required-link.ts", "missing-required-value.ts", "no-state-extra-field.ts",
      "optional-link-undefined.ts", "optional-link-wrong-type.ts", "optional-undefined.ts", "optional-wrong-value.ts", "required-link-wrong-type.ts",
      "required-wrong-value.ts", "state-in-fields.ts", "update-extra-field.ts", "update-optional-undefined.ts", "update-required-undefined.ts",
      "update-wrong-value.ts",
    ]);
  });
  for (const file of refusals) {
    it(`refuses/${file}: its one fault is a type error, there and nowhere else`, { timeout: 60_000 }, () => {
      const source = readFileSync(join(fixture, "refuses", file), "utf8").split("\n");
      const field = /Fault: '(\w+)'/.exec(source[0] ?? "")?.[1];
      const at = source.findIndex((l) => l.includes("← the fault")) + 1;
      expect([field !== undefined, at > 0], "the fixture names its fault and marks its line").toEqual([true, true]);
      // Where the field is written on the faulty line, when it is: an error there is the field's own.
      const written = source[at - 1]!.search(new RegExp(`\\b${field!}:`)) + 1;
      const errors = errorsIn(`refuses/${file}`);
      expect(errors.filter((d) => d.line !== at).map(shown), "an error away from the fault means the file is not one fault").toEqual([]);
      expect(errors.length, `refuses/${file}'s fault must be a type error`).toBeGreaterThan(0);
      // tsc names a missing field as `Property 'x' is missing`, or, when several are, in the list ending "is missing the following properties from type '…': x, y".
      const listed = (d: Diagnostic) => /is missing the following properties from type/.test(d.text) && (d.text.split("\n")[0]!.split("': ").pop() ?? "").split(/, | and /).includes(field!);
      expect(
        errors.some((d) => d.text.includes(`'${field!}'`) || listed(d) || (written > 0 && d.column === written)),
        `one error must name '${field!}' or point at it: ${errors.map(shown).join(" | ")}`,
      ).toBe(true);
    });
  }
});

describe("an insert without its optional fields, at run time (snag #1044)", () => {
  const Company = Blueprint.thing({ description: "A company.", code: "CO", fields: { id: Blueprint.id("co"), name: Blueprint.text({ max: 40 }) } });
  const Account = Blueprint.thing({
    description: "An account.",
    code: "AC",
    fields: {
      id: Blueprint.id("acc"),
      company: Company.fields.id,
      accountName: Blueprint.text({ max: 40 }),
      parentAccount: Blueprint.optional(Blueprint.link(() => Company.fields.id)),
      reportType: Blueprint.oneOf(["Balance Sheet", "Profit and Loss"]),
      accountType: Blueprint.optional(Blueprint.oneOf(["Bank", "Cash", "Tax"])),
    },
  });
  const Gauge = Blueprint.thing({
    description: "A gauge.",
    code: "GA",
    fields: {
      id: Blueprint.id("gau"),
      label: Blueprint.text({ max: 40 }),
      count: Blueprint.optional(Blueprint.uint(64)),
      on: Blueprint.optional(Blueprint.bool()),
      shape: Blueprint.optional(Blueprint.value(Schema.Struct({ a: Schema.Number }))),
    },
  });
  // Typed loosely so this file compiles before the build: the type is judged above, by tsc over the fixture.
  type LooseInsert = (thing: Thing, fields: Instance, state?: string) => Effect.Effect<void>;

  it("holds back, commits and reads back each row as given: absent optional keys absent, set ones kept, falsy ones too, for every thing", async () => {
    const memory = storeMemory();
    const result = await Effect.runPromise(Effect.flatMap(Store, (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        const insert = unit.records.insert as LooseInsert;
        // The handler's own object, changed after the insert: the held-back write is what it was at the insert.
        const mine: Record<string, unknown> = { id: "acc_1", company: "co_1", accountName: "Assets", reportType: "Balance Sheet" };
        yield* insert(Account, mine, "group");
        mine["accountName"] = "changed";
        mine["accountType"] = "Bank";
        yield* insert(Account, { id: "acc_2", company: "co_1", accountName: "Bank", parentAccount: "acc_1", reportType: "Balance Sheet" }, "ledger");
        yield* insert(Gauge, { id: "gau_1", label: "g" });
        yield* insert(Gauge, { id: "gau_2", label: "", count: 0n, on: false, shape: { a: 0 } });
        const seen = yield* unit.records.find(Account, "acc_1");
        const writes = yield* unit.writes;
        const committed = yield* store.commit({ writes, entries: [] });
        const found = yield* Effect.forEach([[Account, "acc_1"], [Account, "acc_2"], [Gauge, "gau_1"], [Gauge, "gau_2"]] as const, ([t, i]) => store.find(t, i));
        return { seen, writes, committed, found: found.map((f) => f?.instance) };
      })).pipe(Effect.provide(memory.layer)));
    expect(result.writes.map((w) => (w.kind === "insert" ? Object.keys(w.fields).sort() : []))).toEqual([
      ["accountName", "company", "id", "reportType"],
      ["accountName", "company", "id", "parentAccount", "reportType"],
      ["id", "label"],
      ["count", "id", "label", "on", "shape"],
    ]);
    expect(result.seen).toStrictEqual({ id: "acc_1", company: "co_1", accountName: "Assets", reportType: "Balance Sheet", state: "group" });
    expect(result.committed).toBe("committed");
    expect(result.found).toStrictEqual([
      { id: "acc_1", company: "co_1", accountName: "Assets", reportType: "Balance Sheet", state: "group" },
      { id: "acc_2", company: "co_1", accountName: "Bank", parentAccount: "acc_1", reportType: "Balance Sheet", state: "ledger" },
      { id: "gau_1", label: "g" },
      { id: "gau_2", label: "", count: 0n, on: false, shape: { a: 0 } },
    ]);
  });
});
