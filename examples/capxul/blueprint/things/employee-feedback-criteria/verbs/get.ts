import { Blueprint } from "orthograph";
import { EmployeeFeedbackCriteria } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the criteria's record.
export default Blueprint.read(EmployeeFeedbackCriteria, {
  by: "id",
  fields: ["company", "criteria", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
