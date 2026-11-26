import { Blueprint } from "orthograph";
import { EmployeeFeedbackCriteria } from "./thing.ts";
import * as Events from "./events.ts";

// Criteria are made and kept. HRMS has no lifecycle for them.
export const machine = Blueprint.machine(EmployeeFeedbackCriteria, {
  states: ["active"],
  moves: { create: { from: [], to: "active", emits: Events.FeedbackCriteriaCreated } },
  notFrom: { exit: 40 },
});
