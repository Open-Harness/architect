import { Blueprint } from "orthograph";
import { SalarySlip } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// An employee's salary slips, in the order they were made, narrowed to one payroll entry when given. The employee
// lists their own (HRMS's Employee role reads its own slips). A read changes nothing, so it has no handler.
export default Blueprint.read(SalarySlip, {
  where: ["employee", "payrollEntry"],
  order: "oldest",
  page: 100,
  allowed: [self.of("employee"), owner.of("employee.company")],
  budget: { p95: "80 millis" },
});
