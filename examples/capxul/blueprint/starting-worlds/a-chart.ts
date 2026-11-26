// Journey-author file: a starting world is made by declared operations, never by hand (D2 #4).
import { Blueprint } from "orthograph";
import { owner } from "../things/company/roles.ts";
import createCostCenter from "../things/cost-center/verbs/create.ts";

/** From a main cost center: Ada has added Operations, a ledger cost center under it. Acme Trading's chart is ready, with no fiscal year yet. */
export default Blueprint.startingWorld("a chart", {
  from: "a main cost center",
  cast: { ada: owner },
  makes: (s) => [s.ada.run(createCostCenter, { company: s.world.company, costCenterName: "Operations", parentCostCenter: s.world.mainCostCenter, isGroup: false })],
  gives: (s) => ({ costCenter: s.last.costCenter }),
});
