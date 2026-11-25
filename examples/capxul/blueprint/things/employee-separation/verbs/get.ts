import { Blueprint } from "orthograph";
import { EmployeeSeparation } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the separation's record.
export default Blueprint.read(EmployeeSeparation, {
  by: "id",
  fields: ["company", "employee", "resignationLetterDate", "boardingBeginsOn", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
