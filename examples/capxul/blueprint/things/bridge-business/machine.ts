import { Blueprint } from "orthograph";
import { BridgeBusiness } from "./thing.ts";
import * as Events from "./events.ts";

// Bridge's `kyc_status` runs not_started, incomplete, under_review, awaiting_ubo, approved, rejected, paused and
// offboarded. Capxul keeps the three a company acts on: it has started, Bridge approved it, or Bridge turned it down.
// Only Bridge decides, so approve and reject are Bridge's reports (journeys/README.md, "Who speaks for Bridge").
export const machine = Blueprint.machine(BridgeBusiness, {
  states: ["started", "approved", "rejected"],
  moves: {
    start: { from: [], to: "started", emits: Events.KybStarted },
    approve: { from: ["started"], to: "approved", emits: Events.KybApproved },
    reject: { from: ["started"], to: "rejected", emits: Events.KybRejected },
  },
  notFrom: { exit: 40 },
});
