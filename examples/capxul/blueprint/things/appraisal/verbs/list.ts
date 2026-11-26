import { Blueprint } from "orthograph";
import { Appraisal } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A cycle's appraisals, or an employee's, oldest first. The owner names the cycle; an employee names themselves. A read changes nothing, so it has no handler. It is how a journey
// sees every appraisal a cycle's start made.
export default Blueprint.read(Appraisal, {
  where: ["appraisalCycle", "employee"],
  order: "oldest",
  page: 50,
  allowed: [self.of("employee"), owner.of("appraisalCycle.company")],
  budget: { p95: "80 millis" },
});
