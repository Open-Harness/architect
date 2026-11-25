// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From an assets group: Ada has added Bank, a ledger of the type Bank, under Assets. */
export default Blueprint.startingWorld("a bank ledger", {
  from: "an assets group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.company, accountName: "Bank", parentAccount: s.world.assets, isGroup: false, accountType: "Bank" })],
  gives: (s) => ({ bank: s.last.account }),
});
