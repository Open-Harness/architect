// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From logistics assets: Ada has added Acme Logistics' own Debtors, a Receivable ledger under its Assets. */
export default Blueprint.startingWorld("logistics debtors", {
  from: "logistics assets",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Debtors", parentAccount: s.world.otherAssets, isGroup: false, accountType: "Receivable" })],
  gives: (s) => ({ otherDebtors: s.last.account }),
});
