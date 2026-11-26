import { Blueprint } from "orthograph";
import { EmployeePromotion } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the promotion's record.
export default Blueprint.read(EmployeePromotion, {
  by: "id",
  fields: ["company", "employee", "promotionDate", "currentDesignation", "newDesignation", "state"],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
