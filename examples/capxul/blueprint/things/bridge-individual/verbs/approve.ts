import { Blueprint } from "orthograph";
import { BridgeIndividual } from "../thing.ts";
import { machine } from "../machine.ts";

// Bridge's report that the person passed KYC. Until Capxul mounts the Bridge adapter and its webhook door, the system
// makes the report (journeys/README.md, "Who speaks for Bridge").
export default Blueprint.operation(BridgeIndividual, {
  description: "Record that Bridge approved a person's KYC.",
  payload: { individual: BridgeIndividual.fields.id },
  answer: { individual: BridgeIndividual.fields.id },
  move: machine.moves.approve,
  allowed: [Blueprint.system],
  steps: { update: Blueprint.step.database() },
  idempotent: "request",
  budget: { p95: "150 millis" },
});
