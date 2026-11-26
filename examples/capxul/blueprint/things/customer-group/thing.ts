import { Blueprint } from "orthograph";
import type { Field } from "orthograph";
import { Company } from "../company/thing.ts";
import { Name } from "../../values/company.ts";

// ERPNext's Customer Group (erpnext/setup/doctype/customer_group), a tree (Frappe's NestedSet, `parent_customer_group`) with one root: its name and the group
// it sits under. Whether it is a group or a ledger is its state, as for Account. ERPNext's groups are site-wide; Capxul's
// are each company's own, as its companies are separate organisations (K42, call 10). Its party accounts, credit limits,
// price list and payment terms come later (`decisions/CX-parties-payments.md`).
// The id's value is declared on its own, so the parent link, which points back at this thing, has a type to name.
const CustomerGroupId = Blueprint.id("cgr");

export const CustomerGroup = Blueprint.thing({
  description: "A heading customers are grouped under in a company, kept as a tree with one root.",
  code: "CG",
  fields: {
    id: CustomerGroupId,
    company: Company.fields.id,
    customerGroupName: Name,
    parentCustomerGroup: Blueprint.optional(Blueprint.link((): Field<typeof CustomerGroupId, "id"> => CustomerGroup.fields.id)),
  },
});
