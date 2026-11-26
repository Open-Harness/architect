// Planted fixture (snag #1044). Compiled on its own by records/insert-optional.test.ts, never by the package's typecheck.
// Three things: capxul's Account cut down (required values and a required link, an optional value and an optional link back to itself); a Gauge
// whose optional fields are every other kind of value (a uint, a bool, a struct, a list, an id), so no rule keyed on one kind or one name passes;
// and a Company with no optional field at all.
import type { Field } from "orthograph";
import { Blueprint } from "orthograph";
import { Schema } from "effect";

export const Company = Blueprint.thing({ description: "A company.", code: "CO", fields: { id: Blueprint.id("co"), name: Blueprint.text({ max: 40 }) } });

const AccountId = Blueprint.id("acc");

export const Account = Blueprint.thing({
  description: "A heading in a company's chart of accounts.",
  code: "AC",
  fields: {
    id: AccountId,
    company: Company.fields.id,
    accountName: Blueprint.text({ max: 40 }),
    parentAccount: Blueprint.optional(Blueprint.link((): Field<typeof AccountId, "id"> => Account.fields.id)),
    reportType: Blueprint.oneOf(["Balance Sheet", "Profit and Loss"]),
    accountType: Blueprint.optional(Blueprint.oneOf(["Bank", "Cash", "Tax"])),
  },
});

export const Gauge = Blueprint.thing({
  description: "A gauge.",
  code: "GA",
  fields: {
    id: Blueprint.id("gau"),
    label: Blueprint.text({ max: 40 }),
    count: Blueprint.optional(Blueprint.uint(64)),
    on: Blueprint.optional(Blueprint.bool()),
    shape: Blueprint.optional(Blueprint.value(Schema.Struct({ a: Schema.Number }))),
    tags: Blueprint.optional(Blueprint.list(Blueprint.text({ max: 10 }))),
    tag: Blueprint.optional(Blueprint.id("tag")),
  },
});

// What a handler holds: the ids the runtime hands in, already branded. Declared, so no line below needs a cast. Typed from each field's own
// schema, never from `FieldsOf`, the type under judgment: a wrong `FieldsOf` must not change what the fixture passes in.
type AccountIdOf = (typeof AccountId)["schema"]["Type"];
export declare const id: AccountIdOf;
export declare const parent: AccountIdOf;
export declare const company: (typeof Company.fields.id)["value"]["schema"]["Type"];
export declare const gauge: (typeof Gauge.fields.id)["value"]["schema"]["Type"];
export declare const tag: (typeof Gauge.fields.tag)["value"]["schema"]["Type"];
// A payload's optional fields, as a handler reads them: there or not.
export declare const maybeParent: AccountIdOf | undefined;
export declare const maybeType: "Bank" | "Cash" | "Tax" | undefined;
