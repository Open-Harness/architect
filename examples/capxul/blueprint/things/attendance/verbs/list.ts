import { Blueprint } from "orthograph";
import { Attendance } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// An employee's attendances, oldest first (HRMS's attendance list, filtered by employee). A read changes nothing, so it
// has no handler. It is how a journey sees every day an approved request marked.
export default Blueprint.read(Attendance, {
  where: ["employee", "attendanceDate"],
  order: "oldest",
  page: 50,
  allowed: [self.of("employee"), owner.of("employee.company")],
  budget: { p95: "80 millis" },
});
