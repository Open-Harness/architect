import { Blueprint } from "orthograph";
import { EmployeePerformanceFeedback } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the feedback's record.
export default Blueprint.read(EmployeePerformanceFeedback, {
  by: "id",
  fields: ["company", "appraisal", "appraisalCycle", "employee", "reviewer", "feedback", "ratings", "totalScore", "state"],
  allowed: [self.of("reviewer"), owner.of("company")],
  budget: { p95: "50 millis" },
});
