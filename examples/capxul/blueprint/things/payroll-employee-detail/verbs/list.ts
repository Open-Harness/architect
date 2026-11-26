import { Blueprint } from "orthograph";
import { PayrollEmployeeDetail } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A payroll entry's employees, in the order they were written: the order they were hired. A read changes nothing, so it
// has no handler.
export default Blueprint.read(PayrollEmployeeDetail, {
  where: ["payrollEntry"],
  order: "oldest",
  page: 100,
  allowed: [owner.of("payrollEntry.company")],
  budget: { p95: "80 millis" },
});
