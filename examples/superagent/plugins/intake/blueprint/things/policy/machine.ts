import { Blueprint } from "orthograph";
import { Policy } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Policy, {
  states: ["current"],
  moves: {
    save: { from: [], to: "current", emits: Events.PolicyChanged },
    restore: { from: ["current"], to: "current", emits: Events.PolicyChanged },
  },
  notFrom: { exit: 87 },
});
