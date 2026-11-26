// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCostCenter from "../things/cost-center/verbs/create.ts";

/** From logistics debtors: Ada has added Acme Logistics, the root cost center group of its own company. */
export default Blueprint.startingWorld("logistics cost centers", {
  from: "logistics debtors",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCostCenter, { company: s.world.otherCompany, costCenterName: "Acme Logistics", isGroup: true })],
  gives: (s) => ({ otherCostCenterGroup: s.last.costCenter }),
});
