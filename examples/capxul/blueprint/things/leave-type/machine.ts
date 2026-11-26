import { Blueprint } from "orthograph";
import { LeaveType } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Leave Type has no lifecycle: it is created and used.
export const machine = Blueprint.machine(LeaveType, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.LeaveTypeCreated },
  },
  notFrom: { exit: 40 },
});
