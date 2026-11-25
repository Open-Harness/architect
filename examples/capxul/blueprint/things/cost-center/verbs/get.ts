import { Blueprint } from "orthograph";
import { CostCenter } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the cost center's record.
export default Blueprint.read(CostCenter, {
  by: "id",
  fields: ["company", "costCenterName", "parentCostCenter", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
