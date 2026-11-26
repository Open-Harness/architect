// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCostCenter from "../things/cost-center/verbs/create.ts";

/** From an outside payable ledger: Ada has added Acme Logistics' root cost center, a group named after it. */
export default Blueprint.startingWorld("an outside cost center group", {
  from: "an outside payable ledger",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCostCenter, { company: s.world.otherCompany, costCenterName: "Acme Logistics", isGroup: true })],
  gives: (s) => ({ otherMainCostCenter: s.last.costCenter }),
});
