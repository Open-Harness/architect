// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a payroll payable ledger: Ada has added Pension Payable, a ledger under Liabilities. */
export default Blueprint.startingWorld("a pension ledger", {
  from: "a payroll payable ledger",
  cast: { ada: owner },
  makes: (s) => [
    s.ada.run(createAccount, { company: s.world.company, accountName: "Pension Payable", parentAccount: s.world.liabilities, isGroup: false }),
  ],
  gives: (s) => ({ pension: s.last.account }),
});
