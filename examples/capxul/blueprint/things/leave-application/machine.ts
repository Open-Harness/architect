import { Blueprint } from "orthograph";
import { LeaveApplication } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Leave Application status: Open, then Approved or Rejected when it is submitted, and Cancelled when it is
// cancelled. Capxul cancels an open application too, which HRMS does by deleting the draft.
export const machine = Blueprint.machine(LeaveApplication, {
  states: ["open", "approved", "rejected", "cancelled"],
  moves: {
    create: { from: [], to: "open", emits: Events.LeaveApplied },
    approve: { from: ["open"], to: "approved", emits: Events.LeaveApplicationApproved },
    reject: { from: ["open"], to: "rejected", emits: Events.LeaveApplicationRejected },
    cancel: { from: ["open", "approved"], to: "cancelled", emits: Events.LeaveApplicationCancelled },
  },
  notFrom: { exit: 40 },
});
