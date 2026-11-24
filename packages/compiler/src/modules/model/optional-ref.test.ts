// The compiler's side of #742 item 5, part two: an optional reference, a wrapped link, a refusal field that may be left
// out, and a decimal named in a message.
//  - `Blueprint.optional(Customer.fields.id)` on a thing's field is a reference a row may leave out (a sales invoice's
//    `project` in the ERPNext spike). The model keeps both halves: its edge (`ref`) and that it is optional.
//  - `optional`, `visibility.secret` and `traced` wrapping a link across two thing.ts files that import each other still
//    load, and the model keeps the edge with the wrapper's mark. (`visibility.private` is checked in orthograph's
//    values/wrapped-link.test.ts, since here it needs a roles.ts.)
//  - The refusals lock records that a refusal field may be left out: a field turning optional changes what clients
//    parse, as a field changing kind does (lock-fields.ts).
//  - The invariants message names a decimal with its places, not as "a schema declared on its own".
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. The lock writes an optional field as its value's entry with `optional: true` beside it, and a required one as today.
//  2. `describeValue` names a decimal with the word "decimal" and its places as a number; the exact words are the builder's.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { Blueprint } from "orthograph";
import { afterAll, describe, expect, it } from "vitest";
import { lockFields } from "./internal/lock-fields.ts";
import { describeValue } from "./internal/same-value.ts";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

// Under the package, so `orthograph` resolves from the temporary projects the way a project's own imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/optional-ref");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");
type Fields = Record<string, Record<string, unknown>>;
const fieldsOf = (exit: Exit.Exit<unknown, unknown>, thing: string): Fields | undefined =>
  Exit.isSuccess(exit) ? (exit.value as { readonly things: Record<string, { readonly fields: Fields }> }).things[thing]?.fields : undefined;

const project = (files: Record<string, string>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};

/** Two invoices whose thing.ts files import each other; the sales invoice's `interCompany` is `sales`. */
const invoices = (sales: string) => project({
  "blueprint/things/sales-invoice/thing.ts": `import { Blueprint } from "orthograph";
import { PurchaseInvoice } from "../purchase-invoice/thing.ts";
export const SalesInvoice = Blueprint.thing({ description: "A bill to a customer.", code: "SI", fields: { id: Blueprint.id("si"), interCompany: ${sales} } });
`,
  "blueprint/things/purchase-invoice/thing.ts": `import { Blueprint } from "orthograph";
import { SalesInvoice } from "../sales-invoice/thing.ts";
export const PurchaseInvoice = Blueprint.thing({ description: "A bill from a supplier.", code: "PI", fields: { id: Blueprint.id("pi"), interCompany: Blueprint.link(() => SalesInvoice.fields.id) } });
`,
});

describe("An optional reference in the model", () => {
  it("keeps a thing's optional reference as an edge to the other thing that may be left out", async () => {
    const exit = await modelOf(project({
      "blueprint/things/customer/thing.ts": `import { Blueprint } from "orthograph";
export const Customer = Blueprint.thing({ description: "Someone who buys.", code: "CU", fields: { id: Blueprint.id("cus") } });
`,
      "blueprint/things/order/thing.ts": `import { Blueprint } from "orthograph";
import { Customer } from "../customer/thing.ts";
export const Order = Blueprint.thing({ description: "An order.", code: "OR", fields: { id: Blueprint.id("ord"), customer: Blueprint.optional(Customer.fields.id), note: Blueprint.text() } });
`,
    }));
    expect(said(exit)).toBe("");
    expect(fieldsOf(exit, "order")?.["customer"]).toMatchObject({ value: { type: "id", prefix: "cus" }, ref: "customer.id", optional: true });
    // Only the wrapped field is optional.
    expect(fieldsOf(exit, "order")?.["note"]?.["optional"]).toBeUndefined();
  });
});

describe("A wrapped link across two thing.ts files that import each other", () => {
  const cases: ReadonlyArray<readonly [string, string, Record<string, unknown>]> = [
    ["optional", "Blueprint.optional(Blueprint.link(() => PurchaseInvoice.fields.id))", { optional: true }],
    ["visibility.secret", "Blueprint.visibility.secret(Blueprint.link(() => PurchaseInvoice.fields.id))", { visibility: "secret" }],
    ["traced", "Blueprint.traced(Blueprint.link(() => PurchaseInvoice.fields.id))", {}],
  ];
  for (const [name, sales, mark] of cases) {
    it(`${name}: loads, and the model keeps the edge and the mark`, async () => {
      const exit = await modelOf(invoices(sales));
      expect(said(exit)).toBe("");
      expect(fieldsOf(exit, "sales-invoice")?.["interCompany"]).toMatchObject({ value: { type: "id", prefix: "pi" }, ref: "purchase-invoice.id", ...mark });
      expect(fieldsOf(exit, "purchase-invoice")?.["interCompany"]).toMatchObject({ ref: "sales-invoice.id" });
    });
  }
});

describe("The refusals lock and a field that may be left out", () => {
  it("records that a refusal field may be left out, and records a required one as before", () => {
    const fields = {
      reason: { value: { type: "text", max: 40 }, optional: true },
      rate: { value: { type: "decimal", places: 4 }, optional: true },
      account: { value: { type: "id", prefix: "acc" } },
    } as never;
    expect(lockFields(fields)).toEqual({
      reason: { value: "text", max: 40, optional: true },
      rate: { value: "decimal", places: 4, optional: true },
      account: { value: "id", prefix: "acc" },
    });
  });
});

describe("A decimal named in a message", () => {
  it("names a decimal with its places, so two decimals of different places read differently", () => {
    const four = describeValue(Blueprint.decimal({ places: 4 }));
    const two = describeValue(Blueprint.decimal({ places: 2 }));
    expect(four).toMatch(/decimal/);
    expect(four).toMatch(/\b4\b/);
    expect(two).toMatch(/\b2\b/);
    expect(four).not.toMatch(/schema declared on its own/);
  });
});
