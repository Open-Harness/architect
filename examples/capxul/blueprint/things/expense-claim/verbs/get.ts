import { Blueprint } from "orthograph";
import { ExpenseClaim } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { self } from "../../employee/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the claim's record.
export default Blueprint.read(ExpenseClaim, {
  by: "id",
  fields: ["company", "employee", "postingDate", "totalClaimedAmount", "totalSanctionedAmount", "state"],
  allowed: [self.of("employee"), owner.of("company")],
  budget: { p95: "50 millis" },
});
