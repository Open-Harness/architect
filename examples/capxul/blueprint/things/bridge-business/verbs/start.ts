import { Blueprint } from "orthograph";
import { BridgeBusiness } from "../thing.ts";
import { machine } from "../machine.ts";
import { owner } from "../../company/roles.ts";

// KybAlreadyStarted belongs to the rule in ../invariants.ts, and the runtime refuses it. Bridge makes the two links
// (`POST /v0/kyc_links`, `type: "business"`); the call to it is a step the builder adds once Capxul mounts the Bridge adapter.
export default Blueprint.operation(BridgeBusiness, {
  description: "Start a company's KYB with Bridge: answers the form the business fills in, and Bridge's terms.",
  payload: {
    company: BridgeBusiness.fields.company,
    legalName: BridgeBusiness.fields.legalName,
    email: BridgeBusiness.fields.email,
  },
  answer: { business: BridgeBusiness.fields.id, kybLink: BridgeBusiness.fields.kybLink, tosLink: BridgeBusiness.fields.tosLink },
  move: machine.moves.start,
  allowed: [owner.of("company")],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "800 millis" },
});
