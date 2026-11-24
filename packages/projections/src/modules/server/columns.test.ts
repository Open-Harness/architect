// What a column holds (Goal 17 slice 7, issue #742 items 1 to 3): a field that may have no value is a column that may be NULL, a
// boolean is INTEGER so it round-trips, and every other field is as it was. The model is acme's with fields of each form added.
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldModel, Model } from "@orthograph/compiler";
import { renderMigration } from "./internal/worker-config.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const model = JSON.parse(execFileSync(process.execPath, [join(repo, "packages/compiler/src/main.ts"), join(repo, "examples/acme")], { encoding: "utf8" })) as Model;

const text: FieldModel = { value: { type: "text", max: 40 } };
const withFields = (fields: Record<string, FieldModel>): string =>
  renderMigration({
    ...model,
    things: { widget: { ...model.things["allowance"]!, name: "widget", fields: { id: model.things["allowance"]!.fields["id"]!, ...fields }, invariants: undefined } as never },
  }).content;

describe("a thing's columns", () => {
  const sql = withFields({
    title: text,
    note: { ...text, optional: true },
    flag: { value: { type: "schema", format: "bool" } },
    maybe: { value: { type: "schema" }, nullable: true },
    anything: { value: { type: "schema" } },
    count: { value: { type: "uint", bits: 32 } },
  });
  const column = (name: string) => sql.split("\n").find((l) => l.trim().startsWith(`"${name}"`))?.trim();

  it("a field every row has is NOT NULL TEXT, as before", () => {
    expect(column("title")).toBe('"title" TEXT NOT NULL,');
    expect(column("count")).toBe('"count" TEXT NOT NULL,');
    expect(column("anything")).toBe('"anything" TEXT NOT NULL,');
  });

  it("an optional field and a nullable one are columns that may be NULL", () => {
    expect(column("note")).toBe('"note" TEXT,');
    expect(column("maybe")).toBe('"maybe" TEXT,');
  });

  it("a boolean is INTEGER, so it comes back as it went in", () => {
    expect(column("flag")).toBe('"flag" INTEGER NOT NULL,');
  });
});

describe("control: a model with none of these is as it was", () => {
  it("makes every column of acme's things TEXT NOT NULL except its optional ones", () => {
    const sql = renderMigration(model).content;
    expect(sql).not.toMatch(/INTEGER NOT NULL,\n/);
  });
});
