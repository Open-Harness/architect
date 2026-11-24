import { Blueprint } from "orthograph";
import { ShiftType } from "./thing.ts";
import * as Events from "./events.ts";

// HRMS's Shift Type has no lifecycle.
export const machine = Blueprint.machine(ShiftType, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.ShiftTypeCreated },
  },
  notFrom: { exit: 40 },
});
