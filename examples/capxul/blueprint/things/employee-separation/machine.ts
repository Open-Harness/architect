import { Blueprint } from "orthograph";
import { EmployeeSeparation } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's `boarding_status`: Pending, In Process, Completed. HRMS sets it from its project's tasks
// (`update_employee_boarding_status`); Capxul has no tasks yet, so the company's owner moves it. A separation may go
// straight from pending to completed, as HRMS's does when its project jumps to 100%. Completing it doesn't relieve
// the employee: `employee.relieve` stays its own call.
export const machine = Blueprint.machine(EmployeeSeparation, {
  states: ["pending", "inProcess", "completed"],
  moves: {
    create: { from: [], to: "pending", emits: Events.EmployeeSeparationStarted },
    begin: { from: ["pending"], to: "inProcess", emits: Events.EmployeeSeparationBegun },
    complete: { from: ["pending", "inProcess"], to: "completed", emits: Events.EmployeeSeparationCompleted },
  },
  notFrom: { exit: 40 },
});
