import { Blueprint } from "orthograph";
import { Superagent } from "@orthograph/superagent/blueprint/things/superagent/thing.ts";
import { SuperagentResumed } from "@orthograph/superagent/blueprint/things/superagent/events.ts";
import { AssignmentEnded, AssignmentPromoted, AssignmentQueued } from "@orthograph/tickets/blueprint/things/assignment/events.ts";

// The app owns the joint, as it owns pause's list: `fill` reads the Superagent's `slots` and state, so `tickets` imports nothing of `superagent`.
export default Blueprint.operation(Superagent, {
  description: "Start waiting Assignments, in line, while seats are free. Does nothing while paused.",
  payload: { superagent: Superagent.fields.id },
  answer: { started: Blueprint.uint(8) },
  allowed: [Blueprint.system],
  on: [
    Blueprint.on(AssignmentQueued, (e) => ({ superagent: e.superagent })), // held while paused (GOAL17-pause)
    Blueprint.on(AssignmentEnded, (e) => ({ superagent: e.superagent })), // a seat freed; held while paused
    Blueprint.on(AssignmentPromoted, (e) => ({ superagent: e.superagent })), // a person's Input moved a pending one up; held
    Blueprint.on(SuperagentResumed, (e) => ({ superagent: e.superagent })), // the event that ends the hold; unheld
  ],
});
