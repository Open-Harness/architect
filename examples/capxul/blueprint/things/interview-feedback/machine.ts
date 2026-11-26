import { Blueprint } from "orthograph";
import { InterviewFeedback } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS submits feedback as it is given; cancelling it comes later.
export const machine = Blueprint.machine(InterviewFeedback, {
  states: ["given"],
  moves: {
    give: { from: [], to: "given", emits: Events.InterviewFeedbackGiven },
  },
  notFrom: { exit: 40 },
});
