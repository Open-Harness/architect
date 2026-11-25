import { Blueprint } from "orthograph";
import { SalarySlip } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the slip's record. Its lines are
// `salary-slip-detail.list`. The employee reads their own slip (HRMS's Employee role reads its own).
export default Blueprint.read(SalarySlip, {
  by: "id",
  fields: [
    "company", "employee", "payrollEntry", "salaryStructure", "postingDate", "startDate", "endDate",
    "grossPay", "totalDeduction", "netPay", "status", "journalEntry",
  ],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
