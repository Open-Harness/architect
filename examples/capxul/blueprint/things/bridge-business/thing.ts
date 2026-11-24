import { Blueprint } from "orthograph";
import { Company } from "../company/thing.ts";
import { BridgeLink, LegalName } from "../../values/bridge.ts";

// A company as a customer of Bridge, served through Capxul's own Bridge account (CX-grill, section 4): Bridge's customer
// of type `business`, and its KYB. No ERPNext doctype has it. A company's bank accounts are opened on it once Bridge
// approves it (journeys/README.md, "Bridge, part two").
export const BridgeBusiness = Blueprint.thing({
  description: "A company's KYB with Bridge: the check of who the business is, which its bank accounts need.",
  code: "KB",
  fields: {
    id: Blueprint.id("kyb"),
    company: Company.fields.id,
    legalName: Blueprint.described(LegalName, "The company's name as it is registered, which Bridge checks."),
    email: Blueprint.described(Blueprint.email(), "Where Bridge writes to the business about its KYB."),
    kybLink: Blueprint.described(BridgeLink, "Bridge's hosted KYB form for this business."),
    tosLink: Blueprint.described(BridgeLink, "Bridge's terms of service, which the business accepts before it is approved."),
  },
});
