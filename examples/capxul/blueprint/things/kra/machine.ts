import { Blueprint } from "orthograph";
import { Kra } from "./thing.ts";
import * as Events from "./events.ts";

// A KRA is made and kept. HRMS has no lifecycle for it.
export const machine = Blueprint.machine(Kra, {
  states: ["active"],
  moves: { create: { from: [], to: "active", emits: Events.KraCreated } },
  notFrom: { exit: 40 },
});
