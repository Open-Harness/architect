import { Blueprint } from "orthograph";
import { SalaryStructureAssignment } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// An employee's assignments, in the order they were made, drafts and cancelled ones too. A read changes nothing, so it
// has no handler.
export default Blueprint.read(SalaryStructureAssignment, {
  where: ["employee"],
  order: "oldest",
  page: 50,
  allowed: [owner.of("employee.company")],
  budget: { p95: "80 millis" },
});
