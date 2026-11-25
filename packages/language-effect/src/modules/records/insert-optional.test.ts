// Snag #1044: `Records.insert` takes a `Blueprint.optional` field as optional. A handler leaves an unset one out with no cast, and leaving out a required
// field (or passing an optional one as `undefined`, or a wrong value) is still a type error. Written by the checks author; the builder never edits this file
// or test/fixtures/insert-optional-types/.
//
// The type is judged by the compiler itself: one tsc run over the fixture. `accepts.ts` must compile clean. Each file in `refuses/` is one of the shapes
// `accepts.ts` holds with exactly one fault, and must have an error on its insert line and nowhere else; so its error can only come from that fault.
// The runtime half: a unit holds back and commits an insert with the optional keys absent, never filled in (D1's half is host-cloudflare's store.test.ts,
// "stores a row with no optional value").
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint, type Thing } from "orthograph";
import { storeMemory, Unit } from "./service.ts";
import { Store, type Instance } from "./types.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const fixture = join(repo, "packages/language-effect/test/fixtures/insert-optional-types");
// The line of each refusal file that holds its one faulty insert.
const insertLine = 10;

type Diagnostic = { readonly file: string; readonly line: number; readonly text: string };
let compiled: ReadonlyArray<Diagnostic> | undefined;
const compile = (): ReadonlyArray<Diagnostic> => (compiled ??= (() => {
  // `--pretty false`: with FORCE_COLOR (CI) tsc colours "error" and "TS" apart, and a filter on "error TS" would find nothing.
  const result = spawnSync(join(repo, "node_modules/.bin/tsc"), ["--pretty", "false", "-p", join(fixture, "tsconfig.json")], { cwd: repo, encoding: "utf8" });
  const found = result.stdout.split("\n").flatMap((l) => {
    const m = /^(.+?)\((\d+),\d+\): error TS\d+: (.*)$/.exec(l);
    return m ? [{ file: resolve(repo, m[1]!), line: Number(m[2]), text: m[3]! }] : [];
  });
  // tsc exits 1 or 2 when it reports errors; one that dies, or is killed, without an error line is no answer, and must not read as a clean compile.
  if (result.status !== 0 && found.length === 0) throw new Error(`tsc exited ${String(result.status)} with no error line: ${result.stdout}${result.stderr}`);
  if (result.status === 0 && found.length > 0) throw new Error("tsc exited 0 but printed errors");
  return found;
})());
const errorsIn = (file: string) => compile().filter((d) => d.file === join(fixture, file)).map((d) => `${String(d.line)}: ${d.text.slice(0, 300)}`);

describe("Records.insert's fields: a Blueprint.optional field may be left out (snag #1044)", () => {
  it("compiles with no cast: an optional value and an optional link each left out, set, or both; an update of one alone", { timeout: 60_000 }, () => {
    expect(errorsIn("accepts.ts"), "accepts.ts must compile: an optional field is one a handler may leave out").toEqual([]);
  });

  it("the fixture's own Account and ids compile", { timeout: 60_000 }, () => {
    expect(errorsIn("thing.ts")).toEqual([]);
  });

  const refusals = readdirSync(join(fixture, "refuses")).filter((f) => f.endsWith(".ts")).sort();
  it("has every refusal the table names", () => {
    expect(refusals).toEqual([
      "extra-field.ts", "missing-id.ts", "missing-required-link.ts", "missing-required-value.ts", "optional-link-undefined.ts",
      "optional-link-wrong-type.ts", "optional-undefined.ts", "optional-wrong-value.ts", "state-in-fields.ts",
    ]);
  });
  for (const file of refusals) {
    it(`refuses/${file} is a type error on its insert, and nowhere else`, { timeout: 60_000 }, () => {
      const errors = errorsIn(`refuses/${file}`);
      expect(errors.filter((e) => !e.startsWith(`${String(insertLine)}: `)), "an error away from the insert means the file is not one fault").toEqual([]);
      expect(errors.length, `refuses/${file}'s one fault must be a type error`).toBeGreaterThan(0);
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
  // Typed loosely so this file compiles before the build: the type is judged above, by tsc over the fixture.
  type LooseInsert = (thing: Thing, fields: Instance, state?: string) => Effect.Effect<void>;

  it("holds back, commits and reads back the row with the optional keys absent, and a set one kept", async () => {
    const memory = storeMemory();
    const result = await Effect.runPromise(Effect.flatMap(Store, (store) =>
      Effect.gen(function* () {
        const unit = yield* Unit.make(store);
        const insert = unit.records.insert as LooseInsert;
        yield* insert(Account, { id: "acc_1", company: "co_1", accountName: "Assets", reportType: "Balance Sheet" }, "group");
        yield* insert(Account, { id: "acc_2", company: "co_1", accountName: "Bank", parentAccount: "acc_1", reportType: "Balance Sheet" }, "ledger");
        const seen = yield* unit.records.find(Account, "acc_1");
        const writes = yield* unit.writes;
        const committed = yield* store.commit({ writes, entries: [] });
        return { seen, writes, committed, one: yield* store.find(Account, "acc_1"), two: yield* store.find(Account, "acc_2") };
      })).pipe(Effect.provide(memory.layer)));
    expect(result.writes.map((w) => (w.kind === "insert" ? Object.keys(w.fields).sort() : []))).toEqual([
      ["accountName", "company", "id", "reportType"],
      ["accountName", "company", "id", "parentAccount", "reportType"],
    ]);
    expect(result.seen).toStrictEqual({ id: "acc_1", company: "co_1", accountName: "Assets", reportType: "Balance Sheet", state: "group" });
    expect(result.committed).toBe("committed");
    expect(result.one?.instance).toStrictEqual({ id: "acc_1", company: "co_1", accountName: "Assets", reportType: "Balance Sheet", state: "group" });
    expect(result.one?.instance).not.toHaveProperty("parentAccount");
    expect(result.one?.instance).not.toHaveProperty("accountType");
    expect(result.two?.instance).toStrictEqual({ id: "acc_2", company: "co_1", accountName: "Bank", parentAccount: "acc_1", reportType: "Balance Sheet", state: "ledger" });
  });
});
