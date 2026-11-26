import { Blueprint } from "orthograph";
import { Task } from "./thing.ts";
import * as Events from "./events.ts";

// K46: a task that waits is a task in a state, and the way out of the state says what it needs.
// The stage the board shows today (answer, review, blocked, working, queued, idle) stays a derived read over the
// task's runs and asks, as `ticket.stage` is in @orthograph/tickets.
export const machine = Blueprint.machine(Task, {
  states: ["open", "done", "dropped"],
  moves: {
    create: { from: [], to: "open", emits: Events.TaskCreated },
    move: { from: ["open"], to: "open", emits: Events.TaskMoved }, // to another lane; a lane that asks first raises an Ask
    finish: { from: ["open"], to: "done", emits: Events.TaskFinished }, // every done-when line met, by someone who did not do it
    drop: { from: ["open"], to: "dropped", emits: Events.TaskDropped },
    reopen: { from: ["done", "dropped"], to: "open", emits: Events.TaskReopened },
  },
});
// AARON: model-next's `next` (working, asked, waiting outside with a date to look, look at a date) is richer than
// three states. As states it would be: working, asked, outside, sleeping. Board decision 6.
