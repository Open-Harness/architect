// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCostCenter from "../things/cost-center/verbs/create.ts";

/** From an outside cost center group: Ada has added Transport, a ledger cost center under Acme Logistics' root. */
export default Blueprint.startingWorld("an outside cost center", {
  from: "an outside cost center group",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCostCenter, { company: s.world.otherCompany, costCenterName: "Transport", parentCostCenter: s.world.otherMainCostCenter, isGroup: false })],
  gives: (s) => ({ otherCostCenter: s.last.costCenter }),
});
