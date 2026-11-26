import { Blueprint } from "orthograph";
import { Customer } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { Day } from "../../../values/employee.ts";
import { Amount } from "../../../values/expenses.ts";
import { Balance } from "../../../values/ledger.ts";

// ERPNext's `get_balance_on(party_type="Customer", party=...)` (erpnext/accounts/utils.py), which the customer's dashboard
// also sums (`get_dashboard_info` in erpnext/accounts/party.py): every ledger line not cancelled, posted on or before the
// day, with this customer as its party. `debit` and `credit` are those lines' sums, and `balance` is debit less credit, so
// an advance received from a customer is negative. It moves nothing, so it has no move; its handler works the sums out
// each time, as nothing stores them (`decisions/CX-parties-payments.md`).
export default Blueprint.operation(Customer, {
  description: "A customer's balance on a day, from the ledger lines posted with it as their party.",
  payload: { customer: Customer.fields.id, onDay: Blueprint.described(Day, "The last day counted: lines posted on it count.") },
  answer: { customer: Customer.fields.id, debit: Amount, credit: Amount, balance: Balance },
  allowed: [owner.of("customer.company")],
  steps: { sum: Blueprint.step.database({ writes: [] }) },
  budget: { p95: "300 millis" },
});
