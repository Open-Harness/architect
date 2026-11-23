import { Blueprint } from "orthograph";
import { Employee } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's Employee status is Active, Inactive, Suspended or Left. This slice hires and relieves; Inactive and
// Suspended come with the moves that reach them.
export const machine = Blueprint.machine(Employee, {
  states: ["active", "left"],
  moves: {
    hire: { from: [], to: "active", emits: Events.EmployeeHired },
    relieve: { from: ["active"], to: "left", emits: Events.EmployeeRelieved },
  },
  notFrom: { exit: 40 },
});
