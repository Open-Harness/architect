import { Blueprint } from "orthograph";
import { EmployeeGrade } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Employee Grade has no lifecycle.
export const machine = Blueprint.machine(EmployeeGrade, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.EmployeeGradeCreated },
  },
  notFrom: { exit: 40 },
});
