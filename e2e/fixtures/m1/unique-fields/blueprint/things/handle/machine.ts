import { Blueprint } from "orthograph";
import { Handle } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Handle, {
  states: ["claimed", "released"],
  moves: {
    claim: { from: [], to: "claimed", emits: Events.HandleClaimed },
    release: { from: ["claimed"], to: "released", emits: Events.HandleReleased },
  },
  notFrom: { exit: 60 },
});
