// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/salary-component/thing.ts";
import type * as Events from "../../../../blueprint/things/salary-component/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a salary-component moves between, as its machine declares them. */
export type SalaryComponentState = "active";

/** A part of an employee's pay: an earning, such as basic pay, or a deduction, such as a pension contribution. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type SalaryComponent = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "salaryComponent": Of<Declared["salaryComponent"]>;
  readonly "type": Of<Declared["type"]>;
  /** What a structure line pays when it names no amount of its own, in USDC base units. 0 for none. */
  readonly "amount": Of<Declared["amount"]>;
  /** The company's ledger its pay is booked to: debited for an earning, credited for a deduction. */
  readonly "account": Of<Declared["account"]>;
  readonly "state": SalaryComponentState;
};

/** The event SalaryComponentCreated: what it carries when a salary-component moves. */
export type SalaryComponentCreated = {
  readonly "salaryComponent": Of<(typeof Events)["SalaryComponentCreated"]["fields"]["salaryComponent"]>;
  readonly "company": Of<(typeof Events)["SalaryComponentCreated"]["fields"]["company"]>;
  readonly "type": Of<(typeof Events)["SalaryComponentCreated"]["fields"]["type"]>;
};
