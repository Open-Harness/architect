import { Blueprint } from "orthograph";
import { Employee } from "../thing.ts";
import { self } from "../roles.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the employee's record.
export default Blueprint.read(Employee, {
  by: "id",
  fields: ["company", "person", "firstName", "gender", "dateOfBirth", "dateOfJoining", "department", "designation", "state"],
  allowed: [self, owner.of("employee.company")],
  budget: { p95: "50 millis" },
});
