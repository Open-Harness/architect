import { Blueprint } from "orthograph";
import { Goal } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's `status`: Pending, In Progress or Completed follow the progress (`set_status`: 0, below 100, 100); Archived and
// Closed are set by hand and kept whatever the progress. A goal is archived or closed from pending or in progress,
// archived from closed and closed from archived, and unarchived or reopened back to the status its progress gives
// (goal_list.js, `get_applicable_current_statuses`). Completing by hand sets the progress to 100 (`update_status`).
export const machine = Blueprint.machine(Goal, {
  states: ["pending", "inProgress", "completed", "archived", "closed"],
  moves: {
    create: { from: [], to: ["pending", "inProgress", "completed"], emits: Events.GoalCreated },
    updateProgress: { from: ["pending", "inProgress", "completed"], to: ["pending", "inProgress", "completed"], emits: Events.GoalProgressUpdated },
    complete: { from: ["pending", "inProgress"], to: "completed", emits: Events.GoalCompleted },
    archive: { from: ["pending", "inProgress", "closed"], to: "archived", emits: Events.GoalArchived },
    close: { from: ["pending", "inProgress", "archived"], to: "closed", emits: Events.GoalClosed },
    unarchive: { from: ["archived"], to: ["pending", "inProgress", "completed"], emits: Events.GoalUnarchived },
    reopen: { from: ["closed"], to: ["pending", "inProgress", "completed"], emits: Events.GoalReopened },
  },
  notFrom: { exit: 40 },
});
