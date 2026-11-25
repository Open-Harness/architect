// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a bank ledger: Ada has added Equity, a root group of the root type Equity. */
export default Blueprint.startingWorld("an equity group", {
  from: "a bank ledger",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Equity", isGroup: true, rootType: "Equity" })],
  gives: (s) => ({ equity: s.last.account }),
});
