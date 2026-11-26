import { Blueprint } from "orthograph";
import { LeaveApplication } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the application's record.
export default Blueprint.read(LeaveApplication, {
  by: "id",
  fields: ["company", "employee", "leaveType", "fromDate", "toDate", "reason", "totalLeaveDays", "state"],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
