import { Blueprint } from "orthograph";
import { AppraisalCycle } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's `status`: Not Started, In Progress, Completed. The form starts a cycle from Not Started, marks it completed from
// In Progress (`complete_cycle`), and marks a completed one In Progress again (appraisal_cycle.js). The owner moves it.
export const machine = Blueprint.machine(AppraisalCycle, {
  states: ["notStarted", "inProgress", "completed"],
  moves: {
    create: { from: [], to: "notStarted", emits: Events.AppraisalCycleCreated },
    start: { from: ["notStarted"], to: "inProgress", emits: Events.AppraisalCycleStarted },
    complete: { from: ["inProgress"], to: "completed", emits: Events.AppraisalCycleCompleted },
    reopen: { from: ["completed"], to: "inProgress", emits: Events.AppraisalCycleReopened },
  },
  notFrom: { exit: 40 },
});
