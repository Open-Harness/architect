import { Blueprint } from "orthograph";
import { Department } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the department's record.
export default Blueprint.read(Department, {
  by: "id",
  fields: ["company", "departmentName", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
