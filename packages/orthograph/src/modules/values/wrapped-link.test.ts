// An optional reference and a wrapped link (#742, item 5, part two). The ERPNext spike's books are full of references a
// row may leave out (a sales invoice's `project`, a journal line's `party`), and of two things that link to each other.
// `Blueprint.optional`, `Blueprint.visibility.secret`, `Blueprint.visibility.private` and `Blueprint.traced` each take a
// field as well as a value (`optional` is typed for a value only, though nothing stops a field). Today each copies what it wraps by spreading it, so:
//  - `optional(Customer.fields.id)` keeps the field's original value, so the field a thing or a payload makes of it is
//    still required, and the mark is lost;
//  - each of the four, wrapping `Blueprint.link(() => Other.fields.id)`, reads the other thing at once, so a link
//    declared before its target throws `ReferenceError`, which is what a link exists to stop.
//
// Assumptions beyond those documents (the PR for this check lists them for the lead):
//  1. A field made of `optional(Other.fields.id)` keeps its edge to that field (`from` is that field, or a copy of it
//     that carries the mark, as `described` makes a copy: the check reads only its thing and key), and its value is
//     marked `optional`, so its schema lets it be left out and still holds only the other thing's ids.
//  2. A wrapped link is a link: it reads its target only when first used, and once read it gives the target's edge and
//     value with the wrapper's own mark (optional, secret, private to its roles, or traced) on top.
//  3. `Blueprint.issued` is left out: the compiler refuses it on a thing's own field, its one use is an answer's value.
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "../../index.ts";
import { structOf } from "#modules/things/service.js";
import type { Field, Thing } from "#modules/things/types.js";

const decodes = (schema: Schema.Top, x: unknown) => Schema.decodeUnknownExit(schema as never)(x)._tag;
const alone = (field: Field) => Schema.Struct({ f: field.value.schema as Schema.Top });
const edgeOf = (field: Field) => ({ of: field.from?.of, key: field.from?.key });
/** `Blueprint.optional` is typed for a value today; read loosely so this file type-checks before and after it takes a field. */
const optional = (x: Field) => (Blueprint.optional as unknown as (f: Field) => Field)(x);

describe("An optional reference keeps its edge", () => {
  const Customer = Blueprint.thing({ description: "Someone who buys.", fields: { id: Blueprint.id("cus") } });

  it("makes a thing's field that keeps the edge to the other thing and may be left out", () => {
    const Order = Blueprint.thing({ description: "An order.", fields: { id: Blueprint.id("ord"), customer: optional(Customer.fields.id) } });
    const customer = Order.fields.customer as Field;
    expect(edgeOf(customer)).toEqual({ of: Customer, key: "id" });
    expect(customer.value.optional).toBe(true);
    expect(decodes(alone(customer), {})).toBe("Success");
    expect(decodes(alone(customer), { f: "cus_7f3k" })).toBe("Success");
    expect(decodes(alone(customer), { f: "ord_7f3k" })).toBe("Failure");
  });

  it("lets a payload leave the field out, and holds only the other thing's ids when it is there", () => {
    const payload = structOf({ customer: optional(Customer.fields.id), note: Blueprint.text() });
    expect(decodes(payload, { note: "hi" })).toBe("Success");
    expect(decodes(payload, { customer: "cus_7f3k", note: "hi" })).toBe("Success");
    expect(decodes(payload, { customer: "ord_7f3k", note: "hi" })).toBe("Failure");
    // Only the wrapped field may be left out.
    expect(decodes(payload, { customer: "cus_7f3k" })).toBe("Failure");
  });
});

const Staff = Blueprint.thing({ description: "Someone who works here.", fields: { id: Blueprint.id("stf") } });
const clerk = Blueprint.role(Staff, { rule: () => true });

/** Each wrapper that takes a field, and what it leaves on the field it makes. */
const wrappers: ReadonlyArray<readonly [string, (f: Field) => Field, (f: Field) => void]> = [
  ["optional", optional, (f) => expect(f.value.optional).toBe(true)],
  ["visibility.secret", (f) => Blueprint.visibility.secret(f), (f) => expect(f.visibility).toBe("secret")],
  ["visibility.private", (f) => Blueprint.visibility.private(f, clerk), (f) => expect(f.visibility).toEqual({ kind: "private", to: [clerk] })],
  ["traced", (f) => Blueprint.traced(f), (f) => expect(f.traced).toBe(true)],
];

describe("A wrapped link stays a link", () => {
  for (const [name, wrap, marked] of wrappers) {
    it(`${name}: a thing's field declared before the thing it links to keeps the edge and the mark`, () => {
      // Declared before Invoice: a wrapper that read the link at once would throw here.
      const Bill: Thing = Blueprint.thing({ description: "A bill.", fields: { id: Blueprint.id("bil"), invoice: wrap(Blueprint.link((): Field => Invoice.fields.id)) } });
      const Invoice = Blueprint.thing({ description: "An invoice.", fields: { id: Blueprint.id("inv") } });
      const invoice = Bill.fields["invoice"] as Field;
      expect(edgeOf(invoice)).toEqual({ of: Invoice, key: "id" });
      expect(invoice.value.meta).toEqual({ type: "id", prefix: "inv" });
      marked(invoice);
    });

    it(`${name}: read outside a thing, as a payload field is, it keeps the edge and the mark`, () => {
      const later = wrap(Blueprint.link((): Field => Invoice.fields.id));
      const Invoice = Blueprint.thing({ description: "An invoice.", fields: { id: Blueprint.id("inv") } });
      // A payload's field is the other thing's field itself, so its edge is its own thing and key (as the compiler reads it).
      expect({ of: later.of, key: later.key }).toEqual({ of: Invoice, key: "id" });
      expect(later.value.meta).toEqual({ type: "id", prefix: "inv" });
      marked(later);
    });
  }
});
