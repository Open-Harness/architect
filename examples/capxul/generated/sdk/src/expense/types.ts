// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/expense/thing.ts";
import type * as Events from "../../../../blueprint/things/expense/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an expense moves between, as its machine declares them. */
export type ExpenseState = "active";

/** One expense in a claim. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type Expense = {
  readonly "id": Of<Declared["id"]>;
  readonly "expenseClaim": Of<Declared["expenseClaim"]>;
  readonly "expenseDate": Of<Declared["expenseDate"]>;
  readonly "expenseType": Of<Declared["expenseType"]>;
  readonly "amount": Of<Declared["amount"]>;
  readonly "sanctionedAmount": Of<Declared["sanctionedAmount"]>;
  readonly "state": ExpenseState;
};

/** The event ExpenseAdded: what it carries when an expense moves. */
export type ExpenseAdded = {
  readonly "expense": Of<(typeof Events)["ExpenseAdded"]["fields"]["expense"]>;
  readonly "expenseClaim": Of<(typeof Events)["ExpenseAdded"]["fields"]["expenseClaim"]>;
  readonly "amount": Of<(typeof Events)["ExpenseAdded"]["fields"]["amount"]>;
  readonly "totalClaimedAmount": Of<(typeof Events)["ExpenseAdded"]["fields"]["totalClaimedAmount"]>;
};
