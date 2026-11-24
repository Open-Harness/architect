import { Blueprint } from "orthograph";
import { BridgeBusiness } from "../thing.ts";
import { machine } from "../machine.ts";

// Bridge's report that the business passed KYB (its customer's `kyc_status` became `approved`). Until Capxul mounts
// the Bridge adapter and its webhook door, the system makes the report (journeys/README.md, "Who speaks for Bridge").
export default Blueprint.operation(BridgeBusiness, {
  description: "Record that Bridge approved a company's KYB.",
  payload: { business: BridgeBusiness.fields.id },
  answer: { business: BridgeBusiness.fields.id },
  move: machine.moves.approve,
  allowed: [Blueprint.system],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
