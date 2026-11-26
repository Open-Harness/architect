import { Blueprint } from "orthograph";
import { LeaveAllocation } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Leave Allocation is a draft until it is submitted; only a submitted one gives leave (docstatus 1).
// Cancelling and changing a submitted allocation come later.
export const machine = Blueprint.machine(LeaveAllocation, {
  states: ["draft", "submitted"],
  moves: {
    create: { from: [], to: "draft", emits: Events.LeaveAllocationCreated },
    submit: { from: ["draft"], to: "submitted", emits: Events.LeaveAllocationSubmitted },
  },
  notFrom: { exit: 40 },
});
