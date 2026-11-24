import { Blueprint } from "orthograph";
import { Decision } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Decision, {
  states: ["recorded", "dismissed"],
  moves: {
    route: { from: [], to: "recorded", emits: Events.DecisionRecorded },
    dismiss: { from: ["recorded"], to: "dismissed", emits: Events.DecisionDismissed },
  },
  notFrom: { exit: 86 },
});
