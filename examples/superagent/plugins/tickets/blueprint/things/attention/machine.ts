import { Blueprint } from "orthograph";
import { Attention } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Attention, {
  states: ["open"],
  moves: {
    raise: { from: [], to: "open", emits: Events.AttentionRaised },
  },
  notFrom: { exit: 100 },
});
