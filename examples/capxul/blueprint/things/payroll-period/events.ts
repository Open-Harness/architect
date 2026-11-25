import { Blueprint } from "orthograph";
import { PayrollPeriod } from "./thing.ts";

export const PayrollPeriodCreated = Blueprint.event({
  payrollPeriod: PayrollPeriod.fields.id,
  company: PayrollPeriod.fields.company,
  startDate: PayrollPeriod.fields.startDate,
  endDate: PayrollPeriod.fields.endDate,
});
