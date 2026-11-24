import { Blueprint } from "orthograph";
import { Interview } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Interview is Pending, Under Review, Cleared or Rejected, and is submitted only Cleared or Rejected. Under
// Review is a mark between the two and comes later. The company's owner decides it; feedback doesn't decide it.
export const machine = Blueprint.machine(Interview, {
  states: ["pending", "cleared", "rejected"],
  moves: {
    create: { from: [], to: "pending", emits: Events.InterviewScheduled },
    clear: { from: ["pending"], to: "cleared", emits: Events.InterviewCleared },
    reject: { from: ["pending"], to: "rejected", emits: Events.InterviewRejected },
  },
  notFrom: { exit: 40 },
});
