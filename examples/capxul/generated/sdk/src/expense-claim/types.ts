// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/expense-claim/thing.ts";
import type * as Events from "../../../../blueprint/things/expense-claim/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states an expense-claim moves between, as its machine declares them. */
export type ExpenseClaimState = "draft" | "approved" | "rejected";

/** What an employee asks the company to pay back. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type ExpenseClaim = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "postingDate": Of<Declared["postingDate"]>;
  readonly "totalClaimedAmount": Of<Declared["totalClaimedAmount"]>;
  readonly "totalSanctionedAmount": Of<Declared["totalSanctionedAmount"]>;
  readonly "state": ExpenseClaimState;
};

/** The event ExpenseClaimApproved: what it carries when an expense-claim moves. */
export type ExpenseClaimApproved = {
  readonly "expenseClaim": Of<(typeof Events)["ExpenseClaimApproved"]["fields"]["expenseClaim"]>;
  readonly "totalSanctionedAmount": Of<(typeof Events)["ExpenseClaimApproved"]["fields"]["totalSanctionedAmount"]>;
};

/** The event ExpenseClaimCreated: what it carries when an expense-claim moves. */
export type ExpenseClaimCreated = {
  readonly "expenseClaim": Of<(typeof Events)["ExpenseClaimCreated"]["fields"]["expenseClaim"]>;
  readonly "company": Of<(typeof Events)["ExpenseClaimCreated"]["fields"]["company"]>;
  readonly "employee": Of<(typeof Events)["ExpenseClaimCreated"]["fields"]["employee"]>;
};

/** The event ExpenseClaimRejected: what it carries when an expense-claim moves. */
export type ExpenseClaimRejected = {
  readonly "expenseClaim": Of<(typeof Events)["ExpenseClaimRejected"]["fields"]["expenseClaim"]>;
};
