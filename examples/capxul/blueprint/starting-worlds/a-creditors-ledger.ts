// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a debtors ledger: Ada has added Creditors, a ledger of the type Payable, under Liabilities. */
export default Blueprint.startingWorld("a creditors ledger", {
  from: "a debtors ledger",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Creditors", parentAccount: s.world.liabilities, isGroup: false, accountType: "Payable" })],
  gives: (s) => ({ creditors: s.last.account }),
});
