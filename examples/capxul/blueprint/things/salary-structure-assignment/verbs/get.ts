import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the assignment's record.
export default Blueprint.read(SalaryStructureAssignment, {
  by: "id",
  fields: ["company", "employee", "salaryStructure", "fromDate", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
