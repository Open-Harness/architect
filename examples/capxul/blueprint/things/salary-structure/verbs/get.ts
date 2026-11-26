import { Blueprint } from "orthograph";
import { SalaryStructure } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the structure's record. Its lines are
// `salary-detail.list`.
export default Blueprint.read(SalaryStructure, {
  by: "id",
  fields: ["company", "salaryStructureName", "totalEarning", "totalDeduction", "netPay", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
