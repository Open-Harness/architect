import { Blueprint } from "orthograph";
import type { Field } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// ERPNext's Supplier Group (erpnext/setup/doctype/supplier_group), a tree (Frappe's NestedSet, `parent_supplier_group`) with one root: its name and the group
// it sits under. Whether it is a group or a ledger is its state, as for Account. ERPNext's groups are site-wide; Capxul's
// are each company's own, as its companies are separate organisations (K42, call 10). Its party accounts, credit limits,
// price list and payment terms come later (`decisions/CX-parties-payments.md`).
// The id's value is declared on its own, so the parent link, which points back at this thing, has a type to name.
const SupplierGroupId = Blueprint.id("sgr");

export const SupplierGroup = Blueprint.thing({
  description: "A heading suppliers are grouped under in a company, kept as a tree with one root.",
  code: "SG",
  fields: {
    id: SupplierGroupId,
    company: Company.fields.id,
    supplierGroupName: Name,
    parentSupplierGroup: Blueprint.optional(Blueprint.link((): Field<typeof SupplierGroupId, "id"> => SupplierGroup.fields.id)),
  },
});
