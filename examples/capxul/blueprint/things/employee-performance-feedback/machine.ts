import { Blueprint } from "orthograph";
import { EmployeePerformanceFeedback } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's feedback is submittable: drafted, then submitted, which counts it in the appraisal's average (`on_submit`).
// Cancelling, which takes it out again, comes later.
export const machine = Blueprint.machine(EmployeePerformanceFeedback, {
  states: ["draft", "submitted"],
  moves: {
    create: { from: [], to: "draft", emits: Events.PerformanceFeedbackDrafted },
    submit: { from: ["draft"], to: "submitted", emits: Events.PerformanceFeedbackSubmitted },
  },
  notFrom: { exit: 40 },
});
