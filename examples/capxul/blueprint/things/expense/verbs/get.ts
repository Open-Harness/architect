import { Blueprint } from "orthograph";
import { Expense } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the expense's record.
export default Blueprint.read(Expense, {
  by: "id",
  fields: ["expenseClaim", "expenseDate", "expenseType", "amount", "sanctionedAmount", "state"],
  allowed: [owner.of("expenseClaim.company")],
  budget: { p95: "50 millis" },
});
