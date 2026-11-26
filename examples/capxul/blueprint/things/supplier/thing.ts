import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { SupplierGroup } from "../supplier-group/thing.ts";
import { Name } from "../../values/company.ts";
import { PartyKind } from "../../values/parties.ts";

// ERPNext's Supplier (erpnext/buying/doctype/supplier): its name, what kind of party it is, and the supplier group it is put in, if any (`supplier_group` is
// optional). ERPNext's suppliers are site-wide, with a party account per company; Capxul's are each company's own, as its
// companies are separate organisations (K42, call 10). Named by a naming series, so two may share a name. `disabled` is
// its state. Party accounts, contacts, addresses, credit limits, price lists, payment terms, loyalty, holds and the
// internal-party fields come later (`decisions/CX-parties-payments.md`).
export const Supplier = Blueprint.thing({
  description: "Someone a company buys from and pays money to.",
  code: "SU",
  fields: {
    id: Blueprint.id("sup"),
    company: Company.fields.id,
    supplierName: Name,
    supplierType: PartyKind,
    supplierGroup: Blueprint.optional(SupplierGroup.fields.id),
  },
});
