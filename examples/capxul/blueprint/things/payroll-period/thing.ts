import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { Day } from "../../values/employee.ts";
import { PeriodName } from "../../values/payroll.ts";

// HRMS's Payroll Period (hrms/payroll/doctype/payroll_period): a company's payroll year, its name, first and last days.
// Only tax reads it (slice 9b), to spread a year's tax over its months; its sub-periods table (Payroll Period Date) comes
// with it (`decisions/CX-payroll.md`).
export const PayrollPeriod = Blueprint.thing({
  description: "A company's payroll year, the span its tax is worked out over.",
  code: "PP",
  fields: {
    id: Blueprint.id("ppr"),
    company: Company.fields.id,
    payrollPeriodName: PeriodName,
    startDate: Day,
    endDate: Day,
  },
});
