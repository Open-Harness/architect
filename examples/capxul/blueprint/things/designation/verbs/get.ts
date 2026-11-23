import { Blueprint } from "orthograph";
import { Designation } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the designation's record.
export default Blueprint.read(Designation, {
  by: "id",
  fields: ["company", "designationName", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
