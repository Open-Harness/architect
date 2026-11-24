import { Blueprint } from "orthograph";
import { ExpenseClaimType } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the type's record.
export default Blueprint.read(ExpenseClaimType, {
  by: "id",
  fields: ["company", "expenseType", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
