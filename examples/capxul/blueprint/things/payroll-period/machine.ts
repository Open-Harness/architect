import { Blueprint } from "orthograph";
import { PayrollPeriod } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Payroll Period has no lifecycle.
export const machine = Blueprint.machine(PayrollPeriod, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.PayrollPeriodCreated },
  },
  notFrom: { exit: 40 },
});
