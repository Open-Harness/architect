// M1.42: what the basics look like in the generated outputs, on acme's model with a few words changed: the docs' Events section and
// description column (the SDK's types and the CLI's flags are in @orthograph/projections). Hostile descriptions (a pipe, a comment's end) must not break them.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { FieldModel, Model, ThingModel } from "@orthograph/compiler";
import { renderDocs } from "./internal/docs.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
const acme = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), resolve(repo, "examples/acme")], { encoding: "utf8" })) as Model;

/** Acme's model with `allowance.limit` saying `description` (and that field in the thing's events and operation payloads too). */
const saying = (description: string): Model => {
  const told = (f: FieldModel): FieldModel => ({ ...f, description });
  const allowance = acme.things["allowance"]!;
  const thing: ThingModel = { ...allowance, fields: { ...allowance.fields, limit: told(allowance.fields["limit"]!) } };
  return { ...acme, things: { ...acme.things, allowance: thing } };
};

describe("the docs", () => {
  const page = (model: Model) => renderDocs(model, "acme").find((f) => f.path === "generated/docs/allowance/index.md")!.content;

  it("have an Events section: each event, the fields it carries and the move that emits it", () => {
    const text = page(acme);
    const section = text.slice(text.indexOf("## Events"), text.indexOf("## Events") + 600).split("\n## ")[0]!;
    expect(section).toContain("- `AllowanceGranted`: carries allowance (allowance.id), limit (Amount)");
    expect(section).toMatch(/- `AllowanceSpent`: carries .*emitted by the move spend/);
    expect(section).not.toContain("| ");
  });

  it("add a description column only when a field has a description, and a pipe in it does not end the cell", () => {
    expect(page(acme)).toContain("| field | value |\n");
    const text = page(saying("one | two\nthree"));
    const row = text.split("\n").find((l) => l.startsWith("| limit"))!;
    expect(text).toContain("| field | value | description |");
    expect(row).toContain("one \\| two three");
    // Escaped pipes are not cell edges: the row has as many cells as the header.
    expect(row.split(/(?<!\\)\|/).length).toBe("| field | value | description |".split("|").length);
  });
});

describe("the docs, for a rule of another thing than the operation's", () => {
  it("shows the rule's own thing's error: its exit, sentence, rule and carried fields, never a state failure", () => {
    const error = { fields: { name: acme.things["organization"]!.fields["name"]! }, exit: 91, code: "OT-001" };
    const other: ThingModel = { ...acme.things["organization"]!, errors: { OtherTaken: error }, invariants: { oneHolder: { kind: "unique", fields: ["name"], while: ["open"], refuse: "OtherTaken" } } };
    const spend = acme.operations["allowance.spend"]!;
    const op = { ...spend, invariants: { OtherTaken: "organization.oneHolder" }, refusals: [...spend.refusals, "OtherTaken"] };
    const model: Model = { ...acme, things: { ...acme.things, organization: other }, operations: { ...acme.operations, "allowance.spend": op }, refusals: { ...acme.refusals, OtherTaken: "OT-001" } };
    const row = renderDocs(model, "acme").find((f) => f.path === "generated/docs/allowance/spend.md")!.content.split("\n").find((l) => l.startsWith("| OtherTaken"))!;
    expect(row).toBe("| OtherTaken | 91 | OT-001 | another open organization holds this name; by the rule organization.oneHolder, carrying name |");
  });
});
