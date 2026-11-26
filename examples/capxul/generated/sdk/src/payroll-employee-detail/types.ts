// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/payroll-employee-detail/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** One employee a payroll entry pays. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type PayrollEmployeeDetail = {
  readonly "id": Of<Declared["id"]>;
  readonly "payrollEntry": Of<Declared["payrollEntry"]>;
  readonly "employee": Of<Declared["employee"]>;
};
