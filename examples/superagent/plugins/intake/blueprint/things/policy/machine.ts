import { Blueprint } from "orthograph";
import { Policy } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Policy, {
  states: ["current"],
  moves: {
    save: { from: [], to: "current", emits: Events.PolicyChanged },
    // A restore saves an earlier version again as a new row, as a save does: the framework serves both (`versions:`).
    restore: { from: [], to: "current", emits: Events.PolicyChanged },
  },
  notFrom: { exit: 87 },
});
