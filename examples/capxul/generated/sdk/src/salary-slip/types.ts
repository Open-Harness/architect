// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/salary-slip/thing.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** One employee's pay for a payroll entry's days: their earnings, deductions and net pay. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type SalarySlip = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "employee": Of<Declared["employee"]>;
  readonly "payrollEntry": Of<Declared["payrollEntry"]>;
  readonly "salaryStructure": Of<Declared["salaryStructure"]>;
  readonly "postingDate": Of<Declared["postingDate"]>;
  readonly "startDate": Of<Declared["startDate"]>;
  readonly "endDate": Of<Declared["endDate"]>;
  readonly "grossPay": Of<Declared["grossPay"]>;
  readonly "totalDeduction": Of<Declared["totalDeduction"]>;
  /** Its gross pay less its total deduction, in USDC base units. */
  readonly "netPay": Of<Declared["netPay"]>;
  readonly "status": Of<Declared["status"]>;
  /** The accrual journal entry that booked it, once its payroll entry submitted it. */
  readonly "journalEntry"?: Of<Declared["journalEntry"]>;
};
