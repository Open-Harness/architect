import { Blueprint } from "orthograph";
import { EmploymentType } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Employment Type has no lifecycle.
export const machine = Blueprint.machine(EmploymentType, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.EmploymentTypeCreated },
  },
  notFrom: { exit: 40 },
});
