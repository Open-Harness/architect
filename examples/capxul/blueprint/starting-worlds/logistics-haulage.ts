// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCostCenter from "../things/cost-center/verbs/create.ts";

/** From logistics cost centers: Ada has added Haulage, a ledger cost center under Acme Logistics' root. */
export default Blueprint.startingWorld("logistics haulage", {
  from: "logistics cost centers",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCostCenter, { company: s.world.otherCompany, costCenterName: "Haulage", parentCostCenter: s.world.otherCostCenterGroup, isGroup: false })],
  gives: (s) => ({ haulage: s.last.costCenter }),
});
