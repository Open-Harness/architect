// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a pension ledger: Ada has added Salaries, a ledger under Operating Expenses, beside Rent. */
export default Blueprint.startingWorld("a salaries ledger", {
  from: "a pension ledger",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createAccount, { company: s.world.company, accountName: "Salaries", parentAccount: s.world.operating, isGroup: false }),
  ],
  gives: (s) => ({ salaries: s.last.account }),
});
