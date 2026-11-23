import { Blueprint } from "orthograph";
import { BridgeIndividual } from "../thing.ts";
import { machine } from "../machine.ts";
import { RejectionReason } from "../../../values/bridge.ts";

// Bridge's report that the person failed KYC, with its reason, which travels in the event.
export default Blueprint.operation(BridgeIndividual, {
  description: "Record that Bridge turned down a person's KYC, and why.",
  payload: { individual: BridgeIndividual.fields.id, reason: RejectionReason },
  answer: { individual: BridgeIndividual.fields.id },
  move: machine.moves.reject,
  allowed: [Blueprint.system],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
