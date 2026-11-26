// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/salary-slip-detail/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** One line of a salary slip: a component and what it paid. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type SalarySlipDetail = {
  readonly "id": Of<Declared["id"]>;
  readonly "salarySlip": Of<Declared["salarySlip"]>;
  readonly "type": Of<Declared["type"]>;
  readonly "line": Of<Declared["line"]>;
  readonly "salaryComponent": Of<Declared["salaryComponent"]>;
  readonly "amount": Of<Declared["amount"]>;
};
