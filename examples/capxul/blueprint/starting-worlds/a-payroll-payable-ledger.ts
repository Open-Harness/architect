// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a liabilities group: Ada has added Payroll Payable, a ledger with no account type, under Liabilities. */
export default Blueprint.startingWorld("a payroll payable ledger", {
  from: "a liabilities group",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createAccount, { company: s.world.company, accountName: "Payroll Payable", parentAccount: s.world.liabilities, isGroup: false }),
  ],
  gives: (s) => ({ payable: s.last.account }),
});
