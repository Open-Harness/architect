import { Blueprint } from "orthograph";
import { CostCenter } from "../thing.ts";
import { machine } from "../machine.ts";
import { ParentCostCenterIsLedger, ParentCostCenterNotInCompany, RootCostCenterIsLedger } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). `isGroup` picks the state it is made in.
export default Blueprint.operation(CostCenter, {
  description: "Add a cost center to a company, under a group or as a root.",
  payload: {
    company: CostCenter.fields.company,
    costCenterName: CostCenter.fields.costCenterName,
    parentCostCenter: CostCenter.fields.parentCostCenter,
    isGroup: Blueprint.described(Blueprint.bool(), "Make it a group, which other cost centers sit under, rather than a ledger, which takes entries."),
  },
  answer: { costCenter: CostCenter.fields.id },
  move: machine.moves.create,
  errors: [ParentCostCenterNotInCompany, ParentCostCenterIsLedger, RootCostCenterIsLedger],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
