// Two things that link to each other (#742, item 5): a thing's field taken from another thing (`Customer.fields.id`) is
// read while the file loads, so when Sales Invoice and Purchase Invoice each read the other's `fields.id`, whichever
// loads second finds the first not there yet: `ReferenceError: Cannot access 'PurchaseInvoice' before initialization`
// (`spikes/erpnext-doctypes/README.md`, found 5). The spike cut one edge of each cycle to a plain id.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. `Blueprint.link(() => Other.fields.id)` declares a field taken from another thing's field, read only when it is
//     first used, so the other thing may be declared after it, in this file or in one that imports this one.
//  2. Once both things exist, a field declared with it is the same as one declared with the field itself: its `from`
//     is that field (the edge the compiler follows), its value is that field's value, and it keeps a `described` sentence.
//
// `Blueprint.link` is read loosely so this file type-checks before and after the surface exists.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";
import type { Field } from "#modules/things/types.js";

const link = (to: () => Field): Field => {
  const surface = Blueprint as unknown as { readonly link?: (to: () => Field) => Field };
  if (typeof surface.link !== "function") throw new Error("Blueprint.link is not there: #742 item 5 adds it");
  return surface.link(to);
};
const holds = (field: Field, x: unknown) => Schema.decodeUnknownExit(field.value.schema as never)(x)._tag;

describe("Two-way links: a thing may link to one declared after it", () => {
  it("declares a field on a thing that is not there yet, and it becomes that thing's field once it is", () => {
    // Declared before SalesInvoice: a link that read its field at once would throw here, as a two-way import does.
    const PurchaseInvoice = Blueprint.thing({
      description: "A bill from a supplier.",
      fields: { id: Blueprint.id("pi"), returnOf: link((): Field => SalesInvoice.fields.id) },
    });
    const SalesInvoice = Blueprint.thing({
      description: "A bill to a customer.",
      fields: { id: Blueprint.id("si"), interCompany: PurchaseInvoice.fields.id },
    });
    expect(PurchaseInvoice.fields.returnOf.from).toBe(SalesInvoice.fields.id);
    expect(PurchaseInvoice.fields.returnOf.of).toBe(PurchaseInvoice);
    expect(PurchaseInvoice.fields.returnOf.key).toBe("returnOf");
    expect(PurchaseInvoice.fields.returnOf.value.meta).toEqual({ type: "id", prefix: "si" });
    expect(SalesInvoice.fields.interCompany.from).toBe(PurchaseInvoice.fields.id);
  });

  it("holds the other thing's ids and no one else's", () => {
    const Bill = Blueprint.thing({ description: "A bill.", fields: { id: Blueprint.id("bil"), invoice: link((): Field => Invoice.fields.id) } });
    const Invoice = Blueprint.thing({ description: "An invoice.", fields: { id: Blueprint.id("inv"), bill: Bill.fields.id } });
    expect(holds(Bill.fields.invoice, "inv_7f3k")).toBe("Success");
    expect(holds(Bill.fields.invoice, "bil_7f3k")).toBe("Failure");
    expect(holds(Invoice.fields.bill, "bil_7f3k")).toBe("Success");
  });

  it("keeps a sentence said of it before the other thing exists", () => {
    const Bill = Blueprint.thing({
      description: "A bill.",
      fields: { id: Blueprint.id("bil"), invoice: Blueprint.described(link((): Field => Invoice.fields.id), "The invoice this bill answers.") },
    });
    const Invoice = Blueprint.thing({ description: "An invoice.", fields: { id: Blueprint.id("inv") } });
    // As a described field taken from a thing is: its `from` is the described copy of that thing's field, so the edge
    // and the sentence travel together.
    expect(Bill.fields.invoice.description).toBe("The invoice this bill answers.");
    expect(Bill.fields.invoice.from?.of).toBe(Invoice);
    expect(Bill.fields.invoice.from?.key).toBe("id");
    expect(Bill.fields.invoice.from?.description).toBe("The invoice this bill answers.");
  });
});
