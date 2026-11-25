// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCostCenter from "../things/cost-center/verbs/create.ts";

/** From a rent ledger: Ada has added Acme Trading's root cost center, a group named after the company, as ERPNext's is. */
export default Blueprint.startingWorld("a main cost center", {
  from: "a rent ledger",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCostCenter, { company: s.world.company, costCenterName: "Acme Trading", isGroup: true })],
  gives: (s) => ({ mainCostCenter: s.last.costCenter }),
});
