import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// An employee's goals in a cycle, oldest first (HRMS's goal tree, `get_children`, filtered by employee and cycle). A read
// changes nothing, so it has no handler. The owner names the cycle; an employee names themselves.
export default Blueprint.read(Goal, {
  where: ["appraisalCycle", "employee"],
  order: "oldest",
  page: 50,
  allowed: [self.of("employee"), owner.of("appraisalCycle.company")],
  budget: { p95: "80 millis" },
});
