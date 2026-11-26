// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a liabilities group: Ada has added Debtors, a ledger of the type Receivable, under Assets. */
export default Blueprint.startingWorld("a debtors ledger", {
  from: "a liabilities group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Debtors", parentAccount: s.world.assets, isGroup: false, accountType: "Receivable" })],
  gives: (s) => ({ debtors: s.last.account }),
});
