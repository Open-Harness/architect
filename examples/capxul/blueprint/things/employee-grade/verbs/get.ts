import { Blueprint } from "orthograph";
import { EmployeeGrade } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the grade's record.
export default Blueprint.read(EmployeeGrade, {
  by: "id",
  fields: ["company", "gradeName", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
