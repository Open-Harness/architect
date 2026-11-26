// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createAccount from "../things/account/verbs/create.ts";

/** From a payroll outsider: Ada has started Acme Logistics' chart with Liabilities, a root group of the root type Liability. */
export default Blueprint.startingWorld("an outside liabilities group", {
  from: "a payroll outsider",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createAccount, { company: s.world.otherCompany, accountName: "Liabilities", isGroup: true, rootType: "Liability" })],
  gives: (s) => ({ otherLiabilities: s.last.account }),
});
