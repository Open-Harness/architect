import { Blueprint } from "orthograph";
import { PayrollEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import {
  NoEmployeesFound,
  PayableAccountHasType,
  PayableAccountIsGroup,
  PayableAccountNotInCompany,
  PayrollCostCenterIsGroup,
  PayrollCostCenterNotInCompany,
  PayrollEndsBeforeStart,
} from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { PayrollEmployeeDetail } from "../../payroll-employee-detail/thing.ts";

// Refusal order (errors.ts). It fills in its employees as HRMS's `fill_employee_details` does: each employee of the
// company still at work (a leaver is skipped, CX-expense-leavers), who joined on or before the last day, holds a
// submitted assignment starting on or before the last day, and holds no submitted salary slip for these very days
// (`remove_payrolled_employees`). It writes one Payroll Employee Detail row for each, in the order the employees were
// hired (HRMS's query sets no order; Capxul's own call, so a run reads the same every time).
export default Blueprint.operation(PayrollEntry, {
  description: "Draft a payroll entry for a span of days, filled with the company's employees to pay.",
  payload: {
    company: PayrollEntry.fields.company,
    postingDate: PayrollEntry.fields.postingDate,
    startDate: PayrollEntry.fields.startDate,
    endDate: PayrollEntry.fields.endDate,
    costCenter: PayrollEntry.fields.costCenter,
    payrollPayableAccount: PayrollEntry.fields.payrollPayableAccount,
  },
  answer: { payrollEntry: PayrollEntry.fields.id, numberOfEmployees: PayrollEntry.fields.numberOfEmployees },
  move: machine.moves.create,
  errors: [
    PayrollEndsBeforeStart,
    PayableAccountNotInCompany,
    PayableAccountIsGroup,
    PayableAccountHasType,
    PayrollCostCenterNotInCompany,
    PayrollCostCenterIsGroup,
    NoEmployeesFound,
  ],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database({ writes: [PayrollEntry, PayrollEmployeeDetail] }) },
  idempotent: "request",
  budget: { p95: "300 millis" },
});
