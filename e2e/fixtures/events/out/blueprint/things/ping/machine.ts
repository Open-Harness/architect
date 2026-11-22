import { Blueprint } from "orthograph";
import { Ping } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Ping, {
  states: ["sent"],
  moves: {
    send: { from: [], to: "sent", emits: Events.Pinged },
  },
  notFrom: { exit: 80 },
});
