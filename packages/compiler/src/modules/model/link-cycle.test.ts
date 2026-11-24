// Two things that link to each other (#742, item 5): Sales Invoice and Purchase Invoice each take the other's
// `fields.id`, so their two thing.ts files import each other, and whichever loads second reads the first before it is
// there: `ReferenceError: Cannot access 'PurchaseInvoice' before initialization` (`spikes/erpnext-doctypes/README.md`).
// `Blueprint.link(() => Other.fields.id)` reads the other thing's field only when it is used, so the blueprint loads, and
// the model keeps both edges, as it keeps one declared with the field itself.
//
// `Blueprint.link` is read loosely so this file type-checks before and after the surface exists.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { Blueprint } from "orthograph";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

// Under the package, so `orthograph` resolves from the temporary projects the way a project's own imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/link-cycle");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const modelOf = (root: string) => Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root)));
const said = (exit: Exit.Exit<unknown, unknown>) => (Exit.isFailure(exit) ? JSON.stringify(exit.cause) : "");
type Fields = Record<string, { readonly value: unknown; readonly ref?: string; readonly description?: string }>;
const fieldsOf = (exit: Exit.Exit<unknown, unknown>, thing: string): Fields | undefined =>
  Exit.isSuccess(exit) ? (exit.value as { readonly things: Record<string, { readonly fields: Fields }> }).things[thing]?.fields : undefined;

/** Two invoices whose thing.ts files import each other; each links to the other as `link` writes it. */
const project = (sales: string, purchase: string): string => {
  if (typeof (Blueprint as unknown as { readonly link?: unknown }).link !== "function") throw new Error("Blueprint.link is not there: #742 item 5 adds it");
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  const files: Record<string, string> = {
    "blueprint/things/sales-invoice/thing.ts": `import { Blueprint } from "orthograph";
import { PurchaseInvoice } from "../purchase-invoice/thing.ts";
export const SalesInvoice = Blueprint.thing({ description: "A bill to a customer.", code: "SI", fields: { id: Blueprint.id("si"), interCompany: ${sales} } });
`,
    "blueprint/things/purchase-invoice/thing.ts": `import { Blueprint } from "orthograph";
import { SalesInvoice } from "../sales-invoice/thing.ts";
export const PurchaseInvoice = Blueprint.thing({ description: "A bill from a supplier.", code: "PI", fields: { id: Blueprint.id("pi"), interCompany: ${purchase} } });
`,
  };
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};

describe("Two-way links: two things that link to each other load", () => {
  it("loads when both sides link, and the model keeps both edges", async () => {
    const exit = await modelOf(project("Blueprint.link(() => PurchaseInvoice.fields.id)", "Blueprint.link(() => SalesInvoice.fields.id)"));
    expect(said(exit)).toBe("");
    expect(fieldsOf(exit, "sales-invoice")?.["interCompany"]).toMatchObject({ value: { type: "id", prefix: "pi" }, ref: "purchase-invoice.id" });
    expect(fieldsOf(exit, "purchase-invoice")?.["interCompany"]).toMatchObject({ value: { type: "id", prefix: "si" }, ref: "sales-invoice.id" });
  });

  it("keeps a link's sentence in the model", async () => {
    const exit = await modelOf(project(`Blueprint.described(Blueprint.link(() => PurchaseInvoice.fields.id), "The supplier's bill for the same sale.")`, "Blueprint.link(() => SalesInvoice.fields.id)"));
    expect(said(exit)).toBe("");
    expect(fieldsOf(exit, "sales-invoice")?.["interCompany"]).toMatchObject({ ref: "purchase-invoice.id", description: "The supplier's bill for the same sale." });
  });
});
