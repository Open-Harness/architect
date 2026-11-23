import { Blueprint } from "orthograph";
import { Designation } from "./thing.ts";
import * as Events from "./events.ts";

// ERPNext's Designation has no lifecycle.
export const machine = Blueprint.machine(Designation, {
  states: ["active"],
  moves: {
    create: { from: [], to: "active", emits: Events.DesignationCreated },
  },
  notFrom: { exit: 40 },
});
