import { Blueprint } from "orthograph";
import { BridgeBusiness } from "../thing.ts";
import { machine } from "../machine.ts";
import { RejectionReason } from "../../../values/bridge.ts";

// Bridge's report that the business failed KYB, with its reason. The reason travels in the event, since a business
// that wasn't turned down has none to store.
export default Blueprint.operation(BridgeBusiness, {
  description: "Record that Bridge turned down a company's KYB, and why.",
  payload: { business: BridgeBusiness.fields.id, reason: RejectionReason },
  answer: { business: BridgeBusiness.fields.id },
  move: machine.moves.reject,
  allowed: [Blueprint.system],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
