import { Blueprint } from "orthograph";
import { PayrollPeriod } from "./thing.ts";
import { PayrollPeriodNameTaken } from "./errors.ts";

// HRMS names a period across the site; here across one company (K42, call 10).
export const oneNamePerCompany = Blueprint.invariant.unique([PayrollPeriod.fields.company, PayrollPeriod.fields.payrollPeriodName], {
  refuse: PayrollPeriodNameTaken,
});
