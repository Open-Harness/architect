// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/payroll-entry/thing.ts";
import type * as Events from "../../../../blueprint/things/payroll-entry/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a payroll-entry moves between, as its machine declares them. */
export type PayrollEntryState = "draft" | "submitted" | "accrued";

/** A company's pay run for a span of days: its employees' salary slips, and the journal entry that books them. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type PayrollEntry = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  /** The day its salary slips and accrual journal entry are posted. */
  readonly "postingDate": Of<Declared["postingDate"]>;
  readonly "startDate": Of<Declared["startDate"]>;
  readonly "endDate": Of<Declared["endDate"]>;
  readonly "costCenter": Of<Declared["costCenter"]>;
  /** The ledger the net pay is credited to, owed to the employees until it is paid. */
  readonly "payrollPayableAccount": Of<Declared["payrollPayableAccount"]>;
  readonly "numberOfEmployees": Of<Declared["numberOfEmployees"]>;
  readonly "state": PayrollEntryState;
};

/** The event PayrollEntryDrafted: what it carries when a payroll-entry moves. */
export type PayrollEntryDrafted = {
  readonly "payrollEntry": Of<(typeof Events)["PayrollEntryDrafted"]["fields"]["payrollEntry"]>;
  readonly "company": Of<(typeof Events)["PayrollEntryDrafted"]["fields"]["company"]>;
  readonly "numberOfEmployees": Of<(typeof Events)["PayrollEntryDrafted"]["fields"]["numberOfEmployees"]>;
};

/** The event PayrollEntrySubmitted: what it carries when a payroll-entry moves. */
export type PayrollEntrySubmitted = {
  readonly "payrollEntry": Of<(typeof Events)["PayrollEntrySubmitted"]["fields"]["payrollEntry"]>;
  readonly "slips": Of<(typeof Events)["PayrollEntrySubmitted"]["fields"]["slips"]>;
};

/** The event SalarySlipsSubmitted: what it carries when a payroll-entry moves. */
export type SalarySlipsSubmitted = {
  readonly "payrollEntry": Of<(typeof Events)["SalarySlipsSubmitted"]["fields"]["payrollEntry"]>;
  readonly "journalEntry": Of<(typeof Events)["SalarySlipsSubmitted"]["fields"]["journalEntry"]>;
  readonly "slips": Of<(typeof Events)["SalarySlipsSubmitted"]["fields"]["slips"]>;
};
