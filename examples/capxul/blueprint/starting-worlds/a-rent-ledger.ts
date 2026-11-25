// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From an operating group: Ada has added Rent, a ledger under Operating Expenses, two levels below Expenses. */
export default Blueprint.startingWorld("a rent ledger", {
  from: "an operating group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Rent", parentAccount: s.world.operating, isGroup: false })],
  gives: (s) => ({ rent: s.last.account }),
});
