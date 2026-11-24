import { Blueprint } from "orthograph";
import { BridgeIndividual } from "./thing.ts";
import * as Events from "./events.ts";

// The same three of Bridge's `kyc_status` a KYB keeps (../bridge-business/machine.ts).
export const machine = Blueprint.machine(BridgeIndividual, {
  states: ["started", "approved", "rejected"],
  moves: {
    start: { from: [], to: "started", emits: Events.KycStarted },
    approve: { from: ["started"], to: "approved", emits: Events.KycApproved },
    reject: { from: ["started"], to: "rejected", emits: Events.KycRejected },
  },
  notFrom: { exit: 40 },
});
