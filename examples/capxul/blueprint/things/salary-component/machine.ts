import { Blueprint } from "orthograph";
import { SalaryComponent } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Salary Component has no lifecycle. `disabled` comes later.
export const machine = Blueprint.machine(SalaryComponent, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.SalaryComponentCreated },
  },
  notFrom: { exit: 40 },
});
