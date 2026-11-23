import { Blueprint } from "orthograph";
import { BridgeIndividual } from "../thing.ts";
import { machine } from "../machine.ts";

// KycAlreadyStarted belongs to the rule in ../invariants.ts, and the runtime refuses it. The person checked is the
// caller. Bridge makes the two links (`POST /v0/kyc_links`, `type: "individual"`); the call to it is a step the
// builder adds once Capxul mounts the Bridge adapter.
export default Blueprint.operation(BridgeIndividual, {
  description: "Start your own KYC with Bridge: answers the form you fill in, and Bridge's terms.",
  payload: { fullName: BridgeIndividual.fields.fullName, email: BridgeIndividual.fields.email },
  answer: { individual: BridgeIndividual.fields.id, kycLink: BridgeIndividual.fields.kycLink, tosLink: BridgeIndividual.fields.tosLink },
  move: machine.moves.start,
  allowed: [Blueprint.signedIn],
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "800 millis" },
});
