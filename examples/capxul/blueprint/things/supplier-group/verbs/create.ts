import { Blueprint } from "orthograph";
import { SupplierGroup } from "../thing.ts";
import { machine } from "../machine.ts";
import { ParentSupplierGroupIsLedger, ParentSupplierGroupNotInCompany, SupplierGroupRootExists } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). `isGroup` picks the state it is made in.
export default Blueprint.operation(SupplierGroup, {
  description: "Add a supplier group to a company, under a group or as its one root.",
  payload: {
    company: SupplierGroup.fields.company,
    supplierGroupName: SupplierGroup.fields.supplierGroupName,
    parentSupplierGroup: SupplierGroup.fields.parentSupplierGroup,
    isGroup: Blueprint.described(Blueprint.bool(), "Make it a group, which other supplier groups sit under, rather than a ledger, which suppliers are put in."),
  },
  answer: { supplierGroup: SupplierGroup.fields.id },
  move: machine.moves.create,
  errors: [ParentSupplierGroupNotInCompany, ParentSupplierGroupIsLedger, SupplierGroupRootExists],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
