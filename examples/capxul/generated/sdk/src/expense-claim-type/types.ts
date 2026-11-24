// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/expense-claim-type/thing.ts";
import type * as Events from "../../../../blueprint/things/expense-claim-type/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an expense-claim-type moves between, as its machine declares them. */
export type ExpenseClaimTypeState = "active";

/** A kind of expense a company pays back, such as travel. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type ExpenseClaimType = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "expenseType": Of<Declared["expenseType"]>;
  readonly "state": ExpenseClaimTypeState;
};

/** The event ExpenseClaimTypeCreated: what it carries when an expense-claim-type moves. */
export type ExpenseClaimTypeCreated = {
  readonly "expenseClaimType": Of<(typeof Events)["ExpenseClaimTypeCreated"]["fields"]["expenseClaimType"]>;
  readonly "company": Of<(typeof Events)["ExpenseClaimTypeCreated"]["fields"]["company"]>;
};
