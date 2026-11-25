import { Blueprint } from "orthograph";
import { EmployeeTransfer } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the transfer's record.
export default Blueprint.read(EmployeeTransfer, {
  by: "id",
  fields: ["company", "employee", "transferDate", "currentDepartment", "newDepartment", "state"],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
