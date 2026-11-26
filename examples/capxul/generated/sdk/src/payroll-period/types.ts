// Generated from the blueprint. Do not edit.
import type * as Source from "../../../../blueprint/things/payroll-period/thing.ts";
import type * as Events from "../../../../blueprint/things/payroll-period/events.ts";

type Declared = Extract<(typeof Source)[keyof typeof Source], { readonly kind: "thing" }>["fields"];
/** What a field or value holds, as the blueprint's own schema decodes it. */
type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;

/** The states a payroll-period moves between, as its machine declares them. */
export type PayrollPeriodState = "active";

/** A company's payroll year, the span its tax is worked out over. A field not every caller is shown (secret, or private to roles) may be missing from what a call returns. */
export type PayrollPeriod = {
  readonly "id": Of<Declared["id"]>;
  readonly "company": Of<Declared["company"]>;
  readonly "payrollPeriodName": Of<Declared["payrollPeriodName"]>;
  readonly "startDate": Of<Declared["startDate"]>;
  readonly "endDate": Of<Declared["endDate"]>;
  readonly "state": PayrollPeriodState;
};

/** The event PayrollPeriodCreated: what it carries when a payroll-period moves. */
export type PayrollPeriodCreated = {
  readonly "payrollPeriod": Of<(typeof Events)["PayrollPeriodCreated"]["fields"]["payrollPeriod"]>;
  readonly "company": Of<(typeof Events)["PayrollPeriodCreated"]["fields"]["company"]>;
  readonly "startDate": Of<(typeof Events)["PayrollPeriodCreated"]["fields"]["startDate"]>;
  readonly "endDate": Of<(typeof Events)["PayrollPeriodCreated"]["fields"]["endDate"]>;
};
