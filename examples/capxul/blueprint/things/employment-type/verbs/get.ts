import { Blueprint } from "orthograph";
import { EmploymentType } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the employment type's record.
export default Blueprint.read(EmploymentType, {
  by: "id",
  fields: ["company", "employmentTypeName", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
