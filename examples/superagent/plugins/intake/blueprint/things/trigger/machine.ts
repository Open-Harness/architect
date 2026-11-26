import { Blueprint } from "orthograph";
import { Trigger } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Trigger, {
  states: ["stored"],
  moves: {
    receive: { from: [], to: "stored", emits: Events.TriggerReceived },
    requeue: { from: ["stored"], to: "stored", emits: Events.TriggerRequeued },
  },
  notFrom: { exit: 83 },
});
