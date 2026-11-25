// Planted fixture (snag #1044). Compiled on its own by records/insert-optional.test.ts, never by the package's typecheck.
// Capxul's Account, cut down: required values, a required link to another thing, an optional value and an optional link back to itself.
import type { Field } from "orthograph";
import { Blueprint } from "orthograph";

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

// What a handler holds: the ids the runtime hands in, already branded. Declared, so no line below needs a cast. Typed from each field's own
// schema, never from `FieldsOf`, the type under judgment: a wrong `FieldsOf` must not change what the fixture passes in.
type AccountIdOf = (typeof AccountId)["schema"]["Type"];
export declare const id: AccountIdOf;
export declare const parent: AccountIdOf;
export declare const company: (typeof Company.fields.id)["value"]["schema"]["Type"];
// A payload's optional fields, as a handler reads them: there or not.
export declare const maybeParent: AccountIdOf | undefined;
export declare const maybeType: "Bank" | "Cash" | "Tax" | undefined;
