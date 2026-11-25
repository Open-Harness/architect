import { Blueprint } from "orthograph";
import { Goal } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the goal's record. Its parent goal is
// left out: a read by id that names an optional field dies on a record without one (a framework gap, reported to
// Goal 16's lead); `goal.list` answers every field, the parent too.
export default Blueprint.read(Goal, {
  by: "id",
  fields: ["company", "employee", "appraisalCycle", "kra", "goalName", "progress", "isGroup", "state"],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
