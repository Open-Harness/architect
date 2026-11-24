import { Blueprint } from "orthograph";
import { AttendanceRequest } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the request's record.
export default Blueprint.read(AttendanceRequest, {
  by: "id",
  fields: ["company", "employee", "fromDate", "toDate", "reason", "state"],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
