import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { CustomerGroup } from "../customer-group/thing.ts";
import { Name } from "../../values/company.ts";
import { PartyKind } from "../../values/parties.ts";

// ERPNext's Customer (erpnext/selling/doctype/customer): its name, what kind of party it is, and the customer group it is put in, if any (`customer_group` is
// optional). ERPNext's customers are site-wide, with a party account per company; Capxul's are each company's own, as its
// companies are separate organisations (K42, call 10). Named by a naming series, so two may share a name. `disabled` is
// its state. Party accounts, contacts, addresses, credit limits, price lists, payment terms, loyalty, holds and the
// internal-party fields come later (`decisions/CX-parties-payments.md`).
export const Customer = Blueprint.thing({
  description: "Someone a company sells to and receives money from.",
  code: "CU",
  fields: {
    id: Blueprint.id("cus"),
    company: Company.fields.id,
    customerName: Name,
    customerType: PartyKind,
    customerGroup: Blueprint.optional(CustomerGroup.fields.id),
  },
});
