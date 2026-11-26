import { Blueprint } from "orthograph";
import { Supplier } from "../thing.ts";
import { machine } from "../machine.ts";
import { SupplierGroupIsGroup, SupplierGroupNotInCompany } from "../errors.ts";
import { owner } from "../../company/roles.ts";

// Refusal order (errors.ts). A supplier needs no group; given one, it must be a ledger group of the same company.
export default Blueprint.operation(Supplier, {
  description: "Add a supplier to a company.",
  payload: {
    company: Supplier.fields.company,
    supplierName: Supplier.fields.supplierName,
    supplierType: Supplier.fields.supplierType,
    supplierGroup: Supplier.fields.supplierGroup,
  },
  answer: { supplier: Supplier.fields.id },
  move: machine.moves.create,
  errors: [SupplierGroupNotInCompany, SupplierGroupIsGroup],
  allowed: [owner.of("company")],
  steps: { load: Blueprint.step.database({ writes: [] }), insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
