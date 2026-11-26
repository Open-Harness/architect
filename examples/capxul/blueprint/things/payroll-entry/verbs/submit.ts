import { Blueprint } from "orthograph";
import { PayrollEntry } from "../thing.ts";
import { machine } from "../machine.ts";
import { NoAssignmentAtStart, SalarySlipExists } from "../errors.ts";
import { owner } from "../../company/roles.ts";
import { SalarySlip } from "../../salary-slip/thing.ts";
import { SalarySlipDetail } from "../../salary-slip-detail/thing.ts";
import { EmployeeCount } from "../../../values/payroll.ts";

// HRMS's `before_submit` and `on_submit` (`create_salary_slips`): a draft salary slip for each of the entry's
// employees, in its employees' order, from the structure errors.ts names, with the entry's company, days and posting day. Each slip copies its
// structure's lines, earnings then deductions, numbered from 1 within each as on the structure; its gross pay is its
// earnings' sum, its total deduction its deductions' sum, and its net pay the one less the other. Every line pays in
// full: payment days come with payroll settings (`decisions/CX-payroll.md`). The employees aren't judged again for
// having left: one who left after the entry was made is still paid (CX-expense-leavers).
export default Blueprint.operation(PayrollEntry, {
  description: "Submit a payroll entry, making a draft salary slip for each of its employees.",
  payload: { payrollEntry: PayrollEntry.fields.id },
  answer: { payrollEntry: PayrollEntry.fields.id, slips: EmployeeCount },
  move: machine.moves.submit,
  errors: [SalarySlipExists, NoAssignmentAtStart],
  allowed: [owner.of("payrollEntry.company")],
  steps: { load: Blueprint.step.database({ writes: [] }), slips: Blueprint.step.database({ writes: [PayrollEntry, SalarySlip, SalarySlipDetail] }) },
  idempotent: "request",
  budget: { p95: "500 millis" },
});
