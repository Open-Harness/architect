import { Blueprint } from "orthograph";
import { Proposal } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Proposal, {
  states: ["waiting", "approved", "rejected"],
  moves: {
    propose: { from: [], to: "waiting", emits: Events.ProposalRecorded },
    approve: { from: ["waiting"], to: "approved", emits: Events.ProposalApproved },
    reject: { from: ["waiting"], to: "rejected", emits: Events.ProposalRejected },
  },
  notFrom: { exit: 70 },
});
