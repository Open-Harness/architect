import { Blueprint } from "orthograph";
import { Assignment } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Assignment, {
  states: ["pending", "running", "closing", "ended"],
  moves: {
    queued: { from: [], to: "pending", emits: Events.AssignmentQueued },
    promoted: { from: ["pending"], to: "pending", emits: Events.AssignmentPromoted },
    started: { from: ["pending"], to: "running", emits: Events.AssignmentStarted },
    cancelled: { from: ["pending"], to: "ended", emits: Events.AssignmentEnded },
    interrupted: { from: ["running"], to: "closing", emits: Events.AssignmentInterrupted },
    turnEnded: { from: ["running", "closing"], to: "ended", emits: Events.AssignmentEnded },
  },
  notFrom: { exit: 94 },
});
