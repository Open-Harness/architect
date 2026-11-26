// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a capital ledger: Ada has added Expenses, a root group of the root type Expense. */
export default Blueprint.startingWorld("an expenses group", {
  from: "a capital ledger",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Expenses", isGroup: true, rootType: "Expense" })],
  gives: (s) => ({ expenses: s.last.account }),
});
