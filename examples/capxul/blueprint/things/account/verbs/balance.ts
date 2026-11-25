import { Blueprint } from "orthograph";
import { Account } from "../thing.ts";
import { owner } from "../../company/roles.ts";
import { Day } from "../../../values/employee.ts";
import { Amount } from "../../../values/expenses.ts";
import { Balance } from "../../../values/ledger.ts";

// ERPNext's `get_balance_on` (erpnext/accounts/utils.py): every ledger line not cancelled, posted on or before the day,
// to the account itself or, for a group, to any account anywhere under it. `debit` and `credit` are those lines' sums,
// and `balance` is debit less credit. It moves nothing, so it has no move; its handler works the sums out each time, as
// nothing stores them (`decisions/CX-ledger.md`, on the tree's sum).
export default Blueprint.operation(Account, {
  description: "An account's balance on a day: its own ledger lines and those of every account under it.",
  payload: { account: Account.fields.id, onDay: Blueprint.described(Day, "The last day counted: lines posted on it count.") },
  answer: { account: Account.fields.id, debit: Amount, credit: Amount, balance: Balance },
  allowed: [owner.of("account.company")],
  steps: { sum: Blueprint.step.database({ writes: [] }) },
  budget: { p95: "300 millis" },
});
