import { Blueprint } from "orthograph";
import { BridgeLink, LegalName } from "../../values/bridge.ts";

// A person as a customer of Bridge, served through Capxul's own Bridge account (CX-grill, section 4): Bridge's customer
// of type `individual`, and its KYC. No ERPNext doctype has it. `person` is the Capxul account that started it.
export const BridgeIndividual = Blueprint.thing({
  description: "A person's KYC with Bridge: the check of who they are.",
  code: "KC",
  fields: {
    id: Blueprint.id("kyc"),
    person: Blueprint.described(Blueprint.id("per"), "The person checked, who started it."),
    fullName: Blueprint.described(LegalName, "The person's name as their documents give it, which Bridge checks."),
    email: Blueprint.described(Blueprint.email(), "Where Bridge writes to the person about their KYC."),
    kycLink: Blueprint.described(BridgeLink, "Bridge's hosted KYC form for this person."),
    tosLink: Blueprint.described(BridgeLink, "Bridge's terms of service, which the person accepts before they are approved."),
  },
});
