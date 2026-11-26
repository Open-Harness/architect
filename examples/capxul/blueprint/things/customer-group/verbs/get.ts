import { Blueprint } from "orthograph";
import { CustomerGroup } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the group's record.
export default Blueprint.read(CustomerGroup, {
  by: "id",
  fields: ["company", "customerGroupName", "parentCustomerGroup", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
