// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From an outside liabilities group: Ada has added Acme Logistics' own Payroll Payable, a ledger under its Liabilities. */
export default Blueprint.startingWorld("an outside payable ledger", {
  from: "an outside liabilities group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Payroll Payable", parentAccount: s.world.otherLiabilities, isGroup: false })],
  gives: (s) => ({ otherPayable: s.last.account }),
});
