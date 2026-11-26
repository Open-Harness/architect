import { Blueprint } from "orthograph";
import { Customer } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the customer's record.
export default Blueprint.read(Customer, {
  by: "id",
  fields: ["company", "customerName", "customerType", "customerGroup", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
