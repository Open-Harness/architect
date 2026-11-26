import { Blueprint } from "orthograph";
import type { Field } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// ERPNext's Cost Center (erpnext/accounts/doctype/cost_center), a tree like Account: its name and the group it sits
// under. Whether it is a group or a ledger is its state. Its number, `disabled`, allocations and the moves between group
// and ledger come later (`decisions/CX-ledger.md`).
// The id's value is declared on its own, so the parent link, which points back at this thing, has a type to name.
const CostCenterId = Blueprint.id("cct");

export const CostCenter = Blueprint.thing({
  description: "Where in a company money is spent or earned, kept as a tree of groups and ledgers.",
  code: "CC",
  fields: {
    id: CostCenterId,
    company: Company.fields.id,
    costCenterName: Name,
    parentCostCenter: Blueprint.optional(Blueprint.link((): Field<typeof CostCenterId, "id"> => CostCenter.fields.id)),
  },
});
