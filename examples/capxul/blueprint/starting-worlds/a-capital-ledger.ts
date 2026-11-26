// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From an equity group: Ada has added Capital Stock, a ledger under Equity. */
export default Blueprint.startingWorld("a capital ledger", {
  from: "an equity group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Capital Stock", parentAccount: s.world.equity, isGroup: false })],
  gives: (s) => ({ capital: s.last.account }),
});
