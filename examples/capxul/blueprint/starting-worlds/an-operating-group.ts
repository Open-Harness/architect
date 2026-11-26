// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From an expenses group: Ada has added Operating Expenses, a group under Expenses. */
export default Blueprint.startingWorld("an operating group", {
  from: "an expenses group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Operating Expenses", parentAccount: s.world.expenses, isGroup: true })],
  gives: (s) => ({ operating: s.last.account }),
});
