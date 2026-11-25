import { Blueprint } from "orthograph";
import { AttendanceRequest } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Attendance Request is a draft until it is submitted, which marks its days (`on_submit`). Capxul's company
// owner submits it as approved, or rejects it, which marks nothing. Cancelling, which cancels the days it marked, comes
// with a list (#764).
export const machine = Blueprint.machine(AttendanceRequest, {
  states: ["draft", "approved", "rejected"],
  moves: {
    create: { from: [], to: "draft", emits: Events.AttendanceRequested },
    approve: { from: ["draft"], to: "approved", emits: Events.AttendanceRequestApproved },
    reject: { from: ["draft"], to: "rejected", emits: Events.AttendanceRequestRejected },
  },
  notFrom: { exit: 40 },
});
