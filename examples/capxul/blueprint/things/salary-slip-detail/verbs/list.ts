import { Blueprint } from "orthograph";
import { SalarySlipDetail } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A slip's lines, in the order they were written: its earnings, then its deductions. A read changes nothing, so it has
// no handler.
export default Blueprint.read(SalarySlipDetail, {
  where: ["salarySlip"],
  order: "oldest",
  page: 100,
  allowed: [self.of("salarySlip.employee"), owner.of("salarySlip.company")],
  budget: { p95: "80 millis" },
});
