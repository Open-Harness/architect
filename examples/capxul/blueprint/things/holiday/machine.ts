import { Blueprint } from "orthograph";
import { Holiday } from "./thing.ts";
import * as Events from "./events.ts";

// A holiday is added and kept. ERPNext's `clear_table` comes with a later slice.
export const machine = Blueprint.machine(Holiday, {
  states: ["active"],
  moves: {
    add: { from: [], to: "active", emits: Events.HolidayAdded },
  },
  notFrom: { exit: 40 },
});
