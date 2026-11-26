import { Blueprint } from "orthograph";
import { Supplier } from "../thing.ts";
import { owner } from "../../company/roles.ts";

// A read changes nothing, so it has no move and no handler: it answers from the supplier's record.
export default Blueprint.read(Supplier, {
  by: "id",
  fields: ["company", "supplierName", "supplierType", "supplierGroup", "state"],
  allowed: [owner.of("company")],
  budget: { p95: "50 millis" },
});
