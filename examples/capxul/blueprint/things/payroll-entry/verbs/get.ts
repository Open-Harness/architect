import { Blueprint } from "orthograph";
import { PayrollEntry } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the entry's record. Its employees are
// `payroll-employee-detail.list`, its slips `salary-slip.list`.
export default Blueprint.read(PayrollEntry, {
  by: "id",
  fields: ["company", "postingDate", "startDate", "endDate", "costCenter", "payrollPayableAccount", "numberOfEmployees", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
